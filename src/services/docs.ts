import type { Row, Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { retentionWindow, utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { rights } from '../domain/permissions.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import { sanitizeHtml } from '../security/html-sanitizer.js';
import {
  can,
  currentActor,
  projectAccess,
  type AccessOptions,
  type ProjectAccess,
  type SessionProof,
} from './authorization.js';

type DocRow = Row & {
  id: number;
  project_id: number;
  title: string;
  body_html: string;
  text_length: number;
  version: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
};
const columns =
  'd.id,d.project_id,d.title,d.body_html,d.text_length,d.version,d.created_by,d.updated_by,d.created_at,d.updated_at,d.deleted_at,d.deleted_by';

/** FR-48 / SRS §9.7. Editors/managers edit any doc; delete/restore needs own doc or P-05. */
export function docService(options: AccessOptions = {}) {
  const now = () => utcNow(options.clock);
  const body = (method: string, path: string, input: unknown) =>
    requestBody(
      operations.find((o) => o.method === method && o.path === path)!.operation,
      input,
    ) as Record<string, unknown>;
  const person = async (tx: Transaction, id: number) => {
    const u = (
      await tx.query<{ id: number; display_name: string; active: number }>(
        sql('SELECT id,display_name,active FROM dbo.users WHERE id=@id', { id }),
      )
    )[0]!;
    return { ...u, active: !!u.active };
  };
  const scope = async (tx: Transaction, proof: SessionProof, projectId: number) => {
    const actor = await currentActor(tx, proof, false, options);
    return { actor, project: await projectAccess(tx, actor, projectId) };
  };
  const writable = async (tx: Transaction, project: ProjectAccess) => {
    if (!rights(project.role).write) throw new ApiFault('FORBIDDEN');
    if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
      throw new ApiFault('MAINTENANCE');
    if (project.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
    if (project.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
  };
  const owns = (project: ProjectAccess, doc: DocRow, actor: number) =>
    can(project, 'P-05') || doc.created_by === actor;
  const load = async (tx: Transaction, id: number, lock = false) => {
    const rows = await tx.query<DocRow>(
      lock
        ? {
            sqlite: `SELECT ${columns} FROM project_docs d WHERE d.id=$id`,
            sqlserver: `SELECT ${columns} FROM dbo.project_docs d WITH (UPDLOCK,HOLDLOCK) WHERE d.id=@id`,
            parameters: { id },
          }
        : sql(`SELECT ${columns} FROM dbo.project_docs d WHERE d.id=@id`, { id }),
    );
    if (!rows[0]) throw new ApiFault('NOT_FOUND');
    return rows[0];
  };
  const dto = async (
    tx: Transaction,
    doc: DocRow,
    project: ProjectAccess,
    actor: number,
    full: boolean,
  ) => {
    const active = !project.archived_at && !project.team_archived_at;
    const write = rights(project.role).write && active;
    return {
      id: doc.id,
      project_id: doc.project_id,
      title: doc.title,
      version: doc.version,
      created_by: await person(tx, doc.created_by),
      updated_by: await person(tx, doc.updated_by),
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      deleted_at: doc.deleted_at,
      text_length: doc.text_length,
      can_edit: write && !doc.deleted_at,
      can_delete: write && !doc.deleted_at && owns(project, doc, actor),
      can_restore:
        write &&
        !!doc.deleted_at &&
        owns(project, doc, actor) &&
        retentionWindow(doc.deleted_at, now()).restorable,
      ...(full ? { body_html: doc.body_html } : {}),
    };
  };
  /** Images may only reference this project's files or attachments of its tasks. */
  const clean = async (tx: Transaction, projectId: number, html: string) => {
    const refs = [
      ...html.matchAll(/\/api\/(project-files|attachments)\/([1-9][0-9]{0,9})\/download/g),
    ];
    const ok = new Set<string>();
    for (const [, kind, id] of refs.slice(0, 200)) {
      const owner = await tx.query(
        sql(
          kind === 'project-files'
            ? 'SELECT id FROM dbo.project_files WHERE id=@id AND project_id=@project AND deleted_at IS NULL'
            : 'SELECT a.id FROM dbo.attachments a JOIN dbo.tasks t ON t.id=a.task_id WHERE a.id=@id AND t.project_id=@project AND a.deleted_at IS NULL AND t.deleted_at IS NULL',
          { id: Number(id), project: projectId },
        ),
      );
      if (owner.length) ok.add(`${kind === 'project-files' ? 'project-file' : 'attachment'}:${id}`);
    }
    let result;
    try {
      result = sanitizeHtml(html, { imageAllowed: (kind, id) => ok.has(`${kind}:${id}`) });
    } catch {
      throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
        body_html: ['Document structure is too deeply nested'],
      });
    }
    if (result.textLength > 200000)
      throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
        body_html: ['Up to 200,000 characters of text'],
      });
    return result;
  };
  const history = (tx: Transaction, doc: DocRow, editor: number, at: string) =>
    tx.execute(
      sql(
        'INSERT INTO dbo.project_doc_versions(doc_id,version,title,body_html,edited_by,edited_at) VALUES(@doc,@version,@title,@body,@editor,@at)',
        { doc: doc.id, version: doc.version, title: doc.title, body: doc.body_html, editor, at },
      ),
    );
  return {
    /** Called by authorization after current rights, before lifecycle checks (409 ordering). */
    async checkVersions(tx: Transaction, id: number, expected: number) {
      requireVersion((await load(tx, id, true)).version, expected);
    },
    async list(
      tx: Transaction,
      proof: SessionProof,
      projectId: number,
      q: Record<string, unknown>,
    ) {
      const { actor, project } = await scope(tx, proof, projectId);
      // Deleted docs are listed only for users who could restore at least their own.
      const deleted = q.includeDeleted === true && rights(project.role).write;
      const rows = await tx.query<DocRow>(
        sql(
          `SELECT ${columns} FROM dbo.project_docs d WHERE d.project_id=@project AND (d.deleted_at IS NULL OR (@deleted=1 AND d.deleted_at>@cutoff)) ORDER BY d.updated_at DESC,d.id`,
          {
            project: projectId,
            deleted: Number(deleted),
            cutoff: new Date(Date.parse(now()) - 30 * 86400000).toISOString(),
          },
        ),
      );
      const items = [];
      for (const doc of rows.slice(0, 1000)) {
        if (doc.deleted_at && !owns(project, doc, actor.id)) continue;
        items.push(await dto(tx, doc, project, actor.id, false));
      }
      return { items };
    },
    async get(tx: Transaction, proof: SessionProof, id: number) {
      const doc = await load(tx, id);
      const { actor, project } = await scope(tx, proof, doc.project_id);
      if (doc.deleted_at && !(rights(project.role).write && owns(project, doc, actor.id)))
        throw new ApiFault('NOT_FOUND');
      return { item: await dto(tx, doc, project, actor.id, true) };
    },
    async create(tx: Transaction, proof: SessionProof, projectId: number, input: unknown) {
      const { actor, project } = await scope(tx, proof, projectId);
      await writable(tx, project);
      const b = body('POST', '/api/projects/{id}/docs', input);
      const sanitized = await clean(tx, projectId, String(b.body_html ?? ''));
      if (
        (
          await tx.query<{ total: number }>(
            sql('SELECT COUNT(*) AS total FROM dbo.project_docs WHERE project_id=@project', {
              project: projectId,
            }),
          )
        )[0]!.total >= 1000
      )
        throw new ApiFault('VALIDATION_FAILED');
      const at = now();
      const parameters = {
        project: projectId,
        title: String(b.title),
        body: sanitized.html,
        length: sanitized.textLength,
        actor: actor.id,
        at,
      };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO project_docs(project_id,title,body_html,text_length,version,created_by,updated_by,created_at,updated_at) VALUES($project,$title,$body,$length,1,$actor,$actor,$at,$at) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.project_docs(project_id,title,body_html,text_length,version,created_by,updated_by,created_at,updated_at) OUTPUT INSERTED.id VALUES(@project,@title,@body,@length,1,@actor,@actor,@at,@at)',
        parameters,
      });
      const doc = await load(tx, rows[0]!.id);
      await history(tx, doc, actor.id, at);
      return { item: await dto(tx, doc, project, actor.id, true) };
    },
    async patch(tx: Transaction, proof: SessionProof, id: number, input: unknown) {
      const before = await load(tx, id, true);
      const { actor, project } = await scope(tx, proof, before.project_id);
      await writable(tx, project);
      if (before.deleted_at) throw new ApiFault('NOT_FOUND');
      const b = body('PATCH', '/api/docs/{id}', input);
      const version = requireVersion(before.version, Number(b.version));
      const sanitized =
        b.body_html === undefined
          ? { html: before.body_html, textLength: before.text_length }
          : await clean(tx, before.project_id, String(b.body_html));
      const at = now();
      await tx.execute(
        sql(
          'UPDATE dbo.project_docs SET title=@title,body_html=@body,text_length=@length,version=@version,updated_by=@actor,updated_at=@at WHERE id=@id AND version=@expected',
          {
            id,
            title: String(b.title ?? before.title),
            body: sanitized.html,
            length: sanitized.textLength,
            version,
            actor: actor.id,
            at,
            expected: before.version,
          },
        ),
      );
      const doc = await load(tx, id);
      if (doc.version !== version) throw new ApiFault('DATABASE_BUSY');
      await history(tx, doc, actor.id, at);
      return { item: await dto(tx, doc, project, actor.id, true) };
    },
    async trash(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      restore: boolean,
    ) {
      const before = await load(tx, id, true);
      const { actor, project } = await scope(tx, proof, before.project_id);
      await writable(tx, project);
      if (!owns(project, before, actor.id)) {
        if (before.deleted_at) throw new ApiFault('NOT_FOUND');
        throw new ApiFault('FORBIDDEN');
      }
      const b = body(
        restore ? 'POST' : 'DELETE',
        restore ? '/api/docs/{id}/restore' : '/api/docs/{id}',
        input,
      );
      if (restore ? !before.deleted_at : !!before.deleted_at) throw new ApiFault('NOT_FOUND');
      const version = requireVersion(before.version, Number(b.version));
      if (restore && !retentionWindow(before.deleted_at!, now()).restorable)
        throw new ApiFault('RETENTION_EXPIRED');
      const at = now();
      await tx.execute(
        sql(
          'UPDATE dbo.project_docs SET deleted_at=@deleted,deleted_by=@by,version=@version,updated_at=@at WHERE id=@id',
          { id, deleted: restore ? null : at, by: restore ? null : actor.id, version, at },
        ),
      );
      return { item: await dto(tx, await load(tx, id), project, actor.id, true) };
    },
    async versions(tx: Transaction, proof: SessionProof, id: number) {
      const doc = await load(tx, id);
      const { actor, project } = await scope(tx, proof, doc.project_id);
      if (doc.deleted_at && !(rights(project.role).write && owns(project, doc, actor.id)))
        throw new ApiFault('NOT_FOUND');
      const rows = await tx.query<{
        version: number;
        title: string;
        body_html: string;
        edited_by: number;
        edited_at: string;
      }>(
        sql(
          'SELECT version,title,body_html,edited_by,edited_at FROM dbo.project_doc_versions WHERE doc_id=@id ORDER BY version DESC',
          { id },
        ),
      );
      const items = [];
      for (const r of rows.slice(0, 1000))
        items.push({ ...r, edited_by: await person(tx, r.edited_by) });
      return { items };
    },
  };
}
