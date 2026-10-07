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
 *                      observed/confirmed confidence, with independent origins and evidence) with
 *                      entry-ID evidence. Also emit a freshness block: the
 *                      docs/STATE.md "Last updated" date and the newest
 *                      docs/progress.md entry date compared with the newest
 *                      commit date; STALE_STATE / STALE_PROGRESS flag durable
 *                      state that a later commit left behind (owning route reconciles
 *                      without blocking independent ready goals). Deterministic; no model call.
 *   archive --dry-run  Print proposed overflow moves to docs/archive/ per the
 *                      consolidate-then-archive rule. This command has no write mode;
 *                      structured capture automatically applies lossless cap
 *                      retention, while bare "archive" is rejected.
 *
 * Usage:
 *   node .agent/tools/memory-maintenance.mjs <check|report|archive --dry-run>
 *        [--json] [--root <repo-root>]
 */

import { createHash } from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import { readBoundedFile, resolveRepositoryPath, writeFileAtomic } from './file-state.mjs';
import { execFileSync } from 'node:child_process';
import {canonicalLocator, isActiveAsset} from './active-assets.mjs';
import {validateConstraints, contextDigest} from './instruction-context.mjs';
import {assertPrivacySafeRuntimeValue} from './privacy-guard.mjs';
import {preventionReport} from './prevention-checks.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { readLedger, inspectLedgerEvidence } from './work-package.mjs';
import { parseFrontmatter, splitEntries } from './knowledge-search.mjs';

const ISO_DATE_RE = /(\d{4}-\d{2}-\d{2})/;

const PROMOTION_THRESHOLD = 3;
const MAX_CANDIDATES = 10;
const MAX_EVIDENCE = 5;
const COUNTED_CONFIDENCE = new Set(['observed', 'confirmed']);
const CONFIDENCE_LADDER = { inferred: 0, observed: 1, confirmed: 2 };
const FEEDBACK_PATH = 'docs/learnings/knowledge-feedback.md';
const FEEDBACK_ARCHIVE = 'docs/archive/KNOWLEDGE_FEEDBACK_ARCHIVE.md';

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
        return fs.readFileSync(path.resolve(root, relPath), 'utf8').replace(/\r\n?/g, '\n');
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw catalogFailure(root, path.resolve(root, relPath), error);
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

function catalogFailure(root, file, error) {
    let locator = canonicalLocator(path.relative(root, file)).slice(0, 300);
    try { assertPrivacySafeRuntimeValue(locator, 'catalog locator'); }
    catch { locator = '[redacted locator]'; }
    const code = /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'READ_FAILED';
    return new Error(`incomplete catalog: ${locator} (${code})`);
}

