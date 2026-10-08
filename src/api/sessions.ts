import { historyService } from '../services/history.js';
import { fileService, type StorageOptions, type PreparedUpload } from '../services/files.js';
import type { Database } from '../domain/database.js';
import type { ApiContext, ApiHooks } from './middleware.js';
import { authorizationHooks } from './authorization.js';
import { sessionService, type SessionOptions } from '../services/sessions.js';
import { cookieProof, sessionCookie, sessionCookieOptions } from '../security/session-cookie.js';
import { accountService, type PreparedAccount } from '../services/accounts.js';
import { ApiFault } from './errors.js';
import { workspaceService } from '../services/workspaces.js';
import { workspaceHandlers } from './workspaces.js';
import { taskService } from '../services/tasks.js';
import { organizationService } from '../services/organization.js';
import { taskHandlers } from './tasks.js';
import { notificationCenter } from '../services/notification-center.js';
import { reportService } from '../services/reports.js';
import { jobTitleService } from '../services/job-titles.js';
import { permissionService } from '../services/permissions.js';
import { docService } from '../services/docs.js';
import { insightService } from '../services/insights.js';
import { favoriteService } from '../services/favorites.js';
import { taskBatchService } from '../services/task-batch.js';
export async function sessionHooks(
  database: Database,
  options: SessionOptions & { cookieSecure: boolean; storage?: StorageOptions },
  additionalHandlers: NonNullable<ApiHooks['handlers']> = {},
) {
  const service = await sessionService(database, options);
  const proof = (context: ApiContext) => {
    const hash = cookieProof(context.request);
    if (!hash || !context.principal) throw new ApiFault('UNAUTHENTICATED');
    return { userId: context.principal.id, tokenHash: hash };
  };
  const history = historyService(options);
  const notifications = notificationCenter(options),
    reports = reportService(database, options);
  const files = options.storage ? await fileService(database, options.storage, options) : undefined;
  const workspaces = workspaceService(options);
  const tasks = taskService(options),
    organization = organizationService(options),
    jobTitles = jobTitleService(options),
    permissions = permissionService(options),
    docs = docService(options),
    insights = insightService(options),
    favorites = favoriteService(options);
  const accounts = accountService(database, service, {
    ...options,
    checkVersions: async (tx, request) => {
      if (request.path === '/api/organization') await organization.checkVersions(tx, request);
      else if (request.path === '/api/job-titles/{id}') await jobTitles.checkVersions(tx, request);
      else if (request.path.startsWith('/api/docs/'))
        await docs.checkVersions(
          tx,
          request.params!.id!,
          (request.body as { version: number }).version,
        );
      else if (
        (request.path === '/api/tasks/{id}' && ['PATCH', 'DELETE'].includes(request.method)) ||
        request.path === '/api/projects/{id}/board/move' ||
        request.path === '/api/tasks/{id}/restore' ||
        request.path === '/api/tasks/{id}/subtasks' ||
        request.path === '/api/subtasks/{id}' ||
        request.path === '/api/groups/{id}'
      )
        await tasks.checkVersions(tx, request);
      else if (
        request.path.startsWith('/api/teams/') ||
        request.path === '/api/projects/{id}' ||
        request.path === '/api/projects/{id}/members/{userId}'
      )
        await workspaces.checkVersions(tx, request);
      else if (options.checkVersions) await options.checkVersions(tx, request);
      else throw new ApiFault('SERVICE_NOT_READY');
    },
  });
  const tx = (context: ApiContext) => {
    if (!context.transaction) throw new ApiFault('SERVICE_NOT_READY');
    return context.transaction;
  };
  const requestId = (context: ApiContext) => context.request.res!.get('X-Request-Id')!;
  const secure = sessionCookieOptions(options.cookieSecure);
  const batch = taskBatchService(tasks, { ...options, checkVersions: accounts.checkVersions });
  const handlers: NonNullable<ApiHooks['handlers']> = {
    get_api_me_overview: async (c) => ({
      status: 200,
      body: await tasks.overview(tx(c), proof(c)),
    }),
    post_api_tasks_batch: async (c) => ({
      status: 200,
      body: await batch.run(tx(c), proof(c), c.body, requestId(c)),
    }),
    get_api_projects_id_docs: async (c) => ({
      status: 200,
      body: await docs.list(tx(c), proof(c), c.params.id!, c.query),
    }),
    post_api_projects_id_docs: async (c) => ({
      status: 201,
      body: await docs.create(tx(c), proof(c), c.params.id!, c.body),
    }),
    get_api_docs_id: async (c) => ({
      status: 200,
      body: await docs.get(tx(c), proof(c), c.params.id!),
    }),
    patch_api_docs_id: async (c) => ({
      status: 200,
      body: await docs.patch(tx(c), proof(c), c.params.id!, c.body),
    }),
    delete_api_docs_id: async (c) => ({
      status: 200,
      body: await docs.trash(tx(c), proof(c), c.params.id!, c.body, false, requestId(c)),
    }),
    post_api_docs_id_restore: async (c) => ({
      status: 200,
      body: await docs.trash(tx(c), proof(c), c.params.id!, c.body, true, requestId(c)),
    }),
    get_api_me_favorites: async (c) => ({
      status: 200,
      body: await favorites.list(tx(c), proof(c)),
    }),
    put_api_me_favorites_id: async (c) => ({
      status: 200,
      body: await favorites.add(tx(c), proof(c), c.params.id!),
    }),
    delete_api_me_favorites_id: async (c) => ({
      status: 200,
      body: await favorites.remove(tx(c), proof(c), c.params.id!),
    }),
    get_api_projects_id_workload: async (c) => ({
      status: 200,
      body: await insights.workload(tx(c), proof(c), 'project', c.params.id!, c.query),
    }),
    get_api_teams_id_workload: async (c) => ({
      status: 200,
      body: await insights.workload(tx(c), proof(c), 'team', c.params.id!, c.query),
    }),
    get_api_projects_id_overview: async (c) => ({
      status: 200,
      body: await insights.overview(tx(c), proof(c), c.params.id!),
    }),
    get_api_docs_id_versions: async (c) => ({
      status: 200,
      body: await docs.versions(tx(c), proof(c), c.params.id!),
    }),
    ...workspaceHandlers(workspaces, proof),
    ...taskHandlers(tasks, organization, proof),
    ...additionalHandlers,
    get_api_notifications: async (c) => ({
      status: 200,
      body: await notifications.page(tx(c), proof(c), c.query),
    }),
    post_api_notifications_id_read: async (c) => ({
      status: 200,
      body: await notifications.read(tx(c), proof(c), c.params.id!),
    }),
    post_api_notifications_read_all: async (c) => ({
      status: 200,
      body: await notifications.read(tx(c), proof(c), null),
    }),
    get_api_reports_summary: async (c) => ({
      status: 200,
      body: await reports.summary(tx(c), proof(c), c.query),
    }),
    get_api_export_tasks_csv: async (c) => ({
      status: 200,
      csv: await reports.export(tx(c), proof(c), c.query),
    }),
    get_api_tasks_id_events: async (c) => ({
      status: 200,
      body: await history.page(tx(c), proof(c), c.params.id!, c.query),
    }),
    get_api_audit: async (c) => ({
      status: 200,
      body: await history.page(tx(c), proof(c), null, c.query),
    }),
    ...(files
      ? {
          post_api_tasks_id_attachments: async (c: ApiContext) => ({
            status: 201,
            body: await files.finalize(tx(c), proof(c), c.prepared as PreparedUpload, requestId(c)),
          }),
          get_api_tasks_id_attachments: async (c: ApiContext) => ({
            status: 200,
            body: await files.list(tx(c), proof(c), c.params.id!, c.query),
          }),
          delete_api_attachments_id: async (c: ApiContext) => ({
            status: 200,
            body: await files.change(tx(c), proof(c), c.params.id!, false, requestId(c)),
          }),
          post_api_attachments_id_restore: async (c: ApiContext) => ({
            status: 200,
            body: await files.change(tx(c), proof(c), c.params.id!, true, requestId(c)),
          }),
          get_api_projects_id_files: async (c: ApiContext) => ({
            status: 200,
            body: await files.projectFiles(tx(c), proof(c), c.params.id!, c.query),
          }),
          post_api_projects_id_files: async (c: ApiContext) => ({
            status: 201,
            body: await files.finalize(tx(c), proof(c), c.prepared as PreparedUpload, requestId(c)),
          }),
          delete_api_project_files_id: async (c: ApiContext) => ({
            status: 200,
            body: await files.projectChange(tx(c), proof(c), c.params.id!, false, requestId(c)),
          }),
          post_api_project_files_id_restore: async (c: ApiContext) => ({
            status: 200,
            body: await files.projectChange(tx(c), proof(c), c.params.id!, true, requestId(c)),
          }),
          get_api_project_files_id_download: async (c: ApiContext) => ({
            status: 200,
            binary: await files.projectDownload(tx(c), proof(c), c.params.id!, requestId(c)),
          }),
          get_api_attachments_id_download: async (c: ApiContext) => ({
            status: 200,
            binary: await files.download(tx(c), proof(c), c.params.id!, requestId(c)),
          }),
        }
      : {}),
    get_api_job_titles: async (c) => ({
      status: 200,
      body: await jobTitles.list(tx(c), proof(c), c.query),
    }),
    post_api_job_titles: async (c) => ({
      status: 201,
      body: await jobTitles.create(tx(c), proof(c), c.body, requestId(c)),
    }),
    patch_api_job_titles_id: async (c) => ({
      status: 200,
      body: await jobTitles.patch(tx(c), proof(c), c.params.id!, c.body, requestId(c)),
    }),
    get_api_permissions_catalog: async () => ({ status: 200, body: permissions.catalog() }),
    get_api_users_id_permissions: async (c) => ({
      status: 200,
      body: await permissions.get(tx(c), proof(c), c.params.id!),
    }),
    put_api_users_id_permissions: async (c) => ({
      status: 200,
      body: await permissions.put(tx(c), proof(c), c.params.id!, c.body, requestId(c)),
    }),
    put_api_permissions_matrix: async (c) => ({
      status: 200,
      body: await permissions.matrix(tx(c), proof(c), c.body, requestId(c)),
    }),
    get_api_users: async (c) => ({
      status: 200,
      body: await accounts.list(tx(c), proof(c), c.query),
    }),
    post_api_users: async (c) => ({
      status: 201,
      body: await accounts.create(tx(c), proof(c), c.prepared as PreparedAccount, requestId(c)),
    }),
    patch_api_users_id: async (c) => {
      const before =
        c.params.id === c.principal!.id ? await service.self(tx(c), proof(c)) : undefined;
      const body = await accounts.patch(tx(c), proof(c), c.params.id!, c.body, requestId(c));
      const revoked =
        before &&
        (before.user.active !== body.item.active || before.user.org_role !== body.item.org_role);
      return {
        status: 200,
        body,
        ...(revoked
          ? { afterCommit: () => c.request.res!.clearCookie(sessionCookie, secure) }
          : {}),
      };
    },
    post_api_users_id_reset_password: async (c) => ({
      status: 200,
      body: await accounts.reset(
        tx(c),
        proof(c),
        c.params.id!,
        c.prepared as PreparedAccount,
        requestId(c),
      ),
      ...(c.params.id === c.principal!.id
        ? { afterCommit: () => c.request.res!.clearCookie(sessionCookie, secure) }
        : {}),
    }),
    post_api_password: async (c) => {
      const result = await accounts.password(
        tx(c),
        proof(c),
        c.prepared as PreparedAccount,
        requestId(c),
      );
      return {
        status: 200,
        body: result.body,
        afterCommit: () =>
          c.request.res!.cookie(sessionCookie, result.token, {
            ...secure,
            expires: new Date(result.expires),
          }),
      };
    },
    post_api_login: async (context) => {
      const result = await service.login(
        context.body,
        context.request.ip ?? '',
        cookieProof(context.request),
      );
      return {
        status: 200,
        body: result.body,
        afterCommit: () =>
          context.request.res!.cookie(sessionCookie, result.token, {
            ...secure,
            expires: new Date(result.expires),
          }),
      };
    },
    get_api_me: async (context) => {
      if (!context.transaction) throw new ApiFault('SERVICE_NOT_READY');
      return { status: 200, body: await service.self(context.transaction, proof(context)) };
    },
    post_api_session_activity: async (context) => {
      if (!context.transaction) throw new ApiFault('SERVICE_NOT_READY');
      await service.activity(
        context.transaction,
        proof(context),
        context.request.get('X-CSRF-Token') ?? '',
      );
      return { status: 204 };
    },
    post_api_logout: async (context) => {
      if (!context.transaction) throw new ApiFault('SERVICE_NOT_READY');
      await service.logout(
        context.transaction,
        proof(context),
        context.request.get('X-CSRF-Token') ?? '',
      );
      return {
        status: 204,
        afterCommit: () => context.request.res!.clearCookie(sessionCookie, secure),
      };
    },
  };
  return {
    ...(files
      ? {
          upload: async (c: ApiContext) => {
            const p =
              c.path === '/api/projects/{id}/files'
                ? await files.receive(c.request, proof(c), 0, { kind: 'project', id: c.params.id! })
                : await files.receive(c.request, proof(c), c.params.id!);
            c.prepared = p;
            c.body = p.fingerprint;
          },
          finishUpload: async (c: ApiContext) => {
            if (c.prepared) {
              try {
                await files.release((c.prepared as PreparedUpload).id);
              } catch {
                options.storage?.log?.({ requestId: requestId(c), code: 'INTERNAL_ERROR' });
              }
            }
          },
        }
      : {}),
    prepare: async (context: ApiContext) => {
      const kind =
        context.operation.operationId === 'post_api_password'
          ? 'password'
          : context.operation.operationId === 'post_api_users'
            ? 'create'
            : context.operation.operationId === 'post_api_users_id_reset_password'
              ? 'reset'
              : undefined;
      return kind
        ? accounts.prepare(kind, proof(context), context.body, context.params.id)
        : undefined;
    },
    session: (request: Parameters<NonNullable<ApiHooks['session']>>[0]) =>
      service.principal(cookieProof(request)),
    ...authorizationHooks(database, async (context) => proof(context), handlers, {
      ...options,
      checkVersions: accounts.checkVersions,
    }),
  };
}
