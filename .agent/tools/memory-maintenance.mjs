#!/usr/bin/env node
/**
 * memory-maintenance - deterministic hygiene checks for durable memory files.
 *
 * Subcommands:
 *   check              Validate docs/ERROR_LOG.md and docs/LEARNED_KNOWLEDGE.md:
 *                      ID grammar (ERR-/LRN-YYYY-MM-DD-NNN), required fields,
 *                      Quick Reference rows matching entries, and caps
 *                      (50 entries/50 KB errors, 30 entries/30 KB learnings).
 *                      Exit 1 with findings on violation; "ok" otherwise.
 *                      Missing files are fine (fresh install).
 *   report             Cluster categories and IF-THEN rules across both files
 *                      plus docs/solutions/** frontmatter; emit bounded
 *                      /sc-evolve promotion candidates (3+ recurrences at
 *                      observed/confirmed confidence, or a PATTERN flag) with
 *                      entry-ID evidence. Also emit a freshness block: the
 *                      docs/STATE.md "Last updated" date and the newest
 *                      docs/progress.md entry date compared with the newest
 *                      commit date; STALE_STATE / STALE_PROGRESS flag durable
 *                      state that a later commit left behind (/sc-status then
 *                      routes to /sc-pause first). Deterministic; no model call.
 *   archive --dry-run  Print proposed overflow moves to docs/archive/ per the
 *                      consolidate-then-archive rule. There is no write mode:
 *                      applying archives stays a human-approved workflow
 *                      action, so bare "archive" is rejected.
 *
 * Usage:
 *   node .agent/tools/memory-maintenance.mjs <check|report|archive --dry-run>
 *        [--json] [--root <repo-root>]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from './knowledge-search.mjs';

const ISO_DATE_RE = /(\d{4}-\d{2}-\d{2})/;

const PROMOTION_THRESHOLD = 3;
const MAX_CANDIDATES = 10;
const MAX_EVIDENCE = 5;
const COUNTED_CONFIDENCE = new Set(['observed', 'confirmed']);
const CONFIDENCE_LADDER = { inferred: 0, observed: 1, confirmed: 2 };

export const FILE_SPECS = [
    {
        relPath: 'docs/ERROR_LOG.md',
        idPrefix: 'ERR',
        requiredFields: ['Symptom', 'Root cause', 'Correct approach', 'Prevention'],
        maxEntries: 50,
        maxBytes: 50 * 1024,
        archivePath: 'docs/archive/ERROR_ARCHIVE.md',
    },
    {
        relPath: 'docs/LEARNED_KNOWLEDGE.md',
        idPrefix: 'LRN',
        requiredFields: ['Learning', 'Confidence', 'Applies to'],
        maxEntries: 30,
        maxBytes: 30 * 1024,
        archivePath: 'docs/archive/KNOWLEDGE_ARCHIVE.md',
    },
];

export function stripComments(raw) {
    return String(raw).replace(/<!--[\s\S]*?-->/g, '');
}

export function normalizeKey(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function idPattern(idPrefix) {
    return new RegExp(`^${idPrefix}-\\d{4}-\\d{2}-\\d{2}-\\d{3}$`);
}

export function parseEntries(raw, idPrefix) {
    const lines = stripComments(raw).split('\n');
    const entries = [];
    let current = null;
    for (const line of lines) {
        const heading = line.match(/^##\s+(\S+)(?:\s+-\s+(.*))?$/);
        if (heading && heading[1].startsWith(`${idPrefix}-`)) {
            current = {
                id: heading[1],
                topic: (heading[2] || '').trim(),
                validId: idPattern(idPrefix).test(heading[1]),
                fields: {},
                lines: [line],
            };
            entries.push(current);
            continue;
        }
        if (/^##\s/.test(line)) {
            current = null;
            continue;
        }
        if (current) {
            current.lines.push(line);
            const field = line.match(/^- ([A-Za-z][A-Za-z ]*?):\s*(.*)$/);
            if (field) current.fields[field[1]] = field[2].trim();
        }
    }
    return entries;
}

export function parseQuickReference(raw, idPrefix) {
    const parts = stripComments(raw).split(/^## Quick Reference\s*$/m);
    if (parts.length < 2) return { present: false, ids: [] };
    const ids = [];
    for (const line of parts[1].split('\n')) {
        if (/^##\s/.test(line)) break;
        if (!line.startsWith('|')) continue;
        const firstCell = line.split('|')[1];
        if (!firstCell) continue;
        const id = firstCell.trim();
        if (id.startsWith(`${idPrefix}-`)) ids.push(id);
    }
    return { present: true, ids };
}

export function checkFile(spec, raw) {
    const findings = [];
    const add = (message) => findings.push({ file: spec.relPath, message });
    const entries = parseEntries(raw, spec.idPrefix);
    const seen = new Set();
    for (const entry of entries) {
        if (!entry.validId) {
            add(`invalid entry ID "${entry.id}" (expected ${spec.idPrefix}-YYYY-MM-DD-NNN)`);
        }
        if (seen.has(entry.id)) add(`duplicate entry ID ${entry.id}`);
        seen.add(entry.id);
        for (const field of spec.requiredFields) {
            if (!entry.fields[field]) add(`${entry.id}: missing required field "${field}"`);
        }
        if (spec.idPrefix === 'LRN' && entry.fields.Confidence) {
            const value = entry.fields.Confidence.toLowerCase();
            if (!(value in CONFIDENCE_LADDER)) {
                add(`${entry.id}: invalid Confidence "${entry.fields.Confidence}" (confirmed | observed | inferred)`);
            }
        }
    }
    const quickRef = parseQuickReference(raw, spec.idPrefix);
    if (!quickRef.present) {
        add('missing "## Quick Reference" section');
    } else {
        const rowIds = new Set(quickRef.ids);
        for (const entry of entries) {
            if (entry.validId && !rowIds.has(entry.id)) {
                add(`${entry.id}: no Quick Reference row`);
            }
        }
        for (const id of quickRef.ids) {
            if (!seen.has(id)) add(`Quick Reference row ${id} has no matching entry`);
        }
    }
    if (entries.length > spec.maxEntries) {
        add(`entry cap exceeded: ${entries.length} entries > ${spec.maxEntries}`);
    }
    const bytes = Buffer.byteLength(raw, 'utf8');
    if (bytes > spec.maxBytes) {
        add(`size cap exceeded: ${bytes} bytes > ${spec.maxBytes}`);
    }
    return findings;
}

function readIfPresent(root, relPath) {
    try {
        return fs.readFileSync(path.resolve(root, relPath), 'utf8');
    } catch {
        return null;
    }
}

export function runCheck({ root }) {
    const findings = [];
    for (const spec of FILE_SPECS) {
        const raw = readIfPresent(root, spec.relPath);
        if (raw === null) continue;
        findings.push(...checkFile(spec, raw));
    }
    return { ok: findings.length === 0, findings };
}

function listMarkdownFiles(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop();
        let dirEntries;
        try {
            dirEntries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of dirEntries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
        }
    }
    return out.sort();
}

export function collectObservations({ root }) {
    const observations = [];
    const totals = { errors: 0, learnings: 0, solutions: 0 };
    for (const spec of FILE_SPECS) {
        const raw = readIfPresent(root, spec.relPath);
        if (raw === null) continue;
        for (const entry of parseEntries(raw, spec.idPrefix)) {
            const isError = spec.idPrefix === 'ERR';
            totals[isError ? 'errors' : 'learnings'] += 1;
            const confidence = (entry.fields.Confidence || '').toLowerCase();
            observations.push({
                id: entry.id,
                category: entry.topic,
                rule: isError ? entry.fields.Prevention : entry.fields['Action rule'],
                counted: isError || COUNTED_CONFIDENCE.has(confidence),
                pattern: /\bPATTERN\b/.test(entry.lines.join('\n')),
            });
        }
    }
    const solutionsDir = path.resolve(root, 'docs/solutions');
    for (const file of listMarkdownFiles(solutionsDir)) {
        let raw;
        try {
            raw = fs.readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        const { meta } = parseFrontmatter(raw);
        totals.solutions += 1;
        if (!meta.category) continue;
        observations.push({
            id: path.relative(root, file),
            category: meta.category,
            rule: null,
            counted: true,
            pattern: false,
        });
    }
    return { observations, totals };
}

export function buildReport({ observations, totals }) {
    const clusters = new Map();
    const add = (kind, label, obs) => {
        const key = normalizeKey(label || '');
        if (!key) return;
        const mapKey = `${kind}:${key}`;
        if (!clusters.has(mapKey)) {
            clusters.set(mapKey, { kind, key, countedIds: [], pattern: false });
        }
        const cluster = clusters.get(mapKey);
        if (obs.counted) cluster.countedIds.push(obs.id);
        if (obs.pattern) cluster.pattern = true;
    };
    for (const obs of observations) {
        add('category', obs.category, obs);
        if (obs.rule) add('rule', obs.rule, obs);
    }
    const candidates = [];
    for (const cluster of clusters.values()) {
        const count = cluster.countedIds.length;
        if (count < PROMOTION_THRESHOLD && !cluster.pattern) continue;
        candidates.push({
            kind: cluster.kind,
            key: cluster.key,
            count,
            reason: cluster.pattern
                ? 'PATTERN flag'
                : `recurs ${count}x at observed/confirmed`,
            evidence: cluster.countedIds.slice(0, MAX_EVIDENCE),
            evidenceTotal: count,
        });
    }
    candidates.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    const truncated = candidates.length > MAX_CANDIDATES;
    return { totals, candidates: candidates.slice(0, MAX_CANDIDATES), truncated };
}

export function latestCommitDate(root) {
    try {
        const out = execFileSync('git', ['-C', root, 'log', '-1', '--format=%cI'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        const match = String(out).match(ISO_DATE_RE);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

export function stateLastUpdated(raw) {
    const match = String(raw).match(/^Last updated:\s*(\d{4}-\d{2}-\d{2})/m);
    return match ? match[1] : null;
}

export function progressLatestEntry(raw) {
    let latest = null;
    for (const match of stripComments(raw).matchAll(/^##\s+(\d{4}-\d{2}-\d{2})/gm)) {
        if (latest === null || match[1] > latest) latest = match[1];
    }
    return latest;
}

/**
 * Date-only comparison (YYYY-MM-DD lexical order) so time zones cannot flip a
 * verdict. A missing file, missing date, or unavailable Git history yields no
 * flag: absence of evidence is reported, never treated as staleness.
 */
