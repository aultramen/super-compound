#!/usr/bin/env node
/**
 * doc-lint - advisory single-projection linter for produced markdown docs.
 *
 * Flags bloat patterns that inflate a document without adding information:
 *   - empty-shell: more than two headings whose body is empty or a bare
 *     'none'/'N/A' with no reason
 *   - duplicate-paragraph: a normalized paragraph of 12+ words repeated
 *     within the doc or in a sibling .md file in the same directory
 *   - uniform-table: a table whose status-like cells are identical on every
 *     data row; suggest a one-line collapse
 *   - word-cap: word count above the budget mapped for the file in
 *     .agent/context/doc-budgets.json (check skipped when the map is absent)
 *   - expanded-id-run: more than four consecutive sequential IDs listed
 *     individually; suggest range notation
 *
 * Reports findings only; it never edits the document or auto-fixes.
 *
 * Usage: node .agent/tools/doc-lint.mjs <file...> [--root <repo-root>] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const STATUS_VALUE_RE = /^(?:pass(?:ed)?|fail(?:ed)?|done|ok(?:ay)?|yes|no|n\/a|none|✅|❌)$/i;
const BARE_NONE_RE = /^(?:[-*]\s+)?(?:none|n\/a)\.?$/i;
const ID_RE = /\b([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-)(\d+)\b/g;
const MIN_DUPLICATE_WORDS = 12;
const MAX_EMPTY_SHELLS = 2;
const MAX_ID_RUN = 4;
const BUDGETS_PATH = '.agent/context/doc-budgets.json';

function stripFences(raw) {
    const lines = raw.split('\n');
    let inFence = false;
    return lines.map((line) => {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            return '';
        }
        return inFence ? '' : line;
    });
}

function countWords(text) {
    return text.trim().split(/\s+/u).filter(Boolean).length;
}

function normalizeParagraph(text) {
    return text.toLowerCase().replace(/\s+/gu, ' ').trim();
}

function snippet(normalized) {
    const words = normalized.split(' ');
    return words.length > 8 ? `${words.slice(0, 8).join(' ')}...` : normalized;
}

function extractParagraphs(lines) {
    const paragraphs = [];
    let current = [];
    for (const line of lines) {
        const trimmed = line.trim();
        const isBreak = trimmed === '' || trimmed.startsWith('|') || HEADING_RE.test(trimmed);
        if (isBreak) {
            if (current.length > 0) paragraphs.push(current.join(' '));
            current = [];
        } else {
            current.push(trimmed);
        }
    }
    if (current.length > 0) paragraphs.push(current.join(' '));
    return paragraphs
        .map(normalizeParagraph)
        .filter((p) => countWords(p) >= MIN_DUPLICATE_WORDS);
}

function checkEmptyShells(lines, findings) {
    const headings = [];
    lines.forEach((line, index) => {
        const match = line.match(HEADING_RE);
        if (match) headings.push({ level: match[1].length, title: match[2].trim(), index });
    });
    const shells = [];
    headings.forEach((heading, i) => {
        const next = headings[i + 1];
        const end = next ? next.index : lines.length;
        const body = lines.slice(heading.index + 1, end).join('\n').trim();
        if (body === '') {
            if (next && next.level > heading.level) return; // container heading
            shells.push(heading.title);
        } else if (BARE_NONE_RE.test(body)) {
            shells.push(heading.title);
        }
    });
    if (shells.length > MAX_EMPTY_SHELLS) {
        findings.push({
            kind: 'empty-shell',
            value: `${shells.length} headings with empty or bare none/N/A bodies (${shells.slice(0, 3).join(', ')}); drop them or state the reason`,
        });
    }
}

function checkDuplicateParagraphs(docPath, lines, findings) {
    const paragraphs = extractParagraphs(lines);
    const counts = new Map();
    for (const p of paragraphs) counts.set(p, (counts.get(p) ?? 0) + 1);
    for (const [p, count] of counts) {
        if (count > 1) {
            findings.push({
                kind: 'duplicate-paragraph',
                value: `repeated ${count}x in doc: "${snippet(p)}"`,
            });
        }
    }

    const dir = path.dirname(docPath);
    const base = path.basename(docPath);
    let siblings = [];
    try {
        siblings = fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.md') && name !== base)
            .sort();
    } catch {
        return;
    }
    for (const sibling of siblings) {
        let siblingRaw;
        try {
            siblingRaw = fs.readFileSync(path.join(dir, sibling), 'utf8');
        } catch {
            continue;
        }
        const siblingParagraphs = new Set(extractParagraphs(stripFences(siblingRaw)));
        for (const p of counts.keys()) {
            if (siblingParagraphs.has(p)) {
                findings.push({
                    kind: 'duplicate-paragraph',
                    value: `repeated in sibling ${sibling}: "${snippet(p)}"`,
                });
            }
        }
    }
}

function parseRow(line) {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());
}

function checkUniformTables(lines, findings) {
    let start = -1;
    const flush = (end) => {
        if (start === -1) return;
        const startLine = start + 1;
        const block = lines.slice(start, end);
        start = -1;
        if (block.length < 4) return; // header + separator + >=2 data rows
        if (!/^[\s:|-]+$/.test(block[1].trim())) return;
        const rows = block.slice(2).map(parseRow);
        if (rows.length < 2) return;
        const columns = Math.max(...rows.map((r) => r.length));
        const statusColumns = [];
        for (let c = 0; c < columns; c += 1) {
            const values = rows.map((r) => r[c] ?? '');
            if (values.every((v) => STATUS_VALUE_RE.test(v))) statusColumns.push(values);
        }
        if (statusColumns.length === 0) return;
        const uniform = statusColumns.every((values) =>
            values.every((v) => v.toLowerCase() === values[0].toLowerCase()));
        if (uniform) {
            findings.push({
                kind: 'uniform-table',
                value: `table at line ${startLine}: all ${rows.length} rows report '${statusColumns[0][0]}'; collapse to one line (e.g. "${rows.length}/${rows.length} ${statusColumns[0][0]}")`,
            });
        }
    };
    lines.forEach((line, index) => {
        if (line.trim().startsWith('|')) {
            if (start === -1) start = index;
        } else {
            flush(index);
        }
    });
    flush(lines.length);
}

export function loadBudgets(root) {
    const budgetsFile = path.join(root, BUDGETS_PATH);
    try {
        const parsed = JSON.parse(fs.readFileSync(budgetsFile, 'utf8'));
        // doc_budgets_v1 nests the path map under "budgets"; flat maps stay as-is.
        return parsed && typeof parsed.budgets === 'object' ? parsed.budgets : parsed;
    } catch {
        return null; // missing or invalid budget map: skip the word-cap check
    }
}

function budgetFor(budgets, relPath) {
    if (!budgets || typeof budgets !== 'object') return null;
    let best = null;
    for (const [key, value] of Object.entries(budgets)) {
        const max = typeof value === 'number' ? value : value?.maxWords;
        if (typeof max !== 'number') continue;
        let matched = false;
        if (key === relPath) {
            matched = true;
        } else if (key.endsWith('/')) {
            matched = relPath.startsWith(key);
        } else if (key.includes('*')) {
            const pattern = key
                .replace(/[.+^${}()[\]\\]/g, '\\$&')
                .replace(/\*\*\//g, '\u0000')
                .replace(/\*\*/g, '\u0001')
                .replace(/\*/g, '[^/]*')
                .replace(/\u0000/g, '(?:.*/)?')
                .replace(/\u0001/g, '.*');
            matched = new RegExp(`^${pattern}$`).test(relPath);
        }
        if (matched && (best === null || key.length > best.key.length)) {
            best = { key, max };
        }
    }
    return best;
}

