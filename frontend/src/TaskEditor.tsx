import { useWritable } from './shared/connection';
import { UiIcon } from './shared/UiIcon';
import { projectGroups, type ProjectGroup } from './task-api';
import { PeoplePicker } from './shared/PeoplePicker';
import { useSharedRefresh } from './shared/refresh';
import { TaskCollaboration } from './TaskCollaboration';
import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { apiClient, ApiError, type Self } from './api';
import type { Project } from './workspace-api';
import { projectPage, projectMembers } from './workspace-api';
import {
  detailReply,
  mutationReply,
  subtaskReply,
  taskReply,
  statuses,
  priorities,
  statusLabel,
  type Detail,
  type Subtask,
} from './task-api';
import { Dialog, ErrorNotice, Field, Form, Loading, Toast } from './shared/components';
const client = apiClient();
type Draft = {
  group_id: number | null;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_ids: number[];
  start_date: string;
  due_date: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'todo' | 'doing' | 'review' | 'done';
};
const draftOf = (t?: Detail): Draft => ({
  group_id: t?.group_id ?? null,
  title: t?.title ?? '',
  description: t?.description ?? '',
  category: t?.category ?? '',
  priority: t?.priority ?? 'medium',
  assignee_ids: t?.assignee_ids ?? (t?.assignee_id ? [t.assignee_id] : []),
  start_date: t?.start_date ?? '',
  due_date: t?.due_date ?? '',
  recurrence: t?.recurrence ?? 'none',
  status: t?.status ?? 'todo',
});
async function currentProject(id: number, signal?: AbortSignal) {
  for (let page = 1; ; page++) {
    const p = await client.request(`/api/projects?includeArchived=true&pageSize=100&page=${page}`, {
      signal,
      parse: (v) => projectPage.parse(v),
    });
    const project = p.items.find((p) => p.id === id);
    if (project) return project;
    if (page * p.pageSize >= p.total) throw new ApiError('not-found', 404);
  }
}
export function TaskEditor({
  id,
  project: initialProject,
  initialGroup,
  self,
  online,
  onFailure,
  onClose,
  onDone,
}: {
  initialGroup?: number | null;
  id?: number;
  project: Project;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState('details'),
    [groups, setGroups] = useState<ProjectGroup[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void client
      .request(`/api/projects/${initialProject.id}/groups`, {
        signal: controller.signal,
        parse: (v) => projectGroups.parse(v),
      })
      .then((r) => setGroups(r.items))
      .catch((e) => {
        if (!controller.signal.aborted && e instanceof ApiError) onFailure(e);
      });
    return () => controller.abort();
  }, [initialProject.id, onFailure]);
  const [project, setProject] = useState(initialProject),
    [base, setBase] = useState<Detail>(),
    [draft, setDraft] = useState<Draft>(() => ({ ...draftOf(), group_id: initialGroup ?? null })),
    [loaded, setLoaded] = useState(!id),
    [error, setError] = useState<ApiError>(),
    [notice, setNotice] = useState(''),
    [changed, setChanged] = useState(false),
    [pending, setPending] = useState(false),
    [latest, setLatest] = useState<Detail>(),
    [reviewed, setReviewed] = useState(false),
    [conflict, setConflict] = useState(false),
    [members, setMembers] = useState<ReturnType<typeof projectMembers.parse>>(),
    [reload, setReload] = useState(0),
    [addTitle, setAddTitle] = useState(''),
    [editing, setEditing] = useState<Subtask>(),
    [childTitle, setChildTitle] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false),
    [deleteBefore, setDeleteBefore] = useState(0),
    [panelDirty, setPanelDirty] = useState(false),
    [confirmChild, setConfirmChild] = useState<Subtask>();
  const mutationEpoch = useRef(0);
  const snapshot = useRef<{ dirty: boolean; base?: Detail }>({ dirty: false });
  const busy = useRef(false),
    intent = useRef<{ json: string; key: string } | undefined>(undefined),
    childIntent = useRef<{ json: string; key: string } | undefined>(undefined);
  // A new task starts in its chosen group; that default is not an edit.
  const formDirty =
    JSON.stringify(draft) !==
    JSON.stringify(base ? draftOf(base) : { ...draftOf(), group_id: initialGroup ?? null });
  const dirty =
    panelDirty || formDirty || !!addTitle || (!!editing && childTitle !== editing.title);
  useEffect(() => {
    snapshot.current = { dirty, base };
  }, [dirty, base]);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Discard your unsaved draft and leave this page?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const stop = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      currentProject(initialProject.id, controller.signal),
      client.request(`/api/projects/${initialProject.id}/members`, {
        signal: controller.signal,
        parse: (v) => projectMembers.parse(v),
      }),
      ...(id
        ? [
            client.request(`/api/tasks/${id}`, {
              signal: controller.signal,
              parse: (v) => detailReply.parse(v),
            }),
          ]
        : []),
    ])
      .then((values) => {
        if (controller.signal.aborted) return;
        setProject(values[0] as Project);
        setMembers(values[1] as ReturnType<typeof projectMembers.parse>);
        if (id) {
          const item = (values[2] as { item: Detail }).item;
          setBase(item);
          setDraft(draftOf(item));
        }
        setLoaded(true);
        setError(undefined);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted && e instanceof ApiError) {
          setError(e);
          onFailure(e);
        }
      });
    return () => controller.abort();
  }, [id, initialProject.id, reload, onFailure]);
  useSharedRefresh(
    async (signal) => {
      if (!loaded || busy.current) return;
      const epoch = mutationEpoch.current;
      try {
        const [p, m, r] = await Promise.all([
          currentProject(initialProject.id, signal),
          client.request(`/api/projects/${initialProject.id}/members`, {
            signal,
            parse: (v) => projectMembers.parse(v),
          }),
          id
            ? client.request(`/api/tasks/${id}`, { signal, parse: (v) => detailReply.parse(v) })
            : Promise.resolve(undefined),
        ]);
        if (signal.aborted || busy.current || epoch !== mutationEpoch.current) return;
        setProject(p);
        setMembers(m);
        if (r && snapshot.current.base && r.item.version > snapshot.current.base.version) {
          if (snapshot.current.dirty) {
            setChanged(true);
          } else {
            setBase(r.item);
            setDraft(draftOf(r.item));
            setChanged(false);
          }
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          onFailure(e);
          if ([401, 403, 404].includes(e.status)) {
            setBase(undefined);
            setDraft(draftOf());
            onDone();
            onClose();
          } else setError(e);
        }
      }
    },
    online,
    String(id ?? 'new') + ':' + initialProject.id,
  );
  // Also wait for the post-reconnect authoritative reads (T057) before offering Save.
  const writable = useWritable();
  const write =
    project.effective_access !== 'viewer' &&
    !project.archived_at &&
    !self.maintenance &&
    online &&
    writable;
  const canDelete =
    base &&
    (['admin', 'lead'].includes(project.effective_access) ||
      (project.effective_access === 'manager' &&
        self.user.permission_keys.includes('P-04') &&
        !project.archived_at) ||
      (['manager', 'editor'].includes(project.effective_access) &&
        base.creator_id === self.user.id &&
        !project.archived_at));
  const close = () => {
    if (!pending && (!dirty || window.confirm('Discard your unsaved draft and close?'))) onClose();
  };
  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setError(e);
      onFailure(e);
      if (e.kind === 'not-found' || e.code === 'FORBIDDEN') {
        onDone();
        onClose();
        return;
      }
      if (e.code === 'SUBTASKS_INCOMPLETE' && base)
        setDraft((d) => ({ ...d, status: base.status }));
      if (e.kind === 'conflict') {
        setConflict(true);
        setReviewed(false);
        setLatest(undefined);
      }
    }
  };
  const review = async () => {
    try {
      if (!id) return;
      const [r, p, m] = await Promise.all([
        client.request(`/api/tasks/${id}`, { parse: (v) => detailReply.parse(v) }),
        currentProject(project.id),
        client.request(`/api/projects/${project.id}/members`, {
          parse: (v) => projectMembers.parse(v),
        }),
      ]);
      setLatest(r.item);
      setProject(p);
      setMembers(m);
      setReviewed(false);
    } catch (e) {
      fail(e);
    }
  };
  const save = async () => {
    if (busy.current || !write) return;
    busy.current = true;
    mutationEpoch.current++;
    setPending(true);
    setError(undefined);
    setNotice('');
    const values = {
      ...draft,
      title: draft.title.trim(),
      category: draft.category.trim(),
      assignee_ids: draft.assignee_ids,
      start_date: draft.start_date || null,
      due_date: draft.due_date || null,
    };
    const createValues = Object.fromEntries(
      Object.entries(values).filter(([key]) => key !== 'status'),
    );
    // Omitted unchanged assignee preserves historical done assignees.
    const patchValues = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) =>
          key !== 'assignee_ids' ||
          JSON.stringify(value) !==
            JSON.stringify(base?.assignee_ids ?? (base?.assignee_id ? [base.assignee_id] : [])),
      ),
    );
    const payload = id
      ? { ...patchValues, version: reviewed && latest ? latest.version : base!.version }
      : { ...createValues, project_id: project.id };
    const json = JSON.stringify(payload);
    if (intent.current?.json !== json) intent.current = { json, key: crypto.randomUUID() };
    try {
      const result = await client.request(id ? `/api/tasks/${id}` : '/api/tasks', {
        method: id ? 'PATCH' : 'POST',
        body: payload,
        csrf: self.csrf,
        key: intent.current!.key,
        parse: (v) => mutationReply.parse(v),
      });
      intent.current = undefined;
      setChanged(false);
      setBase(result.item);
      setDraft(draftOf(result.item));
      setConflict(false);
      setReviewed(false);
      setLatest(undefined);
      setNotice(
        result.successor ? `Saved · Next occurrence created #${result.successor.id}` : 'Task saved',
      );
      onDone();
      if (!id) onClose();
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const childMutation = async (
    path: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body: unknown,
  ) => {
    if (!base || busy.current || !write || formDirty) return;
    busy.current = true;
    mutationEpoch.current++;
    setPending(true);
    setError(undefined);
    const json = JSON.stringify({ path, method, body });
    if (childIntent.current?.json !== json)
      childIntent.current = { json, key: crypto.randomUUID() };
    try {
      await client.request(path, {
        method,
        body,
        csrf: self.csrf,
        ...(method === 'POST' ? { key: childIntent.current!.key } : {}),
        parse: (v) => (method === 'DELETE' ? taskReply.parse(v) : subtaskReply.parse(v)),
      });
      const fresh = await client.request(`/api/tasks/${base.id}`, {
        parse: (v) => detailReply.parse(v),
      });
      childIntent.current = undefined;
      setChanged(false);
      setBase(fresh.item);
      setDraft(draftOf(fresh.item));
      setAddTitle('');
      setEditing(undefined);
      setConfirmChild(undefined);
      setNotice('Checklist saved');
      onDone();
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const remove = async () => {
    if (!base || !canDelete || busy.current || dirty) return;
    busy.current = true;
    mutationEpoch.current++;
    setPending(true);
    setError(undefined);
    try {
      await client.request(`/api/tasks/${base.id}`, {
        method: 'DELETE',
        csrf: self.csrf,
        body: { version: base.version },
        parse: (v) => mutationReply.parse(v),
      });
      onDone();
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
      setConfirmDelete(false);
    }
  };
  const invalid =
    !draft.title.trim() ||
    draft.title.trim().length > 200 ||
    draft.description.length > 10000 ||
    draft.category.trim().length > 80 ||
    (!!draft.start_date && !!draft.due_date && draft.start_date > draft.due_date) ||
    (draft.recurrence !== 'none' && !draft.due_date);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice('');
  };
  return (
    <Dialog
      className="task-editor"
      title={id ? `Task details #${id}` : 'Create task'}
      onClose={close}
      eyebrow={
        id ? `${project.name.toUpperCase()} / FR-${String(id).padStart(3, '0')}` : 'NEW TASK'
      }
      footer={
        <>
          {canDelete && (
            <button
              className="delete-task"
              disabled={pending || dirty || !online || self.maintenance}
              onClick={() => {
                setDeleteBefore(Date.now() + 30 * 86400000);
                setConfirmDelete(true);
              }}
            >
              <UiIcon name="trash" /> Delete task
            </button>
          )}
          <span className="footer-spacer" />
          <span className="draft-label">
            {dirty ? 'Unsaved changes' : write ? '' : 'Read only'}
          </span>
          <button onClick={close} disabled={pending}>
            Cancel
          </button>
          {write && tab === 'details' && (
            <button
              className="primary"
              type="submit"
              form="task-detail-form"
              disabled={pending || invalid || (conflict && !reviewed) || !loaded}
            >
              <UiIcon name="check" />
              {pending ? 'Saving…' : id ? 'Save task' : 'New task'}
            </button>
          )}
        </>
      }
    >
      {changed && (
        <Toast>Data changed. Your draft is preserved. Saving checks the latest version.</Toast>
      )}
      {error && (
        <ErrorNotice error={error} retry={!loaded ? () => setReload((n) => n + 1) : undefined} />
      )}
      {error?.code === 'SUBTASKS_INCOMPLETE' && (
        <p role="alert">Complete every checklist item before marking Done</p>
      )}
      {error?.code === 'ASSIGNEE_INELIGIBLE' && (
        <p role="alert">An assignee no longer has write access. Refresh the task.</p>
      )}
      {notice && <Toast>{notice}</Toast>}
      {!loaded ? (
        !error && <Loading />
      ) : (
        <>
          <p className="editor-project-context">
            {project.name} · {project.owner_team_name}{' '}
            {project.archived_at
              ? '· Archived project · Read only'
              : project.effective_access === 'viewer'
                ? '· Read only'
                : ''}
          </p>
          {base && (
            <button
              className="review-latest"
              disabled={pending || !online}
              onClick={() => {
                if (dirty) {
                  setConflict(true);
                  void review();
                } else {
                  void review().then(() => {});
                  setConflict(true);
                }
              }}
            >
              Review latest data
            </button>
          )}
          {base && (
            <p className="editor-version">
              Version {base.version} · Checklist {base.subtask_done_count}/{base.subtask_count}
            </p>
          )}
          {conflict && (
            <div className="conflict-review">
              <p>Your draft is preserved. Review the latest data before saving.</p>
              <button disabled={!online || pending} onClick={() => void review()}>
                Load latest and compare
              </button>
              {latest && (
                <>
                  <p>
                    Latest data: {latest.title} · Version {latest.version} · Status{' '}
                    {statusLabel[latest.status]}
                  </p>
                  <dl>
                    <dt>Your draft</dt>
                    <dd>{draft.title}</dd>
                    <dt>Latest details</dt>
                    <dd>{latest.description || 'None'}</dd>
                    <dt>Latest assignees</dt>
                    <dd>{latest.assignee?.display_name ?? 'Unassigned'}</dd>
                    <dt>Latest End Plan</dt>
                    <dd>{latest.due_date ?? 'None'}</dd>
                  </dl>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                    />
                    I have reviewed the latest data and my draft
                  </label>
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm('Replace your unsaved draft with the latest data?')) {
                        setChanged(false);
                        setBase(latest);
                        setDraft(draftOf(latest));
                        setConflict(false);
                        setReviewed(false);
                      }
                    }}
                  >
                    Use latest data
                  </button>
                </>
              )}
            </div>
          )}
          <div className="editor-tabs" role="tablist" aria-label="Task sections">
            {['details', 'checklist', 'comments', 'files', 'history'].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                disabled={!base && t !== 'details'}
                onClick={() => setTab(t)}
              >
                <UiIcon
                  name={
                    {
                      details: 'table',
                      checklist: 'check',
                      comments: 'comment',
                      files: 'file',
                      history: 'history',
                    }[t] ?? 'table'
                  }
                />
                {/* FR-53 side panel names: comments are Updates, history is Activity. */}
                {{ comments: 'Updates', history: 'Activity' }[t] ??
                  t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div hidden={tab !== 'details'}>
            <Form
              pending={pending}
              offline={!online}
              blocked={!write}
              submitDisabled={invalid || (conflict && !reviewed)}
              onSubmit={() => void save()}
              submitLabel="Save task"
              formId="task-detail-form"
              hideSubmit
            >
              <Field
                label="Task title"
                placeholder="What needs to get done?"
                data-autofocus={!id ? true : undefined}
                value={draft.title}
                required
                maxLength={200}
                onChange={(e) => change('title', e.target.value)}
              />
              <label>
                Details
                <textarea
                  placeholder="Context, goals or anything your team should know"
                  aria-label="Details"
                  value={draft.description}
                  maxLength={10000}
                  onChange={(e) => change('description', e.target.value)}
                />
              </label>
              <label>
                Group
                <select
                  aria-label="Group"
                  value={draft.group_id ?? ''}
                  onChange={(e) =>
                    change('group_id', e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Tasks</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignees
                <PeoplePicker
                  label="Assignees"
                  people={
                    members?.items
                      .filter((m) => m.assignee_eligible || draft.assignee_ids.includes(m.user.id))
                      .map((m) => ({ ...m.user, active: m.assignee_eligible })) ?? []
                  }
                  value={draft.assignee_ids}
                  disabled={!write || pending || !online}
                  onChange={(ids) => change('assignee_ids', ids)}
                />
              </label>
              <label>
                Priority
                <select
                  aria-label="Priority"
                  value={draft.priority}
                  onChange={(e) => change('priority', e.target.value as Draft['priority'])}
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  aria-label="Status"
                  disabled={!id}
                  value={draft.status}
                  onChange={(e) => change('status', e.target.value as Draft['status'])}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Category"
                value={draft.category}
                maxLength={80}
                onChange={(e) => change('category', e.target.value)}
              />
              <Field
                label="Start Plan"
                type="date"
                value={draft.start_date}
                onChange={(e) => change('start_date', e.target.value)}
              />
              <Field
                label="End Plan"
                type="date"
                value={draft.due_date}
                required={draft.recurrence !== 'none'}
                onChange={(e) => change('due_date', e.target.value)}
              />
              <label>
                Repeat
                <select
                  aria-label="Repeat"
                  value={draft.recurrence}
                  onChange={(e) => change('recurrence', e.target.value as Draft['recurrence'])}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              {draft.recurrence !== 'none' && (
                <p>
                  End Plan is required. The next occurrence is created only when this task is
                  completed.
                  {draft.recurrence === 'monthly' &&
                    ' · Keeps the same day each month, or the last day of shorter months. Changing End Plan resets the anchor.'}
                </p>
              )}
              {draft.start_date && draft.due_date && draft.start_date > draft.due_date && (
                <p role="alert">Start Plan must be on or before End Plan</p>
              )}
            </Form>
          </div>
          {base && (
            <section
              className="checklist-panel"
              hidden={tab !== 'checklist'}
              aria-label="Checklist"
            >
              <h3>
                Checklist {base.subtask_done_count}/{base.subtask_count}
              </h3>
              {dirty && <p>Save your task draft before changing the checklist</p>}
              {base.status === 'done' && (
                <p>Reopen this completed task before adding or unchecking checklist items</p>
              )}
              <ul>
                {base.subtasks.map((s) => (
                  <li key={s.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.done}
                        disabled={!write || pending || dirty || base.status === 'done'}
                        onChange={(e) =>
                          void childMutation(`/api/subtasks/${s.id}`, 'PATCH', {
                            version: s.version,
                            task_version: base.version,
                            done: e.target.checked,
                          })
                        }
                      />
                      {s.title}
                    </label>
                    <PeoplePicker
                      label={`Assign checklist: ${s.title}`}
                      multiple={false}
                      people={
                        members?.items.filter((m) => m.assignee_eligible).map((m) => m.user) ?? []
                      }
                      value={s.assignee_id ? [s.assignee_id] : []}
                      disabled={!write || pending || dirty || base.status === 'done'}
                      onChange={(ids) =>
                        void childMutation(`/api/subtasks/${s.id}`, 'PATCH', {
                          version: s.version,
                          task_version: base.version,
                          assignee_id: ids[0] ?? null,
                        })
                      }
                    />
                    {write && (
                      <>
                        <button
                          disabled={pending || dirty}
                          onClick={() => {
                            setEditing(s);
                            setChildTitle(s.title);
                          }}
                        >
                          Edit checklist item {s.title}
                        </button>
                        <button disabled={pending || dirty} onClick={() => setConfirmChild(s)}>
                          Delete checklist item {s.title}
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {editing && (
                <div>
                  <Field
                    label="New checklist item"
                    value={childTitle}
                    maxLength={200}
                    onChange={(e) => setChildTitle(e.target.value)}
                  />
                  <button
                    disabled={pending || !write || !childTitle.trim()}
                    onClick={() =>
                      void childMutation(`/api/subtasks/${editing.id}`, 'PATCH', {
                        version: editing.version,
                        task_version: base.version,
                        title: childTitle.trim(),
                      })
                    }
                  >
                    Save checklist title
                  </button>
                  <button disabled={pending} onClick={() => setEditing(undefined)}>
                    Cancel checklist edit
                  </button>
                </div>
              )}
              {write && base.status !== 'done' && (
                <div>
                  <Field
                    label="Add checklist item"
                    value={addTitle}
                    maxLength={200}
                    onChange={(e) => setAddTitle(e.target.value)}
                  />
                  <button
                    disabled={
                      pending ||
                      !addTitle.trim() ||
                      JSON.stringify(draft) !== JSON.stringify(draftOf(base))
                    }
                    onClick={() =>
                      void childMutation(`/api/tasks/${base.id}/subtasks`, 'POST', {
                        title: addTitle.trim(),
                        task_version: base.version,
                      })
                    }
                  >
                    Add checklist item
                  </button>
                </div>
              )}
            </section>
          )}
          {base && (
            <TaskCollaboration
              pane={tab}
              task={base.id}
              project={base.project_id}
              self={self}
              write={write}
              online={online}
              onDirty={setPanelDirty}
              onFailure={fail}
            />
          )}
          {base?.predecessor_task_id && <p>Previous occurrence: #{base.predecessor_task_id}</p>}
          {base?.successor_task_id && <p>Next occurrence: #{base.successor_task_id}</p>}
          {confirmDelete && base && (
            <Dialog
              title="Confirm task deletion"
              onClose={() => !pending && setConfirmDelete(false)}
            >
              <p>
                Move “{base.title}” to Trash. Admin/Lead can restore it before{' '}
                {new Date(deleteBefore).toLocaleString('en-GB', {
                  timeZone: 'Asia/Bangkok',
                })}{' '}
                using the actual server deletion time
              </p>
              <button
                disabled={pending || !online || self.maintenance}
                onClick={() => void remove()}
              >
                Delete this task
              </button>
            </Dialog>
          )}
          {confirmChild && (
            <Dialog
              title="Confirm checklist deletion"
              onClose={() => !pending && setConfirmChild(undefined)}
            >
              <p>{confirmChild.title}</p>
              <button
                disabled={pending || !write}
                onClick={() =>
                  void childMutation(`/api/subtasks/${confirmChild.id}`, 'DELETE', {
                    version: confirmChild.version,
                    task_version: base!.version,
                  })
                }
              >
                Delete this checklist item
              </button>
            </Dialog>
          )}
        </>
      )}
    </Dialog>
  );
}