export function computeFreshness({ root, commitDate = latestCommitDate(root) }) {
    const state = readIfPresent(root, 'docs/STATE.md');
    const progress = readIfPresent(root, 'docs/progress.md');
    const stateDate = state === null ? null : stateLastUpdated(state);
    const progressDate = progress === null ? null : progressLatestEntry(progress);
    const flags = [];
    if (commitDate) {
        if (stateDate && stateDate < commitDate) flags.push('STALE_STATE');
        if (progressDate && progressDate < commitDate) flags.push('STALE_PROGRESS');
    }
    return { commitDate, stateDate, progressDate, flags };
}

export function runReport({ root }) {
    return { ...buildReport(collectObservations({ root })), freshness: computeFreshness({ root }) };
}

function entryBytes(entry) {
    return Buffer.byteLength(entry.lines.join('\n'), 'utf8');
}

export function planArchive({ root }) {
    const plans = [];
    for (const spec of FILE_SPECS) {
        const raw = readIfPresent(root, spec.relPath);
        if (raw === null) {
            plans.push({ file: spec.relPath, overflow: false, note: 'missing file' });
            continue;
        }
        const entries = parseEntries(raw, spec.idPrefix);
        const bytes = Buffer.byteLength(raw, 'utf8');
        const reasons = [];
        if (entries.length > spec.maxEntries) {
            reasons.push(`${entries.length} entries > ${spec.maxEntries}`);
        }
        if (bytes > spec.maxBytes) reasons.push(`${bytes} bytes > ${spec.maxBytes}`);
        if (reasons.length === 0) {
            plans.push({ file: spec.relPath, overflow: false, note: 'within caps' });
            continue;
        }
        const consolidations = [];
        if (spec.idPrefix === 'ERR') {
            const byRootCause = new Map();
            for (const entry of entries) {
                const key = normalizeKey(entry.fields['Root cause'] || '');
                if (!key) continue;
                if (!byRootCause.has(key)) byRootCause.set(key, []);
                byRootCause.get(key).push(entry.id);
            }
            for (const [rootCause, ids] of byRootCause) {
                if (ids.length >= 2) consolidations.push({ rootCause, ids });
            }
        }
        let order;
        if (spec.idPrefix === 'ERR') {
            order = [...entries].sort((a, b) => a.id.localeCompare(b.id));
        } else {
            const rank = (entry) => {
                const superseded = /SUPERSEDED/.test(entry.lines.join('\n')) ? 0 : 1;
                const confidence =
                    CONFIDENCE_LADDER[(entry.fields.Confidence || '').toLowerCase()] ?? 0;
                return { superseded, confidence };
            };
            order = [...entries].sort((a, b) => {
                const ra = rank(a);
                const rb = rank(b);
                return (
                    ra.superseded - rb.superseded ||
                    ra.confidence - rb.confidence ||
                    a.id.localeCompare(b.id)
                );
            });
        }
        let count = entries.length;
        let size = bytes;
        const moves = [];
        for (const entry of order) {
            if (count <= spec.maxEntries && size <= spec.maxBytes) break;
            moves.push(entry.id);
            count -= 1;
            size -= entryBytes(entry);
        }
        plans.push({
            file: spec.relPath,
            overflow: true,
            reasons,
            archive: spec.archivePath,
            consolidations,
            moves,
        });
    }
    return plans;
}