function checkWordCap(raw, relPath, budgets, findings) {
    const budget = budgetFor(budgets, relPath);
    if (!budget) return;
    const words = countWords(raw);
    if (words > budget.max) {
        findings.push({
            kind: 'word-cap',
            value: `${words} words exceed the ${budget.max}-word budget for ${budget.key}`,
        });
    }
}

function checkExpandedIdRuns(lines, findings) {
    const text = lines.join('\n');
    let run = null;
    const flush = () => {
        if (run && run.count > MAX_ID_RUN) {
            findings.push({
                kind: 'expanded-id-run',
                value: `${run.first}..${run.last} listed individually (${run.count} IDs); use range notation`,
            });
        }
        run = null;
    };
    for (const match of text.matchAll(ID_RE)) {
        const prefix = match[1];
        const number = Number.parseInt(match[2], 10);
        const id = match[0];
        if (run && run.prefix === prefix && number === run.number + 1) {
            run.number = number;
            run.last = id;
            run.count += 1;
        } else {
            flush();
            run = { prefix, number, first: id, last: id, count: 1 };
        }
    }
    flush();
}

export function lintDoc({ docPath, root, budgets = null }) {
    const findings = [];
    const raw = fs.readFileSync(docPath, 'utf8');
    const lines = stripFences(raw);
    checkEmptyShells(lines, findings);
    checkDuplicateParagraphs(docPath, lines, findings);
    checkUniformTables(lines, findings);
    checkWordCap(raw, path.relative(root, docPath).split(path.sep).join('/'), budgets, findings);
    checkExpandedIdRuns(lines, findings);
    return findings;
}

function main(argv) {
    const args = argv.slice(2);
    const files = [];
    let root = process.cwd();
    let json = false;
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--root') root = args[++i];
        else if (a === '--json') json = true;
        else files.push(a);
    }
    if (files.length === 0 || !files.every((f) => fs.existsSync(f))) {
        process.stderr.write('usage: doc-lint.mjs <file...> [--root <repo-root>] [--json]\n');
        return 2;
    }
    const budgets = loadBudgets(root);
    const results = files.map((file) => ({
        doc: file,
        findings: lintDoc({ docPath: path.resolve(file), root, budgets }),
    }));
    const total = results.reduce((sum, r) => sum + r.findings.length, 0);
    if (json) {
        process.stdout.write(`${JSON.stringify({ files: results, total }, null, 2)}\n`);
    } else if (total === 0) {
        process.stdout.write('No doc-lint findings.\n');
    } else {
        for (const result of results) {
            for (const f of result.findings) {
                process.stdout.write(`${result.doc}: ${f.kind}: ${f.value}\n`);
            }
        }
        process.stdout.write(`${total} finding(s). Advisory only; adjudicate, do not auto-fix.\n`);
    }
    return total === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
