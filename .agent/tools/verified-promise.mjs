#!/usr/bin/env node
/**
 * verified-promise - machine-checked completion predicate.
 *
 * A run may be declared COMPLETE only when its ledger validates, every goal is
 * verified with complete outcome evidence, and every proof is fresh.
 *
 * Usage: node .agent/tools/verified-promise.mjs (--run <run-id> | --contract <path>) [--root <path>]
 * Exit 0 = COMPLETE_ALLOWED; exit 1 = goals unverified; exit 2 = usage/corrupt.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {readBoundedFile} from './file-state.mjs';
import {readLedger} from './work-package.mjs';
import {verifyCompletionEvidence} from './verification-recipe.mjs';

// Pure status predicate; it grants no evidence authority on its own.
export function evaluatePromise(ledger) {
    if (
        ledger === null ||
        typeof ledger !== 'object' ||
        typeof ledger.goals !== 'object' ||
        ledger.goals === null
    ) {
        return { allowed: false, corrupt: true, unverified: [] };
    }
    const entries = Object.entries(ledger.goals);
    if (entries.length === 0) {
        return { allowed: false, corrupt: false, unverified: [], empty: true };
    }
    const unverified = entries
        .filter(([, goal]) => goal?.status !== 'verified')
        .map(([id, goal]) => ({ id, status: goal?.status ?? 'unknown' }));
    return { allowed: unverified.length === 0, corrupt: false, unverified };
}

async function main(argv) {
    const args = argv.slice(2);
    let runId = null;
    let contractPath = null;
    let root = process.cwd();
    const seen = new Set();
    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (!['--run','--contract','--root'].includes(a) || seen.has(a) || !args[i+1] || args[i+1].startsWith('--')) {
            process.stderr.write('usage: verified-promise.mjs (--run <run-id> | --contract <path>) [--root <path>]\n');
            return 2;
        }
        seen.add(a);
        if (a === '--run') runId = args[++i];
        else if (a === '--contract') contractPath = args[++i];
        else if (a === '--root') root = args[++i];
    }
    if (Boolean(runId) === Boolean(contractPath) || (runId && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId))) {
        process.stderr.write('usage: verified-promise.mjs (--run <run-id> | --contract <path>) [--root <path>]\n');
        return 2;
    }
    if (contractPath) {
        try {
            const contractDigest = createHash('sha256').update(await readBoundedFile(root,contractPath)).digest('hex');
            const verdict = await verifyCompletionEvidence(root,{contractPath,contractDigest});
            printEvidenceVerdict(verdict,`contract=${contractPath}`);
            return verdict.allowed ? 0 : 1;
        } catch (error) {
            process.stderr.write(`verified-promise: ${error.message}\n`);
            return 2;
        }
    }
    const ledgerPath = path.join(root, '.scratch', 'work-packages', runId, 'ledger.json');
    let ledger;
    try {
        if (!fs.existsSync(ledgerPath)) throw new Error('missing ledger');
        // Structural/history reads remain possible; outcome checks are explicit.
        ledger = await readLedger(root,ledgerPath,runId,{checkEvidence:false});
    } catch {
        process.stderr.write(`verified-promise: cannot read ledger ${ledgerPath}\n`);
        return 2;
    }
    const verdict = evaluatePromise(ledger);
    if (verdict.corrupt) {
        process.stderr.write('verified-promise: ledger shape invalid; failing closed\n');
        return 2;
    }
    if (verdict.empty) {
        process.stderr.write('verified-promise: ledger has no goals; failing closed\n');
        return 1;
    }
    if (verdict.allowed) {
        try {
            await readLedger(root,ledgerPath,runId);
        } catch (error) {
            const unassessed = /no pinned completion contract|Completion (?:Needs Validation|Partially Verified|Verification Failed)/.test(error.message);
            process.stdout.write(`COMPLETE_DENIED run=${runId} ${error.message}\n`);
            return unassessed ? 1 : 2;
        }
        if (Object.keys(ledger.goals).length > 1 && !ledger.completionContract) {
            process.stdout.write(`COMPLETE_DENIED run=${runId} Needs Validation: aggregate outcome contract missing\n`);
            return 1;
        }
        if (ledger.completionContract) {
            const contract = JSON.parse(await readBoundedFile(root,ledger.completionContract.path,{encoding:'utf8'}));
            if (contract.taskId !== runId) {
                process.stdout.write(`COMPLETE_DENIED run=${runId} Needs Validation: aggregate task identity mismatch\n`);
                return 1;
            }
            const aggregate = await verifyCompletionEvidence(root,{contractPath:ledger.completionContract.path,contractDigest:ledger.completionContract.digest});
            printEvidenceVerdict(aggregate,`run=${runId}`);
            return aggregate.allowed ? 0 : 1;
        }
        const goal = Object.values(ledger.goals)[0];
        const evidence = await verifyCompletionEvidence(root,{contractPath:goal.completionContract.path,contractDigest:goal.completionContract.digest,evidenceRefs:goal.evidence.evidenceArtifacts});
        printEvidenceVerdict(evidence,`run=${runId}`);
        return evidence.allowed ? 0 : 1;
    }
    for (const goal of verdict.unverified) {
        process.stdout.write(`UNVERIFIED ${goal.id}: ${goal.status}\n`);
    }
    process.stdout.write(
        `COMPLETE_DENIED run=${runId} unverified=${verdict.unverified.length}\n`
    );
    return 1;
}

function printEvidenceOfCompletion(verdict) {
    process.stdout.write('\n## Evidence of Completion\n\n| Requirement / AC | Verification | Actual result | Evidence |\n|---|---|---|---|\n');
    const cell = value => String(value ?? '').replaceAll('|','\\|').replace(/[\r\n]/g,' ');
    for (const criterion of verdict.criteria) process.stdout.write(`| ${cell(criterion.id)} | ${cell(criterion.method ?? 'mapped outcome assertion / inspection')} | ${cell(criterion.observed ?? criterion.status)} | ${cell(criterion.evidenceRefs.join(', '))} |\n`);
}

function printEvidenceVerdict(verdict,identity) {
    process.stdout.write(`${verdict.allowed ? 'COMPLETE_ALLOWED' : 'COMPLETE_DENIED'} ${identity} status=${verdict.status}\n`);
    if (verdict.standards?.status === 'legacy') process.stdout.write('STANDARDS_LEGACY organizational compliance not established\n');
    if (verdict.standards?.status === 'ready') {
        const standards=verdict.standards;
        const line=value=>process.stdout.write(`${String(value).replace(/[\r\n]/g,' ')}\n`);
        line(`STANDARDS digest=${standards.digest} snapshot=${standards.snapshotRef} receipt=${standards.receiptRef}`);
        for (const scope of standards.scopes) line(`STANDARDS_SCOPE ${scope.path} profile=${scope.profile ? `${scope.profile.id}@${scope.profile.version}` : 'core and repository conventions'}`);
        for (const limitation of standards.limitations) line(`STANDARDS_LIMITATION ${limitation}`);
        for (const rule of standards.waivedRules) line(`STANDARDS_WAIVED ${rule.scope}:${rule.id} (approved exception; not a passing check)`);
    }
    if (verdict.allowed) printEvidenceOfCompletion(verdict);
    else for (const issue of verdict.issues) process.stdout.write(`UNVERIFIED ${issue}\n`);
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1])) {
    try { process.exitCode = await main(process.argv); }
    catch (error) {
        process.stderr.write(`verified-promise: ${error.message}\n`);
        process.exitCode = 2;
    }
}