function readCatalogFile(root, file) {
    try { return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'); }
    catch (error) { throw catalogFailure(root, file, error); }
}

function listMarkdownFiles(dir, root) {
    const out = [];
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop();
        let dirEntries;
        try {
            dirEntries = fs.readdirSync(current, { withFileTypes: true });
        } catch (error) {
            if (current === dir && error.code === 'ENOENT') continue;
            throw catalogFailure(root, current, error);
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
                counted: COUNTED_CONFIDENCE.has(confidence) && !!entry.fields.Evidence && !/^(stale|superseded|contradicted)\b/i.test(entry.fields.Status || ''),
                origin: entry.fields.Origin || null,
                revision: entry.fields.Revision || null,
                evidence: entry.fields.Evidence || null,
                pattern: /\bPATTERN\b/.test(entry.lines.join('\n')),
            });
        }
    }
    const solutionsDir = path.resolve(root, 'docs/solutions');
    for (const file of listMarkdownFiles(solutionsDir, root).filter(file=>isActiveAsset(path.relative(root,file)))) {
        const raw = readCatalogFile(root, file);
        const { meta } = parseFrontmatter(raw);
        totals.solutions += 1;
        if (!meta.category) continue;
        observations.push({
            id: canonicalLocator(path.relative(root, file)),
            category: meta.category,
            rule: null,
            counted: COUNTED_CONFIDENCE.has(meta.confidence) && !!meta.evidence && !/^(stale|superseded|contradicted)\b/i.test(meta.status || ''),
            origin: meta.origin || null,
            revision: meta.revision || null,
            evidence: meta.evidence || null,
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
            clusters.set(mapKey, { kind, key, countedIds: [], origins: new Set(), sources: new Set(), pattern: false });
        }
        const cluster = clusters.get(mapKey);
        if (obs.counted && obs.origin && obs.evidence) cluster.sources.add(JSON.stringify([obs.origin, obs.revision || null, obs.evidence]));
        if (obs.counted && obs.origin && obs.evidence && !cluster.origins.has(obs.origin)) {
            cluster.origins.add(obs.origin);
            cluster.countedIds.push(obs.id);
        }
        if (obs.pattern) cluster.pattern = true;
    };
    for (const obs of observations) {
        add('category', obs.category, obs);
        if (obs.rule) add('rule', obs.rule, obs);
    }
    const candidates = [];
    for (const cluster of clusters.values()) {
        const count = cluster.countedIds.length;
        if (count < PROMOTION_THRESHOLD) continue;
        candidates.push({
            kind: cluster.kind,
            candidateKey: `${cluster.kind}:${cluster.key}`,
            evidenceDigest: digest([...cluster.sources].sort().join('\n')),
            key: cluster.key,
            count,
            reason: `${count} independent origins at observed/confirmed`,
            origins: [...cluster.origins].sort(),
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
    const report = buildReport(collectObservations({root}));
    const proposals = listMarkdownFiles(path.resolve(root, 'docs/proposals'), root).map(file => parseFrontmatter(readCatalogFile(root, file)).meta);
    report.candidates = report.candidates.filter(candidate => !proposals.some(p => ['DRAFT', 'APPLIED', 'DISMISSED', 'DEFERRED'].includes(p.status) && p.candidate_key === candidate.candidateKey && p.evidence_digest === candidate.evidenceDigest));
    return {...report,feedback:feedbackReport(root),prevention:preventionReport(root),freshness:computeFreshness({root})};
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

const memoryQueues = new Map();

// One orchestrator owns repository writes. This queue serializes its calls;
// it deliberately does not claim cross-process exclusion.
export async function withMemoryWriter(root, operation) {
    const key = path.resolve(root);
    const previous = memoryQueues.get(key) || Promise.resolve();
    const run = previous.catch(() => {}).then(operation);
    memoryQueues.set(key, run);
    try { return await run; }
    finally { if (memoryQueues.get(key) === run) memoryQueues.delete(key); }
}

function singleLine(value, label, max = 2000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\r\n\0]/.test(value)) {
        throw new Error(`${label} must be a bounded nonempty single line`);
    }
    return value.trim();
}

const digest = (value) => createHash('sha256').update(value).digest('hex');

async function evidenceFor(root, refs, limit = 10) {
    if (!Array.isArray(refs) || !refs.length || refs.length > limit) throw new Error(`evidence requires 1..${limit} repository locators`);
    return Promise.all(refs.map(async (ref) => {
        singleLine(ref, 'evidence locator', 300);
        const bytes = await readBoundedFile(root, ref, {maxBytes: 1024 * 1024});
        return {ref: canonicalLocator(path.relative(path.resolve(root), path.resolve(root, canonicalLocator(ref)))), digest: digest(bytes)};
    }));
}

async function readMemory(root, target) {
    const absolute = await resolveRepositoryPath(root, target);
    if (!fs.existsSync(absolute)) return '';
    return readBoundedFile(root, target, {encoding: 'utf8', maxBytes: 2 * 1024 * 1024});
}

function renderMemory(spec, raw, entries) {
    const summary = 'Records reusable observations, evidence, and corrective actions for this project. Lessons remain advisory until adopted by an authoritative decision.';
    const cell = (value) => String(value || '').replace(/\|/g, '&#124;');
    const rows = entries.map(e => `| ${e.id} | ${cell(e.topic)} | ${cell(e.fields.Prevention || e.fields['Action rule'] || e.fields.Learning)} |`);
    const quick = `## Quick Reference\n\n| ID | Topic | Action rule |\n| --- | --- | --- |\n${rows.join('\n')}\n\n`;
    if (!raw) return `# ${spec.idPrefix === 'ERR' ? 'Error Log' : 'Learned Knowledge'}\n\n## Summary\n\n${summary}\n\n${quick}${entries.map(e => e.lines.join('\n').trim()).join('\n\n')}\n`;
    const prior = parseEntries(raw, spec.idPrefix);
    let content = raw.replace(/^## Quick Reference[^\n]*(?:\n(?!## ).*)*/m, () => quick);
    for (const entry of entries) {
        const old = prior.find(e => e.id === entry.id);
        if (old && sameEntry(old, entry)) continue;
        const block = `${entry.lines.join('\n').trim()}\n\n`;
        if (old) content = content.replace(new RegExp(`^## ${entry.id}[^\n]*(?:\n(?!## ).*)*`, 'm'), () => block);
        else content = `${content.trimEnd()}\n\n${block}`;
    }
    return withSummary(content, summary);
}

function withSummary(raw, summary) {
    if (/^## (?:Summary|Executive Summary)\s*$/mi.test(raw)) return raw;
    const title = /^# [^\n]+\n/m;
    return title.test(raw) ? raw.replace(title, m => `${m}\n## Summary\n\n${summary}\n`) : `# Project Handoff\n\n## Summary\n\n${summary}\n\n${raw}`;
}

function sameEntry(a, b) {
    return a.topic === b.topic && JSON.stringify(Object.entries(a.fields).sort()) === JSON.stringify(Object.entries(b.fields).sort());
}

async function clearPendingCapture(root, input) {
    const target = `.scratch/pending-captures/${digest(`${input.kind}\n${input.origin}`)}.json`;
    const existing = await readMemory(root, target);
    if (existing && !isDeepStrictEqual(pendingInput(existing),input)) return;
    const checkpoint=parseCheckpoint(await readMemory(root,'.continue-here.md'));
    if (existing && (JSON.parse(existing).learningCloseout || checkpoint?.learningCloseouts?.some(record=>record.disposition==='pending' && record.captureInputRef===target))) return;
    await fs.promises.rm(await resolveRepositoryPath(root,target),{force:true});
}

function pendingInput(raw) {
    try { return JSON.parse(raw).input; }
    catch { throw new Error('invalid saved pending capture JSON'); }
}

async function savePendingCapture(root, input, error) {
    const pendingPath = `.scratch/pending-captures/${digest(`${input.kind}\n${input.origin}`)}.json`;
    try {
        assertPrivacySafeRuntimeValue(input, 'pending capture');
        const prior = await readMemory(root, pendingPath);
        if (prior && !isDeepStrictEqual(pendingInput(prior),input)) throw new Error('pending capture conflict; retain both original inputs for owner review');
        const saved={...(prior?JSON.parse(prior):{}),input,error:'capture write failed',nextAction:'retry capture'};
        assertPrivacySafeRuntimeValue(saved,'pending capture');
        await writeFileAtomic(root,pendingPath,`${JSON.stringify(saved,null,2)}\n`,{fallbackOnBusy:false});
    } catch (pendingError) {
        throw new AggregateError([error,pendingError],'capture and pending persistence failed; retain the original input and retry capture');
    }
}

function stripArchiveAnchors(text) {
    return text.replace(/^<a id="(?:ERR|LRN)-\d{4}-\d{2}-\d{2}-\d{3}"><\/a>\r?\n/gm, '');
}

function archiveWithAnchors(text) {
    return stripArchiveAnchors(text).replace(/^(## ((?:ERR|LRN)-\d{4}-\d{2}-\d{2}-\d{3})[^\n]*)\n/gm,
        (_, heading, id) => `${heading}\n<a id="${id}"></a>\n`);
}

function validateArchive(spec, raw) {
    if (raw && checkFile(spec,raw).some(f => !/^(entry|size) cap exceeded:/.test(f.message) && f.message !== 'missing "## Quick Reference" section')) {
        throw new Error('repair existing archive findings before capture');
    }
}

// Archive bytes before replacing active memory: interruption can duplicate records,
// but cannot lose them. Redirect anchors retain the original file#entry locators.
async function retainMemory({root, spec, content, protectedId, input, dryRun, writeOptions}) {
    try {
        const findings = checkFile(spec, content);
        if (findings.some(f => !/^(entry|size) cap exceeded:/.test(f.message))) throw new Error('capture violates memory format');
        let active = content;
        let archive = await readMemory(root, spec.archivePath);
        validateArchive(spec,archive);
        const archivedIds = new Set(parseEntries(archive, spec.idPrefix).map(e => e.id));
        const moved = [];
        const candidates = parseEntries(content, spec.idPrefix).filter(e => e.id !== protectedId)
            .sort((a,b) => Number(!/^superseded/i.test(a.fields.Status || '')) - Number(!/^superseded/i.test(b.fields.Status || '')) || a.id.localeCompare(b.id));
        for (const candidate of candidates) {
            if (!checkFile(spec, active).length) break;
            const pattern = new RegExp(`^## ${candidate.id}[^\\n]*(?:\\n(?!## ).*)*`, 'm');
            const block = active.match(pattern)?.[0];
            if (!block) throw new Error('archive source missing');
            const prior = parseEntries(archive, spec.idPrefix).find(e => e.id === candidate.id);
            if (prior && (!sameEntry(prior,candidate) || stripArchiveAnchors(archive.match(pattern)?.[0] || '').trim() !== stripArchiveAnchors(block).trim())) throw new Error('archive entry conflict');
            if (!archivedIds.has(candidate.id)) {
                archive = `${archive.trimEnd() || '# Archived Knowledge\n\n## Summary\n\nPreserves older project observations and their evidence for retrieval.'}\n\n${block.trim()}\n`;
                archivedIds.add(candidate.id);
            }
            active = active.replace(pattern, '');
            active = renderMemory(spec, active, parseEntries(active,spec.idPrefix));
            // Put redirects before entries so the parser never includes them in a record.
            const archiveLink = path.posix.relative(path.posix.dirname(spec.relPath), spec.archivePath);
            const redirect = `<a id="${candidate.id}"></a> [${candidate.id}](${archiveLink}#${candidate.id})\n`;
            const firstEntry = active.search(new RegExp(`^## ${spec.idPrefix}-`, 'm'));
            if (/^## Archived Locators$/m.test(active)) active=active.replace(/^## Archived Locators\n/m,()=>`## Archived Locators\n${redirect}`);
            else active = firstEntry < 0 ? `${active}\n## Archived Locators\n${redirect}` : `${active.slice(0,firstEntry)}## Archived Locators\n${redirect}\n${active.slice(firstEntry)}`;
            moved.push(candidate.id);
        }
        if (checkFile(spec,active).length) throw new Error('memory caps cannot retain required content and locators');
        if (!dryRun) {
            if (moved.length) await writeFileAtomic(root,spec.archivePath,archiveWithAnchors(archive),{...writeOptions,maxBytes:2*1024*1024,fallbackOnBusy:false});
            await writeFileAtomic(root,spec.relPath,active,{...writeOptions,fallbackOnBusy:false});
            await clearPendingCapture(root,input);
        }
        return moved;
    } catch (error) {
        if (!dryRun) {
            await savePendingCapture(root, input, error);
        }
        throw error;
    }
}

async function validateCaptureInput(root, input) {
        assertPrivacySafeRuntimeValue(input, 'knowledge capture');
        const kind = input.kind;
        if (!['LRN', 'ERR', 'solution'].includes(kind)) throw new Error('kind must be LRN, ERR, or solution');
        const origin = singleLine(input.origin, 'origin', 200);
        const revision = singleLine(input.revision, 'revision', 200);
        const topic = singleLine(input.topic, 'topic', 200);
        if (!COUNTED_CONFIDENCE.has(input.confidence) || input.outcome !== 'verified') throw new Error('capture requires observed/confirmed confidence and verified outcome');
        const evidence = await evidenceFor(root, input.evidence);
        const fields = input.fields;
        if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('fields must be an object');
        for (const [key, value] of Object.entries(fields)) {
            if (!/^[A-Za-z][A-Za-z ]*$/.test(key) || ['Origin', 'Revision', 'Evidence', 'Confidence', 'Outcome'].includes(key)) throw new Error('unsupported field');
            singleLine(value, key);
        }
        const spec = FILE_SPECS.find(s => s.idPrefix === kind);
        if (spec) for (const field of spec.requiredFields.filter(f => f !== 'Confidence')) singleLine(fields[field], field);
        if (kind === 'solution') {
            if (!['non-obvious-root-cause', 'recurring-workaround', 'significant-feature'].includes(input.worth)) throw new Error('full solution requires a worth reason');
            for (const field of ['Problem', 'Symptoms', 'Root cause', 'Solution', 'Prevention']) singleLine(fields[field], field);
            const category = singleLine(input.category, 'category', 80);
            if (!/^[a-z0-9-]+$/.test(category)) throw new Error('category must be a slug');
        }
        return {kind, origin, revision, topic, evidence, fields};
}

export async function captureMemory({root, input, dryRun = false, writeOptions = {}}) {
    return withMemoryWriter(root, async () => {
        const {kind, origin, revision, topic, evidence, fields} = await validateCaptureInput(root, input);
        const evidenceText = evidence.map(e => `${e.ref}@${e.digest}`).join(', ');
        if (kind === 'solution') {
            const category = input.category.trim();
            const sources = listMarkdownFiles(path.resolve(root, 'docs/solutions'), root).filter(file => parseFrontmatter(readCatalogFile(root, file)).meta.origin === origin);
            const prior = sources.find(file => !/^(stale|superseded|contradicted)\b/i.test(parseFrontmatter(readCatalogFile(root, file)).meta.status || ''));
            const target = prior ? canonicalLocator(path.relative(root, prior)) : `docs/solutions/${category}/${digest(origin).slice(0, 20)}.md`;
            const raw = await readMemory(root, target);
            const applicability = ['Project', 'Stack', 'Version', 'Applies to'].filter(key => fields[key]).map(key => `${key.toLowerCase().replace(/ /g, '_')}: ${fields[key]}\n`).join('');
            const content = `---\ncategory: ${category}\n${applicability}origin: ${origin}\nrevision: ${revision}\nconfidence: ${input.confidence}\nstatus: active\nevidence: ${evidenceText}\noutcome: verified\nworth: ${input.worth}\n---\n# ${topic}\n\n## Summary\n\n${fields.Problem}. Verified outcome: ${fields.Solution}.\n\n${Object.entries(fields).filter(([k])=>k!=='Summary').map(([k,v]) => `## ${k}\n${v}`).join('\n\n')}\n`;
            if (raw === content) {
                const copies = [];
                for (const source of sources) {
                    const relative = canonicalLocator(path.relative(root, source));
                    if (relative === target || await readMemory(root, relative) !== raw) continue;
                    const replacement = updateScalarMetadata(raw, {status: 'superseded', superseded_by: target});
                    if (!dryRun) await writeFileAtomic(root, relative, replacement, {...writeOptions, fallbackOnBusy: false});
                    copies.push(relative);
                }
                if (!dryRun) await clearPendingCapture(root,input);
                return {action: copies.length ? 'deduplicated' : 'unchanged', path: target, copies, dryRun};
            }
            if (raw && !input.expectedDigest) return {action: 'review_required', path: target, digest: digest(raw)};
            if (raw && input.expectedDigest !== digest(raw)) throw new Error('capture conflict: expectedDigest mismatch');
            if (!dryRun) {
                try { await writeFileAtomic(root, target, content, { ...writeOptions, fallbackOnBusy: false }); }
                catch (error) { await savePendingCapture(root,input,error); throw error; }
                await clearPendingCapture(root,input);
            }
            return {action: raw ? 'updated' : 'created', path: target, dryRun};
        }
        const spec = FILE_SPECS.find(s => s.idPrefix === kind);
        const raw = await readMemory(root, spec.relPath);
        if (raw && checkFile(spec, raw).some(f => !/^(entry|size) cap exceeded:/.test(f.message))) throw new Error('repair existing memory findings before capture');
        const entries = parseEntries(raw, kind);
        const archivedRaw = await readMemory(root, spec.archivePath);
        validateArchive(spec,archivedRaw);
        const archivedEntries = parseEntries(archivedRaw, kind);
        const archivedExisting = archivedEntries.find(e => e.fields.Origin === origin);
        const existing = entries.find(e => e.fields.Origin === origin) || archivedExisting;
        const date = new Date().toISOString().slice(0, 10);
        const next = Math.max(0, ...[...entries,...archivedEntries].filter(e => e.id.startsWith(`${kind}-${date}-`)).map(e => Number(e.id.slice(-3)))) + 1;
        if (next > 999 && !existing) throw new Error('daily memory ID capacity exceeded');
        const id = existing?.id || `${kind}-${date}-${String(next).padStart(3, '0')}`;
        const allFields = {...fields, ...(existing?.fields['Consolidated from'] ? {'Consolidated from': existing.fields['Consolidated from']} : {}), Confidence: input.confidence, Origin: origin, Revision: revision, Status: fields.Status || 'active', Evidence: evidenceText, Outcome: 'verified'};
        const lines = [`## ${id} - ${topic}`, ...Object.entries(allFields).map(([k,v]) => `- ${k}: ${v}`)];
        const entry = {id, topic, fields: allFields, lines, validId: true};
        if (existing && sameEntry(existing, entry)) {
            if (!entries.includes(existing)) {
                if (!dryRun) await clearPendingCapture(root,input);
                return {action:'unchanged',path:spec.archivePath,id};
            }
            const copies = entries.filter(e => e !== existing && sameEntry(e, existing));
            if (!copies.length) {
                if (checkFile(spec,raw).length) {
                    const archived=await retainMemory({root,spec,content:raw,protectedId:id,input,dryRun,writeOptions});
                    return {action:'archived',path:spec.relPath,id,archived,dryRun};
                }
                if (!dryRun) await clearPendingCapture(root,input);
                return {action: 'unchanged', path: spec.relPath, id};
            }
            const canonical = {...existing, fields: {...existing.fields, 'Consolidated from': [existing.fields['Consolidated from'], ...copies.map(e => e.id)].filter(Boolean).join(', ')}};
            const updated = entries.map(e => {
                const result = e === existing ? canonical : copies.includes(e) ? {...e, fields: {...e.fields, Status: 'superseded', 'Superseded by': `${spec.relPath}#${id}`}} : e;
                return result === e ? e : {...result, lines: [`## ${result.id} - ${result.topic}`, ...Object.entries(result.fields).map(([k,v]) => `- ${k}: ${v}`)]};
            });
            const content = renderMemory(spec, raw, updated);
            await retainMemory({root,spec,content,protectedId:id,input,dryRun,writeOptions});
            return {action: 'deduplicated', path: spec.relPath, id, copies: copies.map(e => e.id), dryRun};
        }
        const existingRaw = archivedExisting === existing && existing ? archivedRaw : raw;
        if (existing && !input.expectedDigest) return {action: 'review_required', path: archivedExisting === existing ? spec.archivePath : spec.relPath, id, digest: digest(existingRaw)};
        if (existing && input.expectedDigest !== digest(existingRaw)) throw new Error('capture conflict: expectedDigest mismatch');
        if (archivedExisting === existing && existing) {
            const content = renderMemory(spec,archivedRaw,archivedEntries.map(e=>e===existing?entry:e));
            if (!dryRun) {
                try { await writeFileAtomic(root,spec.archivePath,archiveWithAnchors(content),{...writeOptions,maxBytes:2*1024*1024,fallbackOnBusy:false}); }
                catch (error) { await savePendingCapture(root,input,error); throw error; }
                await clearPendingCapture(root,input);
            }
            return {action:'updated',path:spec.archivePath,id,dryRun};
        }
        const content = renderMemory(spec, raw, existing ? entries.map(e => e === existing ? entry : e) : [...entries, entry]);
        const archived = await retainMemory({root,spec,content,protectedId:id,input,dryRun,writeOptions});
        return {action: existing ? 'updated' : 'created', path: spec.relPath, id, archived, dryRun};
    });
}

function updateScalarMetadata(raw, updates) {
    // Update the existing parser's known scalar fields without reserializing
    // unknown YAML (arrays, block scalars, comments, and owner metadata).
    const {body} = parseFrontmatter(raw);
    const hasHeader = body !== raw;
    let header = hasHeader ? raw.slice(4, raw.indexOf('\n---', 3)) : '';
    for (const [key, value] of Object.entries(updates)) {
        const pattern = new RegExp(`^${key}:.*$`, 'gm');
        if (value === null) header = header.replace(pattern, '');
        else if (pattern.test(header)) header = header.replace(pattern, () => `${key}: ${value}`);
        else header = `${header.trimEnd()}\n${key}: ${value}`;
    }
    return `---\n${header.trim()}\n---${body.startsWith('\n') ? '' : '\n'}${body}`;
}

export async function refreshMemory({root, input, dryRun = false}) {
    return withMemoryWriter(root, async () => {
        assertPrivacySafeRuntimeValue(input, 'knowledge refresh');
        const target = canonicalLocator(singleLine(input.path, 'path', 300));
        if (!/^docs\/(solutions|learnings)\/.+\.md$/.test(target)) throw new Error('refresh targets solution/learning Markdown only');
        const raw = await readMemory(root, target);
        if (!raw) throw new Error('refresh target missing');
        if (!['active', 'stale', 'superseded', 'contradicted'].includes(input.status)) throw new Error('invalid refresh status');
        if (input.status==='active' && /^(?:status:|- Status:)\s*(stale|superseded|contradicted)\b/im.test(raw) && input.reviewed!==true) return {action:'review_required',path:target};
        const reason = singleLine(input.reason, 'reason');
        const evidence = await evidenceFor(root, input.evidence);
        if (input.replacement) await readBoundedFile(root, input.replacement);
        if (input.status === 'superseded' && !input.replacement) throw new Error('superseded requires replacement locator');
        if (input.content !== undefined) {
            if (input.reviewed !== true) return {action: 'review_required', path: target};
            if (input.expectedDigest !== digest(raw)) throw new Error('refresh conflict: expectedDigest mismatch');
            if (typeof input.content !== 'string' || !input.content.trim()) throw new Error('content required');
        }
        const contentSource = input.content ?? raw;
        const updates = {status: input.status, refresh_reason: reason, evidence: evidence.map(e => `${e.ref}@${e.digest}`).join(', '), superseded_by: input.replacement || null};
        const content = updateScalarMetadata(contentSource, updates);
        if (!dryRun && content !== raw) await writeFileAtomic(root, target, content, {fallbackOnBusy: false});
        return {action: content === raw ? 'unchanged' : 'updated', path: target, dryRun};
    });
}

export async function recordFeedback({root, input, dryRun = false, writeOptions = {}}) {
    return withMemoryWriter(root, async () => {
        assertPrivacySafeRuntimeValue(input, 'knowledge feedback');
        const origin = singleLine(input.origin, 'origin', 200);
        const knowledgeRef = canonicalLocator(singleLine(input.knowledgeRef, 'knowledgeRef', 300));
        const [file, anchor] = knowledgeRef.split('#');
        const knowledge = await readBoundedFile(root, file, {encoding: 'utf8',maxBytes:2*1024*1024});
        let snapshot=knowledge, knowledgeRevision=parseFrontmatter(knowledge).meta.revision || 'unknown';
        if (anchor) {
            let record=parseEntries(knowledge,anchor.split('-')[0]).find(entry=>entry.id===anchor);
            const spec=FILE_SPECS.find(value=>value.relPath===file);
            if (!record && spec && knowledge.includes(`<a id="${anchor}"></a>`)) record=parseEntries(await readMemory(root,spec.archivePath),spec.idPrefix).find(entry=>entry.id===anchor);
            if (record) {
                snapshot=JSON.stringify({id:record.id,topic:record.topic,fields:Object.entries(record.fields).sort()});
                knowledgeRevision=record.fields.Revision || 'unknown';
            } else {
                const section=splitEntries(knowledge).find(entry=>entry.heading===anchor || normalizeKey(entry.heading).replace(/ /g,'-')===anchor);
                if (!section) throw new Error('knowledge anchor missing');
                snapshot=section.text;
            }
        }
        const knowledgeDigest=digest(snapshot);
        singleLine(knowledgeRevision,'knowledge revision',200);
        assertPrivacySafeRuntimeValue(knowledgeRevision,'knowledge revision');
        if (!['used', 'rejected', 'irrelevant'].includes(input.disposition)) throw new Error('invalid feedback disposition');
        if (!['verified', 'failed', 'unknown'].includes(input.outcome)) throw new Error('invalid feedback outcome');
        const evidence = await evidenceFor(root, input.evidence);
        const target = FEEDBACK_PATH;
        const raw = await readMemory(root, target) || '# Knowledge Feedback\n\nUsage is not truth or independent recurrence evidence.\n';
        const evidenceText=evidence.map(e=>`${e.ref}@${e.digest}`).sort().join(', ');
        const id = digest(JSON.stringify([origin,knowledgeRef,knowledgeRevision,knowledgeDigest,input.disposition,input.outcome,evidenceText])).slice(0, 24);
        const block = `## feedback-${id}\n- Origin: ${origin}\n- Knowledge: ${knowledgeRef}\n- Knowledge revision: ${knowledgeRevision}\n- Knowledge digest: ${knowledgeDigest}\n- Disposition: ${input.disposition}\n- Outcome: ${input.outcome}\n- Evidence: ${evidenceText}\n`;
        const entries = splitFeedback(raw);
        const archiveRaw=await readMemory(root,FEEDBACK_ARCHIVE) || '# Archived Knowledge Feedback\n\n## Summary\n\nPreserves older usage observations without treating them as truth or independent recurrence evidence.\n';
        const archivedEntries=splitFeedback(archiveRaw);
        const existing = entries.find(e => e.startsWith(`## feedback-${id}\n`));
        const archived=archivedEntries.find(e=>e.startsWith(`## feedback-${id}\n`));
        if (existing || archived) {
            if ([existing,archived].filter(Boolean).some(value=>value.trim()!==block.trim())) return {action:'review_required',path:existing?target:FEEDBACK_ARCHIVE};
            return {action:'unchanged',path:existing?target:FEEDBACK_ARCHIVE};
        }
        const kept=[...entries,block], moved=[];
        let content=renderFeedback(raw,kept);
        while(kept.length>100 || Buffer.byteLength(content,'utf8')>256*1024) {
            if(kept.length===1)throw new Error('feedback record cannot fit active cap');
            moved.push(kept.shift());
            content=renderFeedback(raw,kept);
        }
        for(const value of moved) {
            const key=value.match(/^## feedback-([^\n]+)/)?.[1];
            const copy=archivedEntries.find(entry=>entry.startsWith(`## feedback-${key}\n`));
            if(copy && copy.trim()!==value.trim())throw new Error('feedback archive entry conflict');
            if(!copy)archivedEntries.push(value);
        }
        const archiveContent=renderFeedback(archiveRaw,archivedEntries);
        // ponytail: one 2 MiB archive; owner-managed rollover if capacity is reached.
        if(Buffer.byteLength(archiveContent,'utf8')>2*1024*1024)throw new Error('feedback archive cap exceeded; preserve input and arrange owner-managed rollover');
        if (!dryRun) {
            if(moved.length && archiveContent!==archiveRaw)await writeFileAtomic(root,FEEDBACK_ARCHIVE,archiveContent,{...writeOptions,maxBytes:2*1024*1024,fallbackOnBusy:false});
            await writeFileAtomic(root, target, content, {...writeOptions,maxBytes:256*1024,fallbackOnBusy:false});
        }
        return {action:'created',path:target,archived:moved.length,dryRun};
    });
}

function splitFeedback(raw) {
    return raw.match(/^## feedback-[\s\S]*?(?=^## feedback-|$(?![\s\S]))/gm) || [];
}

function renderFeedback(raw, entries) {
    return withSummary(`${raw.split(/^## feedback-/m)[0].trimEnd()}\n\n${entries.map(entry=>entry.trim()).join('\n\n')}\n`, 'Tracks application of project knowledge and its observed outcomes; usage does not establish truth or independent recurrence.');
}

function feedbackReport(root) {
    const rows=new Map(),groups=new Map();
    const outcomes={verified:0,failed:0,unknown:0},dispositions={used:0,rejected:0,irrelevant:0,unknown:0};
    let legacyUnbound=0,knowledgeRevisionUnknown=0;
    const legacyFeedbackRefs=[];
    for(const file of [FEEDBACK_PATH,FEEDBACK_ARCHIVE]) {
        const raw=readIfPresent(root,file);
        if(raw===null)continue;
        if(Buffer.byteLength(raw,'utf8')>2*1024*1024)throw new Error('feedback report file cap exceeded; inspect through owning maintenance');
        for(const block of splitFeedback(raw)) {
            const id=block.match(/^## (feedback-[^\n]+)/)?.[1];
            if(rows.has(id)) {
                if(rows.get(id)!==block.trim())throw new Error('feedback duplicate conflict; owner review required');
                continue;
            }
            rows.set(id,block.trim());
            const fields=Object.fromEntries([...block.matchAll(/^- ([A-Za-z][A-Za-z ]*):\s*(.*)$/gm)].map(match=>[match[1],match[2].trim()]));
            const outcome=['verified','failed','unknown'].includes(fields.Outcome)?fields.Outcome:'unknown';
            const disposition=['used','rejected','irrelevant'].includes(fields.Disposition)?fields.Disposition:'unknown';
            outcomes[outcome]++; dispositions[disposition]++;
            const revision=fields['Knowledge revision'];
            const recordDigest=fields['Knowledge digest'];
            const feedbackRef=`${file}#${id}`;
            if(!fields.Knowledge || !revision || !/^[a-f0-9]{64}$/.test(recordDigest || '')) {
                legacyUnbound++;
                if(outcome==='failed' || disposition==='rejected') {
                    legacyFeedbackRefs.unshift(feedbackRef);
                    if(legacyFeedbackRefs.length>5)legacyFeedbackRefs.pop();
                } else if(legacyFeedbackRefs.length<5)legacyFeedbackRefs.push(feedbackRef);
                continue;
            }
            if(revision==='unknown')knowledgeRevisionUnknown++;
            const key=JSON.stringify([fields.Knowledge,revision,recordDigest]);
            if(!groups.has(key))groups.set(key,{knowledgeRef:fields.Knowledge,knowledgeRevision:revision,knowledgeDigest:recordDigest,revisionUnknown:revision==='unknown',records:0,outcomes:{verified:0,failed:0,unknown:0},dispositions:{used:0,rejected:0,irrelevant:0,unknown:0},reviewRequired:false,feedbackRefs:[]});
            const group=groups.get(key);
            group.records++; group.outcomes[outcome]++; group.dispositions[disposition]++;
            group.reviewRequired ||= outcome==='failed' || disposition==='rejected';
            if(outcome==='failed' || disposition==='rejected') {
                group.feedbackRefs.unshift(feedbackRef);
                if(group.feedbackRefs.length>5)group.feedbackRefs.pop();
            } else if(group.feedbackRefs.length<5)group.feedbackRefs.push(feedbackRef);
        }
    }
    const ranked=[...groups.values()].sort((a,b)=>Number(b.reviewRequired)-Number(a.reviewRequired) || (b.outcomes.failed+b.dispositions.rejected)-(a.outcomes.failed+a.dispositions.rejected) || a.knowledgeRef.localeCompare(b.knowledgeRef) || a.knowledgeRevision.localeCompare(b.knowledgeRevision) || a.knowledgeDigest.localeCompare(b.knowledgeDigest));
    const report={records:rows.size,outcomes,dispositions,legacyUnbound,knowledgeRevisionUnknown,legacyFeedbackRefs,groups:ranked.slice(0,10),groupsTotal:ranked.length,truncated:ranked.length>10};
    assertPrivacySafeRuntimeValue(report,'feedback report');
    return report;
}

const CHECKPOINT_RE = /<!-- sc-checkpoint:start -->[\s\S]*?<!-- sc-checkpoint:end -->/;

function parseCheckpoint(raw) {
    const match = raw.match(CHECKPOINT_RE);
    if (!match) return null;
    try { return JSON.parse(match[0].match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/)[1]); }
    catch { throw new Error('invalid managed checkpoint JSON'); }
}

function checkpointContent(raw, checkpoint) {
    const marker = `<!-- sc-checkpoint:start -->\n\`\`\`json\n${JSON.stringify(checkpoint, null, 2)}\n\`\`\`\n<!-- sc-checkpoint:end -->`;
    const updated = CHECKPOINT_RE.test(raw) ? raw.replace(CHECKPOINT_RE, () => marker) : `${raw.trimEnd()}\n\n${marker}\n`;
    return withSummary(updated, 'Preserves verified progress, blockers, authoritative references, and the next action for safe continuation.');
}

const closeoutKey = (record) => JSON.stringify([record.origin, record.revision, record.evidenceDigest]);
const PENDING_LEARNING_QUEUE='.scratch/pending-captures';
const MAX_QUEUED_CLOSEOUTS=100;

function mergeLearningCloseouts(hot, queued) {
    const records=new Map(hot.map(record=>[closeoutKey(record),record]));
    for (const record of queued) if (!records.has(closeoutKey(record))) records.set(closeoutKey(record),record);
    return [...records.values()];
}

async function queuedLearningCloseouts(root, goals) {
    const directory=await resolveRepositoryPath(root,PENDING_LEARNING_QUEUE);
    const records=[],issues=[];
    if (!fs.existsSync(directory)) return {records,issues};
    const files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile() && entry.name.endsWith('.json'));
    if (files.length>MAX_QUEUED_CLOSEOUTS) issues.push({ref:PENDING_LEARNING_QUEUE,error:'pending learning queue exceeds inspection bound; remaining jobs retained'});
    for (const entry of files.sort((a,b)=>a.name.localeCompare(b.name)).slice(0,MAX_QUEUED_CLOSEOUTS)) {
        const ref=`${PENDING_LEARNING_QUEUE}/${entry.name}`;
        try {
            const saved=JSON.parse(await readBoundedFile(root,ref,{encoding:'utf8',maxBytes:64*1024}));
            if (!saved.learningCloseout) continue;
            const [record]=await validateLearningCloseouts(root,[saved.learningCloseout],{stored:true,goals});
            if (record.disposition!=='pending' || record.captureInputRef!==ref) throw new Error('invalid queued learning identity');
            records.push(record);
        } catch { issues.push({ref,error:'pending learning metadata requires reconciliation'}); }
    }
    return {records,issues};
}

async function queueLearningCloseout(root, record, dryRun, remove=false) {
    const ref=record.captureInputRef;
    const raw=await readMemory(root,ref);
    if (!raw && remove) return;
    let saved;
    try { saved=JSON.parse(raw); } catch { throw new Error('pending learning job is invalid'); }
    assertPrivacySafeRuntimeValue(saved,'pending learning job');
    if (!saved.input || saved.input.origin!==record.origin || saved.input.revision!==record.revision) throw new Error('pending learning job identity mismatch');
    if (saved.learningCloseout && closeoutKey(saved.learningCloseout)!==closeoutKey(record)) throw new Error('pending learning metadata identity conflict');
    if (remove) delete saved.learningCloseout;
    else saved.learningCloseout=record;
    const content=`${JSON.stringify(saved,null,2)}\n`;
    if (!dryRun && content!==raw) await writeFileAtomic(root,ref,content,{maxBytes:64*1024,fallbackOnBusy:false});
}

async function validateKnowledgeRef(root, record) {
    const ref = canonicalLocator(singleLine(record.knowledgeRef, 'knowledgeRef', 300));
    const [file, anchor, extra] = ref.split('#');
    if (extra || !/^docs\/(?:solutions\/.+\.md|learnings\/.+\.md|(?:archive\/)?(?:ERROR_LOG|LEARNED_KNOWLEDGE|ERROR_ARCHIVE|KNOWLEDGE_ARCHIVE)\.md)$/.test(file)) throw new Error('invalid knowledge locator');
    const raw = await readBoundedFile(root, file, {encoding:'utf8',maxBytes:2*1024*1024});
    const knowledge = anchor ? parseEntries(raw, anchor.split('-')[0]).find(entry=>entry.id===anchor)?.fields : parseFrontmatter(raw).meta;
    if (!knowledge || (knowledge.Origin || knowledge.origin) !== record.origin || (knowledge.Revision || knowledge.revision) !== record.revision) throw new Error('knowledge identity mismatch');
    if (/^(stale|superseded|contradicted)\b/i.test(knowledge.Status || knowledge.status || '')) throw new Error('knowledge is inactive');
    const evidence = await evidenceFor(root, record.evidenceRefs);
    const expected = evidence.map(item=>`${item.ref}@${item.digest}`).sort();
    const actual = String(knowledge.Evidence || knowledge.evidence || '').split(', ').sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('knowledge evidence mismatch');
    return ref;
}

export async function validateLearningCloseouts(root, records, {stored = false, goals = new Map()} = {}) {
    if (!Array.isArray(records) || records.length > 20) throw new Error('learningCloseouts must be a bounded array (maximum 20)');
    const out = [], seen = new Set();
    for (const value of records) {
        const record = {origin:singleLine(value.origin,'learning origin',200),revision:singleLine(value.revision,'learning revision',200),disposition:value.disposition,reason:singleLine(value.reason,'learning reason',500)};
        if (!['captured','skipped-trivial','pending','legacy-unknown'].includes(record.disposition)) throw new Error('invalid learning disposition');
        if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length > 10 || (!value.evidenceRefs.length && !['skipped-trivial','legacy-unknown'].includes(record.disposition))) throw new Error('learning evidenceRefs must be bounded');
        record.evidenceRefs = value.evidenceRefs.map(ref=>canonicalLocator(singleLine(ref,'learning evidence locator',300)));
        assertPrivacySafeRuntimeValue(record, 'learning closeout');
        if (stored) {
            if (value.evidenceDigest !== null && !/^[a-f0-9]{64}$/.test(value.evidenceDigest || '')) throw new Error('invalid learning evidence digest');
            if (!!record.evidenceRefs.length !== (value.evidenceDigest !== null)) throw new Error('learning evidence digest inconsistent');
            record.evidenceDigest = value.evidenceDigest;
        } else {
            const evidence = record.evidenceRefs.length ? await evidenceFor(root, record.evidenceRefs) : [];
            record.evidenceDigest = evidence.length ? digest(JSON.stringify(evidence.sort((a,b)=>a.ref.localeCompare(b.ref)))) : null;
        }
        const key = closeoutKey(record);
        if (seen.has(key)) throw new Error('duplicate learning closeout identity');
        seen.add(key);
        if (value.knowledgeRef !== undefined) record.knowledgeRef = canonicalLocator(singleLine(value.knowledgeRef,'knowledgeRef',300));
        if (value.captureInputRef !== undefined) record.captureInputRef = canonicalLocator(singleLine(value.captureInputRef,'captureInputRef',300));
        if (value.completionRef !== undefined) {
            record.completionRef = singleLine(value.completionRef,'completionRef',500);
            const [ledger, goalId, receiptId, extra] = record.completionRef.split('#');
            assertPrivacySafeRuntimeValue(record.completionRef, 'completion locator');
            const goal = goals.get(`${ledger}#${goalId}`) || (await checkpointGoals(root,[ledger])).get(`${ledger}#${goalId}`);
            if (extra || !goal?.receipts[receiptId]) throw new Error('completionRef must identify an existing work-package receipt');
        }
        assertPrivacySafeRuntimeValue(record, 'learning closeout');
        if (!stored && record.disposition === 'captured') record.knowledgeRef = await validateKnowledgeRef(root, record);
        if (record.disposition === 'captured' && !record.knowledgeRef) throw new Error('captured learning requires knowledgeRef');
        if (record.disposition === 'pending') {
            if (!record.captureInputRef || !/^\.scratch\/pending-captures\/[A-Za-z0-9_-]+\.json$/.test(record.captureInputRef)) throw new Error('pending learning requires captureInputRef');
            if (!stored) {
                let pending;
                try { pending = JSON.parse(await readBoundedFile(root, record.captureInputRef, {encoding:'utf8',maxBytes:64*1024})); }
                catch { throw new Error('pending capture input unreadable or invalid'); }
                const validated = await validateCaptureInput(root, pending.input);
                const evidenceDigest = digest(JSON.stringify(validated.evidence.sort((a,b)=>a.ref.localeCompare(b.ref))));
                if (validated.origin !== record.origin || validated.revision !== record.revision || evidenceDigest !== record.evidenceDigest) throw new Error('pending capture identity or evidence mismatch');
            }
        }
        out.push(record);
    }
    return out;
}

async function checkpointGoals(root, ledgerRefs) {
    const goals = new Map();
    for (const ref of ledgerRefs) {
        const match = ref.match(/^\.scratch\/work-packages\/([A-Za-z0-9_-]+)\/ledger\.json$/);
        if (!match) throw new Error('Invalid work-package ledger locator');
        await readBoundedFile(root,ref,{maxBytes:2*1024*1024});
        const ledger = await readLedger(root,ref,match[1],{checkEvidence:false});
        const issues=new Map((await inspectLedgerEvidence(root,ledger)).map(issue=>[issue.goalId,issue.reason]));
        for (const [id,goal] of Object.entries(ledger.goals)) goals.set(`${ref}#${id}`,{ledger:ref,id,status:goal.status,constraints:goal.constraints||[],receipts:goal.receipts||{},evidenceIssue:issues.get(id)});
    }
    return goals;
}

function validateGoalScopes(scopes, goals) {
    if (scopes === undefined) return;
    if (!scopes || typeof scopes !== 'object' || Array.isArray(scopes) || Object.keys(scopes).some(k=>!['dependencies','blockers','contracts'].includes(k))) throw new Error('invalid goalScopes');
    for (const field of ['dependencies','blockers','contracts']) {
        const map=scopes[field];
        if (!map || typeof map !== 'object' || Array.isArray(map) || Object.keys(map).length>5000) throw new Error(`invalid ${field} scope`);
        for (const [key, refs] of Object.entries(map)) {
            singleLine(key,`${field} scope key`,500);
            if (!Array.isArray(refs) || refs.length>5000 || refs.some(ref=>typeof ref!=='string' || !goals.has(ref))) throw new Error(`unknown goal in ${field} scope`);
            if (field==='dependencies' && !goals.has(key)) throw new Error('unknown goal in dependency scope');
        }
    }
    if ([...goals.keys()].some(key=>!Object.hasOwn(scopes.dependencies,key))) throw new Error('incomplete dependency scope');
    const visited=new Set(), visiting=new Set();
    function visit(key) {
        if (visiting.has(key)) throw new Error('cycle in dependency scope');
        if (visited.has(key)) return;
        visiting.add(key);
        for(const dep of scopes.dependencies[key]) visit(dep);
        visiting.delete(key); visited.add(key);
    }
    for(const key of goals.keys()) visit(key);
}

export async function persistCheckpoint({root, input, dryRun = false, writeOptions = {}}) {
    return withMemoryWriter(root, async () => {
        const constraints = input.constraints === undefined ? undefined : validateConstraints(input.constraints);
        const nextAction = singleLine(input.nextAction, 'nextAction');
        for (const field of ['verifiedOutcomes', 'blockers', 'artifactRefs', 'contractRefs', 'ledgerRefs']) {
            if (!Array.isArray(input[field]) || input[field].length > 20) throw new Error(`${field} must be a bounded array`);
            input[field].forEach(value => singleLine(value, field, 500));
        }
        for (const ref of input.artifactRefs) await readBoundedFile(root, ref);
        for (const ref of input.ledgerRefs) await readBoundedFile(root, ref, {maxBytes: 2 * 1024 * 1024});
        const contracts = input.contractRefs.length ? await evidenceFor(root, input.contractRefs, 20) : [];
        const goals = input.goalScopes === undefined && input.learningCloseouts === undefined ? null : await checkpointGoals(root,input.ledgerRefs);
        if (goals) validateGoalScopes(input.goalScopes,goals);
        const checkpoint = {...(constraints ? {constraints, constraintDigest:contextDigest(constraints)} : {}), ...(input.goalScopes === undefined ? {} : {goalScopes:input.goalScopes}), nextAction, verifiedOutcomes: input.verifiedOutcomes, blockers: input.blockers, artifactRefs: input.artifactRefs, contracts, ledgerRefs: input.ledgerRefs};
        const raw = await readMemory(root, '.continue-here.md');
        const previous = parseCheckpoint(raw);
        const priorGoals=goals || await checkpointGoals(root,previous?.ledgerRefs || []);
        const queued=await queuedLearningCloseouts(root,priorGoals);
        const hot=previous?.learningCloseouts === undefined ? [] : await validateLearningCloseouts(root,previous.learningCloseouts,{stored:true,goals:priorGoals});
        // A durable captured checkpoint wins over leftover queue metadata after interruption.
        for (const record of queued.records) if (hot.some(value=>closeoutKey(value)===closeoutKey(record) && value.disposition==='captured')) await queueLearningCloseout(root,record,dryRun,true);
        const prior=mergeLearningCloseouts(hot,queued.records);
        const incoming = input.learningCloseouts === undefined ? [] : await validateLearningCloseouts(root,input.learningCloseouts,{goals:goals || new Map()});
        const identities = new Set(incoming.map(closeoutKey));
        const preserved = prior.filter(record=>record.disposition==='pending' && !identities.has(closeoutKey(record)));
        for (const record of prior.filter(record=>record.disposition==='pending')) {
            const replacement=incoming.find(value=>closeoutKey(value)===closeoutKey(record));
            if (replacement && !['pending','captured'].includes(replacement.disposition)) throw new Error('pending learning must be captured before closing');
        }
        const closeouts=[...incoming,...preserved],overflow=closeouts.slice(20);
        for (const record of overflow) await queueLearningCloseout(root,record,dryRun);
        if (input.learningCloseouts !== undefined || preserved.length) checkpoint.learningCloseouts=closeouts.slice(0,20);
        if (overflow.length || queued.issues.length) checkpoint.pendingLearningQueue=PENDING_LEARNING_QUEUE;
        const content = checkpointContent(raw,checkpoint);
        if (!dryRun && content !== raw) await writeFileAtomic(root, '.continue-here.md', content, {...writeOptions,fallbackOnBusy: false});
        // Keep queued recovery metadata until the captured closeout is durable.
        for (const record of queued.records) if (incoming.some(next=>closeoutKey(next)===closeoutKey(record) && next.disposition==='captured')) await queueLearningCloseout(root,record,dryRun,true);
        return {action: content === raw ? 'unchanged' : 'checkpointed', path: '.continue-here.md', dryRun};
    });
}

export async function restoreCheckpoint({root}) {
    const raw = await readMemory(root, '.continue-here.md');
    const match = raw.match(CHECKPOINT_RE);
    if (!match) return {checkpoint: null, drift: [], dispatchable: [], skippedVerified: [], status: 'missing_checkpoint'};
    const checkpoint = parseCheckpoint(raw);
    if (checkpoint.constraints !== undefined) {
        validateConstraints(checkpoint.constraints);
        if (checkpoint.constraintDigest !== contextDigest(checkpoint.constraints)) throw new Error('checkpoint constraint digest mismatch');
    } else if (checkpoint.constraintDigest !== undefined) throw new Error('checkpoint constraints missing');
    singleLine(checkpoint.nextAction, 'nextAction');
    for (const field of ['verifiedOutcomes', 'blockers', 'artifactRefs', 'ledgerRefs']) {
        if (!Array.isArray(checkpoint[field]) || checkpoint[field].length > 20) throw new Error(`${field} must be a bounded array`);
        checkpoint[field].forEach(value => singleLine(value, field, 500));
    }
    if (!Array.isArray(checkpoint.contracts) || checkpoint.contracts.length > 20) throw new Error('contracts must be a bounded array');
    for (const contract of checkpoint.contracts) {
        singleLine(contract.ref, 'contract ref', 300);
        if (!/^[a-f0-9]{64}$/.test(contract.digest)) throw new Error('invalid contract digest');
    }
    const drift = [];
    for (const contract of checkpoint.contracts) {
        try {
            const content = await readBoundedFile(root, contract.ref);
            if (digest(content) !== contract.digest) drift.push(contract.ref);
        } catch { drift.push(contract.ref); }
    }
    const goals=await checkpointGoals(root,checkpoint.ledgerRefs);
    if (checkpoint.pendingLearningQueue!==undefined && checkpoint.pendingLearningQueue!==PENDING_LEARNING_QUEUE) throw new Error('invalid pending learning queue');
    const queued=await queuedLearningCloseouts(root,goals);
    const hot=checkpoint.learningCloseouts === undefined ? [] : await validateLearningCloseouts(root,checkpoint.learningCloseouts,{stored:true,goals});
    const learningCloseouts=mergeLearningCloseouts(hot,queued.records);
    const pendingKnowledgeMaintenance = learningCloseouts.filter(record=>record.disposition==='pending');
    validateGoalScopes(checkpoint.goalScopes,goals);
    const scopes=checkpoint.goalScopes;
    const staleEvidence=[...goals.values()].filter(goal=>goal.evidenceIssue).map(goal=>({ledger:goal.ledger,goalId:goal.id,reason:goal.evidenceIssue}));
    const blockedKeys=new Set([...goals.entries()].filter(([,goal])=>goal.evidenceIssue).map(([key])=>key));
    let unknownScope=!scopes && staleEvidence.length>0;
    for (const [issues,field] of [[checkpoint.blockers,'blockers'],[drift,'contracts']]) {
        for(const issue of issues) {
            const affected=scopes && Object.hasOwn(scopes[field],issue) ? scopes[field][issue] : undefined;
            // An unmapped or empty affected set is unknown, never a claim of safety.
            if (!affected?.length) unknownScope=true;
            else affected.forEach(key=>blockedKeys.add(key));
        }
    }
    if (unknownScope) goals.forEach((_,key)=>blockedKeys.add(key));
    if (scopes) {
        let changed=true;
        while(changed) {
            changed=false;
            for(const [key,deps] of Object.entries(scopes.dependencies)) {
                if (!blockedKeys.has(key) && deps.some(dep=>blockedKeys.has(dep))) { blockedKeys.add(key); changed=true; }
            }
        }
    }
    const dispatchable=[],skippedVerified=[],blocked=[];
    for(const [key,goal] of goals) {
        const item={ledger:goal.ledger,id:goal.id};
        if(blockedKeys.has(key)) blocked.push(item);
        else if(goal.status==='verified') skippedVerified.push(item);
        else if(goal.status==='ready' && (!scopes || scopes.dependencies[key].every(dep=>goals.get(dep).status==='verified'))) dispatchable.push(item);
    }
    const activeConstraints=new Map((checkpoint.constraints||[]).map(c=>[c.id,c]));
    const pendingCompletions=[];
    for(const goal of goals.values()) {
        for(const c of goal.constraints) {
            if(activeConstraints.has(c.id)&&JSON.stringify(activeConstraints.get(c.id))!==JSON.stringify(c))throw new Error('conflicting instruction provenance');
            activeConstraints.set(c.id,c);
        }
        for(const [receiptId,receipt] of Object.entries(goal.receipts))if(receipt.state!=='acknowledged')pendingCompletions.push({ledger:goal.ledger,goalId:goal.id,receiptId,state:receipt.state,classification:receipt.classification||null});
    }
    validateConstraints([...activeConstraints.values()]);
    return {checkpoint,activeConstraints:[...activeConstraints.values()],pendingCompletions,pendingKnowledgeMaintenance,pendingLearningQueueIssues:queued.issues,learningCoverage:checkpoint.learningCloseouts===undefined && !queued.records.length?'legacy-unknown':'recorded',drift,staleEvidence,dispatchable,skippedVerified,blocked,unknownScope,status:drift.length?'contract_drift':staleEvidence.length?'evidence_drift':'restored'};
}

export async function flushPendingMaintenance({root}) {
    const jobs=[];
    for(const [directory,kind] of [['.scratch/pending-captures','capture'],['.scratch/pending-checks','check']]) {
        const absolute=await resolveRepositoryPath(root,directory);
        if(!fs.existsSync(absolute))continue;
        for(const entry of fs.readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
            if(entry.isFile()&&entry.name.endsWith('.json'))jobs.push({ref:`${directory}/${entry.name}`,kind});
        }
    }
    for (const job of jobs) {
        try { job.mtime=(await fs.promises.stat(await resolveRepositoryPath(root,job.ref))).mtimeMs; }
        catch { job.mtime=0; }
    }
    jobs.sort((a,b)=>a.mtime-b.mtime || a.ref.localeCompare(b.ref));
    const deferredUntil=new Date(jobs.reduce((latest,job)=>Math.max(latest,job.mtime),Date.now())+1000);
    const results=[];
    for(const job of jobs.slice(0,3)) {
        try {
            const pending=JSON.parse(await readBoundedFile(root,job.ref,{encoding:'utf8',maxBytes:64*1024}));
            if (job.kind==='capture') {
                const restored=await restoreCheckpoint({root});
                const record=restored.pendingKnowledgeMaintenance?.find(value=>value.captureInputRef===job.ref) || pending.learningCloseout;
                if (record) {
                    const validated=await validateCaptureInput(root,pending.input);
                    const evidenceDigest=digest(JSON.stringify(validated.evidence.sort((a,b)=>a.ref.localeCompare(b.ref))));
                    if (validated.origin!==record.origin || validated.revision!==record.revision || evidenceDigest!==record.evidenceDigest) throw new Error('pending learning identity changed');
                }
            }
            const result=job.kind==='capture'?await captureMemory({root,input:pending.input}):await (await import('./prevention-checks.mjs')).recordPreventionCheck({root,input:pending.input});
            if(['review_required','validation_failed'].includes(result.action))throw new Error(result.action);
            if (job.kind==='capture') await completePendingLearning(root,job.ref,pending,result);
            const absolute=await resolveRepositoryPath(root,job.ref);
            await fs.promises.rm(absolute,{force:true});
            results.push({ref:job.ref,status:'completed',action:result.action});
        } catch {
            let retryDeferred=true;
            try {
                const absolute=await resolveRepositoryPath(root,job.ref),metadata=await fs.promises.stat(absolute);
                await fs.promises.utimes(absolute,metadata.atime,deferredUntil);
            } catch { retryDeferred=false; }
            results.push({ref:job.ref,status:'pending',error:'maintenance retry failed; inspect validated input and catalog',retryDeferred});
        }
    }
    const processed=results.filter(r=>r.status==='completed').length;
    return {processed,remaining:jobs.length-processed,results};
}

async function completePendingLearning(root, ref, saved, result) {
    return withMemoryWriter(root,async()=>{
        const restored=await restoreCheckpoint({root});
        const record=restored.pendingKnowledgeMaintenance?.find(value=>value.captureInputRef===ref) || saved.learningCloseout;
        if (!record) return;
        if (!restored.checkpoint) throw new Error('pending learning checkpoint unavailable');
        const [captured]=await validateLearningCloseouts(root,[{...record,disposition:'captured',knowledgeRef:`${result.path}${result.id?`#${result.id}`:''}`,captureInputRef:undefined}]);
        if (closeoutKey(captured)!==closeoutKey(record)) throw new Error('pending learning identity changed');
        const closeouts=[captured,...restored.pendingKnowledgeMaintenance.filter(value=>closeoutKey(value)!==closeoutKey(record))];
        for (const pending of closeouts.slice(20)) await queueLearningCloseout(root,pending,false);
        const checkpoint={...restored.checkpoint,learningCloseouts:closeouts.slice(0,20)};
        if (closeouts.length>20 || restored.pendingLearningQueueIssues?.length) checkpoint.pendingLearningQueue=PENDING_LEARNING_QUEUE;
        else delete checkpoint.pendingLearningQueue;
        const raw=await readMemory(root,'.continue-here.md'),content=checkpointContent(raw,checkpoint);
        if (content!==raw) await writeFileAtomic(root,'.continue-here.md',content,{fallbackOnBusy:false});
        if (saved.learningCloseout) await queueLearningCloseout(root,record,false,true);
    });
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
    const feedback=report.feedback;
    if(feedback?.records) {
        io.out.write(`feedback: records=${feedback.records} verified=${feedback.outcomes.verified} failed=${feedback.outcomes.failed} unknown=${feedback.outcomes.unknown} legacy-unbound=${feedback.legacyUnbound} revision-unknown=${feedback.knowledgeRevisionUnknown}\n`);
        for(const group of feedback.groups.filter(value=>value.reviewRequired))io.out.write(`REVIEW feedback ${group.knowledgeRef} revision=${group.knowledgeRevision} digest=${group.knowledgeDigest} failed=${group.outcomes.failed} rejected=${group.dispositions.rejected}; inspect observation evidence before adopting guidance\n`);
        if(feedback.truncated)io.out.write('(feedback groups truncated to 10; aggregate counts include all records)\n');
    }
    if (report.freshness) {
        const f = report.freshness;
        io.out.write(
            `freshness: commit=${f.commitDate ?? 'unknown'} state=${f.stateDate ?? 'none'} progress=${f.progressDate ?? 'none'} flags=${f.flags.length ? f.flags.join(',') : 'none'}\n`
        );
        if (f.flags.length > 0) {
            io.out.write('STALE durable state: reconcile through the active owning route; ready independent work may continue\n');
        }
    }
    if (report.candidates.length === 0) {
        io.out.write(
            'no promotion candidates (need 3+ recurrences at observed/confirmed, with independent origins and evidence)\n'
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
        'DRY RUN: proposals only; this archive command never writes. Applying archives is a human-approved workflow action.\n'
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

async function main(argv, io = { out: process.stdout, err: process.stderr }) {
    const args = argv.slice(2);
    const command = args[0];
    let root = process.cwd();
    let json = false;
    let dryRun = false;
    let inputFile;
    for (let i = 1; i < args.length; i += 1) {
        const a = args[i];
        if (a === '--root') root = args[++i];
        else if (a === '--json') json = true;
        else if (a === '--dry-run') dryRun = true;
        else if (a === '--input-file') inputFile = args[++i];
        else throw new Error(`unsupported option: ${a}`);
    }
    if (['capture', 'refresh', 'checkpoint', 'feedback'].includes(command)) {
        const raw = await readBoundedFile(root, inputFile, {encoding: 'utf8', maxBytes: 64 * 1024});
        let input;
        try { input = JSON.parse(raw); }
        catch { throw new Error('invalid maintenance input JSON'); }
        const result = await ({capture: captureMemory, refresh: refreshMemory, checkpoint: persistCheckpoint, feedback: recordFeedback}[command])({root, input, dryRun});
        io.out.write(`${JSON.stringify(result)}\n`);
        return result.action === 'review_required' ? 1 : 0;
    }
    if (command === 'resume') {
        io.out.write(`${JSON.stringify(await restoreCheckpoint({root}))}\n`);
        return 0;
    }
    if(command==='flush') {
        if(dryRun)throw new Error('flush is an owning lifecycle action; use report for read-only inspection');
        const result=await flushPendingMaintenance({root});
        io.out.write(`${JSON.stringify(result)}\n`);
        return result.results.some(r=>r.status==='pending')?1:0;
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
        'usage: memory-maintenance.mjs <check|report|capture|refresh|feedback|checkpoint|resume|archive --dry-run> [--json] [--root <path>]\n'
    );
    return 2;
}

export { main };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main(process.argv).then(code => { process.exitCode = code; }).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
}
