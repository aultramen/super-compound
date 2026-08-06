#!/usr/bin/env node
/**
 * knowledge-search - BM25 retrieval over the durable knowledge store.
 *
 * Ranks docs/solutions/** (and optionally docs/learnings/**) against a query
 * and emits at most MAX_RESULTS compact hits: path, title, score, snippet.
 * Ranking sees full text (frontmatter + headings + body); output stays
 * bounded so the knowledge base itself never enters agent context.
 *
 * Usage:
 *   node .agent/tools/knowledge-search.mjs "<query>" [--dir docs/solutions]
 *        [--limit 3] [--json] [--root <repo-root>]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const MAX_RESULTS = 3;
const SNIPPET_CHARS = 240;
const BM25_K1 = 1.5;
const BM25_B = 0.75;

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

export function buildIndex(files, readFile = (f) => fs.readFileSync(f, 'utf8')) {
    const docs = [];
    for (const file of files) {
        let raw;
        try {
            raw = readFile(file);
        } catch {
            continue;
        }
        const { meta, body } = parseFrontmatter(raw);
        const title =
            (body.match(/^#\s+(.+)$/m) || [])[1] || path.basename(file, '.md');
        const searchable = [
            title,
            Object.values(meta).join(' '),
            body,
        ].join('\n');
        docs.push({ file, title, meta, body, tokens: tokenize(searchable) });
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

export function search({ root, dirs, query, limit = MAX_RESULTS }) {
    const files = dirs.flatMap((d) => listMarkdownFiles(path.resolve(root, d)));
    const index = buildIndex(files);
    return scoreQuery(index, query)
        .slice(0, limit)
        .map(({ doc, score }) => ({
            path: path.relative(root, doc.file),
            title: doc.title,
            category: doc.meta.category || path.basename(path.dirname(doc.file)),
            score: Number(score.toFixed(4)),
            snippet: snippetFor(doc, query),
        }));
}

function main(argv) {
    const args = argv.slice(2);
    const dirs = [];
    let query = null;
    let limit = MAX_RESULTS;
    let json = false;
    let root = process.cwd();
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--dir') dirs.push(args[++i]);
        else if (a === '--limit') limit = Math.max(1, Number(args[++i]) || MAX_RESULTS);
        else if (a === '--json') json = true;
        else if (a === '--root') root = args[++i];
        else if (query === null) query = a;
    }
    if (!query) {
        process.stderr.write(
            'usage: knowledge-search.mjs "<query>" [--dir <dir>]... [--limit N] [--json] [--root <path>]\n'
        );
        return 2;
    }
    if (dirs.length === 0) dirs.push('docs/solutions', 'docs/learnings');
    const hits = search({ root, dirs, query, limit });
    if (json) {
        process.stdout.write(`${JSON.stringify({ query, results: hits }, null, 2)}\n`);
    } else if (hits.length === 0) {
        process.stdout.write('No knowledge-store match. Safe to write a new record.\n');
    } else {
        for (const hit of hits) {
            process.stdout.write(
                `${hit.score.toFixed(2)}  ${hit.path}\n    ${hit.title} [${hit.category}]\n    ${hit.snippet}\n`
            );
        }
    }
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
