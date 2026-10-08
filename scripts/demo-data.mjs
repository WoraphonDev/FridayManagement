// Local demo data shaped like TeamFlow_UI_Vibe_Preview.html, created through the public API.
// Usage (fresh local SQLite instance only):
//   DEMO_ORIGIN=http://127.0.0.1:43172 SETUP_TOKEN=<console token> DEMO_PASSWORD=<test password> node scripts/demo-data.mjs
// Refuses non-local origins. Every demo account uses DEMO_PASSWORD; members must change it at first sign-in.
import { randomUUID } from 'node:crypto';

const origin = process.env.DEMO_ORIGIN ?? 'http://127.0.0.1:43172';
const token = process.env.SETUP_TOKEN;
const password = process.env.DEMO_PASSWORD;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) throw new Error('Local origin only');
if (!token || !password) throw new Error('SETUP_TOKEN and DEMO_PASSWORD are required');

let cookie = '';
let csrf = '';
async function call(path, body, method = 'POST') {
  const headers = { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (method === 'POST' || method === 'PATCH') headers['Idempotency-Key'] = randomUUID();
  const r = await fetch(origin + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = r.headers.getSetCookie();
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  const json = await r.json().catch(() => ({}));
  if (r.status >= 400) throw new Error(`${method} ${path} ${r.status} ${json.error?.code ?? ''}`);
  return json;
}
const get = (path) => call(path, undefined, 'GET');

await call('/api/setup', {
  token,
  organization_name: 'Digital Workspace',
  username: 'mina.demo',
  display_name: 'Mina',
  password,
});
await call('/api/login', { username: 'mina.demo', password });
csrf = (await get('/api/me')).csrf;
const me = (await get('/api/me')).user;

const people = { Mina: me };
for (const [username, name] of [
  ['ton', 'Ton'],
  ['prae', 'Prae'],
  ['kan', 'Kan'],
])
  people[name] = (
    await call('/api/users', { username, display_name: name, temp_password: password, org_role: 'member' })
  ).item;

async function team(name, description, members) {
  const t = (await call('/api/teams', { name, description })).item;
  for (const [person, role] of members) {
    const version = (await get('/api/teams')).items.find((x) => x.id === t.id).version;
    await call(`/api/teams/${t.id}/members/${people[person].id}`, { team_role: role, version }, 'PUT');
  }
  return t;
}
const digital = await team('Digital Experience', 'Design and development', [
  ['Mina', 'member'],
  ['Ton', 'lead'],
  ['Prae', 'member'],
  ['Kan', 'member'],
]);
const ops = await team('Operations', 'Operations and coordination', [
  ['Mina', 'member'],
  ['Kan', 'lead'],
]);

const web = (
  await call('/api/projects', {
    owner_team_id: digital.id,
    name: 'Website Relaunch',
    description: 'A better website experience for the team',
  })
).item;
const opsProject = (
  await call('/api/projects', {
    owner_team_id: ops.id,
    name: 'Team Operations',
    description: 'Coordinate recurring work and operations',
  })
).item;
const brand = (
  await call('/api/projects', {
    owner_team_id: digital.id,
    name: 'Brand Library',
    description: 'Collect design references',
  })
).item;

async function share(project, names) {
  for (const n of names) {
    const version = (await get(`/api/projects/${project.id}/members`)).membership_version;
    await call(`/api/projects/${project.id}/members/${people[n].id}`, { access: 'editor', version }, 'PUT');
  }
}
await share(web, ['Mina', 'Prae', 'Kan']);
await share(opsProject, ['Mina']);
const group = async (project, name, color) =>
  (await call(`/api/projects/${project.id}/groups`, { name, color })).item;
const plan = await group(web, 'Phase 1 · Planning', '#579bfc');
const build = await group(web, 'Phase 2 · In progress', '#a25ddc');
const launch = await group(web, 'Phase 3 · Launch', '#00c875');
const routine = await group(opsProject, 'Weekly routine', '#fdab3d');

// [group, project, title, category, priority, assignees, start, due, status]
const tasks = [
  [plan, web, 'Review colors and UI components', 'Design', 'medium', ['Mina'], '2026-10-01', '2026-10-06', 'review'],
  [plan, web, 'Weekly progress summary', 'Operations', 'medium', ['Mina'], '2026-10-08', '2026-10-09', 'todo'],
  [plan, web, 'Set up project structure', 'Planning', 'medium', ['Ton'], '2026-09-28', '2026-10-02', 'done'],
  [plan, web, 'Collect team feedback', 'Research', 'low', [], null, null, 'todo'],
  [build, web, 'Redesign the website', 'Design', 'high', ['Mina'], '2026-10-03', '2026-10-09', 'doing'],
  [build, web, 'Prepare service page content', 'Content', 'urgent', ['Prae'], '2026-10-08', '2026-10-12', 'doing'],
  [build, web, 'Verify project access', 'Development', 'medium', ['Ton'], '2026-10-07', '2026-10-07', 'todo'],
  [launch, web, 'Review mobile screens', 'QA', 'high', ['Kan', 'Mina'], '2026-10-12', '2026-10-14', 'todo'],
  [launch, web, 'Share the user guide', 'Content', 'medium', ['Prae'], '2026-10-14', '2026-10-16', 'todo'],
  [launch, web, 'Plan the next iteration', 'Planning', 'medium', ['Mina'], '2026-10-15', null, 'todo'],
  [routine, opsProject, 'Monthly budget check', 'Finance', 'medium', ['Kan'], '2026-10-01', '2026-10-31', 'doing'],
  [routine, opsProject, 'Update on-call rota', 'Operations', 'low', ['Mina'], null, '2026-10-20', 'todo'],
];
for (const [g, project, title, category, priority, who, start_date, due_date, status] of tasks) {
  const t = (
    await call('/api/tasks', {
      project_id: project.id,
      group_id: g.id,
      title,
      category,
      priority,
      assignee_ids: who.map((n) => people[n].id),
      start_date,
      due_date,
    })
  ).item;
  if (status !== 'todo') await call(`/api/tasks/${t.id}`, { version: t.version, status }, 'PATCH');
}
await call(`/api/projects/${brand.id}`, { version: brand.version, archived: true }, 'PATCH');
console.log(`Demo data ready: 3 projects, ${tasks.length} tasks, 4 people`);
