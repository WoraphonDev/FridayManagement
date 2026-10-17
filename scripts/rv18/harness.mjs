// RV-18 HTTP harness: seeds a synthetic fixture and checks persistence, sessions and recovery routes.
// Runs with plain Node 22 (no project dependencies) so run-rv18.sh can start it in a node container.
// Usage: node harness.mjs <command> <state-dir> [args]
//   seed <setup-token>      setup Admin + Member, team/project/task(Thai)/comment/attachment; save state
//   check-persist           data, org name, attachment bytes, Member 403 on org PATCH, live/ready bodies
//   writer <seconds>        create tasks in a loop (used while a backup runs); reports ok/failed counts
//   check-old-session [who] sessions captured by `seed` (admin, member, or both) must now be 401
//   check-restored          against FRIDAY_URL of the restored instance: same rows/bytes, old sessions 401
//   probe-recovery          no unauthenticated password/admin recovery route exists
// FRIDAY_URL is the base URL (default https://$FRIDAY_HOST). FRIDAY_INSECURE_TLS=1 accepts Caddy's internal CA.
// State (passwords/cookies of the synthetic fixture) is written 0600 under <state-dir>; delete it after the run.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [command, stateDir, arg] = process.argv.slice(2);
if (!command || !stateDir) throw new Error('Usage: harness.mjs <command> <state-dir> [arg]');
if (process.env.FRIDAY_INSECURE_TLS === '1') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const base = process.env.FRIDAY_URL ?? `https://${process.env.FRIDAY_HOST}`;
const origin = process.env.FRIDAY_ORIGIN ?? base;
const statePath = join(stateDir, 'harness-state.json');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

function client() {
  const s = { cookie: '', csrf: '' };
  async function req(path, { method = 'GET', body, form, raw = false } = {}) {
    const headers = { Origin: origin };
    if (s.cookie) headers.Cookie = s.cookie;
    if (s.csrf && method !== 'GET') headers['X-CSRF-Token'] = s.csrf;
    if (method === 'POST' || method === 'PATCH') headers['Idempotency-Key'] = randomUUID();
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const r = await fetch(base + path, { method, headers, body: payload, redirect: 'manual' });
    const set = r.headers.getSetCookie();
    if (set.length) s.cookie = set.map((c) => c.split(';')[0]).join('; ');
    if (raw) return { status: r.status, bytes: Buffer.from(await r.arrayBuffer()), text: '' };
    const text = await r.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { status: r.status, json, text };
  }
  async function ok(path, opts) {
    const r = await req(path, opts);
    if (r.status >= 400)
      throw new Error(`${opts?.method ?? 'GET'} ${path} → ${r.status} ${r.json.error?.code ?? ''}`);
    return r.json;
  }
  async function login(username, password) {
    await ok('/api/login', { method: 'POST', body: { username, password } });
    s.csrf = (await ok('/api/me')).csrf;
  }
  return { s, req, ok, login };
}

async function seed(token) {
  if (!token) throw new Error('seed needs the setup token');
  const admin = client();
  const adminPassword = `Rv18-${randomBytes(12).toString('hex')}`;
  const memberPassword = `Rv18-${randomBytes(12).toString('hex')}`;
  await admin.ok('/api/setup', {
    method: 'POST',
    body: {
      token,
      organization_name: 'RV-18 องค์กรทดสอบ',
      username: 'rv18.admin',
      display_name: 'RV18 Admin',
      password: adminPassword,
    },
  });
  await admin.login('rv18.admin', adminPassword);
  const me = (await admin.ok('/api/me')).user;
  const temp = `Tmp-${randomBytes(12).toString('hex')}`;
  const member = (
    await admin.ok('/api/users', {
      method: 'POST',
      body: {
        username: 'rv18.member',
        display_name: 'สมาชิก RV18',
        temp_password: temp,
        org_role: 'member',
      },
    })
  ).item;
  const m = client();
  await m.login('rv18.member', temp);
  await m.ok('/api/password', {
    method: 'POST',
    body: { current_password: temp, new_password: memberPassword },
  });
  await m.login('rv18.member', memberPassword);
  const team = (
    await admin.ok('/api/teams', {
      method: 'POST',
      body: { name: 'ทีมทดสอบ RV18', description: 'synthetic' },
    })
  ).item;
  const project = (
    await admin.ok('/api/projects', {
      method: 'POST',
      body: {
        owner_team_id: team.id,
        name: 'โปรเจกต์กู้คืน',
        description: 'ข้อมูลภาษาไทย 😀 สำหรับ RV-18',
      },
    })
  ).item;
  const task = (
    await admin.ok('/api/tasks', {
      method: 'POST',
      body: {
        project_id: project.id,
        title: 'งานทดสอบการกู้คืน ✓',
        assignee_ids: [me.id],
        due_date: '2026-12-31',
      },
    })
  ).item;
  await admin.ok(`/api/tasks/${task.id}/comments`, {
    method: 'POST',
    body: { body: 'ความคิดเห็นก่อน backup' },
  });
  const fileBytes = Buffer.from(
    `RV-18 fixture ไฟล์แนบ\n${randomBytes(32 * 1024).toString('hex')}\n`,
  );
  const form = new FormData();
  form.append('file', new Blob([fileBytes], { type: 'text/plain' }), 'rv18-fixture.txt');
  const attachment = (await admin.ok(`/api/tasks/${task.id}/attachments`, { method: 'POST', form }))
    .item;
  Object.assign(state, {
    seededAt: new Date().toISOString(),
    admin: { username: 'rv18.admin', password: adminPassword, cookie: admin.s.cookie },
    member: {
      id: member.id,
      username: 'rv18.member',
      password: memberPassword,
      cookie: m.s.cookie,
    },
    org: 'RV-18 องค์กรทดสอบ',
    ids: { team: team.id, project: project.id, task: task.id, attachment: attachment.id },
    task: { title: task.title },
    attachmentSha256: sha(fileBytes),
  });
  save();
  check(
    'seed fixture created',
    true,
    `task #${task.id}, attachment #${attachment.id}, sha256 ${state.attachmentSha256.slice(0, 12)}…`,
  );
}

