import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import {
  apiClient,
  ApiError,
  userPageSchema,
  type AdminUser,
  type PermissionKey,
  type Self,
} from './api';
import {
  jobTitleItem,
  loadCatalog,
  loadJobTitles,
  matrixResult,
  type Catalog,
  type JobTitle,
} from './admin-api';
import { teamPage, type Team } from './workspace-api';
import { failureMessage } from './auth-policy';
import { Users } from './Users';
import { Workspaces } from './Workspaces';
import { DataTable, Dialog, EmptyState, Field, Form, Loading, Toast } from './shared/components';
const client = apiClient();
type Props = {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onSelfChange: () => void;
};
const tabs = ['Members', 'Teams', 'Job titles', 'Permissions'] as const;
type Tab = (typeof tabs)[number];

/** FR-43 Admin center. Every control is advisory; the server rechecks Admin/not-self/version. */
export function AdminCenter(props: Props) {
  const [tab, setTab] = useState<Tab>('Members');
  return (
    <div className="admin-center">
      <h2>Admin center</h2>
      <div role="tablist" aria-label="Admin sections" className="toolbar">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === 'Members' ? (
          <Users {...props} />
        ) : tab === 'Teams' ? (
          <Workspaces kind="teams" {...props} onBoardChange={() => undefined} />
        ) : tab === 'Job titles' ? (
          <JobTitles {...props} />
        ) : (
          <PermissionMatrix {...props} />
        )}
      </div>
    </div>
  );
}

