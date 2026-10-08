import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import {
  currentActor,
  type AccessOptions,
  type AccessRequest,
  type SessionProof,
} from './authorization.js';
import { operations, requestBody } from '../api/contract.js';
import { ApiFault } from '../api/errors.js';
import { requireVersion } from '../domain/lifecycle.js';
import { utcNow } from '../domain/dates.js';
type Organization = { id: number; name: string; timezone: string; version: number };
export function organizationService(options: AccessOptions = {}) {
  const read = async (tx: Transaction) => {
    const rows = await tx.query<Organization>(
      sql('SELECT id,name,timezone,version FROM dbo.organizations WHERE id=1'),
    );
    if (!rows[0]) throw new ApiFault('SERVICE_NOT_READY');
    return rows[0];
  };
  return {
    async checkVersions(tx: Transaction, r: AccessRequest) {
      const row = await read(tx);
      requireVersion(row.version, (r.body as { version: number }).version);
    },
    async get(tx: Transaction, proof: SessionProof) {
      await currentActor(tx, proof, false, options);
      return { item: await read(tx) };
    },
    async patch(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const actor = await currentActor(tx, proof, false, options);
      if (actor.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      const b = requestBody(
        operations.find((o) => o.operation.operationId === 'patch_api_organization')!.operation,
        input,
      ) as { name: string; version: number };
      const before = await read(tx),
        version = requireVersion(before.version, b.version),
        now = utcNow(options.clock);
      const rows = await tx.query<{ version: number }>({
        sqlite:
          'UPDATE organizations SET name=$name,version=$version,updated_at=$now WHERE id=1 AND version=$expected RETURNING version',
        sqlserver:
          'UPDATE dbo.organizations SET name=@name,version=@version,updated_at=@now OUTPUT INSERTED.version WHERE id=1 AND version=@expected',
        parameters: { name: b.name, version, now, expected: b.version },
      });
      if (rows[0]?.version !== version) {
        requireVersion((await read(tx)).version, b.version);
        throw new ApiFault('DATABASE_BUSY');
      }
      await tx.execute(
        sql(
          'INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,@type,1,@changes,@request,@now)',
          {
            actor: actor.id,
            action: 'organization_updated',
            type: 'organization',
            changes: JSON.stringify({ before: { name: before.name }, after: { name: b.name } }),
            request,
            now,
          },
        ),
      );
      return { item: await read(tx) };
    },
  };
}
