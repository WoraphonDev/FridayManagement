import { confirmDialog } from './shared/confirm';
import { useWritable } from './shared/connection';
import { UiIcon } from './shared/UiIcon';
import { projectGroups, taskPage, type ProjectGroup } from './task-api';
import { PeoplePicker } from './shared/PeoplePicker';
import { StatusPicker } from './shared/StatusPicker';
import { ChecklistStatusPicker } from './shared/ChecklistStatusPicker';
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
  priorities,
  statusLabel,
  type Detail,
  type Subtask,
} from './task-api';
import { Dialog, EmptyState, ErrorNotice, Field, Form, Loading, Toast } from './shared/components';
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
    [groups, setGroups] = useState<ProjectGroup[]>([]),
    [categories, setCategories] = useState<string[]>([]),
    [newCategory, setNewCategory] = useState(false);
  // Category is chosen from the ones this project already uses, or typed as a new one.
  useEffect(() => {
    const controller = new AbortController();
    void client
      .request(`/api/tasks?project=${initialProject.id}&pageSize=100&sort=title_asc`, {
        signal: controller.signal,
        parse: (v) => taskPage.parse(v),
      })
      .then((r) =>
        setCategories(
          [...new Set(r.items.map((t) => t.category.trim()).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b),
          ),
        ),
      )
      .catch(() => {
        /* the list is a convenience; typing a new category still works */
      });
    return () => controller.abort();
  }, [initialProject.id]);
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
    [addOpen, setAddOpen] = useState(false),
    [addTitle, setAddTitle] = useState(''),
    [addAssignee, setAddAssignee] = useState<number | null>(null),
    [addRemark, setAddRemark] = useState(''),
    [editing, setEditing] = useState<Subtask>(),
    [childTitle, setChildTitle] = useState(''),
    [childRemark, setChildRemark] = useState(''),
    [editingField, setEditingField] = useState<'title' | 'remark'>('title'),
    [confirmDelete, setConfirmDelete] = useState(false),
    [deleteBefore, setDeleteBefore] = useState(0),
    [panelDirty, setPanelDirty] = useState(false),
    [confirmChild, setConfirmChild] = useState<Subtask>();
  const checklistDraftRow = useRef<HTMLTableRowElement>(null);
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
    panelDirty ||
    formDirty ||
    !!addTitle ||
    addAssignee !== null ||
    !!addRemark ||
    (!!editing && (childTitle !== editing.title || childRemark !== editing.remark));
  useEffect(() => {
    snapshot.current = { dirty, base };
  }, [dirty, base]);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      void confirmDialog({
        title: 'Discard changes?',
        message: 'This task has unsaved changes. Leaving now will discard them.',
        confirmLabel: 'Discard draft',
        danger: true,
      }).then((ok) => (ok ? blocker.proceed() : blocker.reset()));
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
    if (busy.current) return;
    if (!dirty) return onClose();
    void confirmDialog({
      title: 'Discard changes?',
      message: 'This task has unsaved changes. Closing now will discard them.',
      confirmLabel: 'Discard draft',
      danger: true,
    }).then((ok) => ok && onClose());
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
    const ok = await confirmDialog({
      title: id ? 'Save changes?' : 'Create task?',
      message: id
        ? `Save your changes to “${draft.title.trim() || 'this task'}”?`
        : `Create “${draft.title.trim() || 'Untitled task'}” in ${project.name}?`,
      confirmLabel: id ? 'Save changes' : 'Create task',
    });
    if (!ok) {
      busy.current = false;
      return;
    }
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
      setAddAssignee(null);
      setAddRemark('');
      setAddOpen(false);
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
  const saveChecklistDraft = () => {
    if (!base || busy.current || !write || formDirty) return;
    if (editing) {
      if (childTitle === editing.title && childRemark === editing.remark) {
        setEditing(undefined);
        return;
      }
      if (!childTitle.trim()) {
        setNotice('Enter a checklist name before saving');
        return;
      }
      void childMutation(`/api/subtasks/${editing.id}`, 'PATCH', {
        version: editing.version,
        task_version: base.version,
        title: childTitle.trim(),
        remark: childRemark,
      });
    } else if (addOpen) {
      if (!addTitle.trim()) {
        if (!addTitle && !addRemark && addAssignee === null) setAddOpen(false);
        else setNotice('Enter a checklist name before saving');
        return;
      }
      void childMutation(`/api/tasks/${base.id}/subtasks`, 'POST', {
        title: addTitle.trim(),
        assignee_id: addAssignee,
        remark: addRemark,
        task_version: base.version,
      });
    }
  };
  // Save only when leaving the whole row, never while moving between its fields.
  useEffect(() => {
    if (!editing && !addOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !checklistDraftRow.current?.contains(event.target)) {
        const menu =
          event.target instanceof Element ? event.target.closest('[role="listbox"]') : null;
        if (menu?.getAttribute('aria-label') === 'Options for Assign new checklist item') return;
        saveChecklistDraft();
      }
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  });
  const leaveChecklistRow = (event: React.FocusEvent<HTMLTableRowElement>) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
      saveChecklistDraft();
  };
  const cancelChecklistDraft = () => {
    setAddOpen(false);
    setAddTitle('');
    setAddAssignee(null);
    setAddRemark('');
    setEditing(undefined);
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
        <Toast persist>Data changed. Your draft is preserved. Saving checks the latest version.</Toast>
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
                    onClick={async () => {
                      if (
                        await confirmDialog({
                          title: 'Use the latest data?',
                          message: 'Your unsaved draft will be replaced with the latest data.',
                          confirmLabel: 'Use latest data',
                        })
                      ) {
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
                      .map((m) => ({
                        ...m.user,
                        active: m.assignee_eligible,
                        role: m.job_title ?? m.effective_access,
                      })) ?? []
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
                <StatusPicker
                  label="Status"
                  disabled={!id || !write || pending || !online}
                  value={draft.status}
                  onChange={(status) => change('status', status)}
                />
              </label>
              {newCategory ? (
                <div className="category-new">
                  <Field
                    label="Category"
                    placeholder="New category name"
                    autoFocus
                    value={draft.category}
                    maxLength={80}
                    onChange={(e) => change('category', e.target.value)}
                  />
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setNewCategory(false);
                      change('category', base?.category ?? '');
                    }}
                  >
                    Choose existing
                  </button>
                </div>
              ) : (
                <label>
                  Category
                  <select
                    aria-label="Category"
                    value={draft.category}
                    onChange={(e) => {
                      if (e.target.value === '__new') {
                        setNewCategory(true);
                        change('category', '');
                      } else change('category', e.target.value);
                    }}
                  >
                    <option value="">No category</option>
                    {[...new Set([...categories, draft.category].filter(Boolean))].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new">+ New category…</option>
                  </select>
                </label>
              )}
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
              <p className="checklist-autosave-note">
                Click a name or remark to edit. Click outside the row to save automatically.
              </p>
              {formDirty && <p>Save your task draft before changing the checklist</p>}
              {base.status === 'done' && (
                <p>Reopen this completed task before adding or unchecking checklist items</p>
              )}
              <div
                className="checklist-table-scroll"
                role="region"
                aria-label="Checklist table"
                tabIndex={0}
              >
                <table className="checklist-table" aria-label="Checklist items">
                  <colgroup>
                    <col className="checklist-name-col" />
                    <col className="checklist-assignee-col" />
                    <col className="checklist-status-col" />
                    <col className="checklist-remark-col" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Subitem</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Status</th>
                      <th scope="col">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!base.subtasks.length && (
                      <tr>
                        <td colSpan={4} className="checklist-empty">
                          <EmptyState title="No checklist items yet" />
                        </td>
                      </tr>
                    )}
                    {base.subtasks.map((s) => {
                      const isEditing = editing?.id === s.id;
                      const beginEdit = (field: 'title' | 'remark') => {
                        setEditing(s);
                        setChildTitle(s.title);
                        setChildRemark(s.remark);
                        setEditingField(field);
                      };
                      return (
                        <tr
                          key={s.id}
                          className={isEditing ? 'checklist-edit-row' : undefined}
                          data-done={s.done}
                          ref={isEditing ? checklistDraftRow : undefined}
                          onBlur={isEditing ? leaveChecklistRow : undefined}
                          onKeyDown={(e) => {
                            if (isEditing && e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              cancelChecklistDraft();
                            }
                          }}
                        >
                          <th scope="row">
                            <div className="checklist-name-cell">
                              <input
                                type="checkbox"
                                aria-label={s.title}
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
                              {isEditing ? (
                                <input
                                  aria-label="New checklist item"
                                  value={childTitle}
                                  autoFocus={editingField === 'title'}
                                  maxLength={200}
                                  disabled={pending || !write}
                                  onChange={(e) => setChildTitle(e.target.value)}
                                />
                              ) : write ? (
                                <button
                                  className="checklist-cell-edit checklist-item-title"
                                  aria-label={`Edit checklist item ${s.title}`}
                                  title="Click to edit"
                                  disabled={pending || dirty}
                                  onClick={() => beginEdit('title')}
                                >
                                  {s.title}
                                </button>
                              ) : (
                                <span className="checklist-item-title">{s.title}</span>
                              )}
                              {write && !isEditing && (
                                <button
                                  className="danger checklist-delete"
                                  aria-label={`Delete checklist item ${s.title}`}
                                  title="Delete checklist item"
                                  disabled={pending || dirty}
                                  onClick={() => setConfirmChild(s)}
                                >
                                  <UiIcon name="trash" />
                                </button>
                              )}
                            </div>
                            {isEditing && (
                              <div className="checklist-row-actions">
                                <button
                                  className="permission-cancel"
                                  aria-label="Cancel checklist edit"
                                  disabled={pending}
                                  onClick={() => setEditing(undefined)}
                                >
                                  <UiIcon name="close" />
                                </button>
                              </div>
                            )}
                          </th>
                          <td>
                            <PeoplePicker
                              label={`Assign checklist: ${s.title}`}
                              multiple={false}
                              people={
                                members?.items
                                  .filter((m) => m.assignee_eligible)
                                  .map((m) => ({
                                    ...m.user,
                                    role: m.job_title ?? m.effective_access,
                                  })) ?? []
                              }
                              value={s.assignee_id ? [s.assignee_id] : []}
                              disabled={
                                !write || pending || dirty || !!editing || base.status === 'done'
                              }
                              onChange={(ids) =>
                                void childMutation(`/api/subtasks/${s.id}`, 'PATCH', {
                                  version: s.version,
                                  task_version: base.version,
                                  assignee_id: ids[0] ?? null,
                                })
                              }
                            />
                          </td>
                          <td>
                            <ChecklistStatusPicker
                              done={s.done}
                              label={`Status for checklist: ${s.title}`}
                              disabled={!write || pending || dirty || base.status === 'done'}
                              onChange={(done) =>
                                void childMutation(`/api/subtasks/${s.id}`, 'PATCH', {
                                  version: s.version,
                                  task_version: base.version,
                                  done,
                                })
                              }
                            />
                          </td>
                          <td>
                            {isEditing ? (
                              <textarea
                                aria-label="Edit checklist remark"
                                value={childRemark}
                                autoFocus={editingField === 'remark'}
                                maxLength={2000}
                                rows={1}
                                disabled={pending || !write}
                                onChange={(e) => setChildRemark(e.target.value)}
                              />
                            ) : write ? (
                              <button
                                className="checklist-cell-edit checklist-remark"
                                aria-label={`Edit remark for ${s.title}`}
                                title="Click to edit"
                                disabled={pending || dirty}
                                onClick={() => beginEdit('remark')}
                              >
                                {s.remark || (
                                  <span className="checklist-placeholder">Add remark…</span>
                                )}
                              </button>
                            ) : (
                              <span className="checklist-remark">{s.remark || '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {write && base.status !== 'done' && addOpen && (
                      <tr
                        className="checklist-add-row"
                        ref={checklistDraftRow}
                        onBlur={leaveChecklistRow}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            cancelChecklistDraft();
                          }
                        }}
                      >
                        <td>
                          <div className="checklist-name-cell">
                            <UiIcon name="plus" />
                            <input
                              aria-label="Add checklist item"
                              autoFocus
                              placeholder="Add a checklist item…"
                              value={addTitle}
                              maxLength={200}
                              disabled={pending || formDirty || !!editing}
                              onChange={(e) => setAddTitle(e.target.value)}
                            />
                          </div>
                          <div className="checklist-row-actions">
                            {(addTitle || addAssignee !== null || addRemark) && (
                              <button
                                className="permission-cancel"
                                aria-label="Cancel new checklist item"
                                disabled={pending}
                                onClick={cancelChecklistDraft}
                              >
                                <UiIcon name="close" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <PeoplePicker
                            label="Assign new checklist item"
                            multiple={false}
                            people={
                              members?.items
                                .filter((m) => m.assignee_eligible)
                                .map((m) => ({
                                  ...m.user,
                                  role: m.job_title ?? m.effective_access,
                                })) ?? []
                            }
                            value={addAssignee ? [addAssignee] : []}
                            disabled={pending || formDirty || !!editing}
                            onChange={(ids) => setAddAssignee(ids[0] ?? null)}
                          />
                        </td>
                        <td>
                          <ChecklistStatusPicker
                            done={false}
                            label="Status for new checklist item"
                            disabled
                            onChange={() => {}}
                          />
                        </td>
                        <td>
                          <textarea
                            aria-label="New checklist remark"
                            placeholder="Add remark…"
                            value={addRemark}
                            maxLength={2000}
                            rows={1}
                            disabled={pending || formDirty || !!editing}
                            onChange={(e) => setAddRemark(e.target.value)}
                          />
                        </td>
                      </tr>
                    )}
                    {write && base.status !== 'done' && !addOpen && (
                      <tr className="checklist-add-trigger">
                        <td colSpan={4}>
                          <button
                            className="checklist-add-button"
                            aria-label="Add checklist item"
                            disabled={pending || formDirty || !!editing}
                            onClick={() => {
                              setNotice('');
                              setAddOpen(true);
                            }}
                          >
                            <UiIcon name="plus" /> Add subitem
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
