#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readBoundedFile} from './file-state.mjs';
const validDigest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

// Lower metric values mean lower cost. Quality uses a fixed, caller-defined
// grader; comparability is required before any optimization verdict.
export function compareRuns(before, after) {
    const unknown = reason => ({decision: 'INCONCLUSIVE', reason, reduction: 'unknown'});
    if (!before || !after) return unknown('missing paired runs');
    for (const key of ['tasks', 'host', 'model', 'metric', 'basis', 'grader']) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return unknown(`incomparable ${key}`);
    }
    if (!Array.isArray(before.tasks) || !before.tasks.length || ['host','model','metric','basis','grader'].some(key => typeof before[key] !== 'string' || !before[key].trim() || /^(unknown|unmeasured|unavailable)$/i.test(before[key].trim()))) return unknown('missing measurement identity');
    if (![before.quality, after.quality, before.value, after.value].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0) || before.value === 0) return unknown('missing measurement');
    const reduction = (before.value - after.value) / before.value;
    if (after.quality < before.quality) return {decision: 'REJECT', reason: 'quality regression', reduction};
    if(validDigest(before.sourceDigest)&&validDigest(after.sourceDigest)&&before.sourceDigest===after.sourceDigest)return {decision:'INCONCLUSIVE',reason:'identical effective source is a control, not an optimization',reduction};
    if (after.value >= before.value) return {decision: 'REJECT', reason: 'no measured cost improvement', reduction};
    return {decision: 'KEEP', reason: 'comparable cost improvement with preserved quality', metric: before.metric, basis: before.basis, reduction};
}

const median = values => {
    const sorted=[...values].sort((a,b)=>a-b), mid=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
};
export function comparePairedTrials(trials, {minPairs=5,threshold=0.10,noiseAware=false,controlTrials}={}) {
    const unknown=reason=>({decision:'INCONCLUSIVE',reason,pairs:0,medianReduction:'unknown'});
    if(!Number.isSafeInteger(minPairs)||minPairs<5||!Number.isFinite(threshold)||threshold<0.1||threshold>=1)throw new Error('invalid paired trial gates');
    if(!Array.isArray(trials)||trials.length%2||trials.length<minPairs*2)return unknown('missing repeated pairs');
    const pairs=new Map();
    for(const trial of trials) {
        if(!trial||!Number.isSafeInteger(trial.pair)||trial.pair<1||!['A','B'].includes(trial.variant))return unknown('invalid pair identity');
        const pair=pairs.get(trial.pair)||{};
        if(pair[trial.variant])return unknown('duplicate paired attempt');
        pair[trial.variant]=trial; pairs.set(trial.pair,pair);
    }
    for(const variant of ['A','B']) if(new Set(trials.filter(t=>t.variant===variant).map(t=>t.sourceDigest)).size!==1)return unknown('source changed during paired experiment');
    const identities=['taskDigest','fixtureDigest','configDigest','graderDigest','host','model','metric','basis'];
    const anchor=trials[0];
    for(const trial of trials) {
        if(identities.some(k=>typeof trial[k]!=='string'||!trial[k].trim()||/^(unknown|unavailable)$/i.test(trial[k])||trial[k]!==anchor[k]))return unknown('incomparable task/fixture/config/model/grader');
        if(['taskDigest','fixtureDigest','configDigest','graderDigest','sourceDigest'].some(k=>!validDigest(trial[k])))return unknown('missing provenance');
        if(typeof trial.correctness!=='boolean'||!Number.isSafeInteger(trial.errorCount)||trial.errorCount<0||!Number.isFinite(Date.parse(trial.timestamp)))return unknown('missing quality/freshness');
        if(trial.failure||typeof trial.value!=='number'||!Number.isFinite(trial.value)||trial.value<=0||!Number.isSafeInteger(trial.actualWork?.commandCount)||trial.actualWork.commandCount<1||!trial.actualWork.evidenceRef||!validDigest(trial.actualWork.digest))return unknown('missing actual-work measurement');
    }
    const reductions=[],before=[],after=[];
    for(const {A,B} of pairs.values()) {
        if(!A||!B)return unknown('unpaired attempt');
        if(!B.correctness||B.errorCount>A.errorCount)return {decision:'REJECT',reason:'correctness/error regression',pairs:pairs.size};
        if(!A.correctness)return unknown('baseline correctness failed');
        reductions.push((A.value-B.value)/A.value); before.push(A.value); after.push(B.value);
    }
    const medianReduction=median(reductions),variation=median(reductions.map(v=>Math.abs(v-medianReduction)));
    const stats={pairs:pairs.size,medianBefore:median(before),medianAfter:median(after),medianReduction,variation,range:[Math.min(...reductions),Math.max(...reductions)],threshold};
    if(trials[0].sourceDigest===trials.find(t=>t.variant!==trials[0].variant).sourceDigest)return {...stats,decision:'INCONCLUSIVE',reason:'identical effective source is a control, not an optimization'};
    if(medianReduction<=0)return {...stats,decision:'REJECT',reason:'no measured improvement'};
    if(noiseAware || controlTrials!==undefined) {
        const control=comparePairedTrials(controlTrials,{minPairs:6,threshold});
        const source=trials.find(t=>t.variant==='A').sourceDigest;
        if(control.reason!=='identical effective source is a control, not an optimization'||controlTrials.some(t=>t.sourceDigest!==source||identities.some(k=>t[k]!==anchor[k])))return {...stats,decision:'INCONCLUSIVE',reason:'missing six comparable same-source control pairs'};
        const controlPairs=new Map();
        for(const trial of controlTrials){const pair=controlPairs.get(trial.pair)||{};pair[trial.variant]=trial;controlPairs.set(trial.pair,pair);}
        stats.controlPairs=controlPairs.size;
        stats.noiseFloor=Math.max(...[...controlPairs.values()].map(({A,B})=>Math.abs((A.value-B.value)/A.value)));
        if(medianReduction<=stats.noiseFloor)return {...stats,decision:'INCONCLUSIVE',reason:'improvement does not exceed the observed control noise floor'};
    }
    if(medianReduction<threshold||medianReduction<=2*variation)return {...stats,decision:'INCONCLUSIVE',reason:'improvement below threshold or measurement variation'};
    return {...stats,decision:'KEEP',reason:'repeated measured improvement with preserved correctness'};
}

