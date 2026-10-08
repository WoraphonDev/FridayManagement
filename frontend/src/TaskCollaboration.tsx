import { useSharedRefresh } from './shared/refresh';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError, type Self } from './api';
import {
  attachments,
  attachment,
  comments,
  comment,
  events,
  uploadFile,
  type Attachment,
} from './collaboration-api';
import { Dialog, ErrorNotice, Loading, Toast } from './shared/components';
import { statusLabel, statuses } from './task-api';
const client = apiClient();
const thaiTime = (s: string) => new Date(s).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
const actions: Record<string, string> = {
  created: 'New task',
  updated: 'Task updated',
  assigned: 'Assigned',
  status_changed: 'Change status',
  reopened: 'Reopened',
  deleted: 'Delete task',
  restored: 'Restored',
  subtask_changed: 'Checklist updated',
  comment_added: 'Add comment',
  attachment_changed: 'Attachment updated',
  reordered: 'Reordered',
  recurrence_generated: 'Next occurrence created',
  access_cleanup: 'Access updated',
};
const fields: Record<string, string> = {
  title: 'Name',
  description: 'Details',
  category: 'Category',
  status: 'Status',
  priority: 'Priority',
  assignee_id: 'Assignees',
  assignee_ids: 'Assignees',
  group_id: 'Group',
  start_date: 'Start Plan',
  due_date: 'End Plan',
  recurrence: 'Repeat',
  recurrence_anchor_day: 'Anchor date',
  deleted_at: 'Deleted on',
  subtask: 'Checklist',
  comment: 'Comments',
  comment_id: 'Comments',
  attachment: 'Attachments',
  position: 'Position',
  before_task_id: 'Before task',
  task: 'Tasks',
  completed_at: 'Completed on',
  successor_task_id: 'Next occurrence',
  predecessor_task_id: 'Previous occurrence',
};
function value(field: string, v: string | number | boolean | null) {
  if (v === null) return '—';
  if (typeof v === 'string') {
    if (field === 'status' && v in statusLabel) return statusLabel[v as (typeof statuses)[number]];
    if (/^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))) return thaiTime(v);
    if (['task', 'subtask'].includes(field) && v.startsWith('{')) {
      try {
        const data = JSON.parse(v) as {
          title?: string;
          status?: keyof typeof statusLabel;
          done?: boolean;
          id?: number;
        };
        return [
          data.title ?? (data.id ? `#${data.id}` : 'Tasks'),
          data.status ? statusLabel[data.status] : undefined,
          typeof data.done === 'boolean' ? (data.done ? 'Done' : 'Not completed') : undefined,
        ]
          .filter(Boolean)
          .join(' · ');
      } catch {
        /* Historical plain text remains plain text. */
      }
    }
    if (field === 'priority')
      return (
        (
          { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as Record<string, string>
        )[v] ?? v
      );
    if (field === 'recurrence')
      return (
        (
          {
            none: 'Does not repeat',
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
          } as Record<string, string>
        )[v] ?? v
      );
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
export function TaskCollaboration({
  task,
  pane,
  self,
  write,
  online,
  onDirty,
  onFailure,
}: {
  pane?: string;
  task: number;
  self: Self;
  write: boolean;
  online: boolean;
  onDirty: (v: boolean) => void;
  onFailure: (e: unknown) => void;
}) {
  const [draft, setDraft] = useState(''),
    [file, setFile] = useState<File>(),
    [cp, setCp] = useState(1),
    [fp, setFp] = useState(1),
    [hp, setHp] = useState(1),
    [deleted, setDeleted] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [c, setC] = useState<z.infer<typeof comments>>(),
    [f, setF] = useState<z.infer<typeof attachments>>(),
    [h, setH] = useState<z.infer<typeof events>>(),
    [error, setError] = useState<ApiError>(),
    [notice, setNotice] = useState(''),
    [changed, setChanged] = useState(false),
    [pending, setPending] = useState(false),
    [progress, setProgress] = useState<number>(),
    [confirm, setConfirm] = useState<Attachment>();
  const panelState = useRef({ c, f, h, dirty: !!draft || !!file });
  useEffect(() => {
    panelState.current = { c, f, h, dirty: !!draft || !!file };
  }, [c, f, h, draft, file]);
  const readEpoch = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined),
    busy = useRef(false),
    failure = useRef(onFailure),
    commentIntent = useRef<{ body: string; key: string } | undefined>(undefined),
    fileIntent = useRef<{ file: File; key: string } | undefined>(undefined),
    fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    failure.current = onFailure;
  }, [onFailure]);
  useEffect(() => {
    onDirty(!!draft || !!file || pending);
  }, [draft, file, pending, onDirty]);
  useEffect(() => () => controller.current?.abort(), []);
  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setError(e);
      if (e.kind === 'session' || e.kind === 'not-found' || e.code === 'FORBIDDEN') {
        setC(undefined);
        setF(undefined);
        setH(undefined);
        setDraft('');
        setFile(undefined);
      }
      failure.current(e);
    }
  };
  const readPanel = (signal: AbortSignal) => {
    if (busy.current) return Promise.resolve();
    const epoch = readEpoch.current;
    return Promise.all([
      client.request(`/api/tasks/${task}/comments?page=${cp}&pageSize=10`, {
        signal: signal,
        parse: (v) => comments.parse(v),
      }),
      client.request(
        `/api/tasks/${task}/attachments?page=${fp}&pageSize=10${deleted && write ? '&includeDeleted=true' : ''}`,
        { signal: signal, parse: (v) => attachments.parse(v) },
      ),
      client.request(`/api/tasks/${task}/events?page=${hp}&pageSize=10`, {
        signal: signal,
        parse: (v) => events.parse(v),
      }),
    ])
      .then(([a, b, d]) => {
        if (!signal.aborted && !busy.current && epoch === readEpoch.current) {
          const prior = panelState.current;
          if (
            prior.dirty &&
            prior.c &&
            JSON.stringify([a, b, d]) !== JSON.stringify([prior.c, prior.f, prior.h])
          )
            setChanged(true);
          else if (!prior.dirty) setChanged(false);
          setC(a);
          setF(b);
          setH(d);
          setError(undefined);
        }
      })
      .catch((e: unknown) => {
        if (!signal.aborted && e instanceof ApiError) {
          setError(e);
          if (e.kind === 'session' || e.kind === 'not-found' || e.code === 'FORBIDDEN') {
            setC(undefined);
            setF(undefined);
            setH(undefined);
            setDraft('');
            setFile(undefined);
          }
          failure.current(e);
        }
      });
  };
  useEffect(() => {
    const abort = new AbortController();
    void readPanel(abort.signal);
    return () => abort.abort();
    // Reader changes only when these page/scope inputs change; drafts are preserved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, cp, fp, hp, deleted, write, refresh, self.view_revision]);
  useSharedRefresh(readPanel, online, task);
  const act = async (work: () => Promise<void>) => {
    if (busy.current || !online) return;
    busy.current = true;
    readEpoch.current++;
    setPending(true);
    setError(undefined);
    setNotice('');
    try {
      await work();
      setRefresh((v) => v + 1);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
      setProgress(undefined);
    }
  };
  const sendComment = () =>
    act(async () => {
      if (!write || !draft.trim()) return;
      const intent =
        commentIntent.current?.body === draft
          ? commentIntent.current
          : { body: draft, key: crypto.randomUUID() };
      commentIntent.current = intent;
      await client.request(`/api/tasks/${task}/comments`, {
        method: 'POST',
        body: { body: draft },
        csrf: self.csrf,
        key: intent.key,
        parse: (v) => z.object({ item: comment }).strict().parse(v),
      });
      setDraft('');
      commentIntent.current = undefined;
      setNotice('Comment added');
    });
  const sendFile = () =>
    act(async () => {
      if (!file || !write) return;
      const intent =
        fileIntent.current?.file === file ? fileIntent.current : { file, key: crypto.randomUUID() };
      fileIntent.current = intent;
      controller.current = new AbortController();
      setProgress(0);
      await uploadFile(task, file, self.csrf, intent.key, controller.current.signal, setProgress);
      setFile(undefined);
      if (fileInput.current) fileInput.current.value = '';
      fileIntent.current = undefined;
      setNotice('Uploaded');
    });
  const download = (a: Attachment) =>
    act(async () => {
      const blob = await client.request(`/api/attachments/${a.id}/download`, {
        binary: true,
        parse: (v) => {
          if (!(v instanceof Blob) || v.size !== a.bytes) throw new Error('incomplete');
          return v;
        },
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.original_name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const changeFile = () =>
    act(async () => {
      if (!confirm || !write) return;
      await client.request(
        `/api/attachments/${confirm.id}${confirm.deleted_at ? '/restore' : ''}`,
        {
          method: confirm.deleted_at ? 'POST' : 'DELETE',
          csrf: self.csrf,
          parse: (v) => z.object({ item: attachment }).strict().parse(v),
        },
      );
      setNotice(confirm.deleted_at ? 'File restored' : 'File deleted');
      setConfirm(undefined);
    });
  return (
    <section
      hidden={!!pane && ['details', 'checklist'].includes(pane)}
      className="task-collaboration"
      aria-label="Comments, files and history"
    >
      <button disabled={!online || pending} onClick={() => setRefresh((v) => v + 1)}>
        Refresh comments, files and history
      </button>
      {error && <ErrorNotice error={error} />}
      {changed && <Toast>Collaboration data changed. Your draft is preserved.</Toast>}
      {notice && <Toast>{notice}</Toast>}
      {error &&
        ['FILE_TOO_LARGE', 'QUOTA_EXCEEDED', 'INVALID_FILE_TYPE', 'RETENTION_EXPIRED'].includes(
          error.code ?? '',
        ) && (
          <p role="alert">
            {
              {
                FILE_TOO_LARGE: 'File exceeds 10 MiB',
                QUOTA_EXCEEDED: 'Storage is full. Contact your administrator.',
                INVALID_FILE_TYPE: 'File type or contents are not supported',
                RETENTION_EXPIRED: 'The 30-day restore period has expired',
              }[error.code!]
            }
          </p>
        )}
      <section hidden={!!pane && pane !== 'comments'} aria-label="Comments">
        <h3>Comments</h3>
        {!c && !error && <Loading />}
        <ul>
          {c?.items.map((a) => (
            <li key={a.id}>
              <strong>{a.author.display_name}</strong> · <time>{thaiTime(a.created_at)}</time>
              <p className="plain-text">{a.body}</p>
            </li>
          ))}
        </ul>
        {c && (
          <Pager
            page={c.page}
            size={c.pageSize}
            total={c.total}
            set={setCp}
            label="Comments"
            disabled={pending}
          />
        )}
        <label>
          Write a comment
          <textarea
            aria-label="Write a comment"
            maxLength={5000}
            value={draft}
            disabled={!write || pending}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button disabled={!write || pending || !draft.trim()} onClick={() => void sendComment()}>
          Post comment
        </button>
      </section>
      <section hidden={!!pane && pane !== 'files'} aria-label="Attachments">
        <h3>Attachments</h3>
        {write && (
          <label>
            <input
              type="checkbox"
              checked={deleted}
              disabled={pending}
              onChange={(e) => {
                setDeleted(e.target.checked);
                setFp(1);
              }}
            />
            Show deleted files available to restore
          </label>
        )}
        <ul>
          {f?.items.map((a) => (
            <li key={a.id}>
              <span>
                {a.original_name} · {a.bytes.toLocaleString()} bytes · {a.uploader.display_name}
                {a.deleted_at && ' · Deleted'}
              </span>
              {!a.deleted_at && (
                <button disabled={pending || !online} onClick={() => void download(a)}>
                  Download {a.original_name}
                </button>
              )}
              {(a.can_delete || a.can_restore) && write && (
                <button disabled={pending} onClick={() => setConfirm(a)}>
                  {a.deleted_at ? 'Restore' : 'Delete'}Files {a.original_name}
                </button>
              )}
            </li>
          ))}
        </ul>
        {f && (
          <Pager
            page={f.page}
            size={f.pageSize}
            total={f.total}
            set={setFp}
            label="Files"
            disabled={pending}
          />
        )}
        <p>Choose one file, 1 byte–10 MiB: JPG, PNG, WEBP, PDF, TXT, CSV, DOCX, XLSX, PPTX, ZIP</p>
        <label>
          Choose attachment
          <input
            ref={fileInput}
            aria-label="Choose attachment"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip"
            disabled={!write || pending}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected && (selected.size < 1 || selected.size > 10485760)) {
                setError(new ApiError('request', 413, undefined, {}, 'FILE_TOO_LARGE'));
                e.target.value = '';
                setFile(undefined);
              } else setFile(selected);
            }}
          />
        </label>
        <button disabled={!write || pending || !file} onClick={() => void sendFile()}>
          Upload file
        </button>
        {file && (
          <button
            disabled={pending}
            onClick={() => {
              setFile(undefined);
              if (fileInput.current) fileInput.current.value = '';
            }}
          >
            Discard selected file
          </button>
        )}
        {progress !== undefined && (
          <>
            <progress max={100} value={progress} aria-label="Upload progress" />
            <span>{progress}% · Waiting for confirmation</span>
            <button onClick={() => controller.current?.abort()}>Cancel upload</button>
          </>
        )}
      </section>
      <section hidden={!!pane && pane !== 'history'} aria-label="Task history">
        <h3>Task history</h3>
        <ol>
          {h?.items.map((e) => (
            <li key={e.id}>
              <strong>{actions[e.action]}</strong> · {e.actor?.display_name ?? 'System'} ·{' '}
              <time>{thaiTime(e.created_at)}</time>
              <ul>
                {e.field_changes.map((v, i) => (
                  <li key={i}>
                    {fields[v.field] ?? v.field}: <span>{value(v.field, v.before)}</span> →{' '}
                    <span>{value(v.field, v.after)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {h && (
          <Pager
            page={h.page}
            size={h.pageSize}
            total={h.total}
            set={setHp}
            label="History"
            disabled={pending}
          />
        )}
      </section>
      {confirm && (
        <Dialog
          title={confirm.deleted_at ? 'Confirm file restore' : 'Confirm file deletion'}
          onClose={() => !pending && setConfirm(undefined)}
        >
          <p>
            {confirm.original_name}
            {confirm.deleted_at
              ? ' · Restorable for 30 days'
              : ' · Counts toward storage until permanently removed'}
          </p>
          <button disabled={pending || !write} onClick={() => void changeFile()}>
            Confirm{confirm.deleted_at ? 'Restore file' : 'Delete file'}
          </button>
          <button disabled={pending} onClick={() => setConfirm(undefined)}>
            Cancel
          </button>
        </Dialog>
      )}
    </section>
  );
}
function Pager({
  page,
  size,
  total,
  set,
  label,
  disabled,
}: {
  page: number;
  size: number;
  total: number;
  set: (n: number) => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <nav aria-label={`Page${label}`}>
      <button disabled={disabled || page === 1} onClick={() => set(page - 1)}>
        Previous {label}
      </button>
      <span>
        {page} / {Math.max(1, Math.ceil(total / size))} · {total} items
      </span>
      <button disabled={disabled || page * size >= total} onClick={() => set(page + 1)}>
        Next {label}
      </button>
    </nav>
  );
}
