import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// This is the authoring source for the contract, not an application server.
export function buildContract() {
  const schemas = {};
  const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
  const object = (properties, required = Object.keys(properties), extra = {}) => ({
    type: 'object', properties, required, additionalProperties: false, ...extra,
  });
  const array = (items, maxItems = 100) => ({ type: 'array', items, maxItems });
  const text = (max, min = 0, extra = {}) => ({
    type: 'string', minLength: min, maxLength: max, 'x-utf16MaxLength': max, ...extra,
  });
  const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
  const enumeration = (values, extra = {}) => ({ type: 'string', enum: values, ...extra });
  const integer = (minimum = 1, maximum = 2147483647) => ({ type: 'integer', minimum, maximum });
  const boolean = { type: 'boolean' };
  const nonblank = (max) => text(max, 1, { pattern: '\\S' });
  schemas.Id = integer();
  schemas.Version = integer();
  schemas.Date = text(10, 10, { format: 'date', pattern: '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$' });
  schemas.Timestamp = text(24, 24, { format: 'date-time', pattern: '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-5][0-9]\\.[0-9]{3}Z$', description: 'UTC ISO8601, exactly millisecond precision; no leap seconds.' });
  schemas.RequestId = { type: 'string', format: 'uuid' };
  schemas.Status = enumeration(['todo', 'doing', 'review', 'done']);
  schemas.Priority = enumeration(['low', 'medium', 'high', 'urgent']);
  schemas.ProjectType = enumeration(['', 'internal', 'client', 'operations', 'other']);
  schemas.ProjectCategory = enumeration(['', 'development', 'general', 'it', 'marketing', 'finance', 'hr', 'other']);
  schemas.Recurrence = enumeration(['none', 'daily', 'weekly', 'monthly']);
  schemas.Username = text(60, 1, { pattern: '^[A-Za-z0-9._-]+$' });
  // Password length is Unicode scalar count, not UTF16 storage length; passwords are never trimmed.
  schemas.Password = { type: 'string', minLength: 6, maxLength: 128 };
  schemas.CurrentPassword = { type: 'string', minLength: 1, maxLength: 128 };
  schemas.Empty = object({});
  schemas.VersionBody = object({ version: ref('Version') });
  schemas.Person = object({ id: ref('Id'), display_name: nonblank(100), active: boolean });
  schemas.TeamPosition = enumeration(['pm', 'lead', 'dev']);
  schemas.ContactEmail = text(254, 0, { anyOf: [{ const: '' }, { type: 'string', format: 'email' }] });
  schemas.ContactTelephone = text(40, 0, { pattern: '^[0-9+(). #/-]*$' });
  // T-080/T-081: job title is a label only; permission keys are per-user Admin grants (BR-19/BR-21).
  schemas.PermissionKey = enumeration(['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06', 'P-07', 'P-08', 'P-09', 'P-10']);
  schemas.PermissionKeys = { ...array(ref('PermissionKey'), 10), uniqueItems: true };
  schemas.HexColor = text(7, 7, { pattern: '^#[0-9a-fA-F]{6}$' });
  schemas.AdminUser = object({
    id: ref('Id'), username: ref('Username'), display_name: nonblank(100),
    org_role: enumeration(['admin', 'member']), active: boolean, must_change_password: boolean,
    version: ref('Version'), created_at: ref('Timestamp'), updated_at: ref('Timestamp'),
    job_title_id: nullable(ref('Id')), job_title: nullable(nonblank(50)),
    email: ref('ContactEmail'), telephone: ref('ContactTelephone'),
    teams: array(object({ id: ref('Id'), name: nonblank(100), team_role: enumeration(['lead','member']), team_position: ref('TeamPosition') }),10000),
    permission_keys: ref('PermissionKeys'), permissions_version: ref('Version'),
  });
  schemas.JobTitle = object({ id: ref('Id'), name: nonblank(50), color: ref('HexColor'), is_active: boolean, sort_order: integer(0, 10000), user_count: integer(0), version: ref('Version'), created_at: ref('Timestamp'), updated_at: ref('Timestamp') });
  schemas.JobTitles = object({ items: array(ref('JobTitle'), 1000) });
  schemas.CreateJobTitle = object({ name: nonblank(50), color: ref('HexColor'), sort_order: integer(0, 10000) }, ['name']);
  schemas.PatchJobTitle = object({ name: nonblank(50), color: ref('HexColor'), is_active: boolean, sort_order: integer(0, 10000), version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.PermissionCatalog = object({ items: array(object({ key: ref('PermissionKey'), label: nonblank(200), description: text(500, 1), scope: enumeration(['managed_project', 'member_team']), preset_pm_sm: boolean }), 10) });
  schemas.UserPermissions = object({ user_id: ref('Id'), keys: ref('PermissionKeys'), permissions_version: ref('Version'), manager_project_ids: array(ref('Id'), 10000) });
  schemas.PutUserPermissions = object({ keys: ref('PermissionKeys'), permissions_version: ref('Version') });
  schemas.PermissionMatrix = object({ changes: { ...array(object({ user_id: ref('Id'), keys: ref('PermissionKeys'), permissions_version: ref('Version') }), 100), minItems: 1 } });
  schemas.PermissionMatrixResult = object({ items: array(ref('UserPermissions'), 100) });
  schemas.Organization = object({ id: { const: 1, type: 'integer' }, name: nonblank(100), timezone: { const: 'Asia/Bangkok', type: 'string' }, workload_threshold: integer(1, 1000), version: ref('Version') });
  schemas.TeamMember = object({ user: ref('Person'), team_role: enumeration(['lead', 'member']), team_position: ref('TeamPosition'), joined_at: ref('Timestamp') });
  schemas.Team = object({ id: ref('Id'), name: nonblank(100), description: text(1000), archived_at: nullable(ref('Timestamp')), version: ref('Version'), own_role: nullable(enumeration(['lead', 'member'])) });
  schemas.AdminTeam = object({ ...schemas.Team.properties, members: array(ref('TeamMember'), 10000) });
  schemas.Project = object({
    id: ref('Id'), owner_team_id: ref('Id'), owner_team_name: nonblank(100), name: nonblank(100), description: text(2000),
    project_type: ref('ProjectType'), project_category: ref('ProjectCategory'),
    archived_at: nullable(ref('Timestamp')), version: ref('Version'), created_by: ref('Id'),
    created_at: ref('Timestamp'), updated_at: ref('Timestamp'),
    effective_access: enumeration(['admin', 'lead', 'manager', 'editor', 'viewer']),
  });
  schemas.ProjectMember = object({ user: ref('Person'), job_title: nullable(nonblank(50)), explicit_access: nullable(enumeration(['manager', 'editor', 'viewer'])), effective_access: enumeration(['admin', 'lead', 'manager', 'editor', 'viewer']), assignee_eligible: boolean });
  schemas.DirectoryPerson = object({ id: ref('Id'), display_name: nonblank(100), job_title: nullable(nonblank(50)), teams: array(object({ id: ref('Id'), name: nonblank(100) }), 10000) });
  schemas.Subtask = object({ remark: text(2000), assignee_id: nullable(ref('Id')), id: ref('Id'), task_id: ref('Id'), title: nonblank(200), done: boolean, version: ref('Version'), created_at: ref('Timestamp') });
  schemas.Task = object({
    id: ref('Id'), group_id: nullable(ref('Id')), project_id: ref('Id'), project_name: nonblank(100), owner_team_id: ref('Id'), owner_team_name: nonblank(100), title: nonblank(200), description: text(10000), category: text(80),
    status: ref('Status'), priority: ref('Priority'), assignee_ids: { ...array(ref('Id'), 100), uniqueItems: true }, assignees: array(ref('Person'), 100), assignee_id: nullable(ref('Id')), assignee: nullable(ref('Person')), creator_id: ref('Id'),
    start_date: nullable(ref('Date')), due_date: nullable(ref('Date')), recurrence: ref('Recurrence'),
    recurrence_anchor_day: nullable(integer(1, 31)), predecessor_task_id: nullable(ref('Id')), successor_task_id: nullable(ref('Id')),
    version: ref('Version'), created_at: ref('Timestamp'), updated_at: ref('Timestamp'), completed_at: nullable(ref('Timestamp')),
    deleted_at: nullable(ref('Timestamp')), deleted_by: nullable(ref('Id')),
    subtask_count: integer(0), subtask_done_count: integer(0), overdue: boolean,
  });
  schemas.TaskDetail = object({ ...schemas.Task.properties, subtasks: array(ref('Subtask'), 10000) });
  schemas.Comment = object({ id: ref('Id'), task_id: ref('Id'), author: ref('Person'), body: nonblank(5000), created_at: ref('Timestamp') });
  schemas.Attachment = object({ id: ref('Id'), task_id: ref('Id'), uploader: ref('Person'), original_name: nonblank(200), bytes: integer(1, 10485760), validated_type: text(100, 1), sha256: text(64, 64, { pattern: '^[a-f0-9]{64}$' }), created_at: ref('Timestamp'), deleted_at: nullable(ref('Timestamp')), can_delete: boolean, can_restore: boolean });
  schemas.EventChange = object({ field: enumeration(['title', 'description', 'category', 'status', 'priority', 'assignee_id', 'assignee_ids', 'group_id', 'group_before_task_id', 'start_date', 'due_date', 'recurrence', 'recurrence_anchor_day', 'deleted_at', 'subtask', 'comment', 'attachment', 'position', 'task', 'completed_at', 'comment_id', 'before_task_id', 'successor_task_id', 'predecessor_task_id']), before: nullable({ type: ['string', 'number', 'boolean'] }), after: nullable({ type: ['string', 'number', 'boolean'] }) });
  schemas.TaskEvent = object({ id: ref('Id'), task_id: ref('Id'), actor: nullable(ref('Person')), action: enumeration(['created', 'updated', 'assigned', 'status_changed', 'reopened', 'deleted', 'restored', 'subtask_changed', 'comment_added', 'attachment_changed', 'reordered', 'recurrence_generated', 'access_cleanup']), field_changes: array(ref('EventChange'), 100), request_id: ref('RequestId'), created_at: ref('Timestamp') });
  schemas.AdminAudit = object({ id: ref('Id'), actor: nullable(ref('Person')), action: text(100,1), resource_type: text(100,1), resource_id: nullable(ref('Id')), redacted_changes: text(100000,1), request_id: ref('RequestId'), created_at: ref('Timestamp') });
  schemas.Notification = object({ id: ref('Id'), task_id: ref('Id'), type: enumeration(['assignment', 'comment', 'status', 'access_cleanup', 'due_tomorrow', 'due_today', 'overdue']), message: text(500, 1), read_at: nullable(ref('Timestamp')), created_at: ref('Timestamp') });
  schemas.ColumnVersion = object({ status: ref('Status'), version: ref('Version') });
  schemas.Column = object({ status: ref('Status'), version: ref('Version'), task_ids: array(ref('Id'), 500), complete: boolean });
  schemas.Board = object({ project_id: ref('Id'), mode: enumeration(['board', 'list_required']), total: integer(0), columns: { ...array(ref('Column'), 4), minItems: 4 }, tasks: array(ref('Task'), 500) });
  schemas.BoardMoveResult = object({ task: ref('Task'), successor: nullable(ref('Task')), affected_columns: { ...array(ref('Column'), 3), minItems: 1 } });
  schemas.TaskMutationResult = object({ item: ref('TaskDetail'), successor: nullable(ref('Task')), affected_columns: array(ref('ColumnVersion'), 4) });
  schemas.Self = object({ user: ref('AdminUser'), csrf: text(128, 32), effective_summary: object({ lead_team_ids: array(ref('Id'), 10000), project_ids: array(ref('Id'), 10000) }), must_change_password: boolean, maintenance: boolean, view_revision: { type: 'string', format: 'uuid' }, bangkok_today: ref('Date') });
  const statusCounts = object(Object.fromEntries(['todo', 'doing', 'review', 'done'].map((k) => [k, integer(0)])));
  schemas.Report = object({
    metadata: object({ date_basis: enumeration(['created', 'due', 'completed']), date_from: nullable(ref('Date')), date_to: nullable(ref('Date')), timezone: { type: 'string', const: 'Asia/Bangkok' }, generated_at: ref('Timestamp') }),
    total: integer(0), by_status: statusCounts, overdue: integer(0), unassigned: integer(0), done_in_period: integer(0), completion_percentage: { type: 'number', minimum: 0, maximum: 100 },
    workload: array(object({ assignee: nullable(ref('Person')), job_title: nullable(nonblank(50)), open_count: integer(0) }), 10000),
  });
  const errorCodes = [
    'INVALID_JSON', 'INVALID_QUERY', 'INVALID_PATH', 'UNAUTHENTICATED', 'INVALID_CREDENTIALS', 'FORBIDDEN', 'INVALID_ORIGIN', 'INVALID_CSRF', 'INVALID_SETUP_TOKEN', 'PASSWORD_CHANGE_REQUIRED', 'NOT_FOUND',
    'VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'SETUP_ALREADY_COMPLETED', 'PAYLOAD_TOO_LARGE', 'FILE_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE',
    'VALIDATION_FAILED', 'SUBTASKS_INCOMPLETE', 'PARENT_DONE', 'PROJECT_ARCHIVED', 'TEAM_ARCHIVED', 'TEAM_HAS_ACTIVE_PROJECTS', 'LAST_ACTIVE_ADMIN', 'ASSIGNEE_INELIGIBLE', 'RETENTION_EXPIRED', 'QUOTA_EXCEEDED', 'INVALID_FILE_TYPE', 'INVALID_ANCHOR', 'BOARD_LIMIT_EXCEEDED', 'EXPORT_LIMIT_EXCEEDED', 'RATE_LIMITED', 'DATABASE_BUSY', 'SERVICE_NOT_READY', 'MAINTENANCE', 'INTERNAL_ERROR',
  ];
  schemas.Error = object({ error: object({ code: enumeration(errorCodes), message: text(500, 1), fieldErrors: { type: 'object', propertyNames: { type: 'string', maxLength: 100 }, additionalProperties: array(text(500, 1), 20) }, requestId: ref('RequestId'), currentVersion: ref('Version') }, ['code', 'message', 'fieldErrors', 'requestId'], { allOf: [{ if: { properties: { code: { const: 'VERSION_CONFLICT' } }, required: ['code'] }, then: { properties: { currentVersion: ref('Version') }, required: ['currentVersion'] } }] }) });
  const paginated = (item) => object({ items: array(item), page: integer(), pageSize: integer(1, 100), total: integer(0) });
  const item = (dto) => object({ item: ref(dto) });
  for (const name of ['AdminUser', 'Team', 'Project', 'Task', 'Comment', 'Attachment', 'TaskEvent', 'DirectoryPerson', 'AdminAudit']) schemas[`${name}Page`] = paginated(ref(name));
  schemas.TeamsPage = { anyOf: [paginated(ref('Team')), paginated(ref('AdminTeam'))] };
  schemas.ProjectMembers = object({ items: array(ref('ProjectMember'), 10000), membership_version: ref('Version') });
  schemas.NotificationsPage = object({ ...paginated(ref('Notification')).properties, unread_count: integer(0) });
  schemas.TrashPage = paginated(object({ ...schemas.Task.properties, restore_before: ref('Timestamp') }));
  schemas.Meta = object({ setupRequired: boolean, version: text(60, 1) });
  schemas.Health = object({ status: enumeration(['ok', 'not_ready']) });
  schemas.ProjectGroup = object({id: ref('Id'), project_id: ref('Id'), name: nonblank(100), color: text(7,7,{pattern:'^#[0-9a-fA-F]{6}$'}), position: integer(0), version:ref('Version'), created_at:ref('Timestamp')});
  schemas.ProjectGroups = object({items: array(ref('ProjectGroup'),1000)});
  schemas.CreateGroup = object({name:nonblank(100),color:text(7,7,{pattern:'^#[0-9a-fA-F]{6}$'})},['name']);
  schemas.PatchGroup = object({name:nonblank(100),color:text(7,7,{pattern:'^#[0-9a-fA-F]{6}$'}),version:ref('Version')},['version'],{minProperties:2});
  // T-083 FR-44 My overview (same task scope as reports/My work).
  schemas.MyOverview = object({
    bangkok_today: ref('Date'), by_status: statusCounts, open_total: integer(0), overdue: integer(0), due_today: integer(0), due_this_week: integer(0), no_date: integer(0), done_last_7_days: integer(0),
    by_project: array(object({ project_id: ref('Id'), project_name: nonblank(100), open_count: integer(0) }), 1000), next_up: array(ref('Task'), 5),
  });
  // T-088 FR-50/FR-51 workload (open tasks per person per Monday-start Bangkok week) and project overview.
  const workloadTask = object({ id: ref('Id'), project_id: ref('Id'), title: nonblank(200), start_date: nullable(ref('Date')), due_date: nullable(ref('Date')) });
  const workloadRow = object({ user: nullable(ref('Person')), job_title: nullable(nonblank(50)), counts: array(integer(0), 12), no_date: integer(0), tasks: array(workloadTask, 1000) });
  schemas.Workload = object({ scope: enumeration(['project', 'team']), scope_id: ref('Id'), threshold: integer(1, 1000), weeks: { ...array(ref('Date'), 12), minItems: 1 }, rows: array(workloadRow, 1000), truncated: boolean });
  schemas.WorkloadQuery = object({ from: ref('Date'), weeks: { ...integer(1, 12), default: 6 } }, []);
  const overviewTask = object({ id: ref('Id'), title: nonblank(200), due_date: nullable(ref('Date')), status: ref('Status') });
  schemas.ProjectOverview = object({
    project_id: ref('Id'), bangkok_today: ref('Date'), total: integer(0), done: integer(0), progress_percent: integer(0, 100), by_status: statusCounts, overdue: integer(0), overdue_tasks: array(overviewTask, 10),
    by_assignee: array(object({ user: nullable(ref('Person')), job_title: nullable(nonblank(50)), open: integer(0), done: integer(0) }), 1000),
    by_job_title: array(object({ job_title: nullable(nonblank(50)), open: integer(0), done: integer(0) }), 1000),
    recent_activity: array(object({ task_id: ref('Id'), task_title: nonblank(200), actor: ref('Person'), action: text(100, 1), created_at: ref('Timestamp') }), 10),
  });
  // T-089 NFR-09/UX-03/FR-52 per-user UI preferences; allowlisted keys only, stored ≤ 4,000 chars.
  const prefFields = {
    reduce_motion: boolean,
    confetti: boolean,
    column_widths: { type: 'object', propertyNames: { pattern: '^[a-z_]{1,40}$' }, additionalProperties: integer(60, 800), maxProperties: 30 },
    hidden_tabs: { ...array(enumeration(['kanban', 'calendar', 'gantt', 'docs', 'files', 'workload', 'overview']), 7), uniqueItems: true },
  };
  schemas.Preferences = object(prefFields);
  schemas.PatchPreferences = object(prefFields, [], { minProperties: 1 });
  // T-090 FR-47 private project favorites (current-access filtered, max 100).
  schemas.Favorites = object({ items: array(object({ project_id: ref('Id'), project_name: nonblank(100), owner_team_name: nonblank(100), archived: boolean, created_at: ref('Timestamp') }), 100) });
  // T-084 FR-48 project docs; body_html is server-sanitized (SRS §9.7).
  const docBase = { id: ref('Id'), project_id: ref('Id'), title: nonblank(200), version: ref('Version'), created_by: ref('Person'), updated_by: ref('Person'), created_at: ref('Timestamp'), updated_at: ref('Timestamp'), deleted_at: nullable(ref('Timestamp')), text_length: integer(0, 200000), can_edit: boolean, can_delete: boolean, can_restore: boolean };
  schemas.DocSummary = object(docBase);
  schemas.Doc = object({ ...docBase, body_html: text(1000000) });
  schemas.DocsPage = object({ items: array(ref('DocSummary'), 1000) });
  schemas.CreateDoc = object({ title: nonblank(200), body_html: text(1000000, 0, { default: '' }) }, ['title']);
  schemas.PatchDoc = object({ title: nonblank(200), body_html: text(1000000), version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.DocVersions = object({ items: array(object({ version: ref('Version'), title: nonblank(200), body_html: text(1000000), edited_by: ref('Person'), edited_at: ref('Timestamp') }), 1000) });
  // T-085 FR-49 project files: project-level uploads plus task attachments the viewer can read.
  schemas.ProjectFile = object({ source: enumeration(['project', 'task']), id: ref('Id'), project_id: ref('Id'), task_id: nullable(ref('Id')), task_title: nullable(nonblank(200)), uploader: ref('Person'), original_name: nonblank(200), bytes: integer(1, 10485760), validated_type: text(100, 1), sha256: text(64, 64, { pattern: '^[a-f0-9]{64}$' }), created_at: ref('Timestamp'), deleted_at: nullable(ref('Timestamp')), download_path: text(100, 1, { pattern: '^/api/(project-files|attachments)/[0-9]+/download$' }), can_delete: boolean, can_restore: boolean });
  schemas.ProjectFilePage = object({ items: array(ref('ProjectFile')), page: integer(), pageSize: integer(1, 100), total: integer(0) });
  // T-086 FR-52 batch: one savepoint per item; every item reports its own outcome (SRS §9.10).
  schemas.TaskBatch = object({ operation: enumeration(['patch', 'delete']), patch: object({ status: ref('Status'), assignee_ids: { ...array(ref('Id'), 100), uniqueItems: true }, group_id: nullable(ref('Id')) }, [], { minProperties: 1 }), items: { ...array(object({ id: ref('Id'), version: ref('Version') }), 100), minItems: 1 } }, ['operation', 'items']);
  schemas.TaskBatchResult = object({ results: array(object({ id: ref('Id'), outcome: enumeration(['updated', 'deleted', 'conflict', 'forbidden', 'not_found', 'invalid']), code: nullable(text(60, 1)), current_version: nullable(ref('Version')), item: nullable(ref('Task')) }), 100) });
  const taskFields = { group_id: nullable(ref('Id')),
    title: nonblank(200), description: text(10000, 0, { default: '' }), category: text(80, 0, { default: '' }),
    priority: enumeration(['low', 'medium', 'high', 'urgent'], { default: 'medium' }), assignee_ids: { ...array(ref('Id'), 100), uniqueItems: true }, assignee_id: nullable(ref('Id')),
    start_date: nullable(ref('Date')), due_date: nullable(ref('Date')), recurrence: enumeration(['none', 'daily', 'weekly', 'monthly'], { default: 'none' }),
  };
  schemas.CreateTask = object({ project_id: ref('Id'), ...taskFields }, ['project_id', 'title']);
  schemas.PatchTask = object({ ...taskFields, status: ref('Status'), group_before_task_id: nullable(ref('Id')), version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.Setup = object({ token: text(128, 32), organization_name: nonblank(100), username: ref('Username'), display_name: nonblank(100), password: ref('Password') });
  schemas.Login = object({ username: ref('Username'), password: ref('CurrentPassword') });
  schemas.PasswordChange = object({ current_password: ref('CurrentPassword'), new_password: ref('Password') });
  const memberDetails = { email: ref('ContactEmail'), telephone: ref('ContactTelephone'), team_ids: { ...array(ref('Id'),100), uniqueItems:true } };
  schemas.CreateUser = object({ username: ref('Username'), display_name: nonblank(100), temp_password: ref('Password'), org_role: enumeration(['admin', 'member'], { default: 'member' }), ...memberDetails }, ['username', 'display_name', 'temp_password']);
  schemas.PatchUser = object({ display_name: nonblank(100), active: boolean, org_role: enumeration(['admin', 'member']), job_title_id: nullable(ref('Id')), ...memberDetails, version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.PasswordReset = object({ admin_password: ref('CurrentPassword'), temp_password: ref('Password'), version: ref('Version') });
  schemas.CreateTeam = object({ name: nonblank(100), description: text(1000, 0, { default: '' }), members: array(object({ user_id: ref('Id'), team_position: ref('TeamPosition') }),100) }, ['name']);
  schemas.PatchTeam = object({ name: nonblank(100), description: text(1000), archived: boolean, version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.TeamMembership = object({ team_role: enumeration(['lead', 'member']), team_position: ref('TeamPosition'), version: ref('Version') }, ['team_role','version']);
  schemas.CreateProject = object({ owner_team_id: ref('Id'), name: nonblank(100), description: text(2000, 0, { default: '' }), project_type: ref('ProjectType'), project_category: ref('ProjectCategory') }, ['owner_team_id', 'name']);
  schemas.PatchProject = object({ name: nonblank(100), description: text(2000), project_type: ref('ProjectType'), project_category: ref('ProjectCategory'), archived: boolean, version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.ProjectMembership = object({ access: enumeration(['manager', 'editor', 'viewer']), version: ref('Version') });
  schemas.CreateSubtask = object({ remark: text(2000), assignee_id: nullable(ref('Id')), title: nonblank(200), task_version: ref('Version') }, ['title','task_version']);
  schemas.PatchSubtask = object({ remark: text(2000), assignee_id: nullable(ref('Id')), title: nonblank(200), done: boolean, version: ref('Version'), task_version: ref('Version') }, ['version', 'task_version'], { minProperties: 3 });
  schemas.DeleteSubtask = object({ version: ref('Version'), task_version: ref('Version') });
  schemas.CreateComment = object({ body: nonblank(5000) });
  // File bytes are streamed; this schema describes one multipart part, not a JSON/base64 upload.
  schemas.Upload = object({ file: { type: 'string', format: 'binary' } });
  schemas.PatchOrganization = object({ name: nonblank(100), workload_threshold: integer(1, 1000), version: ref('Version') }, ['version'], { minProperties: 2 });
  schemas.BoardMove = object({ task_id: ref('Id'), task_version: ref('Version'), from_status: ref('Status'), to_status: ref('Status'), source_column_version: ref('Version'), target_column_version: ref('Version'), before_task_id: nullable(ref('Id')) });

  const page = { page: { ...integer(), default: 1 }, pageSize: { ...integer(1, 100), default: 50 } };
  const taskQuery = {
    q: text(100), team: ref('Id'), project: ref('Id'), assignee: nullable(ref('Id')), creator: ref('Id'), job_title: ref('Id'),
    status: { ...array(ref('Status'), 4), minItems: 1, uniqueItems: true }, priority: { ...array(ref('Priority'), 4), minItems: 1, uniqueItems: true },
    category: text(80), due_from: ref('Date'), due_to: ref('Date'), has_due: boolean,
    date_basis: enumeration(['created', 'due', 'completed']), date_from: ref('Date'), date_to: ref('Date'),
    sort: enumeration(['group_order', 'due_asc', 'due_desc', 'created_asc', 'created_desc', 'updated_desc', 'title_asc', 'priority_desc']), ...page,
  };
  schemas.TaskQuery = object(taskQuery, []);
  schemas.ReportQuery = object(Object.fromEntries(Object.entries(taskQuery).filter(([k]) => !['page', 'pageSize', 'sort'].includes(k))), []);
  const qPage = () => object(page, []);
  const operations = [];
  const own = new Map([...readFileSync('TeamFlow_Task_v1.0.md', 'utf8').matchAll(/^\| ((?:GET|POST|PATCH|PUT|DELETE) \/[^|]+?) \| (T-[^|]+) \|/gm)].map((m) => [m[1], m[2].match(/T-\d{3}/g)]));
  const add = (method, path, permission, success, responseSchema, requestSchema = null, querySchema = object({}, []), idempotency = 'none', extra = {}) => {
    const publicRoute = permission === 'public' || permission === 'initial_setup';
    const response = { description: success === 204 ? 'No content' : 'Success', headers: { 'X-Request-Id': { required: true, schema: ref('RequestId') }, 'Cache-Control': { required: true, schema: { type: 'string', const: 'no-store' } } } };
    if (responseSchema) response.content = { 'application/json': { schema: responseSchema } };
    const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: ref('Id') }));
    const queryProperties = querySchema.$ref ? schemas[querySchema.$ref.split('/').at(-1)].properties : querySchema.properties;
    for (const [name, schema] of Object.entries(queryProperties)) parameters.push({ name, in: 'query', required: false, style: 'form', explode: true, schema });
    if (method !== 'GET') {
      parameters.push({ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' } });
      if (!publicRoute) parameters.push({ name: 'X-CSRF-Token', in: 'header', required: true, schema: text(128, 32) });
      if (idempotency === 'required') parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } });
    }
    const op = {
      operationId: `${method.toLowerCase()}_${path.replace(/\{([^}]+)\}/g, '$1').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      summary: `${method} ${path}`, security: publicRoute || permission === 'local_proxy' ? [] : [{ cookieSession: [] }], parameters,
      'x-permission': permission, 'x-owner-tasks': own.get(`${method} ${path}`), 'x-idempotency': idempotency,
      'x-query-schema': querySchema, 'x-business-rules': [],
      responses: { [success]: response, default: { description: 'Error; HTTP status/code mapping is in TeamFlow_API_Contract.md', content: { 'application/json': { schema: ref('Error') } }, headers: { 'X-Request-Id': { required: true, schema: ref('RequestId') }, 'Retry-After': { schema: { type: 'string', pattern: '^[1-9][0-9]*$' } } } } },
      ...extra,
    };
    if (requestSchema) op.requestBody = { required: true, content: { [(path.endsWith('/attachments') || path === '/api/projects/{id}/files') && method === 'POST' ? 'multipart/form-data' : 'application/json']: { schema: requestSchema } } };
    operations.push({ method: method.toLowerCase(), path, op });
  };
  add('GET', '/api/meta', 'public', 200, ref('Meta'));
  add('POST', '/api/setup', 'initial_setup', 201, item('AdminUser'), ref('Setup'), undefined, 'setup_guard');
  add('POST', '/api/login', 'public', 200, ref('Self'), ref('Login'), undefined, 'auth_exception');
  add('GET', '/api/me', 'authenticated_password_gate_exception', 200, ref('Self'));
  add('POST', '/api/session/activity', 'authenticated_password_gate_exception', 204, null, null, undefined, 'natural_noop');
  add('POST', '/api/logout', 'authenticated_password_gate_exception', 204, null, null, undefined, 'natural_noop');
  add('POST', '/api/password', 'own_password_gate_exception', 200, ref('Self'), ref('PasswordChange'), undefined, 'auth_exception');
  add('GET', '/api/users', 'admin', 200, ref('AdminUserPage'), null, object({ ...page, q: text(100), active: boolean, job_title: ref('Id') }, []));
  add('POST', '/api/users', 'admin', 201, item('AdminUser'), ref('CreateUser'), undefined, 'credential_exception');
  add('PATCH', '/api/users/{id}', 'admin', 200, item('AdminUser'), ref('PatchUser'));
  add('POST', '/api/users/{id}/reset-password', 'admin', 200, item('AdminUser'), ref('PasswordReset'), undefined, 'credential_exception');
  add('GET', '/api/users/{id}/permissions', 'admin_or_self', 200, ref('UserPermissions'));
  add('PUT', '/api/users/{id}/permissions', 'admin_not_self', 200, ref('UserPermissions'), ref('PutUserPermissions'), undefined, 'none', { 'x-business-rules': ['BR-22', 'BR-23', 'permissions_version'] });
  add('GET', '/api/permissions/catalog', 'authenticated', 200, ref('PermissionCatalog'));
  add('PUT', '/api/permissions/matrix', 'admin', 200, ref('PermissionMatrixResult'), ref('PermissionMatrix'), undefined, 'none', { 'x-business-rules': ['BR-22', 'BR-23', 'permissions_version', 'all_or_nothing'] });
  add('GET', '/api/job-titles', 'authenticated', 200, ref('JobTitles'), null, object({ includeInactive: { ...boolean, default: false } }, []));
  add('POST', '/api/job-titles', 'admin', 201, item('JobTitle'), ref('CreateJobTitle'), undefined, 'required');
  add('PATCH', '/api/job-titles/{id}', 'admin', 200, item('JobTitle'), ref('PatchJobTitle'));
  add('GET', '/api/directory', 'admin_or_any_active_lead', 200, ref('DirectoryPersonPage'), null, object({ ...page, q: text(100) }, []));
  add('GET', '/api/teams', 'own_teams_or_admin', 200, ref('TeamsPage'), null, object({ ...page, includeArchived: { ...boolean, default: false } }, []));
  add('POST', '/api/teams', 'admin', 201, item('AdminTeam'), ref('CreateTeam'), undefined, 'required');
  add('PATCH', '/api/teams/{id}', 'admin', 200, item('AdminTeam'), ref('PatchTeam'));
  add('PUT', '/api/teams/{id}/members/{userId}', 'admin', 200, item('AdminTeam'), ref('TeamMembership'), undefined, 'parent_version');
  add('DELETE', '/api/teams/{id}/members/{userId}', 'admin', 200, item('AdminTeam'), ref('VersionBody'), undefined, 'parent_version');
  add('GET', '/api/projects', 'project_read', 200, ref('ProjectPage'), null, object({ ...page, team: ref('Id'), includeArchived: { ...boolean, default: false } }, []));
  add('POST', '/api/projects', 'admin_or_owner_lead', 201, item('Project'), ref('CreateProject'), undefined, 'required');
  add('PATCH', '/api/projects/{id}', 'admin_or_owner_lead', 200, item('Project'), ref('PatchProject'));
  add('GET', '/api/projects/{id}/members', 'project_read', 200, ref('ProjectMembers'));
  add('PUT', '/api/projects/{id}/members/{userId}', 'admin_or_owner_lead', 200, ref('ProjectMembers'), ref('ProjectMembership'), undefined, 'parent_version');
  add('DELETE', '/api/projects/{id}/members/{userId}', 'admin_or_owner_lead', 200, ref('ProjectMembers'), ref('VersionBody'), undefined, 'parent_version');
  add('GET', '/api/tasks', 'project_read', 200, ref('TaskPage'), null, ref('TaskQuery'));
  add('POST', '/api/tasks', 'project_write_active', 201, ref('TaskMutationResult'), ref('CreateTask'), undefined, 'required', { 'x-business-rules': ['task_dates', 'recurrence_requires_due', 'assignee_eligible'] });
  add('GET', '/api/tasks/{id}', 'project_read_task_active', 200, item('TaskDetail'));
  add('PATCH', '/api/tasks/{id}', 'project_write_active', 200, ref('TaskMutationResult'), ref('PatchTask'), undefined, 'required', { 'x-business-rules': ['merged_task_dates', 'recurrence_requires_due', 'assignee_eligible', 'checklist_completion', 'RD-02', 'RD-06'] });
  add('DELETE', '/api/tasks/{id}', 'creator_or_admin_owner_lead_RD01', 200, ref('TaskMutationResult'), ref('VersionBody'));
  add('GET', '/api/trash', 'admin_or_owner_lead', 200, ref('TrashPage'), null, object({ ...page, project: ref('Id') }, []));
  add('POST', '/api/tasks/{id}/restore', 'admin_or_owner_lead_RD01', 200, ref('TaskMutationResult'), ref('VersionBody'), undefined, 'required', { 'x-business-rules': ['RD-02', 'RD-05'] });
  add('GET','/api/projects/{id}/groups','project_read',200,ref('ProjectGroups'));
  add('POST','/api/projects/{id}/groups','project_write_active',201,item('ProjectGroup'),ref('CreateGroup'),undefined,'required');
  add('PATCH','/api/groups/{id}','project_write_active',200,item('ProjectGroup'),ref('PatchGroup'),undefined,'required');
  add('GET', '/api/projects/{id}/board', 'project_read', 200, ref('Board'));
  add('POST', '/api/tasks/batch', 'authenticated', 200, ref('TaskBatchResult'), ref('TaskBatch'), undefined, 'required', { 'x-business-rules': ['per_item_savepoint', 'per_item_authorization', 'no_silent_partial'] });
  add('GET', '/api/me/overview', 'authenticated', 200, ref('MyOverview'));
  add('GET', '/api/me/preferences', 'authenticated', 200, item('Preferences'));
  add('PATCH', '/api/me/preferences', 'authenticated', 200, item('Preferences'), ref('PatchPreferences'));
  add('GET', '/api/me/favorites', 'authenticated', 200, ref('Favorites'));
  add('PUT', '/api/me/favorites/{id}', 'authenticated', 200, ref('Favorites'));
  add('DELETE', '/api/me/favorites/{id}', 'authenticated', 200, ref('Favorites'));
  add('GET', '/api/projects/{id}/workload', 'project_read', 200, ref('Workload'), null, ref('WorkloadQuery'));
  add('GET', '/api/teams/{id}/workload', 'team_workload', 200, ref('Workload'), null, ref('WorkloadQuery'));
  add('GET', '/api/projects/{id}/overview', 'project_read', 200, ref('ProjectOverview'));
  add('GET', '/api/projects/{id}/docs', 'project_read', 200, ref('DocsPage'), null, object({ includeDeleted: { ...boolean, default: false } }, []));
  add('POST', '/api/projects/{id}/docs', 'project_write_active', 201, item('Doc'), ref('CreateDoc'), undefined, 'required', { 'x-business-rules': ['sanitize_html', 'text_length_200000'] });
  add('GET', '/api/docs/{id}', 'project_read', 200, item('Doc'));
  add('PATCH', '/api/docs/{id}', 'project_write_active', 200, item('Doc'), ref('PatchDoc'), undefined, 'none', { 'x-business-rules': ['sanitize_html', 'version', 'history'] });
  add('DELETE', '/api/docs/{id}', 'project_write_active', 200, item('Doc'), ref('VersionBody'), undefined, 'none', { 'x-business-rules': ['own_or_P-05'] });
  add('POST', '/api/docs/{id}/restore', 'project_write_active', 200, item('Doc'), ref('VersionBody'), undefined, 'none', { 'x-business-rules': ['own_or_P-05', 'retention_30_days'] });
  add('GET', '/api/docs/{id}/versions', 'project_read', 200, ref('DocVersions'));
  add('GET', '/api/projects/{id}/files', 'project_read', 200, ref('ProjectFilePage'), null, object({ ...page, q: text(100), type: enumeration(['image', 'pdf', 'document', 'other']), source: enumeration(['project', 'task']), includeDeleted: { ...boolean, default: false } }, []));
  add('POST', '/api/projects/{id}/files', 'project_write_active', 201, item('ProjectFile'), ref('Upload'), undefined, 'required', { 'x-business-rules': ['stream_single_file', 'extension_magic', 'quota', 'finalize_access_recheck'] });
  add('GET', '/api/project-files/{id}/download', 'project_read', 200, null, null, undefined, 'none', { responses: { '200': { description: 'Stream exact bytes; never JSON/base64.', headers: { 'Content-Disposition': { required: true, schema: { type: 'string', pattern: '^attachment;' } }, 'X-Content-Type-Options': { required: true, schema: { type: 'string', const: 'nosniff' } }, 'Cache-Control': { required: true, schema: { type: 'string', const: 'no-store' } }, 'X-Request-Id': { required: true, schema: ref('RequestId') } }, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, default: { description: 'Error before stream headers are sent', content: { 'application/json': { schema: ref('Error') } } } } });
  add('DELETE', '/api/project-files/{id}', 'project_write_active', 200, item('ProjectFile'), null, undefined, 'serialized_state', { 'x-business-rules': ['uploader_or_P-06'] });
  add('POST', '/api/project-files/{id}/restore', 'project_write_active', 200, item('ProjectFile'), null, undefined, 'serialized_state', { 'x-business-rules': ['uploader_or_P-06', 'RD-05'] });
  add('POST', '/api/projects/{id}/board/move', 'project_write_active', 200, ref('BoardMoveResult'), ref('BoardMove'), undefined, 'required', { 'x-business-rules': ['same_column_version', 'distinct_anchor', 'current_versions', 'checklist_completion'] });
  add('POST', '/api/tasks/{id}/subtasks', 'project_write_active_parent_not_done', 201, object({ item: ref('Subtask'), task: ref('Task') }), ref('CreateSubtask'), undefined, 'required');
  add('PATCH', '/api/subtasks/{id}', 'project_write_active', 200, object({ item: ref('Subtask'), task: ref('Task') }), ref('PatchSubtask'));
  add('DELETE', '/api/subtasks/{id}', 'project_write_active', 200, item('Task'), ref('DeleteSubtask'));
  add('GET', '/api/tasks/{id}/comments', 'project_read_task_active', 200, ref('CommentPage'), null, qPage());
  add('POST', '/api/tasks/{id}/comments', 'project_write_active', 201, item('Comment'), ref('CreateComment'), undefined, 'required');
  add('GET', '/api/tasks/{id}/attachments', 'project_read_task_active_deleted_metadata_scoped', 200, ref('AttachmentPage'), null, object({ ...page, includeDeleted: { ...boolean, default: false } }, []));
  add('POST', '/api/tasks/{id}/attachments', 'project_write_active', 201, item('Attachment'), ref('Upload'), undefined, 'required', { 'x-business-rules': ['stream_single_file', 'extension_magic', 'quota', 'finalize_access_recheck'] });
  add('GET', '/api/attachments/{id}/download', 'parent_project_read_task_attachment_active', 200, null, null, undefined, 'none', { responses: { '200': { description: 'Stream exact bytes; never JSON/base64.', headers: { 'Content-Disposition': { required: true, schema: { type: 'string', pattern: '^attachment;' } }, 'X-Content-Type-Options': { required: true, schema: { type: 'string', const: 'nosniff' } }, 'Cache-Control': { required: true, schema: { type: 'string', const: 'no-store' } }, 'X-Request-Id': { required: true, schema: ref('RequestId') } }, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, default: { description: 'Error before stream headers are sent', content: { 'application/json': { schema: ref('Error') } } } } });
  add('DELETE', '/api/attachments/{id}', 'uploader_or_admin_owner_lead_write_active', 200, item('Attachment'), null, undefined, 'serialized_state');
  add('POST', '/api/attachments/{id}/restore', 'uploader_or_admin_owner_lead_write_active', 200, item('Attachment'), null, undefined, 'serialized_state', { 'x-business-rules': ['RD-05'] });
  add('GET', '/api/audit', 'admin', 200, ref('AdminAuditPage'), null, qPage());
  add('GET', '/api/tasks/{id}/events', 'project_read_task_active', 200, ref('TaskEventPage'), null, qPage());
  add('GET', '/api/notifications', 'own_recipient_current_parent_access', 200, ref('NotificationsPage'), null, object({ ...page, unread: boolean }, []));
  add('POST', '/api/notifications/{id}/read', 'own_recipient_current_parent_access', 200, item('Notification'), null, undefined, 'natural_noop');
  add('POST', '/api/notifications/read-all', 'own_recipient_current_parent_access', 200, object({ marked_count: integer(0), unread_count: integer(0) }), null, undefined, 'natural_noop');
  add('GET', '/api/reports/summary', 'project_read', 200, ref('Report'), null, ref('ReportQuery'));
  add('GET', '/api/export/tasks.csv', 'project_read', 200, null, null, ref('ReportQuery'), 'none', { responses: { '200': { description: 'UTF8 BOM, escaped/formula-safe streaming CSV, max50000 rows; no pagination.', headers: { 'Cache-Control': { required: true, schema: { type: 'string', const: 'no-store' } }, 'X-Request-Id': { required: true, schema: ref('RequestId') } }, content: { 'text/csv': { schema: { type: 'string' } } } }, default: { description: 'Error before stream begins', content: { 'application/json': { schema: ref('Error') } } } } });
  add('GET', '/api/organization', 'authenticated', 200, item('Organization'));
  add('PATCH', '/api/organization', 'admin', 200, item('Organization'), ref('PatchOrganization'));
  add('GET', '/health/live', 'public', 200, ref('Health'));
  add('GET', '/health/ready', 'local_proxy', 200, ref('Health'));
  operations.at(-1).op.responses['503'] = { description: 'Restricted readiness failure: status only; no database/storage diagnostics.', content: { 'application/json': { schema: ref('Health') } } };
  const paths = {};
  for (const { op } of operations) for (const [status, response] of Object.entries(op.responses)) {
    response.headers = {
      'X-Request-Id': { required: true, schema: ref('RequestId') },
      'Cache-Control': { required: true, schema: { type: 'string', const: 'no-store' } },
      ...response.headers,
    };
    if (status === '503') response.headers['Retry-After'] = { required: true, schema: { type: 'string', pattern: '^[1-9][0-9]*$' } };
  }
  for (const { method, path, op } of operations) paths[path] = { ...paths[path], [method]: op };
  return {
    openapi: '3.1.1', jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: { title: 'FridayManagement API', version: '1.11.0', description: 'T-003 contract; T-080–T-082 job titles/permissions; T-083–T-086 overview/docs/files/batch; T-088 workload/project overview; T-089 preferences; T-090 favorites; owner 2026-10-09 group order, project metadata and team/member contact details; group-order history response correction; owner checklist inline editing and remark. Baseline1.1 + owner-approved RD01–08; Node22/SQLite local, SQL2022 target. Schemas are not authorization or transaction implementation.' },
    servers: [{ url: '/' }], paths,
    components: { securitySchemes: { cookieSession: { type: 'apiKey', in: 'cookie', name: 'friday_session' } }, schemas },
  };
}

if (process.argv[1]?.endsWith('/build-contract.mjs')) {
  mkdirSync('contracts', { recursive: true });
  writeFileSync('contracts/openapi.json', `${JSON.stringify(buildContract(), null, 2)}\n`);
  console.log('Generated contracts/openapi.json');
}