function printCheck(result, json, io) {
    if (json) {
        io.out.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
    }
    if (result.ok) {
        io.out.write('ok\n');
        return;
    }
    io.out.write(`FAIL: ${result.findings.length} finding(s)\n`);
    for (const finding of result.findings) {
        io.out.write(`${finding.file}: ${finding.message}\n`);
    }
}

function printReport(report, json, io) {
    if (json) {
        io.out.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
    }
    const { totals } = report;
    io.out.write(
        `totals: errors=${totals.errors} learnings=${totals.learnings} solutions=${totals.solutions} candidates=${report.candidates.length}\n`
    );
    if (report.freshness) {
        const f = report.freshness;
        io.out.write(
            `freshness: commit=${f.commitDate ?? 'unknown'} state=${f.stateDate ?? 'none'} progress=${f.progressDate ?? 'none'} flags=${f.flags.length ? f.flags.join(',') : 'none'}\n`
        );
        if (f.flags.length > 0) {
            io.out.write('STALE durable state: run /sc-pause before any other route\n');
        }
    }
    if (report.candidates.length === 0) {
        io.out.write(
            'no promotion candidates (need 3+ recurrences at observed/confirmed, or a PATTERN flag)\n'
        );
        return;
    }
    for (const candidate of report.candidates) {
        io.out.write(
            `CANDIDATE ${candidate.kind} "${candidate.key}" count=${candidate.count} (${candidate.reason})\n`
        );
        const more = candidate.evidenceTotal - candidate.evidence.length;
        io.out.write(
            `    evidence: ${candidate.evidence.join(', ')}${more > 0 ? ` +${more} more` : ''}\n`
        );
    }
    if (report.truncated) io.out.write(`(truncated to ${MAX_CANDIDATES} candidates)\n`);
}

