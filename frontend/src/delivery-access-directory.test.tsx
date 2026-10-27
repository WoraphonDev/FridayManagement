import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import { selfFixture } from './test-fixtures';
import type { Self } from './api';
import type { Project } from './workspace-api';
const h = vi.hoisted(() => ({
  slots: [] as { value?: unknown; deps?: unknown[]; cleanup?: () => void }[],
  index: 0,
  dirty: false,
  effects: [] as (() => void)[],
  fetch: vi.fn<typeof fetch>(),
  readers: new Set<(signal: AbortSignal) => void | Promise<void>>(),
  path: '/trash',
  writable: true,
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const slot = () => h.slots[h.index++] ?? (h.slots[h.index - 1] = {});
  const changed = (a?: unknown[], b?: unknown[]) =>
    !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  return {
    ...actual,
    useState(initial: unknown) {
      const s = slot();
      if (!('value' in s)) s.value = typeof initial === 'function' ? initial() : initial;
      return [
        s.value,
        (next: unknown) => {
          const value = typeof next === 'function' ? next(s.value) : next;
          if (!Object.is(value, s.value)) {
            s.value = value;
            h.dirty = true;
          }
        },
      ];
    },
    useRef(initial: unknown) {
      const s = slot();
      return s.value ?? (s.value = { current: initial });
    },
    useCallback(fn: unknown, deps: unknown[]) {
      const s = slot();
      if (changed(s.deps, deps)) {
        s.value = fn;
        s.deps = deps;
      }
      return s.value;
    },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const s = slot();
      if (changed(s.deps, deps)) {
        s.deps = deps;
        h.effects.push(() => {
          s.cleanup?.();
          s.cleanup = effect() || undefined;
        });
      }
    },
    // Layout effects run synchronously at commit, before any passive effect or held reply.
    useLayoutEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const s = slot();
      if (changed(s.deps, deps)) {
        s.deps = deps;
        s.cleanup?.();
        s.cleanup = effect() || undefined;
      }
    },
  };
});

