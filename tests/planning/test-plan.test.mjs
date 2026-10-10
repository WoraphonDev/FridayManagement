import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildTestManifest } from '../../scripts/build-test-manifest.mjs';
import { checkManifest, validateRecords, evaluateGates, taskReadiness } from '../../scripts/check-test-plan.mjs';

const manifest=buildTestManifest();
const empty=()=>({formatVersion:1,records:[],defects:[]});
const context={build:'synthetic-policy-test',sourceSha256:'a'.repeat(64),taskStatuses:new Map(manifest.tasks.map(t=>[t.id,'DONE']))};
// Synthetic fixtures are only inputs to policy tests; they are never saved as actual execution evidence.
const record=(id,profile='sqlserver2022')=>({id,profile,status:'PASS',build:context.build,sourceSha256:context.sourceSha256,schemaVersion:'synthetic',
  tester:'policy fixture',role:'synthetic tester',date:'2026-10-05T00:00:00Z',actual:'synthetic policy input',signoff:'synthetic review',
  environment:{node:'22.23.3',os:profile==='windows-sqlserver2022'?'windows':'macos',osVersion:'synthetic',
    db:{provider:profile==='pure-node22'?'none':profile==='sqlite-local'?'sqlite':'sqlserver2022',product:'SQL Server 2022',version:'synthetic',driver:'synthetic'},
    browser:{name:'Chrome',version:'synthetic'}},
  evidence:[{path:'tests/planning/test-plan.test.mjs',sha256:createHash('sha256').update(readFileSync('tests/planning/test-plan.test.mjs')).digest('hex')}],
  browserCoverage:manifest.browserMatrix.browsers.flatMap(name=>manifest.browserMatrix.versions.map(band=>({name,band,version:'synthetic',os:'synthetic',device:'synthetic',mode:'emulated'})))});
const complete=()=>({formatVersion:1,defects:[],records:[...manifest.cases,...manifest.acceptance,...manifest.variants,...manifest.uat,...manifest.reviews].map(x=>
  record(x.id,x.requiredProfile==='windows-sqlserver2022'||x.profiles?.includes('windows-sqlserver2022')||x.id==='AT-28'?'windows-sqlserver2022':x.profiles?.[0]==='pure-node22'?'pure-node22':'sqlserver2022'))});

