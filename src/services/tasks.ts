import { checklistAudit } from './checklist-audit.js';
import { assignmentIds, replaceAssignments } from '../repository/task-assignments.js';
import { dispatchTaskNotification, dispatchAccessCleanup } from './notifications.js';
import type { Transaction, Row } from '../domain/database.js';
import { taskQuery } from '../repository/task-query.js';
import { sql } from '../repository/access-scope.js';
import {
  addDays,
  bangkokToday,
  monthlyAnchor,
  nextOccurrence,
  utcNow,
  retentionWindow,
  type Recurrence,
} from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { rights } from '../domain/permissions.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody, validateBusiness, parseSchema } from '../api/contract.js';
import {
  lockColumns,
  lockTask,
  renumberColumn,
  bumpTaskVersion,
  statuses,
  type Status,
  type Column,
} from '../repository/board-helpers.js';
import {
  can,
  currentActor,
  projectAccess,
  type SessionProof,
  type AccessOptions,
  type AccessRequest,
} from './authorization.js';
type Task = Row & {
  id: number;
  project_id: number;
  group_id: number | null;
  title: string;
  description: string;
  category: string;
  status: Status;
  priority: string;
  assignee_id: number | null;
  creator_id: number;
  start_date: string | null;
  due_date: string | null;
  recurrence: Recurrence;
  recurrence_anchor_day: number | null;
  predecessor_task_id: number | null;
  successor_task_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  deleted_by: number | null;
};
type Subtask = {
  assignee_id: number | null;
  id: number;
  task_id: number;
  title: string;
  done: number;
  version: number;
  created_at: string;
};
const fields = [
  'group_id',
  'title',
  'description',
  'category',
  'priority',
  'assignee_id',
  'start_date',
  'due_date',
  'recurrence',
  'status',
  'recurrence_anchor_day',
  'completed_at',
] as const;
export function taskService(options: AccessOptions = {}) {
  const now = () => utcNow(options.clock);
  const body = (method: string, path: string, input: unknown) =>
    requestBody(
      operations.find((o) => o.method === method && o.path === path)!.operation,
      input,
    ) as Record<string, unknown>;
  const raw = async (tx: Transaction, id: number, deleted = false) => {
    const row = (
      await tx.query<Task>(
        sql(`SELECT * FROM dbo.tasks WHERE id=@id AND deleted_at IS ${deleted ? 'NOT ' : ''}NULL`, {
          id,
        }),
      )
    )[0];
    if (!row) throw new ApiFault('NOT_FOUND');
    return row;
  };
  const access = async (tx: Transaction, proof: SessionProof, project: number, write = false) => {
    const a = await currentActor(tx, proof, false, options),
      p = await projectAccess(tx, a, project);
    if (write) {
      if (!rights(p.role).write) throw new ApiFault('FORBIDDEN');
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      if (p.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
      if (p.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
    }
    return a;
  };
  const eligible = async (
    tx: Transaction,
    project: number,
    user: number | null,
    write: boolean,
  ) => {
    if (user === null) return false;
    return !!(
      await tx.query(
        sql(
          `SELECT u.id FROM dbo.users u JOIN dbo.projects p ON p.id=@project WHERE u.id=@user AND u.active=1 AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id${write ? " AND pm.access IN ('manager','editor')" : ''}))`,
          { project, user },
        ),
      )
    )[0];
  };
  const validateGroup = async (tx: Transaction, project: number, group: unknown) => {
    if (group === null || group === undefined) return;
    if (
      !(
        await tx.query(
          sql('SELECT id FROM dbo.project_groups WHERE id=@id AND project_id=@project', {
            id: Number(group),
            project,
          }),
        )
      )[0]
    )
      throw new ApiFault('NOT_FOUND');
  };
  const subtasks = async (tx: Transaction, task: number) =>
    (
      await tx.query<Subtask>(
        sql(
          'SELECT id,task_id,title,done,version,created_at,assignee_id FROM dbo.subtasks WHERE task_id=@task ORDER BY id',
          { task },
        ),
      )
    ).map((s) => ({ ...s, done: !!s.done }));
  const cleanChecklist = async (tx: Transaction, task: Task) => {
    const changes = [];
    for (const child of await subtasks(tx, task.id))
      if (
        child.assignee_id !== null &&
        !(await eligible(tx, task.project_id, child.assignee_id, true))
      ) {
        await tx.execute(
          sql('UPDATE dbo.subtasks SET assignee_id=NULL,version=version+1 WHERE id=@id', {
            id: child.id,
          }),
        );
        changes.push({
          field: 'subtask',
          before: child,
          after: { ...child, assignee_id: null, version: child.version + 1 },
        });
      }
    return checklistAudit(changes);
  };
  const dto = async (tx: Transaction, t: Task) => {
    const p = (
      await tx.query<{ project_name: string; owner_team_id: number; owner_team_name: string }>(
        sql(
          'SELECT p.name AS project_name,p.owner_team_id,t.name AS owner_team_name FROM dbo.projects p JOIN dbo.teams t ON t.id=p.owner_team_id WHERE p.id=@id',
          { id: t.project_id },
        ),
      )
    )[0]!;
    const u =
      t.assignee_id === null
        ? null
        : (
            await tx.query<{ id: number; display_name: string; active: number }>(
              sql('SELECT id,display_name,active FROM dbo.users WHERE id=@id', {
                id: t.assignee_id,
              }),
            )
          )[0]!;
    const checklist = (
      await tx.query<{ total: number; done: number }>(
        sql(
          'SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN done=1 THEN 1 ELSE 0 END),0) AS done FROM dbo.subtasks WHERE task_id=@task',
          { task: t.id },
        ),
      )
    )[0]!;
    const ids = await assignmentIds(tx, t.id, t.assignee_id);
    const assignees = [];
    for (const user of ids) {
      const person = (
        await tx.query<{ id: number; display_name: string; active: number }>(
          sql('SELECT id,display_name,active FROM dbo.users WHERE id=@id', { id: user }),
        )
      )[0]!;
      assignees.push({ ...person, active: !!person.active });
    }
    return {
      ...t,
      ...p,
      assignee_ids: ids,
      assignees,
      assignee: u ? { ...u, active: !!u.active } : null,
      subtask_count: checklist.total,
      subtask_done_count: checklist.done,
      overdue:
        t.deleted_at === null &&
        t.status !== 'done' &&
        t.due_date !== null &&
        t.due_date < bangkokToday(now()),
    };
  };
  const detail = async (tx: Transaction, t: Task) => ({
    ...(await dto(tx, t)),
    subtasks: await subtasks(tx, t.id),
  });
  const event = async (
    tx: Transaction,
    task: number,
    actor: number,
    action: string,
    changes: unknown,
    request: string,
  ) =>
    tx.execute(
      sql(
        'INSERT INTO dbo.task_events(task_id,actor_id,action,field_changes,request_id,created_at) VALUES(@task,@actor,@action,@changes,@request,@now)',
        { task, actor, action, changes: JSON.stringify(changes), request, now: now() },
      ),
    );
  const notify = async (
    tx: Transaction,
    t: Task,
    actor: number,
    type: 'assignment' | 'status' | 'comment',
    recipients: (number | null)[],
    request: string,
  ) => {
    await dispatchTaskNotification(tx, {
      task: t.id,
      version: t.version,
      actor,
      type,
      recipients:
        type === 'assignment'
          ? recipients
          : [...recipients, ...(await assignmentIds(tx, t.id, t.assignee_id))],
      request,
      now: now(),
    });
  };

  const append = async (tx: Transaction, t: Task) => {
    const rank = (
      await tx.query<{ rank: number }>(
        sql(
          'SELECT COALESCE(MAX(rank),0)+1 AS rank FROM dbo.board_positions WHERE project_id=@project AND status=@status',
          { project: t.project_id, status: t.status },
        ),
      )
    )[0]!.rank;
    await tx.execute(
      sql(
        'INSERT INTO dbo.board_positions(task_id,project_id,status,rank) VALUES(@id,@project,@status,@rank)',
        { id: t.id, project: t.project_id, status: t.status, rank },
      ),
    );
  };
  const bumpColumns = async (
    tx: Transaction,
    columns: Column[],
    affected: Set<Status>,
    order: Partial<Record<Status, number[]>> = {},
  ) => {
    const result: { status: Status; version: number }[] = [];
    for (const c of columns)
      if (affected.has(c.status)) {
        const ids = await tx.query<{ task_id: number }>(
          sql(
            'SELECT task_id FROM dbo.board_positions WHERE project_id=@project AND status=@status ORDER BY rank',
            { project: c.project_id, status: c.status },
          ),
        );
        result.push({
          status: c.status,
          version: await renumberColumn(
            tx,
            c,
            c.version,
            order[c.status] ?? ids.map((i) => i.task_id),
          ),
        });
      }
    return result;
  };
  const insertTask = async (
    tx: Transaction,
    values: {
      project_id: number;
      title: string;
      description: string;
      category: string;
      priority: string;
      assignee_id: number | null;
      creator_id: number;
      start_date: string | null;
      due_date: string | null;
      recurrence: Recurrence;
      recurrence_anchor_day: number | null;
      predecessor_task_id: number | null;
    },
  ) => {
    const parameters = { ...values, now: now() };
    const names = Object.keys(values).join(','),
      params = Object.keys(values)
        .map((k) => `@${k}`)
        .join(',');
    const rows = await tx.query<{ id: number }>({
      sqlite: sql(
        `INSERT INTO dbo.tasks(${names},created_at,updated_at) VALUES(${params},@now,@now) RETURNING id`,
      ).sqlite,
      sqlserver: `INSERT INTO dbo.tasks(${names},created_at,updated_at) OUTPUT INSERTED.id VALUES(${params},@now,@now)`,
      parameters,
    });
    const t = await raw(tx, rows[0]!.id);
    await append(tx, t);
    await replaceAssignments(tx, t.id, t.assignee_id ? [t.assignee_id] : []);
    return t;
  };
  const lockParent = async (tx: Transaction, id: number, expected: number) => {
    const t = await raw(tx, id),
      columns = await lockColumns(tx, t.project_id, statuses);
    await lockTask(tx, t.project_id, id, expected);
    return { t: await raw(tx, id), columns };
  };
  const subtask = async (tx: Transaction, id: number) => {
    const s = (
      await tx.query<Subtask>(
        sql(
          'SELECT id,task_id,title,done,version,created_at,assignee_id FROM dbo.subtasks WHERE id=@id',
          {
            id,
          },
        ),
      )
    )[0];
    if (!s) throw new ApiFault('NOT_FOUND');
    return s;
  };
  const checkMove = async (tx: Transaction, project: number, input: Record<string, unknown>) => {
    validateBusiness('POST', '/api/projects/{id}/board/move', input);
    const t = await raw(tx, Number(input.task_id));
    if (t.project_id !== project) throw new ApiFault('NOT_FOUND');
    const { columns } = await lockParent(tx, t.id, Number(input.task_version));
    const from = input.from_status as Status,
      to = input.to_status as Status;
    requireVersion(
      columns.find((c) => c.status === from)!.version,
      Number(input.source_column_version),
    );
    requireVersion(
      columns.find((c) => c.status === to)!.version,
      Number(input.target_column_version),
    );
    if (t.status !== from) throw new ApiFault('VERSION_CONFLICT', t.version);
    if (from === to && input.source_column_version !== input.target_column_version)
      throw new ApiFault('VALIDATION_FAILED');
    if (input.before_task_id !== null) {
      const anchor = await tx.query(
        sql(
          'SELECT task_id FROM dbo.board_positions WHERE task_id=@anchor AND project_id=@project AND status=@status',
          { anchor: Number(input.before_task_id), project, status: to },
        ),
      );
      if (Number(input.before_task_id) === t.id || !anchor.length)
        throw new ApiFault('INVALID_ANCHOR');
    }
    return t;
  };
  const patchTask = async (
    tx: Transaction,
    proof: SessionProof,
    id: number,
    input: unknown,
    request: string,
    ordering?: { before: number | null },
  ) => {
    const b = body('PATCH', '/api/tasks/{id}', input),
      scoped = await raw(tx, id);
    const a = await access(tx, proof, scoped.project_id, true);
    const { t, columns } = await lockParent(tx, id, Number(b.version));
    validateBusiness('PATCH', '/api/tasks/{id}', b, t);
    await validateGroup(tx, t.project_id, b.group_id);
    const beforeIds = await assignmentIds(tx, t.id, t.assignee_id);
    let afterIds = Object.hasOwn(b, 'assignee_ids')
      ? [...(b.assignee_ids as number[])].sort((a, b) => a - b)
      : Object.hasOwn(b, 'assignee_id')
        ? b.assignee_id
          ? [Number(b.assignee_id)]
          : []
        : beforeIds;
    if (Object.hasOwn(b, 'assignee_ids')) {
      if (Object.hasOwn(b, 'assignee_id') && b.assignee_id !== (afterIds[0] ?? null))
        throw new ApiFault('VALIDATION_FAILED');
      for (const user of afterIds)
        if (!(await eligible(tx, t.project_id, user, true)))
          throw new ApiFault('ASSIGNEE_INELIGIBLE');
      b.assignee_id = afterIds[0] ?? null;
    }
    const after = { ...t };
    for (const field of fields) if (Object.hasOwn(b, field)) after[field] = b[field] as never;
    after.recurrence_anchor_day = monthlyAnchor(
      t.recurrence,
      after.recurrence,
      after.due_date,
      t.due_date,
      t.recurrence_anchor_day,
    );
    const statusChanged = t.status !== after.status,
      reopen = t.status === 'done' && statusChanged,
      complete = after.status === 'done' && statusChanged;
    if (
      Object.hasOwn(b, 'assignee_id') &&
      after.assignee_id !== null &&
      !(await eligible(tx, t.project_id, after.assignee_id, true))
    )
      throw new ApiFault('ASSIGNEE_INELIGIBLE');
    if (
      reopen &&
      after.assignee_id !== null &&
      !(await eligible(tx, t.project_id, after.assignee_id, true))
    )
      after.assignee_id = null;
    if (reopen) {
      const valid: number[] = [];
      for (const user of afterIds)
        if (await eligible(tx, t.project_id, user, true)) valid.push(user);
      afterIds = valid;
      after.assignee_id = valid[0] ?? null;
    }
    if (complete && (await subtasks(tx, id)).some((s) => !s.done))
      throw new ApiFault('SUBTASKS_INCOMPLETE');
    after.completed_at = complete ? now() : reopen ? null : t.completed_at;
    const cleanedChildren = reopen ? await cleanChecklist(tx, t) : [];
    const cleanedIds = reopen && JSON.stringify(beforeIds) !== JSON.stringify(afterIds);
    const changes = fields
      .filter((f) => t[f] !== after[f])
      .map((f) => ({ field: f, before: t[f], after: after[f] }));
    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds))
      changes.push({
        field: 'assignee_ids' as (typeof fields)[number],
        before: JSON.stringify(beforeIds),
        after: JSON.stringify(afterIds),
      });
    if (!changes.length && !ordering)
      return { item: await detail(tx, t), successor: null, affected_columns: [] };
    after.version = requireVersion(t.version, Number(b.version));
    after.updated_at = now();
    if (statusChanged)
      await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=@id', { id }));
    await tx.execute(
      sql(
        'UPDATE dbo.tasks SET group_id=@group_id,title=@title,description=@description,category=@category,priority=@priority,assignee_id=@assignee_id,start_date=@start_date,due_date=@due_date,recurrence=@recurrence,recurrence_anchor_day=@recurrence_anchor_day,status=@status,completed_at=@completed_at,version=@version,updated_at=@updated_at WHERE id=@id AND version=@expected',
        {
          ...Object.fromEntries(fields.map((f) => [f, after[f]])),
          id,
          version: after.version,
          updated_at: after.updated_at,
          expected: t.version,
        },
      ),
    );
    await replaceAssignments(tx, id, afterIds);
    const affected = new Set<Status>();
    if (statusChanged) {
      await append(tx, after);
      affected.add(t.status);
      affected.add(after.status);
    }
    await event(
      tx,
      id,
      a.id,
      reopen ? 'reopened' : statusChanged ? 'status_changed' : ordering ? 'reordered' : 'updated',
      ordering
        ? [...changes, { field: 'before_task_id', before: null, after: ordering.before }]
        : changes,
      request,
    );
    if (cleanedIds || cleanedChildren.length)
      await event(
        tx,
        id,
        a.id,
        'access_cleanup',
        [
          ...changes.filter((c) => ['assignee_id', 'assignee_ids'].includes(c.field)),
          ...cleanedChildren,
        ],
        request,
      );
    if (cleanedIds || cleanedChildren.length)
      await dispatchAccessCleanup(tx, id, a.id, request, now());
    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds))
      await notify(
        tx,
        after,
        a.id,
        'assignment',
        afterIds.filter((user) => !beforeIds.includes(user)),
        request,
      );
    if (statusChanged)
      await notify(tx, after, a.id, 'status', [after.creator_id, after.assignee_id], request);
    let successor: Task | null = null;
    if (
      complete &&
      after.recurrence !== 'none' &&
      !(
        await tx.query(
          sql('SELECT source_task_id FROM dbo.recurrence_events WHERE source_task_id=@id', {
            id,
          }),
        )
      )[0]
    ) {
      const dates = nextOccurrence(
        after.due_date!,
        after.start_date,
        after.recurrence,
        after.recurrence_anchor_day,
      );
      successor = await insertTask(tx, {
        project_id: after.project_id,
        title: after.title,
        description: after.description,
        category: after.category,
        priority: after.priority,
        assignee_id: (await eligible(tx, after.project_id, after.assignee_id, true))
          ? after.assignee_id
          : null,
        creator_id: a.id,
        ...dates,
        recurrence: after.recurrence,
        predecessor_task_id: id,
      });
      const nextIds: number[] = [];
      for (const user of afterIds)
        if (await eligible(tx, after.project_id, user, true)) nextIds.push(user);
      await replaceAssignments(tx, successor.id, nextIds);
      successor.group_id = t.group_id;
      await tx.execute(
        sql('UPDATE dbo.tasks SET group_id=@group WHERE id=@id', {
          id: successor.id,
          group: t.group_id,
        }),
      );
      successor.assignee_id = nextIds[0] ?? null;
      for (const s of await subtasks(tx, id))
        await tx.execute(
          sql(
            'INSERT INTO dbo.subtasks(task_id,title,assignee_id,done,version,created_at) VALUES(@task,@title,@assignee,0,1,@now)',
            {
              task: successor.id,
              title: s.title,
              assignee:
                s.assignee_id !== null &&
                (await eligible(tx, after.project_id, s.assignee_id, true))
                  ? s.assignee_id
                  : null,
              now: now(),
            },
          ),
        );
      await tx.execute(
        sql(
          'INSERT INTO dbo.recurrence_events(source_task_id,generated_task_id,created_at) VALUES(@id,@next,@now)',
          { id, next: successor.id, now: now() },
        ),
      );
      await tx.execute(
        sql('UPDATE dbo.tasks SET successor_task_id=@next WHERE id=@id', {
          id,
          next: successor.id,
        }),
      );
      after.successor_task_id = successor.id;
      await event(
        tx,
        id,
        a.id,
        'recurrence_generated',
        [{ field: 'successor_task_id', before: null, after: successor.id }],
        request,
      );
      await event(
        tx,
        successor.id,
        a.id,
        'created',
        [{ field: 'predecessor_task_id', before: null, after: id }],
        request,
      );
      await notify(tx, successor, a.id, 'assignment', [successor.assignee_id], request);
      affected.add('todo');
    }
    let ordered: number[] | undefined;
    if (ordering) {
      affected.add(after.status);
      ordered = (
        await tx.query<{ task_id: number }>(
          sql(
            'SELECT task_id FROM dbo.board_positions WHERE project_id=@project AND status=@status ORDER BY rank',
            { project: t.project_id, status: after.status },
          ),
        )
      )
        .map((r) => r.task_id)
        .filter((value) => value !== id);
      const index = ordering.before === null ? ordered.length : ordered.indexOf(ordering.before);
      if (index < 0) throw new ApiFault('INVALID_ANCHOR');
      ordered.splice(index, 0, id);
    }
    return {
      item: await detail(tx, after),
      successor: successor ? await dto(tx, successor) : null,
      affected_columns: await bumpColumns(
        tx,
        columns,
        affected,
        ordered ? { [after.status]: ordered } : {},
      ),
    };
  };
  return {
    async move(
      tx: Transaction,
      proof: SessionProof,
      project: number,
      input: unknown,
      request: string,
    ) {
      const b = body('POST', '/api/projects/{id}/board/move', input);
      await access(tx, proof, project, true);
      const t = await checkMove(tx, project, b);
      const result = await patchTask(
        tx,
        proof,
        t.id,
        { version: b.task_version, status: b.to_status },
        request,
        { before: b.before_task_id as number | null },
      );
      const affected = [];
      for (const c of result.affected_columns) {
        const ids = (
          await tx.query<{ task_id: number }>(
            sql(
              'SELECT task_id FROM dbo.board_positions WHERE project_id=@project AND status=@status ORDER BY rank',
              { project, status: c.status },
            ),
          )
        ).map((r) => r.task_id);
        affected.push({
          ...c,
          task_ids: ids.length <= 500 ? ids : [],
          complete: ids.length <= 500,
        });
      }
      return {
        task: await dto(tx, await raw(tx, t.id)),
        successor: result.successor,
        affected_columns: affected,
      };
    },
    async comments(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: Record<string, unknown>,
    ) {
      const t = await raw(tx, id);
      await access(tx, proof, t.project_id);
      const op = operations.find(
        (o) => o.method === 'GET' && o.path === '/api/tasks/{id}/comments',
      )!.operation;
      parseSchema(op['x-query-schema'], input);
      const page = Number(input.page ?? 1),
        pageSize = Number(input.pageSize ?? 50),
        params = { id, size: pageSize, offset: (page - 1) * pageSize };
      const from = 'FROM dbo.comments c JOIN dbo.users u ON u.id=c.author_id WHERE c.task_id=@id';
      const total = (
        await tx.query<{ total: number }>(sql('SELECT COUNT(*) AS total ' + from, { id }))
      )[0]!.total;
      const query = sql(
        'SELECT c.id,c.task_id,c.body,c.created_at,u.id AS author_id,u.display_name,u.active ' +
          from +
          ' ORDER BY c.id ASC',
        params,
      );
      const rows = await tx.query({
        ...query,
        sqlite: query.sqlite + ' LIMIT $size OFFSET $offset',
        sqlserver: query.sqlserver + ' OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY',
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          task_id: r.task_id,
          body: r.body,
          created_at: r.created_at,
          author: { id: r.author_id, display_name: r.display_name, active: Boolean(r.active) },
        })),
        page,
        pageSize,
        total,
      };
    },
    async createComment(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      request: string,
    ) {
      const b = body('POST', '/api/tasks/{id}/comments', input),
        t = await raw(tx, id);
      const a = await access(tx, proof, t.project_id, true);
      const parameters = { id, author: a.id, body: String(b.body), now: now() };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO comments(task_id,author_id,body,created_at) VALUES($id,$author,$body,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.comments(task_id,author_id,body,created_at) OUTPUT INSERTED.id VALUES(@id,@author,@body,@now)',
        parameters,
      });
      await event(
        tx,
        id,
        a.id,
        'comment_added',
        [{ field: 'comment_id', before: null, after: rows[0]!.id }],
        request,
      );
      await notify(tx, t, a.id, 'comment', [t.creator_id, t.assignee_id], request);
      // FR-53 @mention token `@[Name](#user-ID)`: notify only through the existing comment
      // notification; persistNotification drops anyone without current project access.
      const mentioned = [
        ...String(b.body).matchAll(/@\[[^\]\n]{1,100}\]\(#user-([1-9][0-9]{0,9})\)/g),
      ]
        .map((m) => Number(m[1]))
        .filter((id) => id <= 2147483647)
        .slice(0, 50);
      if (mentioned.length)
        await dispatchTaskNotification(tx, {
          task: t.id,
          version: t.version,
          actor: a.id,
          type: 'comment',
          recipients: mentioned,
          request,
          now: now(),
        });
      const author = (
        await tx.query<{ display_name: string; active: number }>(
          sql('SELECT display_name,active FROM dbo.users WHERE id=@id', { id: a.id }),
        )
      )[0]!;
      return {
        item: {
          id: rows[0]!.id,
          task_id: id,
          author: { id: a.id, display_name: author.display_name, active: Boolean(author.active) },
          body: String(b.body),
          created_at: parameters.now,
        },
      };
    },
    async checkVersions(tx: Transaction, r: AccessRequest) {
      const b = r.body as { version?: number; task_version?: number };
      if (r.path.endsWith('/board/move'))
        await checkMove(tx, r.params!.id!, r.body as Record<string, unknown>);
      else if (r.path === '/api/groups/{id}') {
        const g = (
          await tx.query<{ project_id: number; version: number }>(
            sql('SELECT project_id,version FROM dbo.project_groups WHERE id=@id', {
              id: r.params!.id!,
            }),
          )
        )[0];
        if (!g) throw new ApiFault('NOT_FOUND');
        await lockColumns(tx, g.project_id, statuses);
        requireVersion(
          (
            await tx.query<{ version: number }>(
              sql('SELECT version FROM dbo.project_groups WHERE id=@id', { id: r.params!.id! }),
            )
          )[0]!.version,
          b.version!,
        );
      } else if (r.path.startsWith('/api/subtasks/')) {
        const s = await subtask(tx, r.params!.id!);
        await lockParent(tx, s.task_id, b.task_version!);
        requireVersion((await subtask(tx, s.id)).version, b.version!);
      } else if (r.path === '/api/tasks/{id}/subtasks')
        await lockParent(tx, r.params!.id!, b.task_version!);
      else if (r.path === '/api/tasks/{id}/restore') {
        const t = await raw(tx, r.params!.id!, true);
        await lockColumns(tx, t.project_id, statuses);
        const rows = await tx.query<{ version: number }>({
          sqlite: 'SELECT version FROM tasks WHERE id=$id AND deleted_at IS NOT NULL',
          sqlserver:
            'SELECT version FROM dbo.tasks WITH(UPDLOCK,HOLDLOCK) WHERE id=@id AND deleted_at IS NOT NULL',
          parameters: { id: t.id },
        });
        if (!rows[0]) throw new ApiFault('NOT_FOUND');
        requireVersion(rows[0].version, b.version!);
      } else if (r.path === '/api/tasks/{id}' && ['PATCH', 'DELETE'].includes(r.method))
        await lockParent(tx, r.params!.id!, b.version!);
      else if (options.checkVersions) await options.checkVersions(tx, r);
      else throw new ApiFault('SERVICE_NOT_READY');
    },
    async list(
      tx: Transaction,
      proof: SessionProof,
      input: Record<string, unknown>,
      trash = false,
    ) {
      const a = await currentActor(tx, proof, false, options);
      if (
        trash &&
        a.orgRole !== 'admin' &&
        !(
          await tx.query(
            // Leads, or P-04 managers (rows stay scoped to managed projects by taskQuery).
            sql(
              "SELECT team_id FROM dbo.team_members WHERE user_id=@viewer AND team_role='lead' UNION ALL SELECT pm.project_id FROM dbo.project_members pm JOIN dbo.user_permissions up ON up.user_id=pm.user_id AND up.permission_key='P-04' WHERE pm.user_id=@viewer AND pm.access='manager'",
              { viewer: a.id },
            ),
          )
        )[0]
      )
        throw new ApiFault('FORBIDDEN');
      const q = taskQuery(a.id, input, trash);
      const total = (await tx.query<{ total: number }>(q.count))[0]!.total;
      const items = [];
      for (const t of await tx.query<Task>(q.rows)) {
        const item = await dto(tx, t);
        items.push(
          trash ? { ...item, restore_before: retentionWindow(t.deleted_at!, now()).cutoff } : item,
        );
      }
      return { items, total, page: q.page, pageSize: q.pageSize };
    },
    async trashMutation(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      restore: boolean,
      request: string,
    ) {
      const b = body(
        restore ? 'POST' : 'DELETE',
        restore ? '/api/tasks/{id}/restore' : '/api/tasks/{id}',
        input,
      );
      const a = await currentActor(tx, proof, false, options),
        t = await raw(tx, id, restore),
        p = await projectAccess(tx, a, t.project_id);
      if (
        restore
          ? !can(p, 'P-04')
          : !can(p, 'P-04') && !(rights(p.role).write && t.creator_id === a.id)
      )
        throw new ApiFault(restore ? 'NOT_FOUND' : 'FORBIDDEN');
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      const columns = await lockColumns(tx, t.project_id, statuses);
      if (!restore) await lockTask(tx, t.project_id, id, Number(b.version));
      else {
        const rows = await tx.query<{ version: number }>({
          sqlite: 'SELECT version FROM tasks WHERE id=$id AND deleted_at IS NOT NULL',
          sqlserver:
            'SELECT version FROM dbo.tasks WITH(UPDLOCK,HOLDLOCK) WHERE id=@id AND deleted_at IS NOT NULL',
          parameters: { id },
        });
        if (!rows[0]) throw new ApiFault('NOT_FOUND');
        requireVersion(rows[0].version, Number(b.version));
      }
      const current = await raw(tx, id, restore),
        version = requireVersion(current.version, Number(b.version));
      if (!rights(p.role).manage) {
        if (p.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
        if (p.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
      }
      if (restore && !retentionWindow(current.deleted_at!, now()).restorable)
        throw new ApiFault('RETENTION_EXPIRED');
      const restoreBeforeIds = await assignmentIds(tx, id, current.assignee_id);
      let restoreAfterIds = restoreBeforeIds;
      const restoredChildren: { field: string; before: unknown; after: unknown }[] = [];
      const after = {
        ...current,
        deleted_at: restore ? null : now(),
        deleted_by: restore ? null : a.id,
        version,
        updated_at: now(),
      };
      if (
        restore &&
        after.status !== 'done' &&
        after.assignee_id !== null &&
        !(await eligible(tx, after.project_id, after.assignee_id, true))
      )
        after.assignee_id = null;
      if (restore && after.status !== 'done') {
        const valid: number[] = [];
        for (const user of await assignmentIds(tx, id, current.assignee_id))
          if (await eligible(tx, after.project_id, user, true)) valid.push(user);
        restoreAfterIds = valid;
        after.assignee_id = valid[0] ?? null;
        await replaceAssignments(tx, id, valid);
        restoredChildren.push(...(await cleanChecklist(tx, after)));
      }
      if (!restore)
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=@id', { id }));
      await tx.execute(
        sql(
          'UPDATE dbo.tasks SET deleted_at=@deleted_at,deleted_by=@deleted_by,assignee_id=@assignee_id,version=@version,updated_at=@updated_at WHERE id=@id AND version=@expected',
          {
            id,
            deleted_at: after.deleted_at,
            deleted_by: after.deleted_by,
            assignee_id: after.assignee_id,
            version,
            updated_at: after.updated_at,
            expected: current.version,
          },
        ),
      );
      if (restore) await append(tx, after);
      await event(
        tx,
        id,
        a.id,
        restore ? 'restored' : 'deleted',
        [{ field: 'deleted_at', before: current.deleted_at, after: after.deleted_at }],
        request,
      );
      if (
        JSON.stringify(restoreBeforeIds) !== JSON.stringify(restoreAfterIds) ||
        restoredChildren.length
      )
        await event(
          tx,
          id,
          a.id,
          'access_cleanup',
          [
            {
              field: 'assignee_ids',
              before: JSON.stringify(restoreBeforeIds),
              after: JSON.stringify(restoreAfterIds),
            },
            ...restoredChildren,
          ],
          request,
        );
      if (
        JSON.stringify(restoreBeforeIds) !== JSON.stringify(restoreAfterIds) ||
        restoredChildren.length
      )
        await dispatchAccessCleanup(tx, id, a.id, request, now());
      return {
        item: await detail(tx, after),
        successor: null,
        affected_columns: await bumpColumns(tx, columns, new Set([after.status])),
      };
    },
    async board(tx: Transaction, proof: SessionProof, project: number) {
      await access(tx, proof, project);
      const columns = await lockColumns(tx, project, statuses);
      const total = (
        await tx.query<{ total: number }>(
          sql(
            'SELECT COUNT(*) AS total FROM dbo.tasks WHERE project_id=@project AND deleted_at IS NULL',
            { project },
          ),
        )
      )[0]!.total;
      const tasks = [],
        result = [];
      if (total > 500)
        return {
          project_id: project,
          mode: 'list_required',
          total,
          columns: columns.map((c) => ({
            status: c.status,
            version: c.version,
            task_ids: [],
            complete: false,
          })),
          tasks: [],
        };
      let seen = 0;
      for (const c of columns) {
        const positions = await tx.query<{ task_id: number; rank: number }>(
          sql(
            'SELECT task_id,rank FROM dbo.board_positions WHERE project_id=@project AND status=@status ORDER BY rank',
            { project, status: c.status },
          ),
        );
        for (const [index, position] of positions.entries()) {
          if (position.rank !== index + 1) throw new ApiFault('DATABASE_BUSY');
          const t = await raw(tx, position.task_id);
          if (t.project_id !== project || t.status !== c.status)
            throw new ApiFault('DATABASE_BUSY');
          tasks.push(await dto(tx, t));
          seen++;
        }
        result.push({
          status: c.status,
          version: c.version,
          task_ids: positions.map((p) => p.task_id),
          complete: true,
        });
      }
      if (seen !== total) throw new ApiFault('DATABASE_BUSY');
      return { project_id: project, mode: 'board', total, columns: result, tasks };
    },
    async groups(tx: Transaction, proof: SessionProof, project: number) {
      await access(tx, proof, project);
      return {
        items: await tx.query(
          sql('SELECT * FROM dbo.project_groups WHERE project_id=@project ORDER BY position,id', {
            project,
          }),
        ),
      };
    },
    async createGroup(
      tx: Transaction,
      proof: SessionProof,
      project: number,
      input: unknown,
      request: string,
    ) {
      const a = await access(tx, proof, project, true),
        b = body('POST', '/api/projects/{id}/groups', input);
      await lockColumns(tx, project, statuses);
      const count = (
        await tx.query<{ total: number }>(
          sql('SELECT COUNT(*) AS total FROM dbo.project_groups WHERE project_id=@project', {
            project,
          }),
        )
      )[0]!.total;
      if (count >= 1000) throw new ApiFault('VALIDATION_FAILED');
      const parameters = {
        project,
        name: String(b.name).trim(),
        color: String(b.color ?? '#579bfc'),
        position: count,
        now: now(),
      };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO project_groups(project_id,name,color,position,created_at) VALUES($project,$name,$color,$position,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.project_groups(project_id,name,color,position,created_at) OUTPUT INSERTED.id VALUES(@project,@name,@color,@position,@now)',
        parameters,
      });
      await tx.execute(
        sql(
          "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,'group_created','project_group',@id,@changes,@request,@now)",
          {
            actor: a.id,
            id: rows[0]!.id,
            changes: JSON.stringify({ name: parameters.name, color: parameters.color }),
            request,
            now: now(),
          },
        ),
      );
      return {
        item: (
          await tx.query(sql('SELECT * FROM dbo.project_groups WHERE id=@id', { id: rows[0]!.id }))
        )[0]!,
      };
    },
    async patchGroup(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      request: string,
    ) {
      const group = (
        await tx.query<Row & { project_id: number; version: number; name: string; color: string }>(
          sql('SELECT * FROM dbo.project_groups WHERE id=@id', { id }),
        )
      )[0];
      if (!group) throw new ApiFault('NOT_FOUND');
      const a = await access(tx, proof, group.project_id, true),
        b = body('PATCH', '/api/groups/{id}', input);
      await lockColumns(tx, group.project_id, statuses);
      const latest = (
        await tx.query<{ version: number }>(
          sql('SELECT version FROM dbo.project_groups WHERE id=@id', { id }),
        )
      )[0]!;
      const version = requireVersion(latest.version, Number(b.version));
      const name = String(b.name ?? group.name).trim(),
        color = String(b.color ?? group.color);
      await tx.execute(
        sql(
          'UPDATE dbo.project_groups SET name=@name,color=@color,version=@version WHERE id=@id AND version=@expected',
          { id, name, color, version, expected: group.version },
        ),
      );
      await tx.execute(
        sql(
          "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,'group_updated','project_group',@id,@changes,@request,@now)",
          { actor: a.id, id, changes: JSON.stringify({ name, color }), request, now: now() },
        ),
      );
      return {
        item: (await tx.query(sql('SELECT * FROM dbo.project_groups WHERE id=@id', { id })))[0]!,
      };
    },
    /** FR-44 / SRS §9.9: My overview from the same visibility filter as My work and reports. */
    async overview(tx: Transaction, proof: SessionProof) {
      const a = await currentActor(tx, proof, false, options);
      const at = now(),
        today = bangkokToday(at);
      // Monday-start Bangkok week: 2026-10-05 is a Monday, so day-of-week = days since it mod 7.
      const sinceMonday =
        ((((Date.parse(`${today}T00:00:00Z`) - Date.parse('2026-10-05T00:00:00Z')) / 86400000) %
          7) +
          7) %
        7;
      const weekEnd = addDays(today, 6 - sinceMonday);
      const filter = taskQuery(a.id, { assignee: a.id }).filter;
      const select = 'SELECT t.*,p.name AS overview_project_name ';
      const rows = await tx.query<Task & { overview_project_name: string }>({
        ...filter,
        sqlite: sql(select).sqlite + filter.sqlite,
        sqlserver: select + filter.sqlserver,
      });
      const by_status = { todo: 0, doing: 0, review: 0, done: 0 };
      const projects = new Map<
        number,
        { project_id: number; project_name: string; open_count: number }
      >();
      let overdue = 0,
        due_today = 0,
        due_this_week = 0,
        no_date = 0,
        done_last_7_days = 0;
      // Bangkok dates today-6..today, matching My work date_basis=completed&date_from.
      const weekAgo = addDays(today, -6);
      const open: typeof rows = [];
      for (const t of rows) {
        by_status[t.status as keyof typeof by_status]++;
        if (t.status === 'done') {
          if (t.completed_at && bangkokToday(t.completed_at) >= weekAgo) done_last_7_days++;
          continue;
        }
        open.push(t);
        const p = projects.get(t.project_id) ?? {
          project_id: t.project_id,
          project_name: t.overview_project_name,
          open_count: 0,
        };
        p.open_count++;
        projects.set(t.project_id, p);
        if (!t.due_date) no_date++;
        else if (t.due_date < today) overdue++;
        else if (t.due_date === today) due_today++;
        // Rest of this week after today, the same bucket as My work "This week".
        else if (t.due_date <= weekEnd) due_this_week++;
      }
      open.sort(
        (x, y) =>
          (x.due_date ? 0 : 1) - (y.due_date ? 0 : 1) ||
          String(x.due_date ?? '').localeCompare(String(y.due_date ?? '')) ||
          x.id - y.id,
      );
      const next_up = [];
      for (const t of open.slice(0, 5)) {
        const { overview_project_name: _name, ...task } = t;
        void _name;
        next_up.push(await dto(tx, task as Task));
      }
      return {
        bangkok_today: today,
        by_status,
        open_total: open.length,
        overdue,
        due_today,
        due_this_week,
        no_date,
        done_last_7_days,
        by_project: [...projects.values()]
          .sort((x, y) => y.open_count - x.open_count || x.project_id - y.project_id)
          .slice(0, 1000),
        next_up,
      };
    },
    async get(tx: Transaction, proof: SessionProof, id: number) {
      const t = await raw(tx, id);
      await access(tx, proof, t.project_id);
      return { item: await detail(tx, t) };
    },
    async create(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const b = body('POST', '/api/tasks', input),
        project = Number(b.project_id);
      const a = await access(tx, proof, project, true);
      validateBusiness('POST', '/api/tasks', b);
      await validateGroup(tx, project, b.group_id);
      const ids = [
        ...((b.assignee_ids as number[] | undefined) ??
          (b.assignee_id ? [Number(b.assignee_id)] : [])),
      ].sort((a, b) => a - b);
      if (b.assignee_ids && Object.hasOwn(b, 'assignee_id') && b.assignee_id !== (ids[0] ?? null))
        throw new ApiFault('VALIDATION_FAILED');
      for (const user of ids)
        if (!(await eligible(tx, project, user, true))) throw new ApiFault('ASSIGNEE_INELIGIBLE');
      const assignee = ids[0] ?? null;
      if (assignee !== null && !(await eligible(tx, project, assignee, true)))
        throw new ApiFault('ASSIGNEE_INELIGIBLE');
      const columns = await lockColumns(tx, project, statuses),
        recurrence = (b.recurrence ?? 'none') as Recurrence,
        due = (b.due_date as string | null | undefined) ?? null;
      const t = await insertTask(tx, {
        project_id: project,
        title: String(b.title),
        description: String(b.description ?? ''),
        category: String(b.category ?? ''),
        priority: String(b.priority ?? 'medium'),
        assignee_id: assignee,
        creator_id: a.id,
        start_date: (b.start_date as string | null | undefined) ?? null,
        due_date: due,
        recurrence,
        recurrence_anchor_day: monthlyAnchor('none', recurrence, due, null, null),
        predecessor_task_id: null,
      });
      await event(
        tx,
        t.id,
        a.id,
        'created',
        [{ field: 'task', before: null, after: { title: t.title, status: t.status } }],
        request,
      );
      t.group_id = (b.group_id as number | null | undefined) ?? null;
      await tx.execute(
        sql('UPDATE dbo.tasks SET group_id=@group WHERE id=@id', { id: t.id, group: t.group_id }),
      );
      await replaceAssignments(tx, t.id, ids);
      await notify(tx, t, a.id, 'assignment', ids, request);
      return {
        item: await detail(tx, t),
        successor: null,
        affected_columns: await bumpColumns(tx, columns, new Set(['todo'])),
      };
    },
    patch: patchTask,
    async createSubtask(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      request: string,
    ) {
      const b = body('POST', '/api/tasks/{id}/subtasks', input),
        scoped = await raw(tx, id);
      const a = await access(tx, proof, scoped.project_id, true),
        { t } = await lockParent(tx, id, Number(b.task_version));
      if (t.status === 'done') throw new ApiFault('PARENT_DONE');
      if ((await subtasks(tx, id)).length >= 10000) throw new ApiFault('VALIDATION_FAILED');
      const assignee = (b.assignee_id as number | null | undefined) ?? null;
      if (assignee !== null && !(await eligible(tx, t.project_id, assignee, true)))
        throw new ApiFault('ASSIGNEE_INELIGIBLE');
      const parameters = { task: id, title: String(b.title), assignee, now: now() };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO subtasks(task_id,title,assignee_id,created_at) VALUES($task,$title,$assignee,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.subtasks(task_id,title,assignee_id,created_at) OUTPUT INSERTED.id VALUES(@task,@title,@assignee,@now)',
        parameters,
      });
      await bumpTaskVersion(tx, t.project_id, id, t.version, now());
      await event(
        tx,
        id,
        a.id,
        'subtask_changed',
        [
          {
            field: 'subtask',
            before: null,
            after: { id: rows[0]!.id, title: b.title, done: false },
          },
        ],
        request,
      );
      const s = await subtask(tx, rows[0]!.id);
      if (s.assignee_id)
        await notify(tx, await raw(tx, id), a.id, 'assignment', [s.assignee_id], request);
      return { item: { ...s, done: !!s.done }, task: await dto(tx, await raw(tx, id)) };
    },
    async patchSubtask(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      remove: boolean,
      request: string,
    ) {
      const b = body(remove ? 'DELETE' : 'PATCH', '/api/subtasks/{id}', input),
        before = await subtask(tx, id),
        scoped = await raw(tx, before.task_id);
      const a = await access(tx, proof, scoped.project_id, true),
        { t } = await lockParent(tx, before.task_id, Number(b.task_version)),
        s = await subtask(tx, id),
        version = requireVersion(s.version, Number(b.version));
      if (!remove && t.status === 'done' && b.done === false) throw new ApiFault('PARENT_DONE');
      if (
        Object.hasOwn(b, 'assignee_id') &&
        b.assignee_id !== null &&
        !(await eligible(tx, t.project_id, b.assignee_id as number | null, true))
      )
        throw new ApiFault('ASSIGNEE_INELIGIBLE');
      if (t.status === 'done' && Object.hasOwn(b, 'assignee_id')) throw new ApiFault('PARENT_DONE');
      const after = {
        ...s,
        assignee_id: Object.hasOwn(b, 'assignee_id')
          ? (b.assignee_id as number | null)
          : s.assignee_id,
        title: String(b.title ?? s.title),
        done: b.done === undefined ? s.done : Number(b.done),
        version,
      };
      if (remove)
        await tx.execute(
          sql('DELETE FROM dbo.subtasks WHERE id=@id AND version=@expected', {
            id,
            expected: s.version,
          }),
        );
      else
        await tx.execute(
          sql(
            'UPDATE dbo.subtasks SET title=@title,done=@done,assignee_id=@assignee,version=@version WHERE id=@id AND version=@expected',
            {
              id,
              title: after.title,
              done: after.done,
              assignee: after.assignee_id,
              version,
              expected: s.version,
            },
          ),
        );
      await bumpTaskVersion(tx, t.project_id, t.id, t.version, now());
      await event(
        tx,
        t.id,
        a.id,
        'subtask_changed',
        [
          {
            field: 'subtask',
            before: { ...s, done: !!s.done },
            after: remove ? null : { ...after, done: !!after.done },
          },
        ],
        request,
      );
      if (!remove && after.assignee_id && after.assignee_id !== s.assignee_id)
        await notify(tx, await raw(tx, t.id), a.id, 'assignment', [after.assignee_id], request);
      return { item: { ...after, done: !!after.done }, task: await dto(tx, await raw(tx, t.id)) };
    },
  };
}