vi.mock('./api', async original => {const actual=await original<typeof import('./api')>(); return {...actual,apiClient:()=>actual.apiClient(h.fetch,()=>true)};});
import { MembershipDialog } from './Workspaces';
import { Field, DataTable } from './shared/components';
import * as parsers from './workspace-api';
let self:Self, entity:Project, tree:ReactNode, online:boolean;
const onFailure=vi.fn(), onClose=vi.fn();
const page=(items:unknown[]=[],total=items.length)=>({items,page:1,pageSize:10,total});
function render(){h.index=0;h.dirty=false;tree=MembershipDialog({self,entity,online,onFailure,onClose});h.effects.splice(0).forEach(fn=>fn());}
async function flush(){for(let i=0;i<60;i++){await Promise.resolve();if(h.dirty)render();}}
function elements(node:ReactNode):{type:unknown;props:Record<string,unknown>}[]{if(Array.isArray(node))return node.flatMap(elements);if(!isValidElement<{children?:ReactNode}>(node))return [];return [{type:node.type,props:node.props},...elements(node.props.children)];}
const all=()=>elements(tree);
const field=()=>all().find(e=>e.type===Field&&e.props.label==='Search active users')!;
const button=(name:string)=>all().find(e=>e.type==='button'&&e.props.children===name)!;
const users=()=>all().find(e=>e.type==='select'&&e.props['aria-label']==='Users');
const text=()=>JSON.stringify(tree,(_k,v)=>typeof v==='function'?undefined:v);
function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
let reads:(url:URL)=>unknown|Promise<unknown>;
beforeEach(()=>{
 h.slots=[];h.effects=[];h.index=0;h.dirty=false;online=true;onFailure.mockClear();
 self=selfFixture();self.user.id=2;self.user.permission_keys=['P-03'];
 entity={id:1,owner_team_id:1,owner_team_name:'Owner',name:'Project',description:'',project_type:'internal',project_category:'general',code:null,archived_at:null,version:1,created_by:1,created_at:'2026-10-01T00:00:00.000Z',updated_at:'2026-10-01T00:00:00.000Z',effective_access:'manager'};
 reads=url=>url.pathname==='/api/directory'?page([{id:4,display_name:'Private ไทย😀'}]):url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]);
 h.fetch.mockReset();h.fetch.mockImplementation(async input=>new Response(JSON.stringify(await reads(new URL(String(input),'https://fixture.invalid'))),{status:200,headers:{'Content-Type':'application/json','X-Request-Id':'00000000-0000-4000-8000-000000000001'}}));
});
afterEach(()=>{h.slots.forEach(s=>s.cleanup?.());});
test('P-03 uses scoped identity picker and name-only labels',async()=>{
 render();await flush();
 expect(h.fetch.mock.calls.some(([u])=>String(u).includes('/api/directory?')&&String(u).includes('project=1'))).toBe(true);
 expect(users()).toBeDefined();expect(text()).toContain('Private ไทย😀');expect(text()).not.toContain('No team');
});
test('strict candidate parser rejects legacy/private fields',()=>{
 const parser=(parsers as Record<string,unknown>).projectMemberCandidatePage as {safeParse:(v:unknown)=>{success:boolean}};
 expect(parser).toBeDefined();expect(parser.safeParse(page([{id:4,display_name:'ไทย😀'}])).success).toBe(true);
 for(const extra of [{teams:[]},{job_title:null},{active:true},{display_name:'😀'.repeat(51)}])expect(parser.safeParse(page([{id:4,display_name:'Name',...extra}])).success).toBe(false);
});
const member=(id:number,display_name:string,explicit:string|null,effective:string,active=true)=>({user:{id,display_name,active},job_title:null,explicit_access:explicit,effective_access:effective,assignee_eligible:active});
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','X-Request-Id':'00000000-0000-4000-8000-000000000001'}});
const urls=()=>h.fetch.mock.calls.map(([u])=>String(u));
const select=(label:string)=>all().find(e=>e.type==='select'&&e.props['aria-label']===label)!;
const change=(el:{props:Record<string,unknown>},value:string)=>(el.props.onChange as (e:unknown)=>void)({target:{value}});
const click=(el:{props:Record<string,unknown>})=>(el.props.onClick as ()=>void)();
test('Role switch inside scoped Editor/Viewer mode keeps selection; manager mode is a new legacy request',async()=>{
 self.user.org_role='admin';entity={...entity,effective_access:'admin'};
 reads=url=>url.pathname==='/api/directory'?(url.searchParams.has('project')?page([{id:4,display_name:'Scoped'}]):page([{id:4,display_name:'Legacy',job_title:null,teams:[{id:1,name:'Team A'}]}])):url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]);
 render();await flush();
 change(users()!,'4');render();await flush();
 change(select('Role'),'editor');render();await flush();
 expect(text()).toContain('Scoped');expect(users()).toBeDefined();
 expect(button('Set membership').props.disabled).toBe(false);
 const before=urls().filter(u=>u.startsWith('/api/directory')).length;
 change(select('Role'),'manager');render();await flush();
 const directory=urls().filter(u=>u.startsWith('/api/directory'));
 expect(directory.length).toBe(before+1);expect(directory.at(-1)).not.toContain('project=');
 expect(button('Set membership').props.disabled).toBe(true);expect(text()).toContain('Legacy · Team A');
 expect(field().props.placeholder).toBe('Name or username');
});
test('scoped mode: name placeholder, project-bound request, no legacy retry on invalid scoped payload',async()=>{
 reads=url=>url.pathname==='/api/directory'?page([{id:4,display_name:'Leak',teams:[{id:9,name:'Hidden'}]}]):url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]);
 render();await flush();
 expect(field().props.placeholder).toBe('Name');
 const directory=urls().filter(u=>u.startsWith('/api/directory'));
 expect(directory).toHaveLength(1);expect(directory[0]).toContain('project=1');expect(directory[0]).toContain('pageSize=10');
 expect(users()).toBeUndefined();expect(text()).not.toContain('Leak');expect(text()).not.toContain('Hidden');
});
test('held candidate reply is discarded after the query is edited',async()=>{
 const held=deferred<unknown>();let first=true;
 reads=url=>url.pathname==='/api/directory'?(first?(first=false,held.promise):page([])):url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]);
 render();await flush();
 change(field(),'other');render();
 held.resolve(page([{id:4,display_name:'Stale private'}]));await flush();
 expect(text()).not.toContain('Stale private');expect(users()).toBeUndefined();
});
test('held candidate reply is discarded after authority changes (P-03 revoked)',async()=>{
 const held=deferred<unknown>();
 reads=url=>url.pathname==='/api/directory'?held.promise:url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]);
 render();await flush();
 self={...self,user:{...self.user,permission_keys:[]}};render();
 held.resolve(page([{id:4,display_name:'Late private'}]));await flush();
 expect(text()).not.toContain('Late private');
});
for(const status of [401,403,404]) test(`directory ${status} clears private members and candidates`,async()=>{
 h.fetch.mockImplementation(async input=>{const url=new URL(String(input),'https://fixture.invalid');return url.pathname==='/api/directory'?reply(status,{error:{code:'FORBIDDEN'}}):reply(200,url.pathname.endsWith('/members')?{membership_version:1,items:[member(5,'Private member','viewer','viewer')]}:page([entity]));});
 render();await flush();
 expect(text()).not.toContain('Private member');expect(users()).toBeUndefined();
 expect(onFailure).toHaveBeenCalled();expect(text()).toContain('Member data not found');
});
test('503 keeps a persistent safe error without a stale list or unscoped retry',async()=>{
 h.fetch.mockImplementation(async input=>{const url=new URL(String(input),'https://fixture.invalid');return url.pathname==='/api/directory'?reply(503,{error:{code:'SERVICE_NOT_READY'}}):reply(200,url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]));});
 render();await flush();
 expect(users()).toBeUndefined();expect(all().some(e=>e.props.role==='alert')).toBe(true);
 expect(urls().filter(u=>u.startsWith('/api/directory')).every(u=>u.includes('project=1'))).toBe(true);
});
test('scoped picker shows loading, then a failed state, and a successful retry clears the error',async()=>{
 const held=deferred<Response>();let calls=0;
 h.fetch.mockImplementation(async input=>{const url=new URL(String(input),'https://fixture.invalid');
  if(url.pathname!=='/api/directory')return reply(200,url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]));
  calls++;return calls===1?held.promise:reply(200,page([{id:4,display_name:'Recovered'}]));});
 render();await flush();
 expect(text()).toContain('Loading users…');
 held.resolve(reply(503,{error:{code:'SERVICE_NOT_READY'}}));await flush();
 expect(text()).toContain('Users unavailable');expect(text()).not.toContain('Loading users…');
 const form=all().find(e=>e.type==='form')!;(form.props.onSubmit as (e:unknown)=>void)({preventDefault(){}});render();await flush();
 expect(calls).toBe(2);expect(text()).toContain('Recovered');expect(text()).not.toContain('Users unavailable');
 expect(all().some(e=>e.props.role==='alert')).toBe(false);
});
test('P-03 row actions hide effective Admin/Lead and explicit manager; ordinary inactive Remove remains',async()=>{
 reads=url=>url.pathname==='/api/directory'?page([]):url.pathname.endsWith('/members')?{membership_version:1,items:[
  member(1,'Admin redundant','viewer','admin'),member(3,'Owner lead redundant','editor','lead'),member(7,'Explicit manager','manager','manager'),member(6,'Inactive ordinary','viewer','viewer',false),member(9,'Ordinary editor','editor','editor')]}:page([entity]);
 render();await flush();
 const table=all().find(e=>e.type===DataTable&&e.props.caption==='Members')!;
 const labels=(table.props.rows as ReactNode[][]).map(r=>elements(r.at(-1)).filter(e=>e.type==='button').map(e=>e.props.children));
 expect(labels).toEqual([[],[],[],['Change to Editor','Remove member'],['Change to Viewer','Remove member']]);
});
test('409 on save requires fresh review and never re-sends automatically',async()=>{
 let puts=0;
 h.fetch.mockImplementation(async (input,init)=>{const url=new URL(String(input),'https://fixture.invalid');
  if(init?.method==='PUT'){puts++;return reply(409,{error:{code:'VERSION_CONFLICT',currentVersion:2}});}
  return reply(200,url.pathname==='/api/directory'?page([{id:4,display_name:'Candidate'}]):url.pathname.endsWith('/members')?{membership_version:1,items:[]}:page([entity]));});
 render();await flush();
 change(users()!,'4');render();await flush();
 click(button('Set membership'));render();await flush();
 const save=all().find(e=>e.type==='button'&&typeof e.props.onClick==='function'&&/^(Save|Confirm|Apply|Save changes|Confirm change)/.test(String(e.props.children)));
 expect(save).toBeDefined();click(save!);await flush();await flush();
 expect(puts).toBe(1);expect(text()).toContain('do not retry blindly');
 for(let i=0;i<3;i++){render();await flush();}
 expect(puts).toBe(1);
});