test('Complete manifest matches approved inventories and source dependencies',()=>assert.equal(checkManifest(manifest).result,'PASS'));
test('Missing AT and altered mappings are rejected',()=>{
  const bad=structuredClone(manifest);bad.acceptance.pop();assert.throws(()=>checkManifest(bad));
  const stale=structuredClone(manifest);stale.acceptance[0].cases=[];assert.throws(()=>checkManifest(stale));
});
test('Empty execution store never implies application or release PASS',()=>{
  assert.equal(validateRecords(manifest,empty()).result,'PASS');const gates=evaluateGates(manifest,empty(),context);
  assert.equal(gates.final.result,'NOT_RUN');assert.equal(gates.final.pending.length,168);assert.equal(gates.candidate.result,'NOT_RUN');
});
test('Synthetic full evidence can satisfy policy but is never written as real results',()=>{
  const data=complete();assert.equal(validateRecords(manifest,data).result,'PASS');assert.equal(evaluateGates(manifest,data,context).final.result,'PASS');
});
test('SQLite PASS cannot close a SQL Server case or final gate',()=>{
  const data=complete();data.records=data.records.filter(r=>r.id!=='TC-033');data.records.push(record('TC-033','sqlite-local'));
  assert.equal(validateRecords(manifest,data).result,'PASS');assert(evaluateGates(manifest,data,context).final.pending.some(p=>p.id==='TC-033'));
  const failing=complete();const local=record('TC-033','sqlite-local');local.status='FAIL';failing.records.push(local);
  assert.equal(evaluateGates(manifest,failing,context).final.result,'FAIL');
});
test('SQL PASS on macOS cannot close Windows install',()=>{
  const data=complete();data.records=data.records.filter(r=>r.id!=='TC-080');data.records.push(record('TC-080'));
  assert(evaluateGates(manifest,data,context).final.pending.some(p=>p.id==='TC-080'));
  const liar=record('TC-080','windows-sqlserver2022');liar.environment.os='macos';assert.throws(()=>validateRecords(manifest,{...empty(),records:[liar]}));
});
test('Missing concurrency variant blocks final even when all cases and AT are PASS',()=>{
  const data=complete();data.records=data.records.filter(r=>r.id!=='RV-15');assert.equal(evaluateGates(manifest,data,context).final.result,'NOT_RUN');
});
test('Old build or changed source digest cannot satisfy current sign-off',()=>{
  assert.equal(evaluateGates(manifest,complete(),{...context,build:'next-build'}).final.pending.length,168);
  assert.equal(evaluateGates(manifest,complete(),{...context,sourceSha256:'b'.repeat(64)}).final.pending.length,168);
});
test('Evidence must exist and match hash; credentials/data cannot be used',()=>{
  for(const path of ['missing-evidence.md','.env','uploads/file.txt','backup.bak','../outside.txt']) {
    const r=record('TC-033');r.evidence[0].path=path;assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
  }
  const r=record('TC-033');r.evidence[0].sha256='0'.repeat(64);assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
});
test('PASS requires execution identity/actual/environment and AT sign-off',()=>{
  for(const key of ['actual','tester','role','date','schemaVersion','build','sourceSha256','evidence','environment']) {
    const r=record('TC-033');delete r[key];assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
  }
  const r=record('AT-14');delete r.signoff;assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
});
test('Provider identity and Node major mismatches rejected',()=>{
  const r=record('TC-033');r.environment.db.provider='sqlite';assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
  r.environment.db.provider='sqlserver2022';r.environment.node='24.0.0';assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
});
test('Unsupported status and duplicate per-build results rejected',()=>{
  const r=record('TC-033');r.status='NOT_APPLICABLE';assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
  r.status='PASS';assert.throws(()=>validateRecords(manifest,{...empty(),records:[r,r]}));
});
test('BLOCKED needs reason and FAIL needs defect; neither can be masked by PASS',()=>{
  const data=complete();const r=record('TC-033','windows-sqlserver2022');r.status='BLOCKED';
  assert.throws(()=>validateRecords(manifest,{...data,records:[...data.records,r]}));
  r.reason='No DB available';data.records.push(r);assert.equal(evaluateGates(manifest,data,context).final.result,'BLOCKED');
  r.status='FAIL';assert.throws(()=>validateRecords(manifest,data));
  r.defectId='BUG-1';data.defects.push({id:'BUG-1',severity:'Major',status:'OPEN',summary:'synthetic failure',owner:'synthetic',cases:['TC-033']});
  assert.equal(validateRecords(manifest,data).result,'PASS');assert.equal(evaluateGates(manifest,data,context).final.result,'FAIL');
});
test('Open Critical/Major defects and incomplete task sign-off prevent final PASS',()=>{
  const data=complete();data.defects.push({id:'BUG-1',severity:'Critical',status:'OPEN',summary:'synthetic',owner:'synthetic',cases:['TC-033']});
  assert.equal(evaluateGates(manifest,data,context).final.result,'BLOCKED');
  const states=new Map(context.taskStatuses);states.set('T-076','IN_PROGRESS');assert.equal(evaluateGates(manifest,complete(),{...context,taskStatuses:states}).final.result,'NOT_RUN');
});
test('Browser current/previous matrix cannot close from one browser',()=>{
  const r=record('TC-074');r.browserCoverage=r.browserCoverage.slice(0,1);assert.throws(()=>validateRecords(manifest,{...empty(),records:[r]}));
});
test('Candidate requires packaging reviews and does not imply final PASS',()=>{
  const data={...empty(),records:[record('REL-01','pure-node22'),record('REL-02','pure-node22')]};
  assert.equal(evaluateGates(manifest,data,context).candidate.result,'PASS');assert.equal(evaluateGates(manifest,data,context).final.result,'NOT_RUN');
});
test('Readiness honors dependency completion and carries declared effort',()=>{
  const states=new Map(manifest.tasks.map(t=>[t.id,'TODO']));['T-001','T-002','T-003','T-004'].forEach(id=>states.set(id,'DONE'));
  const ready=taskReadiness(manifest,states).filter(t=>t.readiness==='READY');assert.deepEqual(ready.map(t=>[t.id,t.effort]),[['T-005','Medium'],['T-078','Medium'],['T-092','Medium']]);
});
