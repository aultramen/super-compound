#!/usr/bin/env node
/**
 * validate-doc-claims - mechanical grounding validator for knowledge records.
 *
 * Checks a markdown document for claims a repository can verify cheaply:
 *   - backtick-cited repository paths exist
 *   - referenced commit SHAs exist in this git repository
 *   - relative markdown links resolve
 *   - leftover drafting scaffold (TODO/FIXME/TBD/<placeholder>)
 *   - skeleton-boilerplate residue in produced docs under docs/ or .scratch/
 *     (skeleton scope prose, unfilled tokens such as '<task or none>')
 *
 * Reports findings only; it never edits the document. Findings are
 * adjudicated by the author, not auto-fixed.
 *
 * Usage: node .agent/tools/validate-doc-claims.mjs <doc.md> [--root <repo-root>] [--json]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PATH_RE = /`((?:\.?\.?\/)?[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@*-]+)+\/?)`/g;
const SHA_RE = /\b([0-9a-f]{7,40})\b/g;
const LINK_RE = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g;
const SCAFFOLD_RE = /\b(TODO|FIXME|TBD)\b|<placeholder>|\bXXX\b/g;
// Skeleton residue is only a defect in produced docs (docs/, .scratch/);
// the skeletons and skills that teach these tokens must not self-flag.
const BOILERPLATE_RE = /Implement referenced FSD goal only|<[a-z][a-z /-]{0,40} or none>/g;

function isExternal(target) {
    return /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:');
}

export function validateDoc({ docPath, root, gitCheck }) {
    const findings = [];
    const raw = fs.readFileSync(docPath, 'utf8');
    const docDir = path.dirname(docPath);

    for (const match of raw.matchAll(PATH_RE)) {
        const cited = match[1].replace(/\*/g, '');
        if (cited.includes('<') || cited.endsWith('.')) continue;
        const candidates = [
            path.resolve(root, cited),
            path.resolve(docDir, cited),
        ];
        if (!candidates.some((c) => fs.existsSync(c.replace(/\/$/, '')))) {
            findings.push({ kind: 'missing-path', value: match[1] });
        }
    }

    for (const match of raw.matchAll(LINK_RE)) {
        const target = match[1];
        if (isExternal(target) || target.startsWith('/')) continue;
        const resolved = path.resolve(docDir, target);
        if (!fs.existsSync(resolved)) {
            findings.push({ kind: 'broken-link', value: target });
        }
    }

    if (gitCheck) {
        const seen = new Set();
        for (const match of raw.matchAll(SHA_RE)) {
            const sha = match[1];
            if (sha.length < 7 || seen.has(sha) || /^[0-9]+$/.test(sha)) continue;
            seen.add(sha);
            try {
                execFileSync('git', ['-C', root, 'cat-file', '-e', `${sha}^{commit}`], {
                    stdio: 'ignore',
                });
            } catch {
                findings.push({ kind: 'unknown-commit', value: sha });
            }
        }
    }

    for (const match of raw.matchAll(SCAFFOLD_RE)) {
        findings.push({ kind: 'drafting-scaffold', value: match[0] });
    }

    const rel = path.relative(root, docPath).split(path.sep).join('/');
    if (rel.startsWith('docs/') || rel.startsWith('.scratch/')) {
        for (const match of raw.matchAll(BOILERPLATE_RE)) {
            findings.push({ kind: 'skeleton-boilerplate', value: match[0] });
        }
    }

    return findings;
}

function main(argv) {
    const args = argv.slice(2);
    let docPath = null;
    let root = process.cwd();
    let json = false;
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--root') root = args[++i];
        else if (a === '--json') json = true;
        else if (docPath === null) docPath = a;
    }
    if (!docPath || !fs.existsSync(docPath)) {
        process.stderr.write('usage: validate-doc-claims.mjs <doc.md> [--root <repo-root>] [--json]\n');
        return 2;
    }
    const gitCheck = fs.existsSync(path.join(root, '.git'));
    const findings = validateDoc({ docPath: path.resolve(docPath), root, gitCheck });
    if (json) {
        process.stdout.write(`${JSON.stringify({ doc: docPath, findings }, null, 2)}\n`);
    } else if (findings.length === 0) {
        process.stdout.write('All mechanical claims verified.\n');
    } else {
        for (const f of findings) {
            process.stdout.write(`${f.kind}: ${f.value}\n`);
        }
        process.stdout.write(`${findings.length} finding(s). Adjudicate each; do not auto-fix.\n`);
    }
    return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
