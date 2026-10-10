import assert from 'node:assert/strict';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { buildTestManifest, rows } from './build-test-manifest.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = value => typeof value==='string' && value.trim().length>0;
const unique = (items,label) => assert.equal(new Set(items).size,items.length,`Duplicate ${label}`);
const all = manifest => [...manifest.cases,...manifest.acceptance,...manifest.variants,...manifest.uat,...manifest.reviews];
const statuses = () => new Map(rows(readFileSync('TeamFlow_Task_v1.0.md','utf8'),'T-').map(r=>[r[0],r[4]]));

export function checkManifest(manifest) {
  assert.deepEqual(manifest,buildTestManifest(),'Stale generated test manifest');
  for(const [group,count] of Object.entries({tasks:96,suites:23,cases:99,acceptance:40,variants:20,uat:5,reviews:4})) {
    assert.equal(manifest[group].length,count,`${group} inventory`); unique(manifest[group].map(x=>x.id),group);
  }
  unique(all(manifest).map(x=>x.id),'execution item');
  const taskIds=new Set(manifest.tasks.map(t=>t.id));
  const caseIds=new Set(manifest.cases.map(t=>t.id));
  const atIds=new Set(manifest.acceptance.map(t=>t.id));
  const suiteIds=new Set(manifest.suites.map(t=>t.id));
  const profileIds=new Set(manifest.profiles.map(t=>t.id));
  for(const [kind,count] of Object.entries({FR:52,NFR:9,BR:23})) {
    const coverage=manifest.requirementsCoverage[kind];assert.equal(coverage.length,count);unique(coverage.map(x=>x.id),kind);
    assert(coverage.every(x=>x.tasks.length && x.tasks.every(id=>taskIds.has(id))),`Missing ${kind} owners`);
  }
  assert.equal(manifest.smoke.length,30); unique(manifest.smoke,'smoke');
  assert(manifest.smoke.every(id=>caseIds.has(id)));
  for(const task of manifest.tasks) {
    assert(task.dependencies.every(id=>taskIds.has(id)));
    assert(task.suites.every(id=>suiteIds.has(id)));
    assert(task.acceptance.every(id=>atIds.has(id)));
    assert(['Low','Medium','High'].includes(task.effort));
    assert(nonempty(task.verification));
  }
  const blocks=readFileSync('TeamFlow_Task_v1.0.md','utf8');
  for(const task of manifest.tasks) {
    const block=blocks.split(`### ${task.id} — `)[1]?.split(/\n### T-|\n## /)[0];
    assert(block,`Missing detail ${task.id}`);
    const deps=block.match(/\*\*Depends on:\*\* ([^\n·]+)/)?.[1].match(/T-\d{3}/g)??[];
    assert.deepEqual(task.dependencies,deps,`Dependency mismatch ${task.id}`);
  }
  const visited=new Set(), active=new Set();
  const visit=id=>{ assert(!active.has(id),`Dependency cycle ${id}`); if(visited.has(id))return; active.add(id);
    manifest.tasks.find(t=>t.id===id).dependencies.forEach(visit); active.delete(id);visited.add(id); };
  manifest.tasks.forEach(t=>visit(t.id));
  for(const item of all(manifest)) {
    assert(item.result==='NOT_RUN','Design manifest must not contain execution PASS');
    if(item.tasks) assert(item.tasks.length && item.tasks.every(id=>taskIds.has(id)),`Missing owners ${item.id}`);
    if(item.cases) assert(item.cases.length && item.cases.every(id=>caseIds.has(id)),`Missing cases ${item.id}`);
    if(item.profiles) assert(item.profiles.length && item.profiles.every(id=>profileIds.has(id)));
    assert(item.evidence.length,`Missing evidence ${item.id}`);
  }
  for(const tc of manifest.cases) assert(tc.acceptance.length && tc.acceptance.every(id=>atIds.has(id)),`Orphan ${tc.id}`);
  for(const v of manifest.variants) assert(v.setup && v.steps.length && v.expected.length);
  for(const at of manifest.acceptance) assert(at.cases.length && at.tasks.length && at.expected);
  assert(manifest.cases.every(tc=>manifest.acceptance.some(at=>at.cases.includes(tc.id))));
  // Per-case acceptance can include supplemental traces beyond the coverage table;
  // final sign-off additionally requires EVERY case, not only the table subset.
  for(const rule of manifest.sequencing) assert(rule.tasks.every(t=>taskIds.has(t)) && (rule.closureRequires??[]).every(t=>taskIds.has(t)));
  for(const source of manifest.sources) assert(existsSync(source));
  return {tasks:96,suites:23,cases:99,acceptance:40,variants:20,uat:5,smoke:30,FR:52,NFR:9,BR:23,result:'PASS'};
}

export function validateRecords(manifest, data, {verifyArtifacts=true}={}) {
  assert(data.formatVersion===1 && Array.isArray(data.records) && Array.isArray(data.defects),'Invalid record store');
  const items=new Map(all(manifest).map(x=>[x.id,x]));
  const profiles=new Map(manifest.profiles.map(x=>[x.id,x]));
  unique(data.records.map(r=>`${r.id}:${r.profile}:${r.build}:${r.sourceSha256}`),'record per build/profile');
  unique(data.defects.map(d=>d.id),'defect');
  for(const d of data.defects) {
    assert(nonempty(d.id) && ['Critical','Major','Minor','Cosmetic'].includes(d.severity));
    assert(['OPEN','CLOSED'].includes(d.status) && nonempty(d.owner) && nonempty(d.summary));
    assert(d.cases?.length && d.cases.every(id=>items.has(id)));
    if(d.status==='CLOSED')assert(nonempty(d.retestReference),'Closed defect requires retest evidence');
  }
  for(const r of data.records) {
    const item=items.get(r.id), profile=profiles.get(r.profile);
    assert(item && profile,`Unknown item/profile ${r.id}/${r.profile}`);
    assert(manifest.resultPolicy.statuses.includes(r.status),'Invalid result; NOT_APPLICABLE cannot bypass scope');
    if(r.status==='NOT_RUN')continue;
    assert(nonempty(r.build) && sha(r.sourceSha256),'Execution requires immutable source/build identity');
    assert(nonempty(r.tester) && nonempty(r.role) && typeof r.date==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(r.date) && Number.isFinite(Date.parse(r.date)),'Missing tester/role/UTC date');
    assert(new Date(r.date).toISOString()===r.date.replace(/Z$/,r.date.includes('.')?'Z':'.000Z'),'Invalid UTC calendar date');
    assert(r.environment && /^22\./.test(r.environment.node) && nonempty(r.environment.os) && nonempty(r.environment.osVersion),'Node22/OS version required');
    assert(nonempty(r.schemaVersion),'Execution requires schema version (or none for review)');
    assert(r.environment.db?.provider===profile.db,'Provider/profile mismatch');
    if(profile.db!=='none') assert(nonempty(r.environment.db.version) && nonempty(r.environment.db.driver),'Record actual DB/driver versions');
    if(profile.db==='sqlserver2022') assert(r.environment.db.product==='SQL Server 2022','Actual SQL2022 required');
    if(profile.os==='windows')assert(r.environment.os==='windows','Windows result must run on Windows');
    if(r.status==='BLOCKED') {assert(nonempty(r.reason),'BLOCKED requires reason; tester is responsible owner');continue;}
    assert(nonempty(r.actual),'Execution requires actual results');
    if(r.status==='FAIL')assert(data.defects.some(d=>d.id===r.defectId),'FAIL requires defect ID');
    assert(r.evidence?.length,'PASS/FAIL requires evidence');
    for(const e of r.evidence) {
      assert(nonempty(e.path) && sha(e.sha256),'Evidence needs path/hash');
      const full=resolve(e.path), rel=relative(process.cwd(),full);
      assert(!isAbsolute(e.path) && rel && !rel.startsWith('..') && !isAbsolute(rel),'Evidence must be inside source workspace');
      assert(!/(^|\/)(node_modules|uploads|\.git)(\/|$)|(^|\/)\.env(?:\.|$)|\.(db|sqlite3?|bak)$/i.test(e.path),'Evidence cannot be live data/secrets');
      if(verifyArtifacts) {
        const actualRel=relative(realpathSync(process.cwd()),realpathSync(full));
        assert(actualRel && !actualRel.startsWith('..') && !isAbsolute(actualRel),'Evidence symlink escapes workspace');
        assert(!/(^|\/)(node_modules|uploads|\.git)(\/|$)|(^|\/)\.env(?:\.|$)|\.(db|sqlite3?|bak)$/i.test(actualRel),'Evidence symlink points to live data/secrets');
        assert(digest(readFileSync(full))===e.sha256,`Evidence missing/changed: ${e.path}`);
      }
    }
    if(r.status==='PASS') {
      if(item.requiresBrowser)assert(nonempty(r.environment.browser?.name) && nonempty(r.environment.browser?.version),'UI requires actual browser');
      if(/^(AT-|UAT-|REL-)/.test(r.id))assert(nonempty(r.signoff),'AT/UAT/review requires explicit sign-off');
      if(r.id==='TC-074') {
        for(const name of manifest.browserMatrix.browsers)for(const band of manifest.browserMatrix.versions)
          assert(r.browserCoverage?.some(b=>b.name===name && b.band===band && nonempty(b.version) && nonempty(b.os) && nonempty(b.device) && ['real','emulated'].includes(b.mode)),`Browser coverage missing ${name}/${band}`);
      }
    }
  }
  return {records:data.records.length,defects:data.defects.length,result:'PASS'};
}

function requiredProfile(manifest,item) {
  if(item.requiredProfile)return item.requiredProfile;
  if(item.profiles)return item.profiles.includes('windows-sqlserver2022')?'windows-sqlserver2022':item.profiles.includes('sqlserver2022')?'sqlserver2022':item.profiles[0];
  const childProfiles=item.cases.map(id=>manifest.cases.find(tc=>tc.id===id).requiredProfile);
  return childProfiles.includes('windows-sqlserver2022')?'windows-sqlserver2022':childProfiles.includes('sqlserver2022')?'sqlserver2022':'pure-node22';
}
function acceptableProfile(required,actual) {
  if(required==='pure-node22')return true;
  if(required==='sqlserver2022')return ['sqlserver2022','windows-sqlserver2022'].includes(actual);
  return required===actual;
}
export function evaluateGates(manifest,data,{build,sourceSha256,taskStatuses=statuses()}={}) {
  const matching=data.records.filter(r=>r.build===build && r.sourceSha256===sourceSha256);
  const findStatus=(item)=>{
    const required=requiredProfile(manifest,item);
    const records=matching.filter(r=>r.id===item.id);
    // A failed or blocked result on the same build cannot be masked by another profile PASS.
    if(records.some(r=>r.status==='FAIL'))return 'FAIL';
    if(records.some(r=>r.status==='BLOCKED'))return 'BLOCKED';
    return records.some(r=>r.status==='PASS' && acceptableProfile(required,r.profile))?'PASS':'NOT_RUN';
  };
  const pending=all(manifest).filter(x=>findStatus(x)!=='PASS').map(x=>({id:x.id,result:findStatus(x),requiredProfile:requiredProfile(manifest,x)}));
  const unfinished=manifest.tasks.filter(t=>t.id!=='T-077' && taskStatuses.get(t.id)!=='DONE').map(t=>t.id);
  const defects=data.defects.filter(d=>d.status==='OPEN' && ['Critical','Major'].includes(d.severity)).map(d=>d.id);
  const summary=pending.some(x=>x.result==='FAIL')?'FAIL':pending.some(x=>x.result==='BLOCKED')||defects.length?'BLOCKED':pending.length||unfinished.length?'NOT_RUN':'PASS';
  const candidatePending=manifest.reviews.filter(x=>manifest.gates.candidate.requiredReviews.includes(x.id) && findStatus(x)!=='PASS').map(x=>x.id);
  const g0Pending=manifest.gates.G0.tasks.filter(id=>taskStatuses.get(id)!=='DONE');
  return {G0:{result:g0Pending.length?'NOT_RUN':'PASS',pendingTasks:g0Pending},
    candidate:{result:candidatePending.length?'NOT_RUN':'PASS',pendingReviews:candidatePending,purpose:'Test candidate only; pending full release results must accompany it'},
    final:{result:summary,pending,unfinishedTasks:unfinished,openCriticalMajorDefects:defects},
    production:{result:summary,ownerAction:'Owner deploys; no production action performed by this checker'},
    note:'Gate evaluation verifies recorded evidence completeness, not the truth of a manual test. Owner sign-off and actual expected results remain required.'};
}
export function taskReadiness(manifest,taskStatuses=statuses()) {
  return manifest.tasks.map(t=>({id:t.id,status:taskStatuses.get(t.id),effort:t.effort,
    readiness:taskStatuses.get(t.id)==='DONE'?'DONE':t.dependencies.every(id=>taskStatuses.get(id)==='DONE')?'READY':'WAIT_DEPENDENCY',
    pendingDependencies:t.dependencies.filter(id=>taskStatuses.get(id)!=='DONE')}));
}
if(process.argv[1]?.endsWith('/check-test-plan.mjs')) {
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i+=2) {
    assert(['--build','--source-sha256','--results'].includes(args[i]) && args[i+1], 'Use --build ID --source-sha256 HASH [--results PATH]');
    assert(!options[args[i]],'Duplicate option'); options[args[i]]=args[i+1];
  }
  if(options['--build']||options['--source-sha256'])assert(nonempty(options['--build']) && sha(options['--source-sha256']),'Both build and source hash required');
  const manifest=JSON.parse(readFileSync('tests/test-manifest.json','utf8'));
  const records=JSON.parse(readFileSync(options['--results']??'tests/execution-records.json','utf8'));
  const inventory=checkManifest(manifest),evidence=validateRecords(manifest,records);
  const gates=evaluateGates(manifest,records,{build:options['--build'],sourceSha256:options['--source-sha256']}),readiness=taskReadiness(manifest);
  console.log(JSON.stringify({inventory,evidence,gates:{G0:gates.G0,candidate:gates.candidate,final:{result:gates.final.result,pending:gates.final.pending.length},production:{result:gates.production.result}},ready:readiness.filter(t=>t.readiness==='READY').map(t=>({id:t.id,effort:t.effort}))}));
  if(options['--build'] && gates.final.result!=='PASS')process.exitCode=1;
}