function JobTitles({ self, online, onFailure }: Props) {
  const [items, setItems] = useState<JobTitle[]>(),
    [reload, setReload] = useState(0),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState(''),
    [editing, setEditing] = useState<JobTitle | 'new'>();
  useEffect(() => {
    const c = new AbortController();
    loadJobTitles(c.signal, true)
      .then((v) => {
        if (!c.signal.aborted) {
          setItems(v);
          setFailure('');
        }
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        setFailure(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      });
    return () => c.abort();
  }, [reload, self.view_revision, onFailure]);
  return (
    <section>
      <h3>Job titles</h3>
      <p className="hint">
        Titles are labels for people pickers, members, workload and reports. They never grant
        permissions; use the Permissions tab instead.
      </p>
      {notice && <Toast>{notice}</Toast>}
      {failure && <p role="alert">{failure}</p>}
      <button disabled={!online || self.maintenance} onClick={() => setEditing('new')}>
        Add job title
      </button>
      {!items ? (
        <Loading />
      ) : (
        <DataTable
          caption="Job titles"
          columns={['Title', 'Status', 'Users', 'Order', 'Manage']}
          rows={items.map((t) => [
            <span key={t.id}>
              <span className="title-dot" style={{ background: t.color }} aria-hidden="true" />{' '}
              {t.name}
            </span>,
            t.is_active ? 'Active' : 'Inactive',
            String(t.user_count),
            String(t.sort_order),
            <button
              key={`edit-${t.id}`}
              disabled={!online || self.maintenance}
              onClick={() => setEditing(t)}
            >
              Edit {t.name}
            </button>,
          ])}
        />
      )}
      {editing && (
        <JobTitleDialog
          title={editing === 'new' ? undefined : editing}
          self={self}
          online={online}
          onFailure={onFailure}
          onClose={() => setEditing(undefined)}
          onDone={(text) => {
            setEditing(undefined);
            setNotice(text);
            setReload((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

function JobTitleDialog({
  title,
  self,
  online,
  onFailure,
  onClose,
  onDone,
}: {
  title?: JobTitle;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [name, setName] = useState(title?.name ?? ''),
    [color, setColor] = useState(title?.color ?? '#579bfc'),
    [order, setOrder] = useState(String(title?.sort_order ?? 0)),
    [active, setActive] = useState(title?.is_active ?? true),
    [pending, setPending] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [failure, setFailure] = useState('');
  const key = useRef(crypto.randomUUID());
  return (
    <Dialog title={title ? `Edit ${title.name}` : 'Add job title'} onClose={onClose}>
      {failure && <p role="alert">{failure}</p>}
      <Form
        pending={pending}
        offline={!online || self.maintenance}
        submitLabel={title ? 'Save job title' : 'Create job title'}
        onSubmit={() => {
          const parsed = z
            .object({
              name: z.string().trim().min(1, 'Required').max(50, 'Up to 50 characters'),
              color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use #RRGGBB'),
              sort_order: z.number().int().min(0).max(10000),
            })
            .safeParse({ name, color, sort_order: Number(order) });
          if (!parsed.success) {
            setErrors(
              Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
            );
            return;
          }
          setPending(true);
          setErrors({});
          void client
            .request(title ? `/api/job-titles/${title.id}` : '/api/job-titles', {
              method: title ? 'PATCH' : 'POST',
              csrf: self.csrf,
              ...(title ? {} : { key: key.current }),
              body: title
                ? { ...parsed.data, is_active: active, version: title.version }
                : parsed.data,
              parse: (v) => jobTitleItem.parse(v),
            })
            .then(() => onDone(title ? 'Job title saved' : 'Job title created'))
            .catch((e: unknown) => {
              setFailure(failureMessage(e));
              if (e instanceof ApiError) {
                setErrors(e.fieldErrors);
                onFailure(e);
              }
            })
            .finally(() => setPending(false));
        }}
      >
        <Field
          label="Title name"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Field
          label="Color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          error={errors.color}
        />
        <Field
          label="Sort order"
          type="number"
          min={0}
          max={10000}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          error={errors.sort_order}
        />
        {title && (
          <label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{' '}
            Active (inactive titles stay on existing users but cannot be newly assigned)
          </label>
        )}
      </Form>
    </Dialog>
  );
}

type Row = { user: AdminUser; keys: Set<PermissionKey> };
const presetPmSm = (catalog: Catalog) =>
  new Set(catalog.filter((c) => c.preset_pm_sm).map((c) => c.key));
const sameKeys = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((k) => b.has(k));

async function allUsers(signal: AbortSignal) {
  const items: AdminUser[] = [];
  for (let page = 1; ; page++) {
    const r = await client.request(`/api/users?page=${page}&pageSize=100`, {
      signal,
      parse: (v) => userPageSchema.parse(v),
    });
    items.push(...r.items);
    if (page * r.pageSize >= r.total) return items;
  }
}
async function allTeams(signal: AbortSignal) {
  const items: Team[] = [];
  for (let page = 1; ; page++) {
    const r = await client.request(`/api/teams?page=${page}&pageSize=100`, {
      signal,
      parse: (v) => teamPage.parse(v),
    });
    items.push(...r.items);
    if (page * r.pageSize >= r.total) return items;
  }
}

/** FR-43/AT-33: rows=users × P-01–P-10; bulk preset; summary; all-or-nothing save; stale 409. */
function PermissionMatrix({ self, online, onFailure, onSelfChange }: Props) {
  const [catalog, setCatalog] = useState<Catalog>(),
    [base, setBase] = useState<Row[]>(),
    [draft, setDraft] = useState<Map<number, Set<PermissionKey>>>(new Map()),
    [titles, setTitles] = useState<JobTitle[]>([]),
    [teams, setTeams] = useState<Team[]>([]),
    [team, setTeam] = useState(''),
    [title, setTitle] = useState(''),
    [selected, setSelected] = useState<Set<number>>(new Set()),
    [reload, setReload] = useState(0),
    [failure, setFailure] = useState(''),
    [stale, setStale] = useState<number[]>([]),
    [notice, setNotice] = useState(''),
    [review, setReview] = useState(false),
    [pending, setPending] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      loadCatalog(c.signal),
      allUsers(c.signal),
      loadJobTitles(c.signal, true),
      allTeams(c.signal),
    ])
      .then(([cat, users, t, tm]) => {
        if (c.signal.aborted) return;
        setCatalog(cat);
        setBase(users.map((u) => ({ user: u, keys: new Set(u.permission_keys) })));
        setDraft(new Map());
        setTitles(t);
        setTeams(tm);
        setStale([]);
        setFailure('');
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        setFailure(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      });
    return () => c.abort();
  }, [reload, onFailure]);
  const keysOf = useCallback((row: Row) => draft.get(row.user.id) ?? row.keys, [draft]);
  const visible = useMemo(() => {
    const members = team
      ? new Set(teams.find((t) => String(t.id) === team)?.members?.map((m) => m.user.id) ?? [])
      : undefined;
    return (base ?? []).filter(
      (r) =>
        (!members || members.has(r.user.id)) && (!title || String(r.user.job_title_id) === title),
    );
  }, [base, team, teams, title]);
  const changes = useMemo(
    () =>
      (base ?? []).flatMap((r) => {
        const next = draft.get(r.user.id);
        return next && !sameKeys(next, r.keys) ? [{ row: r, next }] : [];
      }),
    [base, draft],
  );
  const set = (row: Row, keys: Set<PermissionKey>) =>
    setDraft((d) => new Map(d).set(row.user.id, keys));
  const toggle = (row: Row, key: PermissionKey) => {
    const next = new Set(keysOf(row));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    set(row, next);
  };
  const bulk = (keys: Set<PermissionKey>) => {
    for (const r of base ?? [])
      if (selected.has(r.user.id) && r.user.id !== self.user.id) set(r, new Set(keys));
  };
  const save = () => {
    setPending(true);
    setFailure('');
    setNotice('');
    setStale([]);
    void client
      .request('/api/permissions/matrix', {
        method: 'PUT',
        csrf: self.csrf,
        body: {
          changes: changes.map((c) => ({
            user_id: c.row.user.id,
            keys: [...c.next].sort(),
            permissions_version: c.row.user.permissions_version,
          })),
        },
        parse: (v) => matrixResult.parse(v),
      })
      .then((r) => {
        setReview(false);
        setNotice(`Saved permissions for ${r.items.length} user(s). Changes apply immediately.`);
        setSelected(new Set());
        setReload((n) => n + 1);
        onSelfChange();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.kind === 'conflict') {
          setReview(false);
          // All-or-nothing: nothing was saved; name each stale user so the Admin reloads.
          setStale(
            Object.keys(e.fieldErrors)
              .map((k) => Number(k.replace('changes.', '')))
              .filter(Number.isInteger),
          );
          setFailure('No changes were saved. Some users changed meanwhile; reload them first.');
        } else setFailure(failureMessage(e));
        if (e instanceof ApiError) onFailure(e);
      })
      .finally(() => setPending(false));
  };
  if (failure && !base) return <p role="alert">{failure}</p>;
  if (!catalog || !base) return <Loading />;
  const preset = presetPmSm(catalog);
  const nameOf = (id: number) => base.find((r) => r.user.id === id)?.user.display_name ?? `#${id}`;
  return (
    <section>
      <h3>Permission matrix</h3>
      <p className="hint">
        Admin ticks P-01–P-10 per person. Job titles never grant permissions (BR-21). You cannot
        change your own permissions. Admins and team Leads already have these rights.
      </p>
      {notice && <Toast>{notice}</Toast>}
      {failure && <p role="alert">{failure}</p>}
      {stale.length > 0 && (
        <p role="alert">
          Changed by someone else: {stale.map(nameOf).join(', ')}.{' '}
          <button onClick={() => setReload((n) => n + 1)}>Reload matrix</button>
        </p>
      )}
      <div className="toolbar">
        <label>
          Team{' '}
          <select
            aria-label="Filter by team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Job title{' '}
          <select
            aria-label="Filter matrix by job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          >
            <option value="">All titles</option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!selected.size || pending} onClick={() => bulk(preset)}>
          Apply PM/SM preset to selected ({selected.size})
        </button>
        <button disabled={!selected.size || pending} onClick={() => bulk(new Set())}>
          Clear selected
        </button>
        <button
          disabled={!changes.length || pending || !online || self.maintenance}
          onClick={() => setReview(true)}
        >
          Review {changes.length} change(s)
        </button>
        <button disabled={!changes.length || pending} onClick={() => setDraft(new Map())}>
          Discard changes
        </button>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No users match these filters" />
      ) : (
        <div className="table-scroll" role="region" aria-label="Permission matrix" tabIndex={0}>
          <table className="permission-matrix">
            <caption>Permission matrix</caption>
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all visible users"
                    checked={visible.every((r) => selected.has(r.user.id))}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? new Set(
                              visible
                                .filter((r) => r.user.id !== self.user.id)
                                .map((r) => r.user.id),
                            )
                          : new Set(),
                      )
                    }
                  />
                </th>
                <th scope="col">Member</th>
                {catalog.map((c) => (
                  <th key={c.key} scope="col" title={`${c.label} — ${c.description}`}>
                    {c.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const own = r.user.id === self.user.id,
                  keys = keysOf(r),
                  dirty = draft.has(r.user.id) && !sameKeys(keys, r.keys);
                return (
                  <tr key={r.user.id} className={dirty ? 'dirty' : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.user.display_name}`}
                        disabled={own}
                        checked={selected.has(r.user.id)}
                        onChange={(e) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.add(r.user.id);
                            else n.delete(r.user.id);
                            return n;
                          })
                        }
                      />
                    </td>
                    <th scope="row">
                      {r.user.display_name}
                      {r.user.job_title ? ` · ${r.user.job_title}` : ''}
                      {r.user.org_role === 'admin' ? ' · Admin' : ''}
                      {!r.user.active ? ' (Inactive)' : ''}
                      {own ? ' (you — use admin CLI)' : ''}
                      {stale.includes(r.user.id) ? ' — changed elsewhere' : ''}
                    </th>
                    {catalog.map((c) => (
                      <td key={c.key}>
                        <input
                          type="checkbox"
                          aria-label={`${c.key} ${c.label} for ${r.user.display_name}`}
                          disabled={own || pending || self.maintenance}
                          checked={keys.has(c.key)}
                          onChange={() => toggle(r, c.key)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <details>
        <summary>What each permission means</summary>
        <dl>
          {catalog.map((c) => (
            <div key={c.key}>
              <dt>
                {c.key} · {c.label}
              </dt>
              <dd>{c.description}</dd>
            </div>
          ))}
        </dl>
      </details>
      {review && (
        <Dialog
          title="Confirm permission changes"
          onClose={() => !pending && setReview(false)}
          footer={
            <button disabled={pending || !online} onClick={save}>
              {pending ? 'Saving…' : `Save ${changes.length} change(s)`}
            </button>
          }
        >
          <p>All changes are saved together or not at all.</p>
          <ul>
            {changes.map(({ row, next }) => {
              const added = [...next].filter((k) => !row.keys.has(k)).sort(),
                removed = [...row.keys].filter((k) => !next.has(k)).sort(),
                demote =
                  [...row.keys].some((k) => k <= 'P-07') && ![...next].some((k) => k <= 'P-07');
              return (
                <li key={row.user.id}>
                  <strong>{row.user.display_name}</strong>
                  {added.length > 0 && <> · add {added.join(', ')}</>}
                  {removed.length > 0 && <> · remove {removed.join(', ')}</>}
                  {demote && <> · project manager roles become Editor (BR-22)</>}
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
    </section>
  );
}

/** FR-43: a user's own grants, read-only (Settings). */
export function MyPermissions({ self }: { self: Self }) {
  const [catalog, setCatalog] = useState<Catalog>();
  useEffect(() => {
    const c = new AbortController();
    loadCatalog(c.signal)
      .then((v) => !c.signal.aborted && setCatalog(v))
      .catch(() => undefined);
    return () => c.abort();
  }, []);
  return (
    <section aria-labelledby="my-permissions">
      <h2 id="my-permissions">My permissions</h2>
      <p className="hint">Read only. Ask an Admin to change them.</p>
      {self.user.job_title && <p>Job title: {self.user.job_title} (label only)</p>}
      {!catalog ? (
        <Loading />
      ) : (
        <ul className="my-permissions">
          {catalog.map((c) => (
            <li key={c.key}>
              <input
                type="checkbox"
                readOnly
                disabled
                checked={self.user.permission_keys.includes(c.key)}
                aria-label={`${c.key} ${c.label}`}
              />{' '}
              {c.key} · {c.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
