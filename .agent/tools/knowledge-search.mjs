#!/usr/bin/env node
/**
 * knowledge-search - BM25 retrieval over the durable knowledge store.
 *
 * Ranks docs/solutions/** (and optionally docs/learnings/**) plus the
 * memory files docs/ERROR_LOG.md, docs/LEARNED_KNOWLEDGE.md, and the
 * "## Codebase Patterns" head section of docs/progress.md against a query
 * and emits at most MAX_RESULTS compact hits: id, path, title, score,
 * snippet. Multi-entry memory files are split on /^## /m so BM25 ranks at
 * entry granularity; each entry hit carries a stable id (the ERR-* or
 * LRN-* id from its heading when present, else file+heading). Ranking sees full
 * text (frontmatter + headings + body); output stays bounded so the
 * knowledge base itself never enters agent context.
 *
 * Global store (opt-in): when SC_GLOBAL_KNOWLEDGE_DIR is set and
 * <dir>/LEARNED_KNOWLEDGE.md exists, its LRN-* entries join the default corpus
 * and are reported with path `global:LEARNED_KNOWLEDGE.md`. Unset means the
 * corpus is repository-local and the tool stays deterministic in CI.
 *
 * Usage:
 *   node .agent/tools/knowledge-search.mjs "<query>" [--dir docs/solutions]
 *        [--file docs/ERROR_LOG.md] [--limit 3] [--json] [--root <repo-root>]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const MAX_RESULTS = 3;
const SNIPPET_CHARS = 240;
const BM25_K1 = 1.5;
const BM25_B = 0.75;
const ENTRY_ID_RE = /^((?:ERR|LRN)-\d{4}-\d{2}-\d{2}-\d+)\b/;

const DEFAULT_DIRS = ['docs/solutions', 'docs/learnings'];
const DEFAULT_FILES = [
    { file: 'docs/ERROR_LOG.md' },
    { file: 'docs/LEARNED_KNOWLEDGE.md' },
    { file: 'docs/progress.md', section: 'Codebase Patterns' },
];

export function globalKnowledgeFiles(env = process.env) {
    const dir = env.SC_GLOBAL_KNOWLEDGE_DIR;
    if (typeof dir !== 'string' || !dir.trim()) return [];
    const file = path.resolve(dir, 'LEARNED_KNOWLEDGE.md');
    return fs.existsSync(file) ? [{ file, global: true }] : [];
}

export function tokenize(text) {
    return String(text)
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((t) => t.length > 1);
}

export function parseFrontmatter(raw) {
    const meta = {};
    if (!raw.startsWith('---')) return { meta, body: raw };
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return { meta, body: raw };
    const block = raw.slice(3, end);
    for (const line of block.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
        if (m) meta[m[1]] = m[2].trim();
    }
    return { meta, body: raw.slice(end + 4) };
}

function listMarkdownFiles(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
        }
    }
    return out.sort();
}

export function splitEntries(body) {
    const clean = String(body).replace(/<!--[\s\S]*?-->/g, '');
    const marks = [];
    const re = /^## +(.+)$/gm;
    let m;
    while ((m = re.exec(clean)) !== null) {
        marks.push({ heading: m[1].trim(), at: m.index });
    }
    return marks.map((mark, i) => ({
        heading: mark.heading,
        text: clean
            .slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : clean.length)
            .trim(),
    }));
}

export function buildIndex(files, readFile = (f) => fs.readFileSync(f, 'utf8')) {
    const docs = [];
    const addDoc = (file, title, meta, body, extra = {}) => {
        const searchable = [
            title,
            Object.values(meta).join(' '),
            body,
        ].join('\n');
        docs.push({ file, title, meta, body, tokens: tokenize(searchable), ...extra });
    };
    for (const spec of files) {
        const file = typeof spec === 'string' ? spec : spec.file;
        let raw;
        try {
            raw = readFile(file);
        } catch {
            continue;
        }
        const { meta, body } = parseFrontmatter(raw);
        const global = typeof spec === 'object' && spec.global === true;
        if (typeof spec === 'object' && spec.split) {
            let entries = splitEntries(body);
            if (spec.section) entries = entries.filter((e) => e.heading === spec.section);
            if (entries.length > 0 || spec.section) {
                for (const entry of entries) {
                    const idMatch = entry.heading.match(ENTRY_ID_RE);
                    addDoc(file, entry.heading, meta, entry.text, {
                        entryHeading: entry.heading,
                        entryId: idMatch ? idMatch[1] : null,
                        global,
                    });
                }
                continue;
            }
        }
        const title =
            (body.match(/^#\s+(.+)$/m) || [])[1] || path.basename(file, '.md');
        addDoc(file, title, meta, body, { global });
    }
    const df = new Map();
    for (const doc of docs) {
        for (const term of new Set(doc.tokens)) {
            df.set(term, (df.get(term) || 0) + 1);
        }
    }
    const avgLen =
        docs.reduce((sum, d) => sum + d.tokens.length, 0) / (docs.length || 1);
    return { docs, df, avgLen };
}

export function scoreQuery(index, query) {
    const terms = tokenize(query);
    const n = index.docs.length;
    const results = [];
    for (const doc of index.docs) {
        const tf = new Map();
        for (const t of doc.tokens) tf.set(t, (tf.get(t) || 0) + 1);
        let score = 0;
        for (const term of terms) {
            const f = tf.get(term) || 0;
            if (f === 0) continue;
            const dfT = index.df.get(term) || 0;
            const idf = Math.log(1 + (n - dfT + 0.5) / (dfT + 0.5));
            const denom =
                f + BM25_K1 * (1 - BM25_B + (BM25_B * doc.tokens.length) / index.avgLen);
            score += idf * ((f * (BM25_K1 + 1)) / denom);
        }
        if (score > 0) results.push({ doc, score });
    }
    results.sort((a, b) => b.score - a.score || a.doc.file.localeCompare(b.doc.file));
    return results;
}

export function snippetFor(doc, query) {
    const terms = tokenize(query);
    const lower = doc.body.toLowerCase();
    let at = -1;
    for (const term of terms) {
        const idx = lower.indexOf(term);
        if (idx !== -1 && (at === -1 || idx < at)) at = idx;
    }
    const start = Math.max(0, at === -1 ? 0 : at - 60);
    return doc.body
        .slice(start, start + SNIPPET_CHARS)
        .replace(/\s+/g, ' ')
        .trim();
}

export function search({ root, dirs = [], files = [], query, limit = MAX_RESULTS }) {
    const fromDirs = dirs.flatMap((d) => listMarkdownFiles(path.resolve(root, d)));
    const fromFiles = files.map((spec) => {
        const f = typeof spec === 'string' ? { file: spec } : spec;
        return { ...f, file: path.resolve(root, f.file), split: true };
    });
    const index = buildIndex([...fromDirs, ...fromFiles]);
    return scoreQuery(index, query)
        .slice(0, limit)
        .map(({ doc, score }) => {
            const rel = doc.global
                ? `global:${path.basename(doc.file)}`
                : path.relative(root, doc.file);
            return {
                id: doc.entryId || (doc.entryHeading ? `${rel}#${doc.entryHeading}` : rel),
                path: rel,
                title: doc.title,
                category: doc.global
                    ? 'global'
                    : doc.meta.category || path.basename(path.dirname(doc.file)),
                score: Number(score.toFixed(4)),
                snippet: snippetFor(doc, query),
            };
        });
}

function main(argv) {
    const args = argv.slice(2);
    const dirs = [];
    const files = [];
    let query = null;
    let limit = MAX_RESULTS;
    let json = false;
    let root = process.cwd();
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--dir') dirs.push(args[++i]);
        else if (a === '--file') files.push(args[++i]);
        else if (a === '--limit') limit = Math.max(1, Number(args[++i]) || MAX_RESULTS);
        else if (a === '--json') json = true;
        else if (a === '--root') root = args[++i];
        else if (query === null) query = a;
    }
    if (!query) {
        process.stderr.write(
            'usage: knowledge-search.mjs "<query>" [--dir <dir>]... [--file <file>]... [--limit N] [--json] [--root <path>]\n'
        );
        return 2;
    }
    if (dirs.length === 0 && files.length === 0) {
        dirs.push(...DEFAULT_DIRS);
        files.push(...DEFAULT_FILES, ...globalKnowledgeFiles());
    }
    const hits = search({ root, dirs, files, query, limit });
    if (json) {
        process.stdout.write(`${JSON.stringify({ query, results: hits }, null, 2)}\n`);
    } else if (hits.length === 0) {
        process.stdout.write('No knowledge-store match. Safe to write a new record.\n');
    } else {
        for (const hit of hits) {
            const where = hit.id.startsWith(hit.path) ? hit.id : `${hit.path}#${hit.id}`;
            process.stdout.write(
                `${hit.score.toFixed(2)}  ${where}\n    ${hit.title} [${hit.category}]\n    ${hit.snippet}\n`
            );
        }
    }
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
