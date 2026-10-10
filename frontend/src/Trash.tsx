import { useEffect, useRef, useState } from 'react';
import { apiClient, ApiError, type Self } from './api';
import { trashPage, mutationReply, statusLabel } from './task-api';
import { UiIcon } from './shared/UiIcon';
import { DataTable, Dialog, EmptyState, ErrorNotice, Loading, Toast } from './shared/components';
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
  const busy = useRef(false),
    keys = useRef(new Map<string, string>());
  const refresh = () => {
    setLoading(true);
    setReload((n) => n + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    client
      .request(`/api/trash?page=${page}&pageSize=20`, {
        signal: controller.signal,
        parse: (v) => trashPage.parse(v),
      })
      .then((v) => {
        if (!controller.signal.aborted) {
          setData(v);
          setLoading(false);
          setError(undefined);
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted && e instanceof ApiError) {
          setError(e);
          setLoading(false);
          onFailure(e);
        }
      });
    return () => controller.abort();
  }, [page, reload, onFailure, self.view_revision]);
  const run = async () => {
    if (!restore || busy.current || !online) return;
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
      setNotice(`Restore task #${r.item.id} complete`);
      setRestore(undefined);
      refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
        setRestore(undefined);
        if (e.kind === 'conflict' || e.kind === 'not-found') refresh();
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
                      !online || pending || self.maintenance || now >= Date.parse(t.restore_before)
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
            The task returns to the end of its original status column. Archived projects remain read
            only.
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
              disabled={!online || pending || self.maintenance}
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
