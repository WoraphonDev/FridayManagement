import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { fixture, login, call, origin, projectVersion, type F, type Session } from './http-fixture.js';
import { sessionFixture } from '../sessions/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import type { Database, Statement, Transaction } from '../../src/domain/database.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { tokenDigest } from '../../src/security/session-cookie.js';

// Partial TC-023/087/088/089, AT-07/08/32. Same real HTTP/session/service suite per provider.
export async function seedDirectory(f: F) {
  await f.db.transaction(async tx => {
    let next=3;
    for (const name of ['OwnerLead','Candidate ไทย😀','OtherLead','Inactive','OtherManager','SecondAdmin','Literal %_\\[','  spaced  '])
      await tx.execute(sql("INSERT INTO dbo.users(username,display_name,password_hash,org_role,must_change_password) SELECT @username,@name,password_hash,'member',0 FROM dbo.users WHERE id=2", {name,username:`Dir${next++}`}));
    for(let id=3;id<=10;id++) await tx.execute(insert('user_view_revisions',{user_id:id,revision:randomUUID()}));
    await tx.execute(sql("UPDATE dbo.users SET active=0 WHERE id=6"));
    await tx.execute(sql("UPDATE dbo.users SET org_role='admin' WHERE id=8"));
    for(const [user,team,role] of [[3,1,'lead'],[5,2,'lead'],[4,1,'member'],[4,2,'member']] as const)
      await tx.execute(insert('team_members',{user_id:user,team_id:team,team_role:role}));
    for(const [user,project,access] of [[2,1,'manager'],[3,1,'editor'],[4,1,'editor'],[5,1,'viewer'],[6,1,'viewer'],[7,2,'manager'],[8,1,'viewer']] as const)
      await tx.execute(insert('project_members',{user_id:user,project_id:project,access,added_by:1}));
    for(const user of [2,7]) for(const key of ['P-01','P-03'])
      await tx.execute(insert('user_permissions',{user_id:user,permission_key:key,granted_by:1,granted_at:f.clock().toISOString()}));
  });
}
export const proofFor = (s: Awaited<ReturnType<typeof login>>, userId=2) => ({userId,tokenHash:tokenDigest(s.cookie.slice(s.cookie.indexOf('=')+1))});
// Usernames from seedDirectory: Dir3 OwnerLead … Dir10 spaced.
const P03_POOL=[4,5,7,9,10], PRIVILEGED_POOL=[2,4,5,7,9,10];
const ids=(r:{body:{items:{id:number}[]}})=>r.body.items.map(u=>u.id);
const code=(r:{body:{error?:{code?:string}}})=>r.body.error?.code;
const one=async<R>(f:F,text:string,parameters:Record<string,string|number|null>={})=>(await f.db.transaction(tx=>tx.query<Record<string,string|number|null>>(sql(text,parameters))))[0] as R;
const version=async(f:F,table:'teams'|'users',id:number)=>Number((await one<{version:number}>(f,`SELECT version FROM dbo.${table} WHERE id=@id`,{id})).version);
async function raw(base:string,path:string,cookie?:string){
  const r=await fetch(base+path,{headers:cookie?{Cookie:cookie}:{}}); const text=await r.text();
  return {status:r.status,body:text?JSON.parse(text):text};
}
async function permissions(base:string,admin:Session,user:number,keys:string[]){
  const current=await call(base,admin,`/api/users/${user}/permissions`); assert.equal(current.status,200);
  const r=await call(base,admin,`/api/users/${user}/permissions`,'PUT',{keys,permissions_version:current.body.permissions_version});
  assert.equal(r.status,200,JSON.stringify(r.body));
}
/** Domain rows a guard denial/fault must leave untouched (session/rate-limit bookkeeping excluded). */
async function snapshot(f:F){
  return f.db.transaction(async tx=>{
    const q=(text:string)=>tx.query(sql(text));
    return JSON.stringify({
      members:await q('SELECT project_id,user_id,access FROM dbo.project_members ORDER BY project_id,user_id'),
      projects:await q('SELECT id,version,updated_at FROM dbo.projects ORDER BY id'),
      tasks:await q('SELECT id,assignee_id,version FROM dbo.tasks ORDER BY id'),
      assignees:await q('SELECT task_id,user_id FROM dbo.task_assignees ORDER BY task_id,user_id'),
      subtasks:await q('SELECT id,assignee_id,version FROM dbo.subtasks ORDER BY id'),
      favorites:await q('SELECT user_id,project_id FROM dbo.user_favorites ORDER BY user_id,project_id'),
      audit:await q('SELECT id FROM dbo.admin_events ORDER BY id'),
      events:await q('SELECT id FROM dbo.task_events ORDER BY id'),
      notifications:await q('SELECT id FROM dbo.notifications ORDER BY id'),
      revisions:await q('SELECT user_id,revision FROM dbo.user_view_revisions ORDER BY user_id'),
    });
  });
}

