import type { Statement, Value } from '../domain/database.js';
import { sql, projectVisibility } from './access-scope.js';
import { queryFor, parseSchema, operations } from '../api/contract.js';
import { addDays } from '../domain/dates.js';
import { ApiFault } from '../api/errors.js';
const ci = 'Latin1_General_100_CI_AS_SC';
// Clamp only the lower UTC edge that SQL DATETIME2 cannot represent; decoded date is already validated.
const utcStart = (date: string) =>
  date === '0001-01-01'
    ? '0001-01-01T00:00:00.000Z'
    : new Date(Date.parse(`${date}T00:00:00.000Z`) - 7 * 3600000).toISOString();
/** Reusable access/filter semantics for future list/calendar/report/export; count and rows share WHERE. */
export function taskQuery(viewer: number, input: Record<string, unknown>, trash = false) {
  try {
    parseSchema(
      operations.find(
        (o) => o.path === (trash ? '/api/trash' : '/api/tasks') && o.method === 'GET',
      )!.operation['x-query-schema'],
      input,
    );
  } catch {
    throw new ApiFault('INVALID_QUERY');
  }
  const wire = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) throw new ApiFault('INVALID_QUERY');
    for (const v of Array.isArray(value) ? value : [value]) wire.append(key, String(v));
  }
  const q = queryFor('GET', trash ? '/api/trash' : '/api/tasks', wire);
  const params: Record<string, Value> = { viewer },
    clauses = [
      trash ? projectVisibility('manage', 'P-04') : projectVisibility('read'),
      `t.deleted_at IS ${trash ? 'NOT ' : ''}NULL`,
    ];
  const bind = (key: string, value: Value, clause: string) => {
    params[key] = value;
    clauses.push(clause);
  };
  if (!trash && !q.project)
    clauses.push('p.archived_at IS NULL AND owner_team.archived_at IS NULL');
  for (const [key, col] of [
    ['team', 'p.owner_team_id'],
    ['project', 'p.id'],
    ['creator', 't.creator_id'],
  ] as const)
    if (q[key] !== undefined) bind(key, Number(q[key]), `${col}=@${key}`);
  if (Object.hasOwn(q, 'assignee')) {
    if (q.assignee === null) clauses.push('t.assignee_id IS NULL AND NOT EXISTS(SELECT 1 FROM dbo.task_assignees ta WHERE ta.task_id=t.id)');
    else bind('assignee', Number(q.assignee), '(t.assignee_id=@assignee OR EXISTS(SELECT 1 FROM dbo.task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=@assignee))');
  }
  // FR-41: label filter on any current assignee; never part of visibility (BR-19).
  if (q.job_title !== undefined)
    bind(
      'job_title',
      Number(q.job_title),
      '(EXISTS(SELECT 1 FROM dbo.users ju WHERE ju.id=t.assignee_id AND ju.job_title_id=@job_title) OR EXISTS(SELECT 1 FROM dbo.task_assignees ta JOIN dbo.users ju ON ju.id=ta.user_id WHERE ta.task_id=t.id AND ju.job_title_id=@job_title))',
    );
  if (q.q !== undefined)
    bind(
      'search',
      `%${String(q.q).replace(/[\\%_\[]/g, (c) => `\\${c}`)}%`,
      `(t.title COLLATE ${ci} LIKE @search ESCAPE '\\' OR t.description COLLATE ${ci} LIKE @search ESCAPE '\\' OR t.category COLLATE ${ci} LIKE @search ESCAPE '\\')`,
    );
  if (q.category !== undefined)
    bind('category', String(q.category), `t.category COLLATE ${ci}=@category COLLATE ${ci}`);
  for (const key of ['status', 'priority'] as const)
    if (Array.isArray(q[key])) {
      const values = q[key] as string[];
      clauses.push(
        `t.${key} IN (${values
          .map((v, i) => {
            params[`${key}${i}`] = v;
            return `@${key}${i}`;
          })
          .join(',')})`,
      );
    }
  if (q.has_due !== undefined) clauses.push(`t.due_date IS ${q.has_due ? 'NOT ' : ''}NULL`);
  if (q.due_from) bind('due_from', String(q.due_from), 't.due_date>=@due_from');
  if (q.due_to) bind('due_to', String(q.due_to), 't.due_date<=@due_to');
  const basis = q.date_basis ?? 'created';
  if (basis === 'completed') clauses.push("t.status='done'");
  const col =
    basis === 'due' ? 't.due_date' : basis === 'completed' ? 't.completed_at' : 't.created_at';
  if (q.date_from) {
    const value = String(q.date_from);
    bind('date_from', basis === 'due' ? value : utcStart(value), `${col}>=@date_from`);
  }
  if (q.date_to) {
    const value = String(q.date_to);
    // 9999-12-31 has no representable date-only successor, but its Bangkok UTC end is valid.
    const end =
      basis === 'due'
        ? value
        : value === '9999-12-31'
          ? '9999-12-31T17:00:00.000Z'
          : utcStart(addDays(value, 1));
    bind('date_to', end, `${col}${basis === 'due' ? '<=' : '<'}@date_to`);
  }
  const orders: Record<string, string> = {
    due_asc: 'CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,t.due_date ASC,t.id ASC',
    due_desc: 'CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,t.due_date DESC,t.id ASC',
    created_asc: 't.created_at ASC,t.id ASC',
    created_desc: 't.created_at DESC,t.id ASC',
    updated_desc: 't.updated_at DESC,t.id ASC',
    title_asc: `t.title COLLATE ${ci} ASC,t.id ASC`,
    priority_desc:
      "CASE t.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,t.id ASC",
  };
  const from = `FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id JOIN dbo.teams owner_team ON owner_team.id=p.owner_team_id WHERE ${clauses.join(' AND ')}`;
  const order = trash ? 't.deleted_at DESC,t.id ASC' : orders[String(q.sort ?? 'due_asc')]!;
  const dialect = (text: string, parameters: Record<string, Value>): Statement => {
    const statement = sql(text, parameters);
    statement.sqlite = statement.sqlite
      .replace(
        new RegExp(`t\\.(title|description|category) COLLATE ${ci}`, 'g'),
        'friday_ci_key(t.$1)',
      )
      .replace(`$category COLLATE ${ci}`, 'friday_ci_key($category)');
    if (parameters.search !== undefined)
      statement.parameters = {
        ...parameters,
        search: String(parameters.search).normalize('NFC').toLowerCase(),
      };
    return statement;
  };
  const page = Number(q.page ?? 1),
    pageSize = Number(q.pageSize ?? 50);
  return {
    page,
    pageSize,
    filter: dialect(from, params),
    count: dialect(`SELECT COUNT(*) AS total ${from}`, params),
    rows: {
      ...dialect(`SELECT t.* ${from} ORDER BY ${order}`, params),
      sqlite: dialect(`SELECT t.* ${from} ORDER BY ${order} LIMIT @size OFFSET @offset`, params)
        .sqlite,
      sqlserver: `SELECT t.* ${from} ORDER BY ${order} OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      parameters: {
        ...dialect('', params).parameters,
        size: pageSize,
        offset: (page - 1) * pageSize,
      },
    },
  };
}
