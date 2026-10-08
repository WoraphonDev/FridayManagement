import { UiIcon } from './shared/UiIcon';
import { formatPlanDate } from './shared/formatPlanDate';
import { StatusPicker } from './shared/StatusPicker';
import { Assignees } from './shared/PeoplePicker';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { apiClient, ApiError, type Self } from './api';
import { projectPage, teamPage, projectMembers, type Project, type Team } from './workspace-api';
import {
  taskPage,
  statuses,
  priorities,
  statusLabel,
  priorityLabel,
  projectGroups,
  projectGroup,
  mutationReply,
  type ProjectGroup,
  type Status,
  type Task,
} from './task-api';
import {
  emptyFilters,
  myWorkFilters,
  taskParameters,
  allTaskPages,
  type Filters,
} from './task-list';
import { myWorkGroup, myWorkGroups } from './task-dates';
import { useSharedRefresh } from './shared/refresh';
import { useFavorites } from './favorites-api';
import { motionAllowed } from './motion';
import { savePreferences, usePreferences } from './preferences';
import { TaskEditor } from './TaskEditor';
import { DataTable, Dialog, ErrorNotice, Field, Loading } from './shared/components';
import { CalendarView, GanttView } from './TaskViews';
import { z } from 'zod';
const batchReply = z
  .object({
    results: z
      .array(
        z
          .object({
            id: z.number().int(),
            outcome: z.enum([
              'updated',
              'deleted',
              'conflict',
              'forbidden',
              'not_found',
              'invalid',
            ]),
            code: z.string().nullable(),
            current_version: z.number().int().nullable(),
            item: z.unknown().nullable(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
type BatchResult = z.infer<typeof batchReply>['results'];
// FR-52: Main table column ids for per-user widths stored in /api/me/preferences.
const mainColumns = ['select', 'task', 'assignees', 'status', 'priority', 'start', 'end'] as const;
const client = apiClient();
const Kanban = lazy(() => import('./Kanban').then((m) => ({ default: m.Kanban })));
const ProjectDocs = lazy(() => import('./ProjectDocs').then((m) => ({ default: m.ProjectDocs })));
const WorkloadView = lazy(() =>
  import('./ProjectInsights').then((m) => ({ default: m.WorkloadView })),
);
const ProjectOverview = lazy(() =>
  import('./ProjectInsights').then((m) => ({ default: m.ProjectOverview })),
);
const ProjectFiles = lazy(() =>
  import('./ProjectFiles').then((m) => ({ default: m.ProjectFiles })),
);
type View = 'table' | 'calendar' | 'gantt' | 'kanban' | 'docs' | 'files' | 'workload' | 'overview';
/** Vibe date cell: shows "📅 1 Oct"; the native picker opens on click and stays keyboard-editable. */
function PlanDateCell({
  label,
  value,
  overdue,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  overdue: boolean;
  disabled: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <span className={`plan-date-cell ${overdue ? 'overdue' : ''}`}>
      <span aria-hidden="true">
        <UiIcon name="calendar" /> {value ? formatPlanDate(value) : 'Not scheduled'}
      </span>
      <input
        type="date"
        aria-label={label}
        value={value ?? ''}
        disabled={disabled}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            /* picker unavailable; typing still works */
          }
        }}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </span>
  );
}
export function TaskWorkspace({
  project: initialProject,
  self,
  online,
  onFailure,
  mode = 'project',
  onScopeRemoved,
  onBack,
}: {
  project?: Project;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  mode?: 'project' | 'my' | 'calendar';
  onScopeRemoved?: () => void;
  onBack?: () => void;
}) {
  const [project, setProject] = useState(initialProject);
  const knownRows = useRef<{ key: string; ids: Set<number> }>(undefined),
    [newRows, setNewRows] = useState<number[]>([]);
  useEffect(() => {
    if (!newRows.length) return;
    const timer = setTimeout(() => setNewRows([]), 400);
    return () => clearTimeout(timer);
  }, [newRows]);
  const favorites = useFavorites(project ? self.csrf : undefined, online),
    starred = !!project && favorites.items.some((f) => f.project_id === project.id);
  const closeScope = useRef(onScopeRemoved);
  useEffect(() => {
    closeScope.current = onScopeRemoved;
  });
  const [view, setView] = useState<View>(mode === 'calendar' ? 'calendar' : 'table'),
    [filters, setFilters] = useState<Filters>(() =>
      mode === 'my' ? myWorkFilters(window.location.search) : emptyFilters,
    ),
    [q, setQ] = useState(''),
    [created, setCreated] = useState(false),
    [taskTotal, setTaskTotal] = useState<number>(),
    [page, setPage] = useState(1),
    [data, setData] = useState<{ items: Task[]; total: number; pageSize: number }>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<ApiError>(),
    [reload, setReload] = useState(0),
    [editor, setEditor] = useState<{
      id?: number;
      project: Project;
      initialGroup?: number | null;
    }>();
  const [namedGroups, setNamedGroups] = useState<ProjectGroup[]>([]),
    [collapsed, setCollapsed] = useState<string[]>([]),
    [groupName, setGroupName] = useState(''),
    [groupColor, setGroupColor] = useState('#579bfc'),
    [groupPending, setGroupPending] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup>();
  const [groupBy, setGroupBy] = useState('groups');
  // FR-52 Main table state: selection/batch, inline edits, quick add, drag and column widths.
  const [selected, setSelected] = useState<number[]>([]),
    [batchResult, setBatchResult] = useState<BatchResult>(),
    [batchStatus, setBatchStatus] = useState(''),
    [batchGroup, setBatchGroup] = useState(''),
    [titleEdit, setTitleEdit] = useState<{ id: number; value: string }>(),
    [quickAdd, setQuickAdd] = useState<Record<string, string>>({}),
    [dragging, setDragging] = useState<number>(),
    [draftWidths, setDraftWidths] = useState<Record<string, number>>({});
  const prefs = usePreferences(self.csrf);
  const widths = mainColumns.map(
    (k) => draftWidths[k] ?? prefs.column_widths[k] ?? (k === 'select' ? 44 : undefined),
  );
  const saveWidths = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Resize follows the pointer locally and is saved per user once it settles (UX/FR-52).
  const resizeColumn = (index: number, width: number) => {
    const key = mainColumns[index]!,
      value = Math.max(60, Math.min(800, width));
    setDraftWidths((d) => {
      const next = { ...d, [key]: value };
      clearTimeout(saveWidths.current);
      saveWidths.current = setTimeout(() => {
        void savePreferences(self.csrf, {
          column_widths: { ...prefs.column_widths, ...next },
        }).catch((e: unknown) => {
          if (e instanceof ApiError) onFailure(e);
        });
      }, 400);
      return next;
    });
  };
  useEffect(() => () => clearTimeout(saveWidths.current), []);
  const writableProject =
    !!project && project.effective_access !== 'viewer' && !project.archived_at && !self.maintenance;
  const mutate = async (path: string, method: 'PATCH' | 'POST', body: unknown) => {
    if (mutationBusy.current || !online) return false;
    mutationBusy.current = true;
    setGroupPending(true);
    try {
      await client.request(path, {
        method,
        csrf: self.csrf,
        key: crypto.randomUUID(),
        body,
        parse: (v) => mutationReply.parse(v),
      });
      setError(undefined);
      setReload((n) => n + 1);
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
      return false;
    } finally {
      mutationBusy.current = false;
      setGroupPending(false);
    }
  };
  const patchTask = (t: Task, body: Record<string, unknown>) =>
    mutate(`/api/tasks/${t.id}`, 'PATCH', { ...body, version: t.version });
  const moveTask = (t: Task, group: string) => {
    const target = group === 'ungrouped' ? null : Number(group);
    if ((t.group_id ?? null) === target) return;
    void patchTask(t, { group_id: target });
  };
  const quickCreate = async (g: string) => {
    const title = (quickAdd[g] ?? '').trim();
    if (!project || !title) return;
    const ok = await mutate('/api/tasks', 'POST', {
      project_id: project.id,
      title: title.slice(0, 200),
      ...(groupBy === 'groups' && g !== 'ungrouped' ? { group_id: Number(g) } : {}),
      ...(groupBy === 'status' ? {} : {}),
    });
    if (ok) setQuickAdd((q) => ({ ...q, [g]: '' }));
  };
  const runBatch = async (operation: 'patch' | 'delete', patch?: Record<string, unknown>) => {
    if (!data || !selected.length || mutationBusy.current || !online) return;
    if (operation === 'delete' && !window.confirm(`Move ${selected.length} task(s) to trash?`))
      return;
    mutationBusy.current = true;
    setGroupPending(true);
    try {
      const items = data.items
        .filter((t) => selected.includes(t.id))
        .map((t) => ({ id: t.id, version: t.version }));
      const reply = await client.request('/api/tasks/batch', {
        method: 'POST',
        csrf: self.csrf,
        key: crypto.randomUUID(),
        body: { operation, ...(patch ? { patch } : {}), items },
        parse: (v) => batchReply.parse(v),
      });
      setBatchResult(reply.results);
      // Keep failed rows selected so the user can review and retry them.
      setSelected(
        reply.results.filter((r) => !['updated', 'deleted'].includes(r.outcome)).map((r) => r.id),
      );
      setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
    } finally {
      mutationBusy.current = false;
      setGroupPending(false);
    }
  };
  const startGroup = () => {
    setEditingGroup(undefined);
    setGroupName('');
    setGroupColor('#579bfc');
    setGroupDialog(true);
  };
  const mutationBusy = useRef(false),
    groupIntent = useRef<{ signature: string; key: string } | undefined>(undefined),
    statusIntent = useRef<{ signature: string; key: string } | undefined>(undefined);
  const changeStatus = async (t: Task, status: Status) => {
    if (mutationBusy.current || !online || self.maintenance) return;
    mutationBusy.current = true;
    setGroupPending(true);
    const signature = JSON.stringify({ id: t.id, version: t.version, status });
    if (statusIntent.current?.signature !== signature)
      statusIntent.current = { signature, key: crypto.randomUUID() };
    try {
      await client.request(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        csrf: self.csrf,
        key: statusIntent.current.key,
        body: { version: t.version, status },
        parse: (v) => mutationReply.parse(v),
      });
      statusIntent.current = undefined;
      setError(undefined);
      setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
    } finally {
      mutationBusy.current = false;
      setGroupPending(false);
    }
  };
  const addGroup = async () => {
    if (mutationBusy.current || !groupName.trim() || !project) return;
    mutationBusy.current = true;
    setGroupPending(true);
    const signature = JSON.stringify({
      project: project.id,
      name: groupName.trim(),
      color: groupColor,
      id: editingGroup?.id,
      version: editingGroup?.version,
    });
    if (groupIntent.current?.signature !== signature)
      groupIntent.current = { signature, key: crypto.randomUUID() };
    try {
      const r = await client.request(
        editingGroup ? `/api/groups/${editingGroup.id}` : `/api/projects/${project.id}/groups`,
        {
          method: editingGroup ? 'PATCH' : 'POST',
          csrf: self.csrf,
          key: groupIntent.current.key,
          body: {
            name: groupName.trim(),
            color: groupColor,
            ...(editingGroup ? { version: editingGroup.version } : {}),
          },
          parse: (v) => ({ item: projectGroup.parse((v as { item: unknown }).item) }),
        },
      );
      setNamedGroups((g) =>
        editingGroup ? g.map((item) => (item.id === r.item.id ? r.item : item)) : [...g, r.item],
      );
      setGroupName('');
      setGroupDialog(false);
      groupIntent.current = undefined;
      setError(undefined);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
    } finally {
      mutationBusy.current = false;
      setGroupPending(false);
    }
  };
  const projectId = project?.id;
  const generation = useRef(0),
    opening = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]),
    [teams, setTeams] = useState<Team[]>([]),
    [people, setPeople] = useState<{ id: number; display_name: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const collect = async <T,>(
      read: (page: number) => Promise<{ items: T[]; total: number; pageSize: number }>,
    ) => {
      const items: T[] = [];
      for (let p = 1; ; p++) {
        const list = await read(p);
        items.push(...list.items);
        if (p * list.pageSize >= list.total) return items;
      }
    };
    void Promise.all([
      collect((p) =>
        client.request(`/api/projects?includeArchived=true&pageSize=100&page=${p}`, {
          signal: controller.signal,
          parse: (v) => projectPage.parse(v),
        }),
      ),
      collect((p) =>
        client.request(`/api/teams?pageSize=100&page=${p}`, {
          signal: controller.signal,
          parse: (v) => teamPage.parse(v),
        }),
      ),
      projectId
        ? client.request(`/api/projects/${projectId}/members`, {
            signal: controller.signal,
            parse: (v) => projectMembers.parse(v),
          })
        : Promise.resolve(undefined),
    ])
      .then(([p, t, m]) => {
        if (!controller.signal.aborted) {
          setProjects(p);
          setTeams(t);
          setPeople(m?.items.map((i) => i.user) ?? []);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && e instanceof ApiError) onFailure(e);
      });
    return () => controller.abort();
  }, [projectId, self.view_revision, onFailure]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const filterKey = JSON.stringify(filters);
  const read = useCallback(
    async (signal: AbortSignal) => {
      if (view === 'kanban') return;
      const at = ++generation.current;
      const { query, empty } = taskParameters(
        JSON.parse(filterKey) as Filters,
        self.bangkok_today,
        { project: project?.id, self: mode === 'my' ? self.user.id : undefined, created },
      );
      query.set('page', String(page));
      query.set('pageSize', view === 'table' ? '20' : '100');
      try {
        if (projectId) {
          let current: Project | undefined;
          for (let p = 1; ; p++) {
            const list = await client.request(
              `/api/projects?includeArchived=true&pageSize=100&page=${p}`,
              { signal, parse: (v) => projectPage.parse(v) },
            );
            current = list.items.find((p) => p.id === projectId);
            if (current || p * list.pageSize >= list.total) break;
          }
          if (!current) throw new ApiError('not-found', 404);
          const groups = await client.request(`/api/projects/${projectId}/groups`, {
            signal,
            parse: (v) => projectGroups.parse(v),
          });
          if (!signal.aborted && at === generation.current) {
            setProject(current);
            setNamedGroups(groups.items);
          }
        }
        const result = empty
          ? { items: [], total: 0, pageSize: 20 }
          : view === 'table'
            ? await client.request('/api/tasks?' + query, {
                signal,
                parse: (v) => taskPage.parse(v),
              })
            : await allTaskPages((n) => {
                query.set('page', String(n));
                return client.request('/api/tasks?' + query, {
                  signal,
                  parse: (v) => taskPage.parse(v),
                });
              }, signal);
        if (!signal.aborted && at === generation.current) {
          // AN-07: rows that appear in an otherwise unchanged list are briefly highlighted.
          const key = `${filterKey}|${page}|${view}|${created}|${projectId ?? ''}`;
          const before = knownRows.current;
          if (before?.key === key && motionAllowed()) {
            const fresh = result.items.filter((t) => !before.ids.has(t.id)).map((t) => t.id);
            if (fresh.length) setNewRows(fresh);
          }
          knownRows.current = { key, ids: new Set(result.items.map((t) => t.id)) };
          setData(result);
          setTaskTotal(result.total);
          setLoading(false);
          setError(undefined);
        }
      } catch (e) {
        if (!signal.aborted && at === generation.current) {
          const failure = e instanceof ApiError ? e : new ApiError('offline', 0);
          setError(failure);
          setLoading(false);
          if ([401, 403, 404].includes(failure.status)) {
            setData(undefined);
            setEditor(undefined);
            setProjects([]);
            setTeams([]);
            setPeople([]);
            closeScope.current?.();
          }
          onFailure(failure);
        }
      }
    },
    [
      view,
      page,
      filterKey,
      self.bangkok_today,
      self.user.id,
      project?.id,
      projectId,
      mode,
      created,
      onFailure,
    ],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setData(undefined);
      return read(controller.signal);
    });
    return () => {
      controller.abort();
      // This ref is an invalidation counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [read, reload, self.view_revision]);
  useSharedRefresh(read, online, project?.id ?? mode);
  const update = (key: keyof Filters, value: Filters[keyof Filters]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const refresh = () => setReload((n) => n + 1);
  const open = async (t: Task) => {
    if (opening.current || !online) return;
    opening.current = true;
    try {
      let found = project;
      if (!found)
        for (let page = 1; ; page++) {
          const list = await client.request(
            `/api/projects?includeArchived=true&pageSize=100&page=${page}`,
            { parse: (v) => projectPage.parse(v) },
          );
          found = list.items.find((p) => p.id === t.project_id);
          if (found || page * list.pageSize >= list.total) break;
        }
      if (!found) throw new ApiError('not-found', 404);
      setEditor({ id: t.id, project: found });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        onFailure(e);
      }
    } finally {
      opening.current = false;
    }
  };
  const deepTask = useRef(
    mode === 'project' ? new URLSearchParams(window.location.search).get('task') : null,
  );
  useEffect(() => {
    const id = deepTask.current;
    if (!project || !id || !/^[1-9][0-9]{0,9}$/.test(id)) return;
    deepTask.current = null;
    // The editor's GET /api/tasks/{id} enforces access before anything is shown.
    setEditor({ id: Number(id), project });
  }, [project]);
  useEffect(() => {
    if (mode !== 'my' || !data || !window.location.hash.startsWith('#my-group-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [mode, data]);
  const groups = project
    ? groupBy === 'status'
      ? [...statuses]
      : [...namedGroups.map((g) => String(g.id)), 'ungrouped']
    : mode === 'my'
      ? [...myWorkGroups]
      : [...statuses];
  const groupLabel: Record<string, string> = {
    ...statusLabel,
    ungrouped: 'Tasks',
    ...Object.fromEntries(namedGroups.map((g) => [String(g.id), g.name])),
    overdue: 'Overdue',
    today: 'Today',
    future: 'Future',
    this_week: 'This week',
    next_week: 'Next week',
    later: 'Later',
    none: 'No date',
  };
  return (
    <section
      className="task-workspace"
      aria-label={project ? 'Project task list' : mode === 'my' ? 'My work' : 'Work calendar'}
    >
      <div className="project-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {onBack ? <button onClick={onBack}>All projects</button> : <span>Workspace</span>}
            <span aria-hidden="true">›</span>
            <span>{project?.owner_team_name ?? (mode === 'my' ? 'My work' : 'Calendar')}</span>
          </nav>
          <div className="title-row">
            <h1>{project?.name ?? (mode === 'my' ? 'My work' : 'Work calendar')}</h1>
            {project && (
              <button
                type="button"
                className={`favorite-toggle ${starred ? 'on' : ''}`}
                aria-pressed={starred}
                aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
                disabled={!online}
                onClick={() =>
                  void favorites.toggle(project.id, !starred).catch((e: unknown) => {
                    if (e instanceof ApiError) onFailure(e);
                  })
                }
              >
                {starred ? '★' : '☆'}
              </button>
            )}
          </div>
          <p>
            {project?.description ||
              (mode === 'my'
                ? 'Prioritize your work and focus on what matters today'
                : 'All due dates across projects you can access')}
          </p>
          {project && (
            <div className="header-meta">
              <UiIcon name="team" /> {project.owner_team_name} <span>•</span> {taskTotal ?? '…'}{' '}
              Tasks <span>•</span> Access {project.effective_access}
            </div>
          )}
        </div>
      </div>
      {project && (
        <div className="board-members">
          <Assignees people={people.slice(0, 4)} />
          <button disabled={!online} onClick={() => setShowMembers(true)}>
            <UiIcon name="users" /> Members
          </button>
        </div>
      )}
      {showMembers && (
        <Dialog title="Project members" onClose={() => setShowMembers(false)}>
          <p>{project?.name}</p>
          <div className="member-roster">
            {people.map((person) => (
              <Assignees key={person.id} people={[person]} />
            ))}
            {!people.length && <p>No explicit members</p>}
          </div>
          <p className="muted">Assignment does not change project access.</p>
        </Dialog>
      )}
      {project?.archived_at && <p>Archived · Read only</p>}
      <div className="view-tabs" role="region" tabIndex={0} aria-label="Task views">
        {(
          [
            'table',
            ...(project ? ['kanban'] : []),
            'calendar',
            'gantt',
            ...(project ? ['docs', 'files', 'workload', 'overview'] : []),
          ] as View[]
        ).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => {
              setView(v);
              setPage(1);
            }}
          >
            <UiIcon name={v} />{' '}
            {
              {
                table: 'Main table',
                gantt: 'Gantt',
                calendar: 'Calendar',
                kanban: 'Kanban',
                docs: 'Docs',
                files: 'Files',
                workload: 'Workload',
                overview: 'Overview',
              }[v]
            }
          </button>
        ))}
      </div>
      {mode === 'my' && (
        <div className="my-work-scope">
          <select
            aria-label="Show tasks"
            value={created ? 'created' : 'assigned'}
            onChange={(e) => {
              setCreated(e.target.value === 'created');
              setPage(1);
            }}
          >
            <option value="assigned">Assigned to me</option>
            <option value="created">Created by me</option>
          </select>
          <span>
            {created
              ? 'Tasks you created, including those assigned to others'
              : 'Tasks assigned to you'}
          </span>
        </div>
      )}
      {view === 'docs' && project ? (
        <Suspense fallback={<Loading />}>
          <ProjectDocs {...{ project, self, online, onFailure }} />
        </Suspense>
      ) : view === 'workload' && project ? (
        <Suspense fallback={<Loading />}>
          <WorkloadView scope="project" id={project.id} {...{ self, online, onFailure }} />
        </Suspense>
      ) : view === 'overview' && project ? (
        <Suspense fallback={<Loading />}>
          <ProjectOverview projectId={project.id} {...{ self, online, onFailure }} />
        </Suspense>
      ) : view === 'files' && project ? (
        <Suspense fallback={<Loading />}>
          <ProjectFiles {...{ project, self, online, onFailure }} />
        </Suspense>
      ) : view === 'kanban' && project ? (
        <Suspense fallback={<Loading />}>
          <Kanban
            {...{ project, self, online, onFailure }}
            revision={reload}
            groups={namedGroups}
            onTotalChange={setTaskTotal}
            onOpen={(id) => setEditor({ id, project })}
            onCreate={() => setEditor({ project })}
          />
        </Suspense>
      ) : (
        <>
          <div className="task-filters">
            {project && project.effective_access !== 'viewer' && !project.archived_at && (
              <button
                disabled={!online || self.maintenance}
                className="primary board-new-task"
                onClick={() => setEditor({ project })}
              >
                <UiIcon name="plus" /> New task
              </button>
            )}
            <div className="board-search">
              <UiIcon name="search" />
              <Field
                label="Search tasks"
                placeholder="Search tasks"
                value={q}
                maxLength={100}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button
              className="search-submit"
              disabled={!online}
              onClick={() => {
                update('q', q);
                refresh();
              }}
            >
              Search
            </button>
            <details>
              <summary>
                <UiIcon name="filter" /> Filters
              </summary>
              <div className="filter-grid">
                {!project && (
                  <>
                    <label>
                      Projects
                      <select
                        aria-label="Projects"
                        value={filters.project}
                        onChange={(e) => update('project', e.target.value)}
                      >
                        <option value="">All projects</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Teams
                      <select
                        aria-label="Teams"
                        value={filters.team}
                        onChange={(e) => update('team', e.target.value)}
                      >
                        <option value="">All teams</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {mode !== 'my' && (
                  <label>
                    Assignees
                    <select
                      aria-label="Assignees"
                      value={filters.assignee}
                      onChange={(e) => update('assignee', e.target.value)}
                    >
                      <option value="">Everyone</option>
                      <option value="null">Unassigned</option>
                      {[
                        ...new Map(
                          [
                            { id: self.user.id, display_name: self.user.display_name },
                            ...people,
                            ...(data?.items.flatMap(
                              (t) => t.assignees ?? (t.assignee ? [t.assignee] : []),
                            ) ?? []),
                          ].map((p) => [p.id, p]),
                        ).values(),
                      ].map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Field
                  label="Category"
                  value={filters.category}
                  maxLength={80}
                  onChange={(e) => update('category', e.target.value)}
                />
                <Field
                  label="End Plan from"
                  type="date"
                  value={filters.due_from}
                  onChange={(e) => update('due_from', e.target.value)}
                />
                <Field
                  label="End Plan to"
                  type="date"
                  value={filters.due_to}
                  onChange={(e) => update('due_to', e.target.value)}
                />
                <label>
                  Due date
                  <select
                    aria-label="Due date"
                    value={filters.has_due}
                    onChange={(e) => update('has_due', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="true">Has End Plan</option>
                    <option value="false">No due date</option>
                  </select>
                </label>
                <fieldset>
                  <legend>Status (multiple)</legend>
                  {statuses.map((s) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        checked={filters.status.includes(s)}
                        onChange={(e) =>
                          update(
                            'status',
                            e.target.checked
                              ? [...filters.status, s]
                              : filters.status.filter((v) => v !== s),
                          )
                        }
                      />
                      {statusLabel[s]}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Priority (multiple)</legend>
                  {priorities.map((s) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(s)}
                        onChange={(e) =>
                          update(
                            'priority',
                            e.target.checked
                              ? [...filters.priority, s]
                              : filters.priority.filter((v) => v !== s),
                          )
                        }
                      />
                      {priorityLabel[s]}
                    </label>
                  ))}
                </fieldset>
                <button
                  onClick={() => {
                    setFilters(emptyFilters);
                    setQ('');
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              </div>
            </details>
            {mode === 'my' && (
              <label>
                Due range
                <select
                  aria-label="Due range"
                  value={filters.group}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, group: e.target.value, completed_from: '' }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {['today', 'overdue', 'this_week', 'future', 'none', 'done'].map((g) => (
                    <option key={g} value={g}>
                      {groupLabel[g]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === 'my' && filters.completed_from && (
              <button
                className="filter-chip"
                aria-label={`Remove filter completed since ${filters.completed_from}`}
                onClick={() => update('completed_from', '')}
              >
                Completed since {filters.completed_from} ×
              </button>
            )}
            <label>
              <select
                aria-label="Sort by"
                value={filters.sort}
                onChange={(e) => update('sort', e.target.value)}
              >
                {[
                  ['due_asc', 'End Plan · earliest'],
                  ['due_desc', 'End Plan · latest'],
                  ['created_desc', 'Newest created'],
                  ['created_asc', 'Oldest created'],
                  ['updated_desc', 'Recently updated'],
                  ['priority_desc', 'Priority'],
                  ['title_asc', 'Task title'],
                ].map(([s, label]) => (
                  <option key={s} value={s}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {project && view === 'table' && (
              <label>
                <select
                  aria-label="Group by"
                  value={groupBy}
                  onChange={(e) => {
                    setGroupBy(e.target.value);
                    setCollapsed([]);
                  }}
                >
                  <option value="groups">Groups</option>
                  <option value="status">Status</option>
                </select>
              </label>
            )}
            <span className="board-task-count">{data?.total ?? 0} Tasks</span>
            {project &&
              view === 'table' &&
              project.effective_access !== 'viewer' &&
              !project.archived_at && (
                <button
                  className="new-group-trigger"
                  disabled={!online || self.maintenance}
                  onClick={startGroup}
                >
                  <UiIcon name="plus" /> New Group
                </button>
              )}
            <button className="refresh-board" disabled={!online} onClick={refresh}>
              Refresh tasks
            </button>
          </div>
          {error && <ErrorNotice error={error} retry={refresh} />}
          {loading ? (
            <Loading />
          ) : (
            data && (
              <>
                {view === 'table' ? (
                  <>
                    {project && writableProject && selected.length > 0 && (
                      <div className="batch-bar toolbar" role="region" aria-label="Batch actions">
                        <strong>{selected.length} selected</strong>
                        <select
                          aria-label="Batch status"
                          value={batchStatus}
                          onChange={(e) => setBatchStatus(e.target.value)}
                        >
                          <option value="">Set status…</option>
                          {statuses.map((st) => (
                            <option key={st} value={st}>
                              {statusLabel[st]}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!batchStatus || groupPending || !online}
                          onClick={() => void runBatch('patch', { status: batchStatus })}
                        >
                          Apply status
                        </button>
                        <select
                          aria-label="Batch group"
                          value={batchGroup}
                          onChange={(e) => setBatchGroup(e.target.value)}
                        >
                          <option value="">Move to group…</option>
                          {[...namedGroups.map((ng) => String(ng.id)), 'ungrouped'].map((k) => (
                            <option key={k} value={k}>
                              {groupLabel[k]}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={!batchGroup || groupPending || !online}
                          onClick={() =>
                            void runBatch('patch', {
                              group_id: batchGroup === 'ungrouped' ? null : Number(batchGroup),
                            })
                          }
                        >
                          Move
                        </button>
                        <button
                          disabled={groupPending || !online}
                          onClick={() => void runBatch('delete')}
                        >
                          Delete
                        </button>
                        <button onClick={() => setSelected([])}>Clear selection</button>
                      </div>
                    )}
                    {batchResult && (
                      <div className="batch-result" role="status">
                        <strong>
                          Batch result:{' '}
                          {
                            batchResult.filter((r) => ['updated', 'deleted'].includes(r.outcome))
                              .length
                          }{' '}
                          done,{' '}
                          {
                            batchResult.filter((r) => !['updated', 'deleted'].includes(r.outcome))
                              .length
                          }{' '}
                          not applied
                        </strong>
                        <ul>
                          {batchResult
                            .filter((r) => !['updated', 'deleted'].includes(r.outcome))
                            .map((r) => (
                              <li key={r.id}>
                                Task #{r.id}:{' '}
                                {r.outcome === 'conflict'
                                  ? 'changed by someone else — reload and retry'
                                  : r.outcome === 'forbidden'
                                    ? 'you do not have permission'
                                    : r.outcome === 'not_found'
                                      ? 'no longer available'
                                      : `rejected (${r.code ?? 'invalid'})`}
                              </li>
                            ))}
                        </ul>
                        <button onClick={() => setBatchResult(undefined)}>Dismiss</button>
                      </div>
                    )}
                    {groups.map((g) => {
                      const tasks = data.items.filter((t) =>
                        project
                          ? groupBy === 'status'
                            ? t.status === g
                            : g === 'ungrouped'
                              ? !t.group_id
                              : String(t.group_id) === g
                          : mode === 'my'
                            ? myWorkGroup(t, self.bangkok_today) === g
                            : t.status === g,
                      );
                      return tasks.length || (project && g !== 'ungrouped') ? (
                        <section
                          className={`task-group ${project ? 'project-task-group' : 'personal-task-group'}`}
                          key={g}
                          id={mode === 'my' ? `my-group-${g}` : undefined}
                          onDragOver={(e) => {
                            if (dragging && writableProject && groupBy === 'groups')
                              e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const t = data.items.find((x) => x.id === dragging);
                            setDragging(undefined);
                            if (t && groupBy === 'groups') moveTask(t, g);
                          }}
                          style={{
                            color:
                              namedGroups.find((group) => String(group.id) === g)?.color ??
                              '#579bfc',
                          }}
                        >
                          <div className="group-heading">
                            <button
                              aria-expanded={!collapsed.includes(g)}
                              onClick={() =>
                                setCollapsed((c) =>
                                  c.includes(g) ? c.filter((id) => id !== g) : [...c, g],
                                )
                              }
                            >
                              <span className="chev">{collapsed.includes(g) ? '›' : '⌄'}</span>{' '}
                              {groupLabel[g]}
                            </button>
                            <span>{tasks.length} Tasks</span>
                            {project &&
                              project.effective_access !== 'viewer' &&
                              !project.archived_at &&
                              groupBy === 'groups' &&
                              g !== 'ungrouped' && (
                                <button
                                  className="edit-group"
                                  aria-label={`Edit group ${groupLabel[g]}`}
                                  disabled={!online || self.maintenance || groupPending}
                                  onClick={() => {
                                    const item = namedGroups.find((item) => String(item.id) === g);
                                    if (!item) return;
                                    setEditingGroup(item);
                                    setGroupName(item.name);
                                    setGroupColor(item.color);
                                    setGroupDialog(true);
                                  }}
                                >
                                  <UiIcon name="more" />
                                </button>
                              )}
                            {project &&
                              project.effective_access !== 'viewer' &&
                              !project.archived_at && (
                                <button
                                  disabled={!online || self.maintenance}
                                  onClick={() =>
                                    setEditor({
                                      project,
                                      initialGroup:
                                        groupBy === 'status' || g === 'ungrouped'
                                          ? null
                                          : Number(g),
                                    })
                                  }
                                >
                                  + Add task
                                </button>
                              )}
                          </div>
                          <div
                            hidden={collapsed.includes(g)}
                            style={
                              project
                                ? ({ '--select-col': `${widths[0] ?? 44}px` } as CSSProperties)
                                : undefined
                            }
                          >
                            <DataTable
                              caption={`${groupLabel[g]} · Tasks`}
                              columns={
                                project
                                  ? [
                                      'Select',
                                      'Task',
                                      'Assignees',
                                      'Status',
                                      'Priority',
                                      'Start Plan',
                                      'End Plan',
                                    ]
                                  : [
                                      'Task',
                                      'Assignee',
                                      'Status',
                                      'Priority',
                                      'Start Plan',
                                      'End Plan',
                                    ]
                              }
                              className={project ? 'main-table' : 'main-table my-work-table'}
                              {...(project ? { widths, onResize: resizeColumn } : {})}
                              rowProps={(i) => {
                                const fresh = newRows.includes(tasks[i]!.id) ? 'row-new' : '';
                                return project && writableProject && groupBy === 'groups'
                                  ? {
                                      draggable: true,
                                      onDragStart: () => setDragging(tasks[i]!.id),
                                      onDragEnd: () => setDragging(undefined),
                                      className:
                                        [dragging === tasks[i]!.id ? 'dragging' : '', fresh]
                                          .filter(Boolean)
                                          .join(' ') || undefined,
                                    }
                                  : { className: fresh || undefined };
                              }}
                              rows={tasks.map((t) =>
                                project
                                  ? [
                                      <div className="row-select" key={t.id}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${t.title}`}
                                          checked={selected.includes(t.id)}
                                          onChange={(e) =>
                                            setSelected((s) =>
                                              e.target.checked
                                                ? [...s, t.id]
                                                : s.filter((x) => x !== t.id),
                                            )
                                          }
                                        />
                                        <details className="task-row-menu">
                                          <summary aria-label={`Task menu ${t.title}`}>
                                            <UiIcon name="more" />
                                          </summary>
                                          <button onClick={() => void open(t)}>
                                            View task details
                                          </button>
                                          {writableProject && (
                                            <button
                                              onClick={() =>
                                                setTitleEdit({ id: t.id, value: t.title })
                                              }
                                            >
                                              Rename task
                                            </button>
                                          )}
                                          {writableProject && groupBy === 'groups' && (
                                            <label>
                                              Move to group
                                              <select
                                                aria-label={`Move ${t.title} to group`}
                                                value={
                                                  t.group_id ? String(t.group_id) : 'ungrouped'
                                                }
                                                onChange={(e) => moveTask(t, e.target.value)}
                                              >
                                                {[
                                                  ...namedGroups.map((ng) => String(ng.id)),
                                                  'ungrouped',
                                                ].map((k) => (
                                                  <option key={k} value={k}>
                                                    {groupLabel[k]}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>
                                          )}
                                        </details>
                                      </div>,
                                      <div className="task-name" key={t.id}>
                                        {titleEdit?.id === t.id ? (
                                          <input
                                            aria-label={`Task title ${t.title}`}
                                            autoFocus
                                            maxLength={200}
                                            value={titleEdit.value}
                                            onChange={(e) =>
                                              setTitleEdit({ id: t.id, value: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') setTitleEdit(undefined);
                                              if (e.key === 'Enter' && titleEdit.value.trim()) {
                                                void patchTask(t, {
                                                  title: titleEdit.value.trim(),
                                                });
                                                setTitleEdit(undefined);
                                              }
                                            }}
                                            onBlur={() => setTitleEdit(undefined)}
                                          />
                                        ) : (
                                          <button
                                            aria-label={`Open task #${t.id}`}
                                            disabled={!online}
                                            onClick={() => void open(t)}
                                            // A click opens the task, so rename is F2 or the row menu.
                                            onKeyDown={(e) => {
                                              if (e.key === 'F2' && writableProject) {
                                                e.preventDefault();
                                                setTitleEdit({ id: t.id, value: t.title });
                                              }
                                            }}
                                          >
                                            {t.title}
                                            <small>
                                              FR-{String(t.id).padStart(3, '0')}
                                              {t.category ? ` · ${t.category}` : ''}
                                            </small>
                                          </button>
                                        )}
                                        <button
                                          className="task-comment-link"
                                          aria-label={`Comments for ${t.title}`}
                                          disabled={!online}
                                          onClick={() => void open(t)}
                                        >
                                          <UiIcon name="comment" />
                                        </button>
                                      </div>,
                                      <Assignees
                                        key={t.id}
                                        compact
                                        people={t.assignees ?? (t.assignee ? [t.assignee] : [])}
                                      />,
                                      <StatusPicker
                                        key={t.id}
                                        label={`Status for ${t.title}`}
                                        value={t.status}
                                        disabled={
                                          !online ||
                                          groupPending ||
                                          self.maintenance ||
                                          project.effective_access === 'viewer' ||
                                          !!project.archived_at
                                        }
                                        onChange={(status) => void changeStatus(t, status)}
                                      />,
                                      writableProject ? (
                                        <select
                                          key={t.id}
                                          className={`priority-pill ${t.priority}`}
                                          aria-label={`Priority for ${t.title}`}
                                          value={t.priority}
                                          disabled={!online || groupPending}
                                          onChange={(e) =>
                                            void patchTask(t, { priority: e.target.value })
                                          }
                                        >
                                          {priorities.map((p) => (
                                            <option key={p} value={p}>
                                              {priorityLabel[p]}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span key={t.id} className={`priority-pill ${t.priority}`}>
                                          {priorityLabel[t.priority]}
                                        </span>
                                      ),
                                      writableProject ? (
                                        <PlanDateCell
                                          key={t.id}
                                          label={`Start Plan ${t.title}`}
                                          value={t.start_date}
                                          overdue={false}
                                          disabled={!online || groupPending}
                                          onChange={(v) => void patchTask(t, { start_date: v })}
                                        />
                                      ) : (
                                        <span key={t.id} className="plan-date">
                                          {t.start_date
                                            ? formatPlanDate(t.start_date)
                                            : 'Not scheduled'}
                                        </span>
                                      ),
                                      writableProject ? (
                                        <PlanDateCell
                                          key={t.id}
                                          label={`End Plan ${t.title}`}
                                          value={t.due_date}
                                          overdue={!!t.overdue}
                                          disabled={!online || groupPending}
                                          onChange={(v) => void patchTask(t, { due_date: v })}
                                        />
                                      ) : (
                                        <span
                                          key={t.id}
                                          className={`plan-date ${t.overdue ? 'overdue' : ''}`}
                                        >
                                          {t.due_date
                                            ? formatPlanDate(t.due_date)
                                            : 'Not scheduled'}
                                        </span>
                                      ),
                                    ]
                                  : [
                                      <div className="task-name" key={t.id}>
                                        <button
                                          aria-label={`Open task #${t.id}`}
                                          disabled={!online}
                                          onClick={() => void open(t)}
                                        >
                                          {t.title}
                                          <small>
                                            FR-{String(t.id).padStart(3, '0')} · {t.project_name}
                                          </small>
                                        </button>
                                      </div>,
                                      <Assignees
                                        key={t.id}
                                        compact
                                        people={t.assignees ?? (t.assignee ? [t.assignee] : [])}
                                      />,
                                      <StatusPicker
                                        key={t.id}
                                        label={`Status for ${t.title}`}
                                        value={t.status}
                                        disabled={!online || groupPending || self.maintenance}
                                        onChange={(status) => void changeStatus(t, status)}
                                      />,
                                      <span key={t.id} className={`priority-pill ${t.priority}`}>
                                        {priorityLabel[t.priority]}
                                      </span>,
                                      <span key={t.id} className="plan-date">
                                        {t.start_date
                                          ? formatPlanDate(t.start_date)
                                          : 'Not scheduled'}
                                      </span>,
                                      <span
                                        key={t.id}
                                        className={`plan-date ${t.overdue ? 'overdue' : ''}`}
                                      >
                                        {t.due_date ? formatPlanDate(t.due_date) : 'Not scheduled'}
                                      </span>,
                                    ],
                              )}
                            />
                            {project &&
                              project.effective_access !== 'viewer' &&
                              !project.archived_at && (
                                <form
                                  className="group-add-row"
                                  style={{
                                    borderLeftColor:
                                      namedGroups.find((group) => String(group.id) === g)?.color ??
                                      '#579bfc',
                                  }}
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    void quickCreate(g);
                                  }}
                                >
                                  <UiIcon name="plus" />
                                  <input
                                    aria-label={`Add task to ${groupLabel[g]}`}
                                    placeholder="+ Add task (type and press Enter)"
                                    maxLength={200}
                                    data-add
                                    value={quickAdd[g] ?? ''}
                                    disabled={!online || self.maintenance || groupPending}
                                    onChange={(e) =>
                                      setQuickAdd((q) => ({ ...q, [g]: e.target.value }))
                                    }
                                  />
                                </form>
                              )}
                            <div className="group-summary">
                              {tasks.filter((t) => t.status === 'done').length} Completed ·{' '}
                              {tasks.length}{' '}
                              {data && data.total > data.pageSize
                                ? 'tasks on this page'
                                : 'tasks in this group'}
                            </div>
                          </div>
                        </section>
                      ) : null;
                    })}
                    {project && project.effective_access !== 'viewer' && !project.archived_at && (
                      <>
                        <button className="add-new-group" onClick={startGroup}>
                          <UiIcon name="plus" /> Add new group
                        </button>
                        {groupDialog && (
                          <Dialog
                            title={editingGroup ? 'Edit group' : 'New Group'}
                            onClose={() => !groupPending && setGroupDialog(false)}
                          >
                            <form
                              className="new-group-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void addGroup();
                              }}
                            >
                              <input
                                aria-label="New group name"
                                placeholder="New group name"
                                maxLength={100}
                                value={groupName}
                                disabled={groupPending || !online || self.maintenance}
                                onChange={(e) => setGroupName(e.target.value)}
                              />
                              <input
                                aria-label="Group color"
                                type="color"
                                value={groupColor}
                                onChange={(e) => setGroupColor(e.target.value)}
                              />
                              <button
                                type="submit"
                                disabled={
                                  !groupName.trim() || groupPending || !online || self.maintenance
                                }
                              >
                                {editingGroup ? 'Save group' : '+ New group'}
                              </button>
                            </form>
                            {error && <ErrorNotice error={error} />}
                          </Dialog>
                        )}
                      </>
                    )}
                    {data.total === 0 && <p>No tasks match these filters</p>}
                    <div className="toolbar">
                      <button disabled={!online || page === 1} onClick={() => setPage(page - 1)}>
                        Previous task page
                      </button>
                      <span>
                        Page {page} · Total {data.total} Tasks · {data.pageSize} tasks per page
                      </span>
                      <button
                        disabled={!online || page * data.pageSize >= data.total}
                        onClick={() => setPage(page + 1)}
                      >
                        Next task page
                      </button>
                    </div>
                  </>
                ) : view === 'calendar' ? (
                  <CalendarView
                    tasks={data.items}
                    today={self.bangkok_today}
                    open={(t) => void open(t)}
                  />
                ) : (
                  <GanttView
                    tasks={data.items}
                    today={self.bangkok_today}
                    open={(t) => void open(t)}
                  />
                )}
              </>
            )
          )}
        </>
      )}
      {editor && (
        <TaskEditor
          key={editor.id ?? 'new'}
          {...{ self, online, onFailure }}
          project={editor.project}
          id={editor.id}
          initialGroup={editor.initialGroup}
          onClose={() => setEditor(undefined)}
          onDone={refresh}
        />
      )}
    </section>
  );
}