/** Test-local seam: delegates every statement to the real provider transaction. */
type Probe={statement?:(text:string,phase:'before'|'after',local:Record<string,unknown>)=>void|Promise<void>;enter?:()=>void};
export const probe:{current?:Probe}={};
export function controlled(factory:(initial?:boolean)=>Promise<Fixture>){
  return async(initial?:boolean):Promise<Fixture>=>{
    const f=await factory(initial), real:Database=f.db;
    const db:Database={provider:real.provider,close:()=>real.close(),
      transaction:(work)=>{probe.current?.enter?.(); return real.transaction(tx=>{
        const local:Record<string,unknown>={};
        const hook=(s:Statement,phase:'before'|'after')=>probe.current?.statement?.(s.sqlserver,phase,local);
        const wrapped:Transaction={
          execute:async s=>{await hook(s,'before'); await tx.execute(s); await hook(s,'after');},
          query:async<R extends Record<string,string|number|null>>(s:Statement)=>{await hook(s,'before'); const r=await tx.query<R>(s); await hook(s,'after'); return r;},
        };
        return work(wrapped);
      });}};
    return {...f,db};
  };
}
function gate(){
  let reach!:()=>void, open!:()=>void;
  const arrived=new Promise<void>(r=>reach=r), released=new Promise<void>(r=>open=r);
  return {arrived,released,reach,open};
}
const within=<T>(p:Promise<T>,label:string,ms=15000)=>Promise.race([p,new Promise<never>((_,j)=>setTimeout(()=>j(new Error(`timeout: ${label}`)),ms).unref())]);
const config=parseConfiguration({NODE_ENV:'test',DB_PROVIDER:'sqlite',DATA_DIR:'/private/tmp/permissions-http',LOG_DIR:'/private/tmp/permissions-log',SQLITE_DB_PATH:'/private/tmp/permissions-http/fixture.sqlite',APP_ORIGIN:origin,COOKIE_SECURE:'true'});
/** Change-first HTTP: hold a selected request after its committed preflight, before execute authorization. */
async function heldApp(factory:(initial?:boolean)=>Promise<Fixture>,work:(base:string,f:F,hold:(match:string)=>ReturnType<typeof gate>)=>Promise<void>){
  const f=await sessionFixture(factory);
  let held:{match:string;g:ReturnType<typeof gate>}|undefined;
  const hooks=await sessionHooks(f.db,{clock:f.clock,cookieSecure:true});
  const authorize=hooks.authorize!;
  hooks.authorize=async c=>{
    const decision=await authorize(c);
    const h=held; if(h&&`${c.method} ${c.request.originalUrl}`===h.match){held=undefined;h.g.reach();await h.g.released;}
    return decision;
  };
  const server=createApp(undefined,config,hooks).listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const address=server.address(); assert(address&&typeof address==='object');
  const gates:ReturnType<typeof gate>[]=[];
  try{ await work(`http://127.0.0.1:${address.port}`,f,match=>{const g=gate();gates.push(g);held={match,g};return g;}); }
  finally{ held=undefined; for(const g of gates) g.open(); server.closeAllConnections(); await new Promise<void>(r=>server.close(()=>r())); await f.close(); }
}
/** Settle outstanding work with a bound so a failed case never leaves a held request/lock behind. */
const drain=(...pending:Promise<unknown>[])=>within(Promise.allSettled(pending),'drain outstanding');
async function changeFirst<T>(g:ReturnType<typeof gate>,request:Promise<T>,change:()=>Promise<unknown>){
  let ok=false;
  try { await within(g.arrived,'held request'); await change(); g.open(); const r=await within(request,'released request'); ok=true; return r; }
  finally { g.open(); if(!ok) await drain(request); }
}
/** Confirm-first: hold inside the real execute transaction at the first matching statement. */
async function confirmFirst<T,U>(match:RegExp,phase:'before'|'after',request:()=>Promise<T>,competitor:()=>Promise<U>){
  const g=gate(), enteredAfterHold=gate(); let armed=true, entered=0;
  probe.current={
    statement:async(text,p)=>{ if(armed&&p===phase&&match.test(text)){armed=false;g.reach();await g.released;} },
    enter:()=>{ if(!armed){ entered++; enteredAfterHold.reach(); } },
  };
  const pending:Promise<unknown>[]=[]; let ok=false;
  try{
    const first=request(); pending.push(first); await within(g.arrived,'confirm hold');
    const second=competitor(); pending.push(second); await within(enteredAfterHold.arrived,'competitor entry');
    assert(entered>=1); g.open();
    const r=await within(Promise.all([first,second]),'both commits'); ok=true; return r;
  } finally {
    armed=false; g.open();
    if(!ok) await drain(...pending);
    probe.current=undefined;
  }
}