function printArchivePlan(plans, json, io) {
    if (json) {
        io.out.write(`${JSON.stringify({ dryRun: true, plans }, null, 2)}\n`);
        return;
    }
    io.out.write(
        'DRY RUN: proposals only; this tool never writes. Applying archives is a human-approved workflow action.\n'
    );
    for (const plan of plans) {
        if (!plan.overflow) {
            io.out.write(`${plan.file}: ${plan.note}; nothing to archive\n`);
            continue;
        }
        io.out.write(`${plan.file}: over caps (${plan.reasons.join('; ')})\n`);
        for (const consolidation of plan.consolidations) {
            io.out.write(
                `    consolidate duplicate root cause "${consolidation.rootCause}": ${consolidation.ids.join(', ')} -> one entry (Consolidated from: ${consolidation.ids.join(', ')})\n`
            );
        }
        io.out.write(`    move to ${plan.archive}: ${plan.moves.join(', ')}\n`);
    }
}

function main(argv, io = { out: process.stdout, err: process.stderr }) {
    const args = argv.slice(2);
    const command = args[0];
    let root = process.cwd();
    let json = false;
    let dryRun = false;
    for (let i = 1; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--root') root = args[++i];
        else if (a === '--json') json = true;
        else if (a === '--dry-run') dryRun = true;
    }
    if (command === 'check') {
        const result = runCheck({ root });
        printCheck(result, json, io);
        return result.ok ? 0 : 1;
    }
    if (command === 'report') {
        printReport(runReport({ root }), json, io);
        return 0;
    }
    if (command === 'archive') {
        if (!dryRun) {
            io.err.write(
                'archive requires --dry-run: this tool only proposes moves; applying archives is a human-approved workflow action (constitutional guardrail).\n'
            );
            return 2;
        }
        printArchivePlan(planArchive({ root }), json, io);
        return 0;
    }
    io.err.write(
        'usage: memory-maintenance.mjs <check|report|archive --dry-run> [--json] [--root <path>]\n'
    );
    return 2;
}

export { main };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv));
}
