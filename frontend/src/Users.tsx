import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  apiClient,
  ApiError,
  setupReplySchema,
  userPageSchema,
  type Self,
  type AdminUser,
} from './api';
import { currentPassword, newPassword, username, displayName, failureMessage } from './auth-policy';
import { Field, Form, DataTable, Dialog, Loading, Toast } from './shared/components';
import { loadJobTitles, type JobTitle } from './admin-api';
const client = apiClient();
type Action = 'create' | 'edit' | 'active' | 'reset';
export function Users({
  self,
  online,
  onFailure,
  onSelfChange,
}: {
  self: Self;
  online: boolean;
  onFailure: (error: ApiError) => void;
  onSelfChange: () => void;
}) {
  const [data, setData] = useState<z.infer<typeof userPageSchema>>(),
    [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState('all'),
    [titleFilter, setTitleFilter] = useState(''),
    [titles, setTitles] = useState<JobTitle[]>([]),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState(''),
    [action, setAction] = useState<{ kind: Action; user?: AdminUser }>();
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
      q: search,
      ...(filter === 'all' ? {} : { active: filter }),
      ...(titleFilter ? { job_title: titleFilter } : {}),
    });
    void loadJobTitles(controller.signal, true)
      .then((t) => {
        if (!controller.signal.aborted) setTitles(t);
      })
      .catch(() => {
        /* the directory request reports failures */
      });
    void client
      .request('/api/users?' + params, {
        signal: controller.signal,
        parse: (v) => userPageSchema.parse(v),
      })
      .then((v) => {
        if (!controller.signal.aborted) {
          setData(v);
          setLoading(false);
          setFailure('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setData(undefined);
          setLoading(false);
          setFailure(failureMessage(e));
          if (e instanceof ApiError) onFailure(e);
        }
      });
    return () => controller.abort();
  }, [page, search, filter, titleFilter, reload, self.view_revision, onFailure]);
  return (
    <div>
      <h2>Organization users</h2>
      {notice && <Toast>{notice}</Toast>}
      {failure && <p role="alert">{failure}</p>}
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setData(undefined);
          setSearch(q);
          setPage(1);
          setReload((n) => n + 1);
        }}
      >
        <Field
          label="Search users"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <label>
          Status{' '}
          <select
            value={filter}
            onChange={(e) => {
              setData(undefined);
              setLoading(true);
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="true">Activate</option>
            <option value="false">Deactivate</option>
          </select>
        </label>
        <label>
          Job title{' '}
          <select
            aria-label="Filter by job title"
            value={titleFilter}
            onChange={(e) => {
              setData(undefined);
              setLoading(true);
              setTitleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All titles</option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_active ? '' : ' (Inactive)'}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!online}>Search</button>
      </form>
      <button disabled={!online || self.maintenance} onClick={() => setAction({ kind: 'create' })}>
        Add user
      </button>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <DataTable
              caption="User directory"
              columns={['Username', 'Display name', 'Job title', 'Access', 'Status', 'Management']}
              rows={data.items.map((u) => [
                u.username,
                u.display_name,
                u.job_title ?? '—',
                u.org_role,
                u.active ? 'Activate' : 'Deactivate',
                <div className="row-actions" key={u.id}>
                  <button
                    disabled={!online || self.maintenance}
                    onClick={() => setAction({ kind: 'edit', user: u })}
                  >
                    Edit {u.username}
                  </button>
                  <button
                    disabled={!online || self.maintenance}
                    onClick={() => setAction({ kind: 'active', user: u })}
                  >
                    {u.active ? 'Deactivate' : 'Activate'} {u.username}
                  </button>
                  <button
                    disabled={!online || self.maintenance}
                    onClick={() => setAction({ kind: 'reset', user: u })}
                  >
                    Reset password {u.username}
                  </button>
                  {u.must_change_password && <span>Password change required</span>}
                </div>,
              ])}
            />
            <div className="toolbar">
              <button
                disabled={page === 1 || !online}
                onClick={() => {
                  setData(undefined);
                  setLoading(true);
                  setPage((n) => n - 1);
                }}
              >
                Previous page
              </button>
              <span>
                Page {page} · Total {data.total} people
              </span>
              <button
                disabled={page * data.pageSize >= data.total || !online}
                onClick={() => {
                  setData(undefined);
                  setLoading(true);
                  setPage((n) => n + 1);
                }}
              >
                Next page
              </button>
            </div>
          </>
        )
      )}
      {action && (
        <UserAction
          key={action.kind + String(action.user?.id)}
          {...action}
          titles={titles}
          self={self}
          online={online}
          onFailure={onFailure}
          onClose={() => setAction(undefined)}
          onDone={(text) => {
            setAction(undefined);
            setNotice(text);
            setReload((n) => n + 1);
            onSelfChange();
          }}
        />
      )}
    </div>
  );
}
function UserAction({
  kind,
  user,
  titles,
  self,
  online,
  onClose,
  onDone,
  onFailure,
}: {
  kind: Action;
  user?: AdminUser;
  titles: JobTitle[];
  self: Self;
  online: boolean;
  onClose: () => void;
  onDone: (text: string) => void;
  onFailure: (e: ApiError) => void;
}) {
  const [current, setCurrent] = useState(user),
    [name, setName] = useState(user?.display_name ?? ''),
    [login, setLogin] = useState(''),
    [role, setRole] = useState(user?.org_role ?? 'member'),
    [jobTitle, setJobTitle] = useState(user?.job_title_id ? String(user.job_title_id) : ''),
    [temp, setTemp] = useState(''),
    [admin, setAdmin] = useState(''),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState(''),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false);
  const busy = useRef(false),
    controller = useRef<AbortController>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const title =
    kind === 'create'
      ? 'Add user'
      : `${kind === 'edit' ? 'Edit' : kind === 'reset' ? 'Reset password' : current?.active ? 'Deactivate' : 'Activate'} ${user!.username}`;
  const load = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setTemp('');
    setAdmin('');
    try {
      const result = await client.request(
        `/api/users?q=${encodeURIComponent(user!.username)}&page=1&pageSize=100`,
        { parse: (v) => userPageSchema.parse(v) },
      );
      const latest = result.items.find((u) => u.id === user!.id);
      if (!latest) throw new ApiError('not-found', 404);
      setCurrent(latest);
      setName(latest.display_name);
      setRole(latest.org_role);
      setJobTitle(latest.job_title_id ? String(latest.job_title_id) : '');
      setConflict(false);
      setFailure('Latest data loaded. Review it and enter the password again before confirming.');
    } catch (e) {
      setFailure(failureMessage(e));
      if (e instanceof ApiError) onFailure(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!busy.current) onClose();
      }}
    >
      <p>
        {kind === 'reset'
          ? 'The user must change their password at the next sign-in. Existing sessions will be revoked.'
          : kind === 'active'
            ? 'Confirm the account status change. Historical data is retained.'
            : kind === 'edit'
              ? 'Username cannot change. Permission changes revoke existing sessions.'
              : 'Enter a temporary password. The user must change it at their first sign-in.'}
      </p>
      {failure && <p role="alert">{failure}</p>}
      {conflict && (
        <button disabled={pending || !online} onClick={() => void load()}>
          Load latest data
        </button>
      )}
      <Form
        pending={pending}
        blocked={conflict}
        offline={!online || self.maintenance}
        submitLabel={kind === 'create' ? 'Create user' : 'Confirm'}
        onSubmit={() => {
          if (busy.current) return;
          const schema =
            kind === 'create'
              ? z.object({
                  username,
                  display_name: displayName,
                  org_role: z.enum(['admin', 'member']),
                  temp_password: newPassword,
                })
              : kind === 'edit'
                ? z.object({
                    display_name: displayName,
                    org_role: z.enum(['admin', 'member']),
                    job_title_id: z.number().int().min(1).nullable(),
                    version: z.number(),
                  })
                : kind === 'reset'
                  ? z.object({
                      admin_password: currentPassword,
                      temp_password: newPassword,
                      version: z.number(),
                    })
                  : z.object({ active: z.boolean(), version: z.number() });
          const input =
            kind === 'create'
              ? { username: login, display_name: name, org_role: role, temp_password: temp }
              : kind === 'edit'
                ? {
                    display_name: name,
                    org_role: role,
                    job_title_id: jobTitle ? Number(jobTitle) : null,
                    version: current!.version,
                  }
                : kind === 'reset'
                  ? { admin_password: admin, temp_password: temp, version: current!.version }
                  : { active: !current!.active, version: current!.version };
          const result = schema.safeParse(input);
          if (!result.success) {
            setErrors(
              Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message])),
            );
            return;
          }
          busy.current = true;
          setPending(true);
          setFailure('');
          setErrors({});
          setTemp('');
          setAdmin('');
          controller.current = new AbortController();
          const path =
            kind === 'create'
              ? '/api/users'
              : `/api/users/${current!.id}${kind === 'reset' ? '/reset-password' : ''}`;
          void client
            .request(path, {
              method: kind === 'create' || kind === 'reset' ? 'POST' : 'PATCH',
              body: result.data,
              csrf: self.csrf,
              signal: controller.current.signal,
              parse: (v) => setupReplySchema.parse(v),
            })
            .then(() =>
              onDone(
                kind === 'reset'
                  ? 'Password reset. The user must change it at their next sign-in.'
                  : 'User saved',
              ),
            )
            .catch((e: unknown) => {
              if (e instanceof Error && e.name === 'AbortError') return;
              setFailure(
                failureMessage(e) +
                  (e instanceof ApiError && ['offline', 'unavailable', 'invalid'].includes(e.kind)
                    ? ' Result is unconfirmed. Refresh the directory before retrying.'
                    : ''),
              );
              if (e instanceof ApiError) {
                setErrors(e.fieldErrors);
                if (e.kind === 'conflict') setConflict(true);
                onFailure(e);
              }
            })
            .finally(() => {
              busy.current = false;
              setPending(false);
            });
        }}
      >
        {kind === 'create' && (
          <Field
            label="New username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            error={errors.username}
            autoComplete="off"
          />
        )}
        {(kind === 'create' || kind === 'edit') && (
          <>
            <Field
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.display_name}
            />
            <label>
              Access{' '}
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {kind === 'edit' && (
              <label>
                Job title{' '}
                <select
                  aria-label="Job title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                >
                  <option value="">No title</option>
                  {titles
                    .filter((t) => t.is_active || String(t.id) === jobTitle)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_active ? '' : ' (Inactive)'}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {kind === 'edit' && (
              <p className="hint">
                Job title is a label only. It never grants or removes permissions.
              </p>
            )}
            {errors.job_title_id && <p role="alert">{errors.job_title_id}</p>}
          </>
        )}
        {(kind === 'create' || kind === 'reset') && (
          <Field
            label="Temporary password"
            type="password"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            error={errors.temp_password}
            autoComplete="new-password"
            hint="6–128 characters"
          />
        )}
        {kind === 'reset' && (
          <Field
            label="Your administrator password"
            type="password"
            value={admin}
            onChange={(e) => setAdmin(e.target.value)}
            error={errors.admin_password}
            autoComplete="current-password"
          />
        )}
      </Form>
    </Dialog>
  );
}