export function deliveryDirectorySuite(provider: string, factory: () => Promise<Fixture>, skip: string | false = false) {
  const it=(name:string,fn:()=>Promise<void>)=>test(`${provider}: ${name}`,{skip},fn);
  it('direct service scoped discovery and protected mutations', async () => {
    const f=await sessionFixture(factory);
    try {
      await seedDirectory(f);
      const signed=await f.service.login({username:'Member',password:'  Session-fixture-password  '},'127.0.0.1');
      const proof={userId:2,tokenHash:tokenDigest(signed.token)};
      const svc=workspaceService({clock:f.clock});
      const result=await f.db.transaction(tx=>svc.directory(tx,proof,{project:1}));
      assert.deepEqual(result.items.map(u=>u.id),P03_POOL);
      for(const userId of [1,3,8,2]) for(const remove of [false,true])
        await assert.rejects(f.db.transaction(tx=>svc.projectMember(tx,proof,1,userId,{version:1,...(!remove?{access:'viewer'}:{})},remove,randomUUID())),e=>(e as {code:string}).code==='FORBIDDEN');
      // Direct service: requested manager is still checked after version (no HTTP preflight here).
      await assert.rejects(f.db.transaction(tx=>svc.projectMember(tx,proof,1,9,{version:9,access:'manager'},false,randomUUID())),e=>(e as {code:string}).code==='VERSION_CONFLICT');
      await assert.rejects(f.db.transaction(tx=>svc.projectMember(tx,proof,1,9,{version:1,access:'manager'},false,randomUUID())),e=>(e as {code:string}).code==='FORBIDDEN');
    } finally {await f.close();}
  });
  it('direct service read authorizes before count/items', async () => {
    const f=await sessionFixture(factory);
    try {
      await seedDirectory(f);
      const signed=await f.service.login({username:'Member',password:'  Session-fixture-password  '},'127.0.0.1');
      const proof={userId:2,tokenHash:tokenDigest(signed.token)};
      await f.db.transaction(tx=>tx.execute(sql("DELETE FROM dbo.user_permissions WHERE user_id=2 AND permission_key='P-03'")));
      const reads:string[]=[];
      const svc=workspaceService({clock:f.clock});
      await assert.rejects(f.db.transaction(tx=>svc.directory({execute:s=>tx.execute(s),query:s=>{reads.push(s.sqlserver);return tx.query(s);}},proof,{project:1})),e=>(e as {code:string}).code==='FORBIDDEN');
      assert(!reads.some(s=>/COUNT\(\*\)|SELECT u\.id,u\.display_name/.test(s)),'no candidate count/page read before denial');
      await assert.rejects(f.db.transaction(tx=>svc.directory(tx,proof,{project:2})),e=>(e as {code:string}).code==='NOT_FOUND');
    } finally {await f.close();}
  });
  it('scoped HTTP identity-only discovery and legacy denial', async () => fixture(async (base,f) => {
    await seedDirectory(f); const s=await login(base,'Member');
    const r=await call(base,s,'/api/directory?project=1');
    assert.equal(r.status,200); assert.deepEqual(ids(r),P03_POOL);
    for(const u of r.body.items) assert.deepEqual(Object.keys(u).sort(),['display_name','id']);
    assert.equal(r.body.total,5); assert.equal(r.body.page,1); assert.equal(r.body.pageSize,50);
    assert.equal((await call(base,s,'/api/directory')).status,403);
    const direct=await f.db.transaction(tx=>workspaceService({clock:f.clock}).directory(tx,proofFor(s),{project:1}));
    assert.deepEqual(direct,r.body);
  },factory));
  it('malformed query400 precedes session/password; valid query401/403/404/403 order', async () => fixture(async (base,f) => {
    await seedDirectory(f);
    const bad=['project=','project=0','project=-1','project=%2B1','project=+1','project=01','project=1.0','project=1e2','project=null','project=%201','project=2147483648','project=1,2','project[]=1','project=1&project=1','q=&q=','page=1&page=1','pageSize=10&pageSize=10','project=1&page=0','project=1&page=2147483648','project=1&pageSize=0','project=1&pageSize=101','project=1&team=1','project=1&username=Dir4','project=1&includeInactive=true','project=1&sort=id',`project=1&q=${encodeURIComponent('ก'.repeat(101))}`,`project=1&q=${encodeURIComponent('😀'.repeat(51))}`];
    for(const q of bad){ const r=await raw(base,`/api/directory?${q}`); assert.equal(r.status,400,q); assert.equal(code(r),'INVALID_QUERY',q); }
    const s=await login(base,'Member');
    for(const q of bad.slice(0,3)) assert.equal((await raw(base,`/api/directory?${q}`,s.cookie)).status,400);
    assert.equal((await raw(base,'/api/directory?project=1')).status,401);
    assert.equal((await raw(base,'/api/directory?project=1','friday_session=invalid')).status,401);
    const forced=await login(base,'Dir4');
    await f.db.transaction(tx=>tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=4')));
    const pw=await raw(base,'/api/directory?project=1',forced.cookie);
    assert.equal(pw.status,403); assert.equal(code(pw),'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await raw(base,'/api/directory?project=1&q=0',forced.cookie)).status,403);
    assert.equal((await raw(base,'/api/directory?project=0',forced.cookie)).status,400);
    for(const [p,status] of [[99,404],[2,404],[2147483647,404]] as const){
      const r=await call(base,s,`/api/directory?project=${p}`); assert.equal(r.status,status); assert.equal(r.body.items,undefined); assert.equal(r.body.error.currentVersion,undefined);
    }
  },factory));
  it('scope: Admin/owner Lead/manager+P-03 only; no Lead/global-key/other-project bypass', async () => fixture(async (base,f) => {
    await seedDirectory(f);
    const admin=await login(base), second=await login(base,'Dir8'), ownerLead=await login(base,'Dir3');
    for(const s of [admin,second,ownerLead]){ const r=await call(base,s,'/api/directory?project=1'); assert.equal(r.status,200); assert.deepEqual(ids(r),PRIVILEGED_POOL); assert.equal(r.body.total,6); }
    // Other-team Lead viewing as Viewer: legacy works, scoped forbidden (no any-Lead fast path).
    const otherLead=await login(base,'Dir5');
    assert.equal((await call(base,otherLead,'/api/directory')).status,200);
    const denied=await call(base,otherLead,'/api/directory?project=1'); assert.equal(denied.status,403); assert.equal(denied.body.items,undefined);
    // Other project's manager+P-03 cannot see project 1; own project works with its own pool.
    const otherManager=await login(base,'Dir7');
    assert.equal((await call(base,otherManager,'/api/directory?project=1')).status,404);
    const own=await call(base,otherManager,'/api/directory?project=2'); assert.equal(own.status,200);
    assert(!ids(own).includes(7)&&!ids(own).includes(5)&&!ids(own).includes(1)&&!ids(own).includes(8),'project2 excludes owner Lead/admins/explicit manager');
    // Editor holding a global P-03 key, and manager without P-03, are forbidden on a visible project.
    const editor=await login(base,'Dir4');
    await permissions(base,admin,4,['P-03']);
    assert.equal((await call(base,editor,'/api/directory?project=1')).status,403);
    const s=await login(base,'Member');
    await permissions(base,admin,2,['P-01']);
    const noKey=await call(base,s,'/api/directory?project=1'); assert.equal(noKey.status,403); assert.equal(noKey.body.total,undefined);
    // Job title/team_position never grant scope.
    await f.db.transaction(tx=>tx.execute(sql("UPDATE dbo.team_members SET team_position='pm' WHERE user_id=4")));
    assert.equal((await call(base,editor,'/api/directory?project=1')).status,403);
  },factory));
  it('name-only literal search, Thai/emoji, paging and stable eligible total', async () => fixture(async (base,f) => {
    await seedDirectory(f); const s=await login(base,'Member');
    const get=async(q:string)=>call(base,s,`/api/directory?project=1&${q}`);
    for(const [q,expected] of [['%',[9]],['_',[9]],['%5C',[9]],['%5B',[9]],['%20',[4,9,10]],['%20%20spaced',[10]],[encodeURIComponent('ไทย'),[4]],[encodeURIComponent('😀'),[4]],['Dir',[]],[encodeURIComponent('ทีม'),[]],['',P03_POOL],['Other',[5,7]]] as const){
      const r=await get(`q=${q}`); assert.equal(r.status,200,q); assert.deepEqual(ids(r),expected,q); assert.equal(r.body.total,expected.length,q);
    }
    const p2=await get('pageSize=2&page=2'); assert.deepEqual(ids(p2),[7,9]); assert.equal(p2.body.total,5);
    const p3=await get('pageSize=2&page=3'); assert.deepEqual(ids(p3),[10]); assert.equal(p3.body.total,5);
    for(const page of ['4','2147483647']){ const r=await get(`pageSize=2&page=${page}`); assert.equal(r.status,200); assert.deepEqual(r.body.items,[]); assert.equal(r.body.total,5); }
    const max=await get('pageSize=100'); assert.equal(max.body.pageSize,100); assert.deepEqual(ids(max),P03_POOL);
    // Multi-team identity (user4 in teams1+2) appears once; active target requiring password change stays eligible.
    await f.db.transaction(tx=>tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=9')));
    assert.deepEqual(ids(await get('')),P03_POOL);
  },factory));
  it('scoped GET performs no domain writes', async () => fixture(async (base,f) => {
    await seedDirectory(f); const s=await login(base,'Member'); const before=await snapshot(f);
    const writes:string[]=[];
    probe.current={statement:(text,phase)=>{ if(phase==='before'&&/^\s*(INSERT|UPDATE|DELETE)/i.test(text)&&/project_members|projects|admin_events|user_view_revisions|notifications|task_events|team_members|user_permissions/.test(text)) writes.push(text); }};
    try { for(const q of ['','q=x','page=9']) assert.equal((await call(base,s,`/api/directory?project=1&${q}`)).status,200); }
    finally { probe.current=undefined; }
    assert.deepEqual(writes,[]); assert.equal(await snapshot(f),before);
  },controlled(factory)));
  it('delegated protected PUT/DELETE and stale version order', async () => fixture(async(base,f)=>{
    await seedDirectory(f); const s=await login(base,'Member');
    for(const target of [1,3,8,2]) for(const method of ['PUT','DELETE']) {
      const v=await projectVersion(f), before=await snapshot(f);
      const r=await call(base,s,`/api/projects/1/members/${target}`,method,{version:v,...(method==='PUT'?{access:'viewer'}:{})});
      assert.equal(r.status,403,`${method} ${target}`); assert.equal(await snapshot(f),before);
      assert.equal(r.body.error.currentVersion,undefined);
    }
    const admin=await login(base); await call(base,admin,'/api/projects/1/members/4','PUT',{version:1,access:'viewer'});
    const stale=await call(base,s,'/api/projects/1/members/3','DELETE',{version:1});
    assert.equal(stale.status,409); assert.equal(stale.body.error.currentVersion,2);
    assert.equal((await call(base,s,'/api/projects/1/members/3','DELETE',{version:2})).status,403);
    // HTTP requested manager is denied by actor operation check before version.
    assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:1,access:'manager'})).status,403);
    assert.equal((await call(base,s,'/api/projects/1/members/6','PUT',{version:2,access:'editor'})).status,422);
    assert.equal((await call(base,s,'/api/projects/1/members/99','PUT',{version:2,access:'editor'})).status,404);
    assert.equal((await call(base,s,'/api/projects/1/members/6','DELETE',{version:2})).status,200);
    // Ordinary absent row DELETE stays404 for active and inactive targets; protected absent403.
    assert.equal((await call(base,s,'/api/projects/1/members/6','DELETE',{version:3})).status,404);
    assert.equal((await call(base,s,'/api/projects/1/members/9','DELETE',{version:3})).status,404);
    assert.equal((await call(base,s,'/api/projects/1/members/1','DELETE',{version:3})).status,403);
    // Ordinary P-03 add/update succeeds; privileged authority over protected targets is unchanged.
    assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:3,access:'viewer'})).status,200);
    assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:4,access:'editor'})).status,200);
    assert.equal((await call(base,admin,'/api/projects/1/members/3','PUT',{version:5,access:'viewer'})).status,200);
    assert.equal((await call(base,admin,'/api/projects/1/members/8','DELETE',{version:6})).status,200);
    assert.equal((await call(base,admin,'/api/projects/1/members/2','PUT',{version:7,access:'editor'})).status,200);
  },factory));
  it('protected redundant-row DELETE does not run cleanup; ordinary Editor→Viewer cleanup once', async () => fixture(async(base,f)=>{
    await seedDirectory(f); const s=await login(base,'Member');
    await f.db.transaction(async tx=>{ await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=3 WHERE id=1')); await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=4 WHERE id=2')); });
    const before=await snapshot(f);
    assert.equal((await call(base,s,'/api/projects/1/members/3','DELETE',{version:1})).status,403);
    assert.equal(await snapshot(f),before);
    const ok=await call(base,s,'/api/projects/1/members/4','PUT',{version:1,access:'viewer'}); assert.equal(ok.status,200);
    const events=await f.db.transaction(tx=>tx.query<{task_id:number}>(sql("SELECT task_id FROM dbo.task_events WHERE action='access_cleanup' ORDER BY id")));
    assert.deepEqual(events.map(e=>Number(e.task_id)),[2]);
    assert.equal((await one<{assignee_id:number|null}>(f,'SELECT assignee_id FROM dbo.tasks WHERE id=2')).assignee_id,null);
    assert.equal(Number((await one<{assignee_id:number}>(f,'SELECT assignee_id FROM dbo.tasks WHERE id=1')).assignee_id),3);
  },factory));
  it('cleanup controls: multi-assignee/subtask unassigned once, done history and retained writer untouched', async () => fixture(async(base,f)=>{
    await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
    await f.db.transaction(async tx=>{
      await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=4 WHERE id=1'));
      for(const user of [4,3]) await tx.execute(insert('task_assignees',{task_id:1,user_id:user}));
      await tx.execute(insert('subtasks',{task_id:2,title:'Checklist ไทย',assignee_id:4}));
      await tx.execute(insert('tasks',{project_id:1,title:'Done history',creator_id:1,status:'done',completed_at:f.clock().toISOString(),assignee_id:4}));
      await tx.execute(sql("INSERT INTO dbo.task_assignees(task_id,user_id) SELECT id,4 FROM dbo.tasks WHERE title='Done history'"));
      await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=3 WHERE id=2'));
    });
    const rows=async()=>f.db.transaction(async tx=>({
      assignees:await tx.query(sql('SELECT task_id,user_id FROM dbo.task_assignees ORDER BY task_id,user_id')),
      tasks:await tx.query(sql('SELECT id,assignee_id,version FROM dbo.tasks ORDER BY id')),
      subtasks:await tx.query(sql('SELECT assignee_id,version FROM dbo.subtasks ORDER BY id')),
      events:await tx.query(sql("SELECT task_id FROM dbo.task_events WHERE action='access_cleanup' ORDER BY task_id")),
      recipients:await tx.query(sql('SELECT DISTINCT recipient_id FROM dbo.notifications ORDER BY recipient_id')),
    }));
    const before=await rows();
    // Privileged redundant-row DELETE of the owner Lead: write retained, so no unassignment/cleanup event.
    assert.equal((await call(base,admin,'/api/projects/1/members/3','DELETE',{version:1})).status,200);
    const retained=await rows();
    assert.deepEqual(retained.assignees,before.assignees); assert.deepEqual(retained.tasks,before.tasks); assert.deepEqual(retained.events,[]);
    // Ordinary Editor→Viewer: target removed from non-done work exactly once; done history kept.
    assert.equal((await call(base,s,'/api/projects/1/members/4','PUT',{version:2,access:'viewer'})).status,200);
    const after=await rows(), n=(v:unknown)=>Number(v);
    const doneId=n((before.tasks as {id:number}[])[2]!.id);
    // Task2's retained legacy assignee is normalized into task_assignees by the existing cleanup.
    assert.deepEqual(after.assignees.map(r=>[n(r.task_id),n(r.user_id)]),[[1,3],[2,3],[doneId,4]]);
    assert.equal(n(after.tasks[0]!.assignee_id),3); assert.equal(n(after.tasks[0]!.version),n(before.tasks[0]!.version)+1);
    assert.deepEqual(after.tasks[2],before.tasks[2],'done history unchanged');
    assert.equal(after.subtasks[0]!.assignee_id,null); assert.equal(n(after.subtasks[0]!.version),n(before.subtasks[0]!.version)+1);
    assert.deepEqual(after.events.map(e=>n(e.task_id)),[1,2]);
    const recipients=after.recipients.map(r=>n(r.recipient_id));
    assert(recipients.includes(1)&&recipients.includes(8),'active Admins notified'); assert(!recipients.includes(4));
    // Idempotent: repeating the same role write performs no second cleanup.
    assert.equal((await call(base,s,'/api/projects/1/members/4','PUT',{version:3,access:'viewer'})).status,200);
    assert.deepEqual((await rows()).events,after.events);
  },factory));
  it('change-first: Admin promotion, session expiry, BR-22 last-key demotion, DELETE and target Admin transitions', async () => {
    const actorCases:[string,string,'GET'|'PUT'|'DELETE',(base:string,admin:Session,f:F)=>Promise<unknown>,number][]=[
      ['actor promoted to Admin revokes old session','/api/directory?project=1','GET',async(b,a,f)=>assert.equal((await call(b,a,'/api/users/2','PATCH',{org_role:'admin',version:await version(f,'users',2)})).status,200),401],
      ['actor session expired','/api/projects/1/members/9','PUT',async(_b,_a,f)=>f.setTime('2027-12-31T00:00:00.000Z'),401],
      ['BR-22 last project key revoked','/api/directory?project=1','GET',(b,a)=>permissions(b,a,2,[]),403],
      ['BR-22 last project key revoked before PUT','/api/projects/1/members/9','PUT',(b,a)=>permissions(b,a,2,[]),403],
      ['P-03 revoked before DELETE','/api/projects/1/members/5','DELETE',(b,a)=>permissions(b,a,2,['P-01']),403],
    ];
    for(const [label,path,method,change,status] of actorCases) await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
      const v=await projectVersion(f), g=hold(`${method} ${path}`);
      const r=await changeFirst(g,call(base,s,path,method,method==='GET'?undefined:{version:v,...(method==='PUT'?{access:'viewer'}:{})}),()=>change(base,admin,f));
      assert.equal(r.status,status,label); assert.equal(r.body.items,undefined,label); assert.equal(r.body.error?.currentVersion,undefined,label);
      if(method==='DELETE') assert.equal((await one<{access:string}>(f,'SELECT access FROM dbo.project_members WHERE project_id=1 AND user_id=5')).access,'viewer');
    });
    for(const [label,target,role,expectSame] of [['target promoted to Admin',9,'admin',403],['target demoted from Admin',8,'member',200]] as const)
      await heldApp(factory,async(base,f,hold)=>{
        await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
        const v=await projectVersion(f), g=hold(`PUT /api/projects/1/members/${target}`); let now=0;
        const r=await changeFirst(g,call(base,s,`/api/projects/1/members/${target}`,'PUT',{version:v,access:'editor'}),async()=>{
          assert.equal((await call(base,admin,`/api/users/${target}`,'PATCH',{org_role:role,version:await version(f,'users',target)})).status,200,label);
          now=await projectVersion(f);
        });
        assert.equal(r.status,now===v?expectSame:409,label);
        if(now!==v) assert.equal((await call(base,s,`/api/projects/1/members/${target}`,'PUT',{version:now,access:'editor'})).status,expectSame,`${label} refreshed`);
        assert.equal(ids(await call(base,s,'/api/directory?project=1')).includes(target),role==='member',`${label} pool`);
      });
  });
  it('actor privileged demotion and session revoke: change-first denies, confirm-first earlier write stands', async () => {
    // Change-first: Admin actor (Dir8) demoted → account org_role change revokes sessions → 401, no write.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const actor=await login(base,'Dir8'), admin=await login(base);
      const g=hold('PUT /api/projects/1/members/3'), before=await snapshot(f);
      const r=await changeFirst(g,call(base,actor,'/api/projects/1/members/3','PUT',{version:1,access:'viewer'}),async()=>
        assert.equal((await call(base,admin,'/api/users/8','PATCH',{org_role:'member',version:await version(f,'users',8)})).status,200));
      assert.equal(r.status,401); assert.equal(r.body.error?.currentVersion,undefined);
      assert.deepEqual(JSON.parse(await snapshot(f)).members,JSON.parse(before).members);
    });
    // Change-first: owner-team Lead actor (Dir3) demoted to member → now plain Editor without P-03 → 403.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const actor=await login(base,'Dir3'), admin=await login(base);
      const g=hold('PUT /api/projects/1/members/8');
      const r=await changeFirst(g,call(base,actor,'/api/projects/1/members/8','PUT',{version:1,access:'editor'}),async()=>
        assert.equal((await call(base,admin,'/api/teams/1/members/3','PUT',{team_role:'member',version:await version(f,'teams',1)})).status,200));
      assert.equal(r.status,403); assert.equal(r.body.error?.currentVersion,undefined);
      assert.equal((await one<{access:string}>(f,'SELECT access FROM dbo.project_members WHERE project_id=1 AND user_id=8')).access,'viewer');
      assert.equal((await call(base,actor,'/api/directory?project=1')).status,403);
    });
    // Change-first: actor's own session revoked (logout) between preflight and execute → 401 for GET and PUT.
    for(const [method,path] of [['GET','/api/directory?project=1'],['PUT','/api/projects/1/members/9']] as const)
      await heldApp(factory,async(base,f,hold)=>{
        await seedDirectory(f); const s=await login(base,'Member'), other=await login(base,'Member');
        const g=hold(`${method} ${path}`);
        const r=await changeFirst(g,call(base,s,path,method,method==='PUT'?{version:1,access:'viewer'}:undefined),async()=>
          assert.equal((await call(base,s,'/api/logout','POST')).status<300,true));
        assert.equal(r.status,401,method); assert.equal(r.body.items,undefined);
        // A distinct session of the same actor is unaffected.
        assert.equal((await call(base,other,'/api/directory?project=1')).status,200);
      });
  });
  it('confirm-first: privileged write commits before actor Admin demotion; old session then 401', async () => fixture(async(base,f)=>{
    await seedDirectory(f); const actor=await login(base,'Dir8'), admin=await login(base);
    const userVersion=await version(f,'users',8);
    const [r,c]=await confirmFirst(/^UPDATE dbo\.project_members/,'before',
      ()=>call(base,actor,'/api/projects/1/members/3','PUT',{version:1,access:'viewer'}),
      ()=>call(base,admin,'/api/users/8','PATCH',{org_role:'member',version:userVersion}));
    assert.equal(r.status,200); assert.equal(c.status,200);
    assert.equal((await one<{access:string}>(f,'SELECT access FROM dbo.project_members WHERE project_id=1 AND user_id=3')).access,'viewer');
    assert.equal((await call(base,actor,'/api/directory?project=1')).status,401);
  },controlled(factory)));
  it('confirm-first DELETE commits before actor revoke; subsequent requests deny', async () => fixture(async(base,f)=>{
    await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
    const current=(await call(base,admin,'/api/users/2/permissions')).body.permissions_version;
    const [r,c]=await confirmFirst(/^DELETE FROM dbo\.project_members/,'before',
      ()=>call(base,s,'/api/projects/1/members/5','DELETE',{version:1}),
      ()=>call(base,admin,'/api/users/2/permissions','PUT',{keys:['P-01'],permissions_version:current}));
    assert.equal(r.status,200); assert.equal(c.status,200);
    assert.equal((await f.db.transaction(tx=>tx.query(sql('SELECT user_id FROM dbo.project_members WHERE project_id=1 AND user_id=5')))).length,0);
    assert.equal((await call(base,s,'/api/projects/1/members/4','DELETE',{version:await projectVersion(f)})).status,403);
  },controlled(factory)));
  for(const [label,match,phase] of [
    ['after membership/project update',/^UPDATE dbo\.projects SET version/,'after'],
    ['after cleanup assignment/event persistence',/^INSERT INTO dbo\.task_events/,'after'],
    ['at notification persistence',/^INSERT INTO dbo\.notifications/,'before'],
    ['at admin audit persistence',/^INSERT INTO dbo\.admin_events/,'before'],
    ['after view invalidation before response',/VIEW_INVALIDATED/,'before'],
  ] as const) for(const method of ['PUT','DELETE'] as const) it(`fault ${label} (${method}) rolls back multi-assignee/subtask/favorite effects; success control commits`, async () => fixture(async(base,f)=>{
    await seedDirectory(f); const s=await login(base,'Member');
    // Real effect data for target 4: legacy+multi-assignee task1 (3 retained), subtask on task2, favorite.
    await f.db.transaction(async tx=>{
      await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=4 WHERE id=1'));
      for(const user of [4,3]) await tx.execute(insert('task_assignees',{task_id:1,user_id:user}));
      await tx.execute(insert('subtasks',{task_id:2,title:'Fault subtask',assignee_id:4}));
      await tx.execute(insert('user_favorites',{user_id:4,project_id:1,created_at:f.clock().toISOString()}));
    });
    const body=method==='PUT'?{version:1,access:'viewer'}:{version:1};
    const before=await snapshot(f); let fired=false;
    probe.current={statement:(text,p,local)=>{
      if(/^UPDATE dbo\.user_view_revisions/.test(text)&&p==='after') local.invalidated=true;
      const hit=match.source==='VIEW_INVALIDATED'?local.invalidated===true&&!/user_view_revisions/.test(text):match.test(text)&&p===phase;
      if(hit&&!fired){fired=true;throw new Error('injected directory fault');}
    }};
    let r; try { r=await call(base,s,'/api/projects/1/members/4',method,body); } finally { probe.current=undefined; }
    assert(fired,label); assert(r.status>=500,`${label}: ${r.status}`);
    assert.equal(await snapshot(f),before,`${label}: exact pre-state incl. assignees/subtasks/favorites`);
    const pre=JSON.parse(before), n=(v:unknown)=>Number(v);
    assert.deepEqual(pre.assignees.map((a:{task_id:number;user_id:number})=>[n(a.task_id),n(a.user_id)]),[[1,3],[1,4]]);
    assert.equal(n(pre.subtasks[0].assignee_id),4); assert.equal(pre.favorites.length,1);
    const ok=await call(base,s,'/api/projects/1/members/4',method,body);
    assert.equal(ok.status,200); const after=JSON.parse(await snapshot(f));
    assert.equal(n(after.projects[0].version),2); assert.equal(after.audit.length,pre.audit.length+1);
    assert.equal(after.events.length,pre.events.length+2,'task1 and task2 cleanup events');
    assert(after.notifications.length>pre.notifications.length);
    assert.notDeepEqual(after.revisions,pre.revisions);
    assert.equal(n(after.tasks[0].assignee_id),3,'retained co-assignee becomes legacy assignee');
    assert(!after.assignees.some((a:{user_id:number})=>n(a.user_id)===4));
    assert.equal(after.subtasks[0].assignee_id,null); assert.equal(n(after.subtasks[0].version),n(pre.subtasks[0].version)+1);
    // Viewer keeps read so the favorite stays; DELETE removes visibility and the favorite.
    assert.equal(after.favorites.length,method==='PUT'?1:0);
  },controlled(factory)));
  it('change-first: actor revoke/demotion/removal/inactivation recheck at execute', async () => {
    const cases:[string,string,'GET'|'PUT',(base:string,admin:Session,f:F)=>Promise<unknown>,number][]=[
      ['P-03 revoked (P-01 kept)','/api/directory?project=1','GET',(b,a)=>permissions(b,a,2,['P-01']),403],
      ['P-03 revoked before PUT','/api/projects/1/members/9','PUT',(b,a)=>permissions(b,a,2,['P-01']),403],
      ['demoted to editor','/api/projects/1/members/9','PUT',async(b,a,f)=>assert.equal((await call(b,a,'/api/projects/1/members/2','PUT',{version:await projectVersion(f),access:'editor'})).status,200),403],
      ['membership removed','/api/directory?project=1','GET',async(b,a,f)=>assert.equal((await call(b,a,'/api/projects/1/members/2','DELETE',{version:await projectVersion(f)})).status,200),404],
      ['actor inactivated','/api/directory?project=1','GET',async(b,a,f)=>assert.equal((await call(b,a,'/api/users/2','PATCH',{active:false,version:await version(f,'users',2)})).status,200),401],
    ];
    for(const [label,path,method,change,status] of cases) await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base); const before=await projectVersion(f);
      const g=hold(`${method} ${path}`);
      const r=await changeFirst(g,call(base,s,path,method,method==='PUT'?{version:before,access:'viewer'}:undefined),()=>change(base,admin,f));
      assert.equal(r.status,status,label); assert.equal(r.body.items,undefined,label); assert.equal(r.body.error?.currentVersion,undefined,label);
    });
  });
  it('change-first: actor promoted to owner Lead uses privileged branch', async () => heldApp(factory,async(base,f,hold)=>{
    await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
    const g=hold('PUT /api/projects/1/members/3'); let now=0;
    const r=await changeFirst(g,call(base,s,'/api/projects/1/members/3','PUT',{version:1,access:'viewer'}),async()=>{
      assert.equal((await call(base,admin,'/api/teams/1/members/2','PUT',{team_role:'lead',version:await version(f,'teams',1)})).status,200);
      now=await projectVersion(f);
    });
    assert.equal(r.status,now===1?200:409);
  }));
  it('change-first: target promotion/demotion/inactivation and stale→refreshed review', async () => {
    // Target promoted to owner Lead (team change): same project version → effective-target403.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
      const v=await projectVersion(f), g=hold('PUT /api/projects/1/members/9'); let now=0;
      const r=await changeFirst(g,call(base,s,'/api/projects/1/members/9','PUT',{version:v,access:'viewer'}),async()=>{
        assert.equal((await call(base,admin,'/api/teams/1/members/9','PUT',{team_role:'lead',version:await version(f,'teams',1)})).status,200);
        now=await projectVersion(f);
      });
      assert.equal(r.status,now===v?403:409);
      if(now!==v) assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:now,access:'viewer'})).status,403);
      assert(!ids(await call(base,s,'/api/directory?project=1')).includes(9));
    });
    // Target demoted from owner Lead: ordinary target now editable after (fresh) review.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
      const v=await projectVersion(f), g=hold('PUT /api/projects/1/members/3'); let now=0;
      const r=await changeFirst(g,call(base,s,'/api/projects/1/members/3','PUT',{version:v,access:'viewer'}),async()=>{
        assert.equal((await call(base,admin,'/api/teams/1/members/3','PUT',{team_role:'member',version:await version(f,'teams',1)})).status,200);
        now=await projectVersion(f);
      });
      assert.equal(r.status,now===v?200:409);
      if(now!==v) assert.equal((await call(base,s,'/api/projects/1/members/3','PUT',{version:now,access:'viewer'})).status,200);
    });
    // Target promoted to explicit manager (bumps project version): stale409 first, refreshed review403.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
      await permissions(base,admin,9,['P-01']);
      assert.equal((await call(base,admin,'/api/projects/1/members/9','PUT',{version:1,access:'viewer'})).status,200);
      const g=hold('DELETE /api/projects/1/members/9');
      const r=await changeFirst(g,call(base,s,'/api/projects/1/members/9','DELETE',{version:2}),async()=>
        assert.equal((await call(base,admin,'/api/projects/1/members/9','PUT',{version:2,access:'manager'})).status,200));
      assert.equal(r.status,409); assert.equal(r.body.error.currentVersion,3);
      const fresh=await call(base,s,'/api/projects/1/members/9','DELETE',{version:3});
      assert.equal(fresh.status,403); assert.equal(fresh.body.error.currentVersion,undefined);
    });
    // Target inactivated after selection: GET excludes, PUT422, ordinary DELETE of existing row allowed.
    await heldApp(factory,async(base,f,hold)=>{
      await seedDirectory(f); const s=await login(base,'Member'), admin=await login(base);
      assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:1,access:'viewer'})).status,200);
      const g=hold('PUT /api/projects/1/members/9');
      const inactivate=async()=>assert.equal((await call(base,admin,'/api/users/9','PATCH',{active:false,version:await version(f,'users',9)})).status,200);
      let now=0;
      const r=await changeFirst(g,call(base,s,'/api/projects/1/members/9','PUT',{version:2,access:'editor'}),async()=>{await inactivate();now=await projectVersion(f);});
      assert.equal(r.status,now===2?422:409);
      assert(!ids(await call(base,s,'/api/directory?project=1')).includes(9));
      assert.equal((await call(base,s,'/api/projects/1/members/9','DELETE',{version:now})).status,200);
    });
  });
  it('confirm-first: eligible write commits before target promotion / actor revoke; protected-first403 rolls back before demotion', async () => {
    const run=(work:(base:string,f:F)=>Promise<void>)=>fixture(async(base,f)=>{await seedDirectory(f);await work(base,f);},controlled(factory));
    await run(async(base,f)=>{
      const s=await login(base,'Member'), admin=await login(base);
      const [r,c]=await confirmFirst(/^INSERT INTO dbo\.project_members/,'before',
        ()=>call(base,s,'/api/projects/1/members/9','PUT',{version:1,access:'viewer'}),
        async()=>call(base,admin,'/api/teams/1/members/9','PUT',{team_role:'lead',version:await version(f,'teams',1)}));
      assert.equal(r.status,200); assert.equal(c.status,200);
      assert.equal((await one<{access:string}>(f,'SELECT access FROM dbo.project_members WHERE project_id=1 AND user_id=9')).access,'viewer');
      assert.equal((await call(base,s,'/api/projects/1/members/9','DELETE',{version:await projectVersion(f)})).status,403);
    });
    await run(async(base,f)=>{
      const s=await login(base,'Member'), admin=await login(base);
      const current=(await call(base,admin,'/api/users/2/permissions')).body.permissions_version;
      const [r,c]=await confirmFirst(/^INSERT INTO dbo\.project_members/,'before',
        ()=>call(base,s,'/api/projects/1/members/9','PUT',{version:1,access:'viewer'}),
        ()=>call(base,admin,'/api/users/2/permissions','PUT',{keys:['P-01'],permissions_version:current}));
      assert.equal(r.status,200); assert.equal(c.status,200);
      assert.equal((await call(base,s,'/api/directory?project=1')).status,403);
      assert.equal((await call(base,s,'/api/projects/1/members/9','PUT',{version:await projectVersion(f),access:'editor'})).status,403);
    });
    await run(async(base,f)=>{
      const s=await login(base,'Member'), admin=await login(base);
      const teamVersion=await version(f,'teams',1), before=await snapshot(f);
      const [r,c]=await confirmFirst(/^SELECT user_id FROM dbo\.team_members WHERE team_id=@team AND user_id=@userId AND team_role='lead'/,'after',
        ()=>call(base,s,'/api/projects/1/members/3','PUT',{version:1,access:'viewer'}),
        ()=>call(base,admin,'/api/teams/1/members/3','PUT',{team_role:'member',version:teamVersion}));
      assert.equal(r.status,403); assert.equal(c.status,200);
      const members=JSON.parse(before).members;
      assert.deepEqual(JSON.parse(await snapshot(f)).members,members,'denied PUT left membership unchanged');
      assert.equal((await call(base,s,'/api/projects/1/members/3','PUT',{version:await projectVersion(f),access:'viewer'})).status,200);
    });
  });
}
