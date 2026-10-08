import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const target = 'reports/UAT-signoff-template.json';
if (existsSync(target))
  throw new Error('UAT template already exists; refusing to overwrite human input');
const manifest = JSON.parse(readFileSync('tests/test-manifest.json', 'utf8'));
const openapi = JSON.parse(readFileSync('contracts/openapi.json', 'utf8'));
const metadata = {
  formatVersion: 1,
  scope: 'Human sign-off template; no formal execution evidence',
  baseline: '1.1',
  candidateArchive: null,
  candidateSHA256: null,
  build: null,
  sourceManifestSHA256: createHash('sha256')
    .update(readFileSync('tests/test-manifest.json'))
    .digest('hex'),
  environment: 'Windows / SQL Server 2022 required; NOT_RUN',
  reviewer: null,
  date: null,
  formalRecords:
    'tests/execution-records.json (unchanged; append only evidence satisfying release policy)',
  defectPolicy:
    'Record severity, affected criteria, reproduction, redacted evidence, owner, fix build and retest. Empty registry does not prove no Critical/Major defects.',
  acceptance: manifest.acceptance.map((item) => ({
    ...item,
    result: 'NOT_RUN',
    tester: null,
    role: null,
    date: null,
    build: null,
    sourceHash: null,
    steps: [],
    actual: null,
    evidenceFiles: [],
    signoff: null,
  })),
  journeys: manifest.uat.map((item) => ({
    ...item,
    result: 'NOT_RUN',
    tester: null,
    role: null,
    date: null,
    build: null,
    sourceHash: null,
    steps: [],
    actual: null,
    evidenceFiles: [],
    signoff: null,
  })),
  defects: [],
  localReferences: ['TeamFlow_T070_T074_Test_Report.md', 'TeamFlow_T075_T077_Test_Report.md'],
};
writeFileSync(target, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
const screens = [
  ['/', 'frontend/src/Reports.tsx / Auth.tsx / Setup.tsx'],
  ['/my-tasks', 'frontend/src/TaskWorkspace.tsx'],
  ['/projects', 'frontend/src/Workspaces.tsx / ProjectTasks.tsx'],
  ['/calendar', 'frontend/src/TaskWorkspace.tsx / TaskViews.tsx'],
  ['/reports', 'frontend/src/Reports.tsx'],
  ['/notifications', 'frontend/src/Notifications.tsx'],
  ['/teams', 'frontend/src/Workspaces.tsx'],
  ['/trash', 'frontend/src/Trash.tsx'],
  ['/users', 'frontend/src/Users.tsx'],
  ['/settings', 'frontend/src/Auth.tsx / Organization.tsx'],
  ['Table/Gantt/Calendar/Kanban', 'frontend/src/TaskViews.tsx / Kanban.tsx / TaskEditor.tsx'],
];
const coverage = {
  formatVersion: 1,
  scope: 'Mapping only; implementation and acceptance are not implied PASS',
  requirements: manifest.requirementsCoverage,
  operations: Object.entries(openapi.paths).flatMap(([path, methods]) =>
    Object.entries(methods)
      .filter(([method]) => ['get', 'post', 'patch', 'put', 'delete'].includes(method))
      .map(([method, operation]) => ({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId,
        contract: 'contracts/openapi.json',
        result: 'NOT_RUN_FULL_ACCEPTANCE',
      })),
  ),
  screens: screens.map(([path, source]) => ({
    path,
    source,
    result: 'NOT_RUN_FULL_WINDOWS_BROWSER_MATRIX',
  })),
  acceptance: manifest.acceptance.map(({ id, title, tasks, cases, result }) => ({
    id,
    title,
    tasks,
    cases,
    result,
  })),
  counts: { FR: 40, NFR: 8, BR: 18, API: 53, TC: 84, AT: 30, RV: 20, UAT: 5, REL: 4 },
  releases: manifest.reviews,
  formalSignoffs: 'NOT_RUN',
};
if (coverage.operations.length !== 53) throw new Error('API inventory mismatch');
writeFileSync('reports/release-readiness.json', JSON.stringify(coverage, null, 2) + '\n', {
  flag: 'wx',
});
console.log(
  JSON.stringify({
    acceptance: metadata.acceptance.length,
    journeys: metadata.journeys.length,
    operations: coverage.operations.length,
    status: 'NOT_RUN',
  }),
);
