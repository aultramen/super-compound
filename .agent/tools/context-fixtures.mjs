#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {resolveRepositoryPath} from './file-state.mjs';

const manifestPath = fileURLToPath(new URL('../evals/context-efficiency.fixtures.json',import.meta.url));
export async function seedContextFixtures(directory) {
  const root=path.resolve(directory);
  if (fs.existsSync(root)) throw new Error('Fixture destination must be fresh');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  fs.mkdirSync(root,{recursive:true});
  const reports=[];
  for (const fixture of manifest.fixtures) {
    const target=await resolveRepositoryPath(root,fixture.name);
    const sum=fixture.mode==='bug' ? 'a - b':'a + b';
    const files={
      'README.md':'# Arithmetic fixture\n\nGoal: integer additon and multiplication. No dependencies.\n',
      'package.json':JSON.stringify({private:true,scripts:{test:'node --test test/*.test.cjs'}})+'\n',
      'src/sum.cjs':`exports.sum = (a, b) => ${sum};\nexports.multiply = (a, b) => 0;\n`,
      'test/sum.test.cjs':"const test=require('node:test'); const assert=require('node:assert/strict'); const {sum}=require('../src/sum.cjs');\ntest('integer addition',()=>{assert.equal(sum(2,3),5);assert.equal(sum(-2,3),1);});\n",
      'docs/brd/brd-arithmetic.md':'# BRD-ARITHMETIC\nStatus: approved by fixture user\nBREQ-001: correct integer addition and multiplication.\n',
      'docs/prd/prd-arithmetic.md':'# PRD-ARITHMETIC\nStatus: approved by fixture user\nFR-001: sum(a,b) returns integer a+b. FR-002: multiply(a,b) returns integer a*b.\n',
      'docs/fsd/fsd-arithmetic.md':`# FSD-ARITHMETIC\nStatus: approved by fixture user; both goals execution authorized\nContract version: 2.0.0\nUpstream: BRD-ARITHMETIC#BREQ-001; PRD-ARITHMETIC#FR-001,FR-002\nTDEC-001: CommonJS, node:test, no new dependencies or input policy.\nADR: none required\n## GOAL-001\nStatus: ${fixture.mode==='resume'?'verified':'ready-for-agent'}\nBlocked by: None\nTarget: src/sum.cjs sum only. Preserve multiply.\nAcceptance: sum(2,3)=5; sum(-2,3)=1. TEST-001: node --test test/sum.test.cjs.\nUI delivery role: NOT_APPLICABLE; contract gate: NOT_APPLICABLE\n## GOAL-002\nStatus: ${fixture.mode==='resume'?'ready-for-agent':'blocked'}\nBlocked by: GOAL-001\nTarget: multiply in src/sum.cjs, new test/multiply.test.cjs.\nAcceptance: multiply(2,3)=6; multiply(-2,3)=-6; multiply(0,3)=0. TEST-002: node --test test/*.test.cjs.\nUI delivery role: NOT_APPLICABLE; contract gate: NOT_APPLICABLE\n`,
      'docs/STATE.md':`# Project State\n## Current Position\n- Workflow: sc-work\n- Next action: ${fixture.mode==='resume'?'GOAL-002; skip verified GOAL-001':'GOAL-001'}\n## Completed Work\n${fixture.mode==='resume'?'- GOAL-001 verified: TEST-001 passes on seeded source. Revalidate fingerprint before reuse.':'- None'}\n`,
      'fixture.json':JSON.stringify(fixture,null,2)+'\n',
    };
    const hashes={};
    for (const [relative,text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(target,relative)),{recursive:true});
      fs.writeFileSync(path.join(target,relative),text);
      hashes[relative]=createHash('sha256').update(text).digest('hex');
    }
    reports.push({fixture:fixture.name,route:fixture.route,tier:fixture.tier,files:hashes});
  }
  return {schema:'context_fixture_seed_v1',fixtures:reports};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  if(!process.argv[2]) {console.error('Usage: context-fixtures.mjs <fresh-directory>');process.exitCode=1;}
  else seedContextFixtures(process.argv[2]).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