async function verifyData(label) {
  const admin = client();
  await admin.login(state.admin.username, state.admin.password);
  const task = (await admin.ok(`/api/tasks/${state.ids.task}`)).item;
  check(
    `${label}: task title (Thai/Unicode) unchanged`,
    task.title === state.task.title,
    task.title,
  );
  const list = (await admin.ok(`/api/tasks/${state.ids.task}/comments`)).items;
  check(
    `${label}: comment present`,
    list.some((c) => c.body === 'ความคิดเห็นก่อน backup'),
    `${list.length} comment(s)`,
  );
  const dl = await admin.req(`/api/attachments/${state.ids.attachment}/download`, { raw: true });
  check(
    `${label}: attachment bytes match sha256`,
    dl.status === 200 && sha(dl.bytes) === state.attachmentSha256,
    `HTTP ${dl.status}`,
  );
  const org = (await admin.ok('/api/organization')).item;
  check(`${label}: organization name persisted`, org.name === state.org, org.name);
  return admin;
}

async function checkPersist() {
  const admin = await verifyData('after restart');
  const m = client();
  await m.login(state.member.username, state.member.password);
  const org = (await admin.ok('/api/organization')).item;
  const patch = await m.req('/api/organization', {
    method: 'PATCH',
    body: { name: 'hijack', version: org.version },
  });
  check('Member cannot rename organization', patch.status === 403, `HTTP ${patch.status}`);
  const live = await admin.req('/health/live');
  check(
    '/health/live reveals no paths/secrets',
    live.status === 200 && !/\/(data|logs|var|home)|password|postgres/i.test(live.text),
    live.text.slice(0, 80),
  );
}

async function writer(seconds) {
  const admin = client();
  await admin.login(state.admin.username, state.admin.password);
  const end = Date.now() + Number(seconds || 30) * 1000;
  let ok = 0;
  const failed = {};
  while (Date.now() < end) {
    const r = await admin.req('/api/tasks', {
      method: 'POST',
      body: { project_id: state.ids.project, title: `writer ${Date.now()}` },
    });
    if (r.status < 400) ok++;
    else failed[r.status] = (failed[r.status] ?? 0) + 1;
    await new Promise((res) => setTimeout(res, 100));
  }
  console.log(JSON.stringify({ writerOk: ok, writerFailedByStatus: failed }));
  check(
    'writer saw only success or clean maintenance refusals (503)',
    Object.keys(failed).every((k) => k === '503'),
    JSON.stringify(failed),
  );
}

async function checkOldSession(only) {
  for (const who of only ? [only] : ['admin', 'member']) {
    const c = client();
    c.s.cookie = state[who].cookie;
    const r = await c.req('/api/me');
    check(`pre-backup ${who} session rejected`, r.status === 401, `HTTP ${r.status}`);
  }
}

async function checkRestored() {
  await verifyData('restored instance');
  await checkOldSession();
}

async function probeRecovery() {
  const paths = [
    '/api/recover',
    '/api/recovery',
    '/api/password/reset',
    '/api/password/forgot',
    '/api/admin/recover',
    '/api/reset-password',
  ];
  for (const p of paths) {
    const r = await client().req(p, { method: 'POST', body: { username: 'rv18.admin' } });
    check(
      `no public recovery route ${p}`,
      [401, 403, 404, 405].includes(r.status),
      `HTTP ${r.status}`,
    );
  }
}

const commands = {
  seed: () => seed(arg),
  'check-persist': checkPersist,
  writer: () => writer(arg),
  'check-old-session': () => checkOldSession(arg),
  'check-restored': checkRestored,
  'probe-recovery': probeRecovery,
};
if (!commands[command]) throw new Error(`Unknown command ${command}`);
try {
  await commands[command]();
} catch (e) {
  check(`${command} completed`, false, e.message);
}
writeFileSync(
  join(stateDir, `harness-${command}.json`),
  JSON.stringify({ command, at: new Date().toISOString(), checks }, null, 2) + '\n',
);
process.exitCode = checks.every((c) => c.result === 'PASS') ? 0 : 1;