export function gradeBehavior({events, requiredContracts}) {
    if (!Array.isArray(events) || !Array.isArray(requiredContracts) || !requiredContracts.length) return {pass: false, failures: ['missing trace/contract requirements']};
    const failures = [];
    const close = events.findIndex(e => e.action === 'close');
    if (close < 0) failures.push('missing close');
    const beforeClose = events.slice(0, Math.max(0, close));
    for (const ref of requiredContracts) {
        if (!beforeClose.some(e => e.action === 'read_contract' && e.path === ref)) failures.push(`contract not read: ${ref}`);
    }
    const verify = beforeClose.findLastIndex(e => e.action === 'verify');
    const capture = beforeClose.findLastIndex(e => e.action === 'capture');
    const spec = beforeClose.findLastIndex(e => e.action === 'review_spec');
    const quality = beforeClose.findLastIndex(e => e.action === 'review_quality');
    if (verify < 0 || beforeClose[verify].exitCode !== 0 || !beforeClose[verify].evidence || capture <= verify || !['created', 'updated', 'unchanged', 'deduplicated', 'skipped_worth_gate'].includes(beforeClose[capture]?.outcome) || !beforeClose[capture]?.evidence) failures.push('latest successful verification must precede capture');
    if (spec < 0 || quality <= spec || beforeClose[spec].verdict !== 'PASS' || !beforeClose[spec].evidence || beforeClose[quality]?.verdict !== 'PASS' || !beforeClose[quality]?.evidence) failures.push('latest SPEC and QUALITY reviews must pass in order');
    if (requiredContracts.some(ref => beforeClose.findIndex(e => e.action === 'read_contract' && e.path === ref) > verify)) failures.push('contract read after verification');
    return {pass: failures.length === 0, failures, evidenceBasis: 'normalized_action_trace', hostReliability: 'unknown'};
}

async function main() {
    const [command, inputFile] = process.argv.slice(2);
    const input = JSON.parse(await readBoundedFile(process.cwd(), inputFile, {encoding: 'utf8', maxBytes: 128 * 1024}));
    let result;
    if (command === 'compare') result = compareRuns(input.before, input.after);
    else if (command === 'paired') {
        for(const trial of [...input.trials || [],...input.gates?.controlTrials || []]) {
            if(trial.actualWork?.evidenceRef) {
                const bytes=await readBoundedFile(process.cwd(),trial.actualWork.evidenceRef);
                if(createHash('sha256').update(bytes).digest('hex')!==trial.actualWork.digest)throw new Error('paired evidence digest mismatch');
            }
        }
        result=comparePairedTrials(input.trials,input.gates);
    } else if (command === 'behavior') {
        for (const event of input.events || []) if (event.evidence) await readBoundedFile(process.cwd(), event.evidence);
        for (const ref of input.requiredContracts || []) await readBoundedFile(process.cwd(), ref);
        result = gradeBehavior(input);
        if (!result.pass) process.exitCode = 1;
    } else throw new Error('usage: adaptive-eval.mjs <compare|paired|behavior> <input.json>');
    process.stdout.write(`${JSON.stringify(result)}\n`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => {console.error(error.message); process.exitCode = 2;});
