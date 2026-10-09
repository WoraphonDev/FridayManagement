import { UiIcon } from './shared/UiIcon';
import { formatPlanDate } from './shared/formatPlanDate';
import { StatusPicker } from './shared/StatusPicker';
import { Assignees } from './shared/PeoplePicker';
import { useSharedRefresh } from './shared/refresh';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiClient, ApiError, type Self } from './api';
import { projectPage, projectMembers, type Project } from './workspace-api';
import {
  boardSchema,
  moveReply,
  taskPage,
  statuses,
  statusLabel,
  priorities,
  priorityLabel,
  type ProjectGroup,
  type Board,
  type Task,
  type Status,
} from './task-api';
import { ErrorNotice, Field, Loading, Toast } from './shared/components';
import { motionAllowed } from './motion';
const client = apiClient();
async function currentProject(id: number, signal?: AbortSignal) {
  for (let page = 1; ; page++) {
    const p = await client.request(`/api/projects?includeArchived=true&pageSize=100&page=${page}`, {
      signal,
      parse: (v) => projectPage.parse(v),
    });
    const found = p.items.find((p) => p.id === id);
    if (found) return found;
    if (page * 100 >= p.total) throw new ApiError('not-found', 404);
  }
}
const blank = {
  q: '',
  assignee: '',
  priority: '',
  category: '',
  due_from: '',
  due_to: '',
  status: '',
};
type Filter = typeof blank;
type Intent = {
  body: {
    task_id: number;
    task_version: number;
    from_status: Status;
    to_status: Status;
    source_column_version: number;
    target_column_version: number;
    before_task_id: number | null;
  };
  key: string;
};
function Card({
  task,
  groupName,
  disabled,
  controls,
  onOpen,
  onMove,
  before,
  after,
}: {
  task: Task;
  groupName?: string;
  disabled: boolean;
  controls: boolean;
  onOpen: () => void;
  onMove: (status: Status, before: number | null) => void;
  before?: number;
  after?: number | null;
}) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
    attributes,
    listeners,
  } = useSortable({ id: task.id, disabled });
  return (
    <article
      className="kanban-card"
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-task-id={task.id}
    >
      <div className="card-top">
        <span>FR-{String(task.id).padStart(3, '0')}</span>
        {controls && (
          <button
            className="drag-handle"
            aria-label={`Drag task #${task.id}`}
            disabled={disabled}
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        )}
      </div>
      <div className="card-content-motion">
        <button className="card-title" onClick={onOpen} aria-label={`Open task #${task.id}`}>
          {task.title}
        </button>
        <div className="card-group-name">{groupName ?? 'Tasks'}</div>
        {task.subtask_count > 0 && (
          <div className="card-checklist">
            <progress
              aria-label="Checklist completion"
              value={task.subtask_done_count}
              max={task.subtask_count}
            />
            <span>
              {task.subtask_done_count}/{task.subtask_count}
            </span>
          </div>
        )}
        <div className="card-foot">
          <span className={`priority-pill ${task.priority}`}>{priorityLabel[task.priority]}</span>
          <span
            className={`card-due ${task.overdue ? 'overdue' : ''}`}
            title={`Start Plan ${formatPlanDate(task.start_date)} · End Plan ${formatPlanDate(task.due_date)}`}
          >
            <UiIcon name="calendar" />
            {formatPlanDate(task.due_date)}
          </span>
          <Assignees compact people={task.assignees ?? (task.assignee ? [task.assignee] : [])} />
          {controls && (
            <details className="card-manage">
              <summary aria-label={`Manage task #${task.id}`}>•••</summary>
              <div className="card-manage-menu">
                <StatusPicker
                  value={task.status}
                  label={`Status for ${task.title}`}
                  disabled={disabled}
                  onChange={(status) => onMove(status, null)}
                />
                <button
                  disabled={disabled || before === undefined}
                  onClick={() => onMove(task.status, before!)}
                >
                  Move up #{task.id}
                </button>
                <button
                  disabled={disabled || after === undefined}
                  onClick={() => onMove(task.status, after!)}
                >
                  Move down #{task.id}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
function Lane({ status, children }: { status: Status; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-lane lane-${status}`}
      aria-label={`Column ${statusLabel[status]}`}
    >
      <h3>{statusLabel[status]}</h3>
      {children}
    </section>
  );
}
export function Kanban({
  project,
  self,
  online,
  onFailure,
  onOpen,
  onCreate,
  revision,
  groups,
  onTotalChange,
}: {
  project: Project;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
  onOpen: (id: number) => void;
  onCreate: () => void;
  revision: number;
  groups?: ProjectGroup[];
  onTotalChange?: (total: number) => void;
}) {
  const [data, setData] = useState<Board>(),
    [current, setCurrent] = useState(project),
    [people, setPeople] = useState<{ id: number; display_name: string }[]>([]),
    [filter, setFilter] = useState<Filter>(blank),
    [visible, setVisible] = useState<Task[]>(),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState<ApiError>(),
    [notice, setNotice] = useState(''),
    [pending, setPending] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [retryAllowed, setRetryAllowed] = useState(false),
    [loading, setLoading] = useState(true);
  const boardRoot = useRef<HTMLElement>(null),
    positions = useRef(new Map<string, DOMRect>()),
    motions = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const cards = boardRoot.current?.querySelectorAll<HTMLElement>('[data-task-id]');
    if (!cards) return;
    motions.current.forEach((a) => a.cancel());
    motions.current = [];
    const reduced = !motionAllowed();
    const next = new Map<string, DOMRect>();
    cards.forEach((card) => {
      const id = card.dataset.taskId!,
        rect = card.getBoundingClientRect(),
        previous = positions.current.get(id);
      next.set(id, rect);
      if (!reduced && previous && (previous.x !== rect.x || previous.y !== rect.y)) {
        // FLIP the whole card (frame and content) from its old slot to the new one.
        if (card.animate && !card.dataset.dragging)
          motions.current.push(
            card.animate(
              [
                {
                  transform: `translate(${previous.x - rect.x}px,${previous.y - rect.y}px) scale(1.02)`,
                  boxShadow: '0 10px 24px #292f4c26',
                  zIndex: 5,
                },
                {
                  transform: 'translate(0,0) scale(1)',
                  boxShadow: '0 1px 2px #292f4c14',
                  zIndex: 5,
                },
              ],
              {
                duration: previous.x === rect.x ? 240 : 380,
                easing: 'cubic-bezier(.2,.8,.2,1)',
              },
            ),
          );
      }
    });
    positions.current = next;
  }, [data, visible]);
  useEffect(() => () => motions.current.forEach((a) => a.cancel()), []);
  const busy = useRef(false),
    intent = useRef<Intent | undefined>(undefined),
    sequence = useRef(0),
    mounted = useRef(true);
  const filtered = Object.values(filter).some(Boolean),
    canWrite = current.effective_access !== 'viewer' && !current.archived_at && !self.maintenance;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const n = ++sequence.current;
      try {
        const [p, b, members] = await Promise.all([
          currentProject(project.id, signal),
          client.request(`/api/projects/${project.id}/board`, {
            signal,
            parse: (v) => boardSchema.parse(v),
          }),
          client.request(`/api/projects/${project.id}/members`, {
            signal,
            parse: (v) => projectMembers.parse(v),
          }),
        ]);
        const query = new URLSearchParams({
          project: String(project.id),
          page: String(b.mode === 'list_required' ? page : 1),
          pageSize: b.mode === 'list_required' ? '20' : '100',
        });
        for (const [key, value] of Object.entries(filter))
          if (value)
            query.set(key, key === 'assignee' ? (value === 'null' ? 'null' : value) : value);
        let tasks: Task[] | undefined,
          count = b.total;
        if (filtered || b.mode === 'list_required') {
          const first = await client.request('/api/tasks?' + query, {
            signal,
            parse: (v) => taskPage.parse(v),
          });
          tasks = [...first.items];
          count = first.total;
          if (b.mode === 'board')
            for (let i = 2; i <= Math.ceil(first.total / 100); i++) {
              query.set('page', String(i));
              const next = await client.request('/api/tasks?' + query, {
                signal,
                parse: (v) => taskPage.parse(v),
              });
              tasks.push(...next.items);
              if (tasks.length > 500) throw new ApiError('conflict', 409);
            }
        }
        if (mounted.current && n === sequence.current && !signal?.aborted) {
          setCurrent(p);
          setPeople([
            ...new Map(
              [
                ...members.items.map((m) => m.user),
                ...b.tasks.flatMap((t) => (t.assignee ? [t.assignee] : [])),
              ].map((u) => [u.id, u]),
            ).values(),
          ]);
          setData(b);
          onTotalChange?.(b.total);
          setVisible(tasks);
          setTotal(count);
          setLoading(false);
        }
        return b;
      } catch (e) {
        if (mounted.current && n === sequence.current && !signal?.aborted) {
          const failure = e instanceof ApiError ? e : new ApiError('offline', 0);
          setError(failure);
          setLoading(false);
          if (['not-found', 'session', 'forbidden'].includes(failure.kind)) {
            setData(undefined);
            setVisible(undefined);
            setPeople([]);
          }
          onFailure(failure);
        }
        throw e;
      }
    },
    [project.id, filter, page, onFailure, filtered, onTotalChange],
  );
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve()
      .then(() => load())
      .catch(() => {});
    return () => {
      mounted.current = false;
      // Invalidate request sequence; this ref is a counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
    };
  }, [load, revision, self.view_revision]);
  useSharedRefresh(
    async (signal) => {
      if (!busy.current) await load(signal);
    },
    online,
    project.id,
  );
  const execute = async (command: Intent, original: Board) => {
    if (busy.current || !online) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    setNotice('Saving position…');
    let acknowledged = false;
    try {
      const result = await client.request(`/api/projects/${project.id}/board/move`, {
        method: 'POST',
        body: command.body,
        key: command.key,
        csrf: self.csrf,
        signal: AbortSignal.timeout(10000),
        parse: (v) => moveReply.parse(v),
      });
      acknowledged = true;
      intent.current = undefined;
      setRetryAllowed(false);
      const columns = original.columns.map(
        (c) => result.affected_columns.find((changed) => changed.status === c.status) ?? c,
      );
      const tasks = original.tasks.map((t) => (t.id === result.task.id ? result.task : t));
      if (result.successor) tasks.push(result.successor);
      const total = original.total + (result.successor ? 1 : 0),
        complete = total <= 500 && columns.every((c) => c.complete);
      setData({
        ...original,
        total,
        mode: complete ? 'board' : 'list_required',
        tasks: complete ? tasks : [],
        columns: complete ? columns : columns.map((c) => ({ ...c, task_ids: [], complete: false })),
      });
      setUncertain(false);
      await load();
      setNotice('Position saved');
      requestAnimationFrame(() => {
        if (document.querySelectorAll('dialog[open]').length === 1)
          document
            .querySelector<HTMLButtonElement>(
              `[data-task-id="${command.body.task_id}"] .card-title`,
            )
            ?.focus();
      });
    } catch (e) {
      if (!acknowledged) setData(original);
      const failure = e instanceof ApiError ? e : new ApiError('offline', 0);
      setError(failure);
      onFailure(failure);
      if (acknowledged) {
        setRetryAllowed(false);
        setUncertain(true);
        setNotice('Position saved. Refresh the board to see the latest data.');
      } else if (
        failure.status === 0 ||
        failure.kind === 'invalid' ||
        failure.kind === 'unavailable'
      ) {
        setRetryAllowed(true);
        setUncertain(true);
        setNotice('Checking the server before retrying the same action');
        try {
          await load();
        } catch {
          /* keep retry blocked until a successful authoritative read */
        }
      } else {
        intent.current = undefined;
        setUncertain(false);
        setNotice(
          failure.kind === 'conflict'
            ? 'Position changed. Review the latest board and move again.'
            : 'Move failed. Previous position restored.',
        );
        try {
          await load();
        } catch {
          /* error already reported */
        }
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const move = (id: number, to: Status, before: number | null) => {
    if (
      !data ||
      busy.current ||
      uncertain ||
      !online ||
      !canWrite ||
      filtered ||
      data.mode !== 'board'
    )
      return;
    const task = data.tasks.find((t) => t.id === id)!;
    if (before === id) return;
    const source = data.columns.find((c) => c.status === task.status)!,
      target = data.columns.find((c) => c.status === to)!;
    const command: Intent = {
      key: crypto.randomUUID(),
      body: {
        task_id: id,
        task_version: task.version,
        from_status: task.status,
        to_status: to,
        source_column_version: source.version,
        target_column_version: target.version,
        before_task_id: before,
      },
    };
    intent.current = command;
    const optimistic = {
      ...data,
      columns: data.columns.map((c) => {
        const ids = c.task_ids.filter((t) => t !== id);
        if (c.status === to) ids.splice(before === null ? ids.length : ids.indexOf(before), 0, id);
        return { ...c, task_ids: ids };
      }),
      tasks: data.tasks.map((t) => (t.id === id ? { ...t, status: to } : t)),
    };
    setData(optimistic);
    void execute(command, data);
  };
  const drop = ({ active, over }: DragEndEvent) => {
    if (!over || !data) return;
    const id = Number(active.id),
      target =
        typeof over.id === 'string' && statuses.includes(over.id as Status)
          ? (over.id as Status)
          : data.tasks.find((t) => t.id === Number(over.id))?.status;
    if (target) move(id, target, typeof over.id === 'number' ? over.id : null);
  };
  const disabled = !canWrite || !online || pending || uncertain || filtered;
  const change = (key: keyof Filter, value: string) => {
    setFilter((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  return (
    <section ref={boardRoot} className="kanban" aria-label="Project Kanban" aria-busy={pending}>
      <div className="kanban-toolbar task-filters">
        {canWrite && (
          <button
            className="primary board-new-task"
            disabled={!online || pending || uncertain}
            onClick={onCreate}
          >
            <UiIcon name="plus" /> New task
          </button>
        )}
        <div className="board-search">
          <UiIcon name="search" />
          <Field
            label="Search board"
            placeholder="Search tasks"
            value={filter.q}
            maxLength={100}
            onChange={(e) => change('q', e.target.value)}
          />
        </div>
        <details className="popover-menu">
          <summary>
            <UiIcon name="filter" /> Board filters
          </summary>
          <div className="board-filters">
            <label>
              Board assignee
              <select
                aria-label="Board assignee"
                value={filter.assignee}
                onChange={(e) => change('assignee', e.target.value)}
              >
                <option value="">Everyone</option>
                <option value="null">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Board priority
              <select
                aria-label="Board priority"
                value={filter.priority}
                onChange={(e) => change('priority', e.target.value)}
              >
                <option value="">All</option>
                {priorities.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <Field
              label="Board category"
              value={filter.category}
              maxLength={80}
              onChange={(e) => change('category', e.target.value)}
            />
            <Field
              type="date"
              label="Board due from"
              value={filter.due_from}
              onChange={(e) => change('due_from', e.target.value)}
            />
            <Field
              type="date"
              label="Board due to"
              value={filter.due_to}
              onChange={(e) => change('due_to', e.target.value)}
            />
            <label>
              Board status filter
              <select
                aria-label="Board status filter"
                value={filter.status}
                onChange={(e) => change('status', e.target.value)}
              >
                <option value="">All</option>
                {statuses.map((s) => (
                  <option value={s} key={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={pending}
              onClick={() => {
                setFilter(blank);
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        </details>
        <button
          className="board-refresh"
          disabled={pending || !online}
          onClick={() => {
            setError(undefined);
            void load().catch(() => {});
          }}
        >
          Refresh board
        </button>
        <span className="board-task-count">{data?.total ?? 0} Tasks</span>
      </div>
      {filtered && (
        <p role="status">
          Reordering is disabled while filtering. Open task details to change status, or clear
          filters.
        </p>
      )}
      {!canWrite && <p>Read-only</p>}
      {error && <ErrorNotice error={error} />}
      {notice && <Toast>{notice}</Toast>}
      {uncertain && (
        <div>
          {retryAllowed && (
            <button
              disabled={pending || !online}
              onClick={() =>
                void (async () => {
                  try {
                    const b = await load();
                    if (intent.current) await execute(intent.current, b);
                  } catch {
                    /* authoritative read required */
                  }
                })()
              }
            >
              Review and retry
            </button>
          )}
          <button
            disabled={pending || !online}
            onClick={() =>
              void load()
                .then(() => {
                  intent.current = undefined;
                  setUncertain(false);
                  setNotice('Latest data applied');
                })
                .catch(() => {})
            }
          >
            Use latest data
          </button>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : data?.mode === 'list_required' ? (
        <>
          <p>Over 500 tasks. Use the paginated list to open and update tasks.</p>
          {visible?.map((t) => (
            <p key={t.id}>
              <button onClick={() => onOpen(t.id)}>Open task #{t.id}</button> {t.title} ·{' '}
              {statusLabel[t.status]}
            </p>
          ))}
          <button disabled={page === 1 || pending} onClick={() => setPage((n) => n - 1)}>
            Previous board page
          </button>
          <span>
            Page {page} · Total {total} Tasks
          </span>
          <button disabled={page * 20 >= total || pending} onClick={() => setPage((n) => n + 1)}>
            Next board page
          </button>
        </>
      ) : (
        data && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={drop}>
            <div className="kanban-grid">
              {data.columns.map((c) => (
                <Lane key={c.status} status={c.status}>
                  <SortableContext items={c.task_ids} strategy={verticalListSortingStrategy}>
                    {c.task_ids.map((id, i) => {
                      const task = data.tasks.find((t) => t.id === id)!;
                      if (visible && !visible.some((t) => t.id === id)) return null;
                      return (
                        <Card
                          key={id}
                          task={task}
                          groupName={groups?.find((g) => g.id === task.group_id)?.name}
                          controls={canWrite}
                          disabled={disabled}
                          onOpen={() => onOpen(id)}
                          onMove={(status, before) => move(id, status, before)}
                          before={i ? c.task_ids[i - 1] : undefined}
                          after={
                            i < c.task_ids.length - 1 ? (c.task_ids[i + 2] ?? null) : undefined
                          }
                        />
                      );
                    })}
                  </SortableContext>
                  {!c.task_ids.length && <p>No tasks yet</p>}
                </Lane>
              ))}
            </div>
          </DndContext>
        )
      )}
    </section>
  );
}
