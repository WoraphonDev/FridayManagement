import { readFileSync, writeFileSync } from 'node:fs';
import { variants, fixturePolicy, profiles, uat, reviews, sequencing } from '../tests/test-policy.mjs';

export const rows = (text, prefix) => text.split('\n').filter(line=>new RegExp(`^\\| ${prefix}\\d+ \\|`).test(line)).map(line=>line.split('|').slice(1,-1).map(v=>v.trim()));
const ids = (text, prefix) => [...new Set(text.match(new RegExp(`${prefix}-\\d+`, 'g')) ?? [])];
export function buildTestManifest() {
  const taskText=readFileSync('TeamFlow_Task_v1.0.md','utf8');
  const plan=readFileSync('TeamFlow_Test_Plan_v1.0.md','utf8');
  const casesText=readFileSync('TeamFlow_Test_Cases_v1.0.md','utf8');
  const srs=readFileSync('TeamFlow_SRS_v1.0.md','utf8');
  const responsibility=new Map(rows(plan,'T-').map(r=>[r[0],r]));
  const acceptRows=new Map(rows(taskText,'AT-').map(r=>[r[0],r]));
  const specs=new Map(rows(srs,'AT-').map(r=>[r[0],r]));
  const acceptance=rows(casesText,'AT-').map(r=>({id:r[0],title:specs.get(r[0])[1],expected:specs.get(r[0])[2],trace:specs.get(r[0])[3],
    tasks:ids(acceptRows.get(r[0])[2],'T'), cases:ids(r[1],'TC'), result:'NOT_RUN',
    variants:variants.filter(v=>v.cases.some(id=>ids(r[1],'TC').includes(id))).map(v=>v.id),
    evidence:['all mapped case/variant results on required profiles','explicit AT steps/expected/actual review; case mapping alone is insufficient']}));
  const cases=rows(casesText,'TC-').map(r=>{
    const body=casesText.split(`### ${r[0]} — `)[1]?.split(/\n### TC-|\n## /)[0];
    const acceptanceIds=ids(body.match(/\*\*Acceptance:\*\* ([^\n]+)/)?.[1]??'','AT');
    const needsDB=/Integration|Operations|Performance/.test(r[3]);
    return {id:r[0],priority:r[1],title:r[2],levels:r[3],trace:body.match(/\*\*Trace:\*\* (.*?) ·/)?.[1]??'',
      acceptance:acceptanceIds, tasks:[...new Set(acceptance.filter(a=>a.cases.includes(r[0])).flatMap(a=>a.tasks))],
      source:`TeamFlow_Test_Cases_v1.0.md#${r[0]}`, result:'NOT_RUN',
      requiredProfile:r[0]==='TC-080'?'windows-sqlserver2022':needsDB?'sqlserver2022':'pure-node22',
      requiresBrowser:/UI/.test(r[3]), evidence:['steps/expected/actual for entire case','build/schema/provider/OS/runtime/role/tester/date','redacted HTTP/DB/bytes/UI/operation evidence appropriate to levels']};
  });
  const suites=rows(plan,'UT-').map(r=>({id:r[0],module:r[1],tasks:ids(r[2],'T'),assertions:r[3],result:'NOT_RUN',
    note:r[0]==='UT-01'?'T-003 subset only has separate PASS evidence; T-009/T-026 suite remains unexecuted':r[0]==='UT-18'?'If UI logic is not extracted, required behavior is covered by actual E2E; do not require duplicate unit tests':'planned suite; not executed'}));
  const tasks=rows(taskText,'T-').map(r=>({id:r[0],title:r[1],dependencies:ids(r[2],'T'),effort:r[3],
    suites:ids(responsibility.get(r[0])[2],'UT'),verification:responsibility.get(r[0])[3],
    acceptance:acceptance.filter(a=>a.tasks.includes(r[0])).map(a=>a.id),
    variants:variants.filter(v=>v.tasks.includes(r[0])).map(v=>v.id),
    closureNote:'Run relevant feature checks now; later regression tasks do not replace evidence required for this task.'}));
  const requirementsCoverage=Object.fromEntries(['FR','NFR','BR'].map(prefix=>[prefix,rows(taskText,`${prefix}-`).map(r=>({id:r[0],tasks:ids(r.slice(1).join(' '),'T'),evidenceExpectation:r.slice(1).join(' | ')}))]));
  return {formatVersion:1,ownerTask:'T-004',businessBaseline:'1.1 + approved RD-01–RD-08 + Monday-style addendum (Requirements 1.9, T-078)',runtimeMajor:22,
    sources:['TeamFlow_Requirements_v1.0.md','TeamFlow_SRS_v1.0.md','TeamFlow_Task_v1.0.md','TeamFlow_Test_Plan_v1.0.md','TeamFlow_Test_Cases_v1.0.md'],
    resultPolicy:{statuses:['PASS','FAIL','BLOCKED','NOT_RUN'],notApplicable:'Excluded while current scope is unchanged; owner-approved scope change must revise manifest/gates first.',
      pass:'All steps and expected results actually executed; same candidate build/profile; non-empty actual + existing hashed evidence; AT/UAT/review sign-offs explicitly reviewed.',
      fail:'Actual differs; record defect ID/severity/owner; retest original case and affected regression.',blocked:'Record prerequisite/environment/reason/owner; does not close release gates.',notRun:'No execution result; empty records resolve to NOT_RUN; mapping/checklist/code inspection is never PASS.'},
    profiles,fixturePolicy,tasks,suites,cases,acceptance,variants,uat,reviews,sequencing,requirementsCoverage,
    browserMatrix:{browsers:['Chrome','Edge','Firefox','Safari'],versions:['current','previous'],asOf:'execution date; record exact versions, OS/device and real-device versus emulation'},
    smoke:ids(casesText.match(/\*\*Smoke subset:\*\* ([^\n]+)/)[1],'TC'),
    gates:{G0:{tasks:['T-001','T-002','T-003','T-004'],purpose:'Plan/contract ready for T-005, not application acceptance'},
      candidate:{requiredReviews:['REL-01','REL-02'],purpose:'Labeled test candidate only; include all pending results and known defects; does not close final tasks'},
      final:{requires:'all 99 cases on required profiles + 40 AT sign-offs + all required variants + 5 human UAT journeys + 4 release reviews; no Critical/Major open defects; Windows/SQL2022 evidence; all implementation tasks through T-076 plus T-078–T-091 and manuals complete'},
      production:{requires:'final + owner Windows/HTTPS/service/backup/restore/UAT evidence; owner deploys; no DNS/server actions authorized'}}};
}
if(process.argv[1]?.endsWith('/build-test-manifest.mjs')) {
  const manifest=buildTestManifest(); writeFileSync('tests/test-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({tasks:manifest.tasks.length,cases:manifest.cases.length,acceptance:manifest.acceptance.length,variants:manifest.variants.length}));
}
