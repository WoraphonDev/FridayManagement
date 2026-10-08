import type { Transaction } from '../domain/database.js';
import { projectVisibility, sql } from '../repository/access-scope.js';
import { utcNow } from '../domain/dates.js';
import { ApiFault } from '../api/errors.js';
import {
  currentActor,
  projectAccess,
  type AccessOptions,
  type SessionProof,
} from './authorization.js';

const limit = 100;

/**
 * Remove favorites for projects the user can no longer reach through Admin, owner-team Lead or
 * project membership (FR-47 / SRS §9.11). Called in the same transaction as every access change.
 */
export async function cleanupFavorites(tx: Transaction, user: number) {
  await tx.execute(
    sql(
      "DELETE FROM dbo.user_favorites WHERE user_id=@user AND NOT EXISTS(SELECT 1 FROM dbo.projects p JOIN dbo.users u ON u.id=@user WHERE p.id=dbo.user_favorites.project_id AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id)))",
      { user },
    ),
  );
}

/** FR-47 private project favorites; reads are always filtered by current project access. */
export function favoriteService(options: AccessOptions = {}) {
  const list = async (tx: Transaction, viewer: number) => {
    const items = await tx.query<{
      project_id: number;
      project_name: string;
      owner_team_name: string;
      archived: number;
      created_at: string;
    }>(
      sql(
        `SELECT f.project_id,p.name AS project_name,owner_team.name AS owner_team_name,CASE WHEN p.archived_at IS NULL AND owner_team.archived_at IS NULL THEN 0 ELSE 1 END AS archived,f.created_at FROM dbo.user_favorites f JOIN dbo.projects p ON p.id=f.project_id JOIN dbo.teams owner_team ON owner_team.id=p.owner_team_id WHERE f.user_id=@viewer AND ${projectVisibility('read')} ORDER BY f.created_at,f.project_id`,
        { viewer },
      ),
    );
    return { items: items.map((i) => ({ ...i, archived: !!i.archived })) };
  };
  return {
    async list(tx: Transaction, proof: SessionProof) {
      const actor = await currentActor(tx, proof, false, options);
      return list(tx, actor.id);
    },
    async add(tx: Transaction, proof: SessionProof, project: number) {
      const actor = await currentActor(tx, proof, false, options);
      // 404 for projects the user cannot read: a favorite never widens or reveals access.
      await projectAccess(tx, actor, project);
      const exists = await tx.query(
        sql(
          'SELECT project_id FROM dbo.user_favorites WHERE user_id=@user AND project_id=@project',
          {
            user: actor.id,
            project,
          },
        ),
      );
      if (!exists.length) {
        const total = (
          await tx.query<{ total: number }>(
            sql('SELECT COUNT(*) AS total FROM dbo.user_favorites WHERE user_id=@user', {
              user: actor.id,
            }),
          )
        )[0]!.total;
        if (total >= limit)
          throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
            project_id: [`Up to ${limit} favorites`],
          });
        await tx.execute(
          sql(
            'INSERT INTO dbo.user_favorites(user_id,project_id,created_at) VALUES(@user,@project,@now)',
            {
              user: actor.id,
              project,
              now: utcNow(options.clock),
            },
          ),
        );
      }
      return list(tx, actor.id);
    },
    async remove(tx: Transaction, proof: SessionProof, project: number) {
      const actor = await currentActor(tx, proof, false, options);
      // Removing is always allowed for the owner's own row, even after access was lost.
      await tx.execute(
        sql('DELETE FROM dbo.user_favorites WHERE user_id=@user AND project_id=@project', {
          user: actor.id,
          project,
        }),
      );
      return list(tx, actor.id);
    },
  };
}
