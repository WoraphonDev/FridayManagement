import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiError, type Self } from './api';
import { trashPage, mutationReply, statusLabel } from './task-api';
import { UiIcon } from './shared/UiIcon';
import { DataTable, Dialog, EmptyState, ErrorNotice, Loading, Toast } from './shared/components';
import { useSharedRefresh } from './shared/refresh';
import { projectPage, teamPage, type Project, type Team } from './workspace-api';
const client = apiClient();
export function Trash({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [data, setData] = useState<ReturnType<typeof trashPage.parse>>(),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<ApiError>(),
    [reload, setReload] = useState(0),
    [restore, setRestore] = useState<ReturnType<typeof trashPage.parse>['items'][number]>(),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState('');
  const [restorable, setRestorable] = useState<Set<number>>(new Set());
  const hasP04 = self.user.permission_keys.includes('P-04');
  const busy = useRef(false),
    keys = useRef(new Map<string, string>());
  const epoch = useRef(0),
    denied = useRef(false);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  const clearPrivate = useCallback(() => {
    epoch.current++;
    denied.current = true;
    setData(undefined);
    setRestore(undefined);
    setRestorable(new Set());
    setNotice('');
    keys.current.clear();
    setLoading(false);
  }, []);
  const refresh = () => {
    epoch.current++;
    denied.current = false;
    setRestore(undefined);
    setData(undefined);
    setRestorable(new Set());
    setLoading(true);
    setReload((n) => n + 1);
  };
  const read = useCallback(
    async (signal: AbortSignal) => {
      if (denied.current) return;
      const requestEpoch = epoch.current;
      try {
        const v = await client.request(`/api/trash?page=${page}&pageSize=20`, {
          signal,
          parse: (v) => trashPage.parse(v),
        });
        const projects: Project[] = [],
          teams: Team[] = [];
        // Existing trash DTO has no parent lifecycle/capability flags. Read current, scoped
        // metadata; never infer permissions from catalogue or creator/assignee identity.
        for (let p = 1; ; p++) {
          const list = await client.request(
            `/api/projects?includeArchived=true&pageSize=100&page=${p}`,
            {
              signal,
              parse: (v) => projectPage.parse(v),
            },
          );
          projects.push(...list.items);
          if (p * list.pageSize >= list.total) break;
        }
        if (self.user.org_role !== 'admin') {
          for (let p = 1; ; p++) {
            const list = await client.request(
              `/api/teams?includeArchived=true&pageSize=100&page=${p}`,
              {
                signal,
                parse: (v) => teamPage.parse(v),
              },
            );
            teams.push(...list.items);
            if (p * list.pageSize >= list.total) break;
          }
        }
        if (signal.aborted || requestEpoch !== epoch.current || denied.current) return;
        const allowed = new Set(
          v.items
            .filter((task) => {
              const project = projects.find((p) => p.id === task.project_id);
              if (!project) return false;
              if (['admin', 'lead'].includes(project.effective_access)) return true;
              return (
                project.effective_access === 'manager' &&
                hasP04 &&
                !project.archived_at &&
                !teams.find((t) => t.id === project.owner_team_id)?.archived_at
              );
            })
            .map((t) => t.id),
        );
        setData(v);
        setRestorable(allowed);
        setRestore((previous) => {
          // A changed version needs a fresh explicit confirmation; never silently upgrade it.
          const current = v.items.find((t) => t.id === previous?.id);
          return previous && current?.version === previous.version && allowed.has(previous.id)
            ? previous
            : undefined;
        });
        setLoading(false);
      } catch (e) {
        if (signal.aborted || requestEpoch !== epoch.current) return;
        setData(undefined);
        setRestore(undefined);
        setRestorable(new Set());
        setLoading(false);
        if (e instanceof ApiError) {
          if ([401, 403, 404].includes(e.status)) clearPrivate();
          setError(e);
          onFailure(e);
        }
      }
    },
    [page, self.user.org_role, hasP04, onFailure, clearPrivate],
  );
  useEffect(() => {
    // Reject responses begun under an older authority snapshot.
    epoch.current++;
  }, [self.view_revision]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return read(controller.signal);
    });
    return () => controller.abort();
  }, [read, reload, self.view_revision]);
  useSharedRefresh(read, online, 'trash');
  const run = async () => {
    if (
      !restore ||
      denied.current ||
      busy.current ||
      !online ||
      self.maintenance ||
      !restorable.has(restore.id) ||
      Date.now() >= Date.parse(restore.restore_before)
    )
      return;
    const requestEpoch = epoch.current;
    busy.current = true;
    setPending(true);
    setError(undefined);
    const identity = `${restore.id}:${restore.version}`;
    if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
    try {
      const r = await client.request(`/api/tasks/${restore.id}/restore`, {
        method: 'POST',
        body: { version: restore.version },
        csrf: self.csrf,
        key: keys.current.get(identity),
        parse: (v) => mutationReply.parse(v),
      });
      if (requestEpoch !== epoch.current || denied.current) return;
      setNotice(`Restore task #${r.item.id} complete`);
      setRestore(undefined);
      refresh();
    } catch (e) {
      if (requestEpoch !== epoch.current) return;
      if (e instanceof ApiError) {
        if ([401, 403, 404].includes(e.status)) clearPrivate();
        else {
          setRestore(undefined);
          if (
            e.kind === 'conflict' ||
            ['PROJECT_ARCHIVED', 'TEAM_ARCHIVED', 'RETENTION_EXPIRED'].includes(e.code ?? '')
          )
            refresh();
        }
        setError(e);
        onFailure(e);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <div className="trash-workspace">
      <p className="settings-lead trash-intro">
        <UiIcon name="history" />
        Restore before the date shown. Permanent deletion is unavailable here.
      </p>
      {error && <ErrorNotice error={error} retry={refresh} />}
      {notice && <Toast>{notice}</Toast>}
      <button disabled={!online || pending} onClick={refresh}>
        Refresh trash
      </button>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            {!data.items.length && (
              <EmptyState title="Trash is empty">
                <p>Deleted tasks appear here for 30 days.</p>
              </EmptyState>
            )}
            {data.items.length > 0 && (
              <DataTable
                caption="Trashed tasks"
                columns={['Tasks', 'Projects', 'Status', 'Deleted at', 'Restore before', 'Manage']}
                rows={data.items.map((t) => [
                  t.title,
                  t.project_name,
                  statusLabel[t.status],
                  new Date(t.deleted_at!).toLocaleString('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  new Date(t.restore_before).toLocaleString('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                  <button
                    key={t.id}
                    className="restore-action"
                    disabled={
                      !online ||
                      pending ||
                      self.maintenance ||
                      !restorable.has(t.id) ||
                      now >= Date.parse(t.restore_before)
                    }
                    onClick={() => setRestore(t)}
                  >
                    Restore task #{t.id}
                  </button>,
                ])}
              />
            )}
            <div className="toolbar">
              <button
                disabled={!online || page === 1}
                onClick={() => {
                  setPage((n) => n - 1);
                  refresh();
                }}
              >
                Previous trash page
              </button>
              <span>
                Page {page} · Total {data.total} Tasks
              </span>
              <button
                disabled={!online || page * data.pageSize >= data.total}
                onClick={() => {
                  setPage((n) => n + 1);
                  refresh();
                }}
              >
                Next trash page
              </button>
            </div>
          </>
        )
      )}
      {restore && (
        <Dialog title="Confirm task restore" onClose={() => !pending && setRestore(undefined)}>
          <p>
            {restore.title} · Restore before{' '}
            {new Date(restore.restore_before).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}
          </p>
          <p>
            The task returns to the end of its original status column. Only an administrator or
            owner-team access Lead can restore under archived parents. Current access and version
            are checked by the server.
          </p>
          <div className="trash-confirm-actions">
            <button
              className="trash-cancel"
              disabled={pending}
              onClick={() => setRestore(undefined)}
            >
              Cancel
            </button>
            <button
              className="restore-action"
              disabled={
                !online ||
                pending ||
                self.maintenance ||
                !restorable.has(restore.id) ||
                now >= Date.parse(restore.restore_before)
              }
              onClick={() => void run()}
            >
              Restore this task
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
