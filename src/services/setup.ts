import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database, Transaction } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { sql } from '../repository/access-scope.js';
import { operations, requestBody, parseSchema } from '../api/contract.js';
import { ApiFault } from '../api/errors.js';
import { hashPassword } from '../security/passwords.js';
import { consumeSetupAttempt } from '../security/rate-limit.js';
const setupOperation = operations.find(
  (o) => o.method === 'POST' && o.path === '/api/setup',
)!.operation;
export interface SetupInput {
  token: string;
  organization_name: string;
  username: string;
  display_name: string;
  password: string;
}
async function hasUsers(tx: Transaction, claim = false): Promise<boolean> {
  const rows = await tx.query<{ id: number }>({
    sqlite: 'SELECT id FROM users LIMIT 1',
    sqlserver: `SELECT TOP(1) id FROM dbo.users${claim ? ' WITH (UPDLOCK,HOLDLOCK)' : ''}`,
  });
  return rows.length > 0;
}
export async function setupService(
  database: Database,
  options: { announceToken: (token: string) => void; clock?: () => Date },
) {
  const version: unknown = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
  parseSchema({ type: 'string', minLength: 1, maxLength: 60 }, version);
  let digest: Buffer | undefined;
  if (!(await runTransaction(database, (tx) => hasUsers(tx)))) {
    const bytes = randomBytes(32);
    try {
      const token = bytes.toString('hex');
      digest = createHash('sha256').update(token).digest();
      options.announceToken(token);
    } finally {
      bytes.fill(0);
    }
  }
  return {
    dispose() {
      digest?.fill(0);
      digest = undefined;
    },
    async meta() {
      return { setupRequired: !(await runTransaction(database, (tx) => hasUsers(tx))), version };
    },
    async create(input: unknown, address: string, requestId: string) {
      const body = requestBody(setupOperation, input) as SetupInput;
      if (await runTransaction(database, (tx) => hasUsers(tx)))
        throw new ApiFault('SETUP_ALREADY_COMPLETED');
      await consumeSetupAttempt(database, address, options.clock);
      const supplied = createHash('sha256').update(body.token).digest();
      const valid = digest !== undefined && timingSafeEqual(supplied, digest);
      supplied.fill(0);
      if (!valid) throw new ApiFault('INVALID_SETUP_TOKEN');
      parseSchema({ type: 'string', format: 'uuid' }, requestId);
      // Hash before acquiring the business claim; no credential-derived hashes/results enter idempotency.
      const passwordHash = await hashPassword(body.password);
      const reply = await runTransaction(database, async (tx) => {
        if (await hasUsers(tx, true)) throw new ApiFault('SETUP_ALREADY_COMPLETED');
        const now = utcNow(options.clock);
        const org = await tx.query<{ version: number }>(
          sql('SELECT version FROM dbo.organizations WHERE id=1'),
        );
        if (org[0])
          await tx.execute(
            sql(
              'UPDATE dbo.organizations SET name=@name,version=@version,updated_at=@now WHERE id=1',
              {
                name: body.organization_name,
                version: requireVersion(org[0].version, org[0].version),
                now,
              },
            ),
          );
        else
          await tx.execute(
            sql(
              "INSERT INTO dbo.organizations(id,name,timezone,version,created_at,updated_at) VALUES(1,@name,'Asia/Bangkok',1,@now,@now)",
              { name: body.organization_name, now },
            ),
          );
        const user = await tx.query<{ id: number }>({
          sqlite:
            "INSERT INTO users(username,display_name,password_hash,org_role,active,must_change_password,auth_version,version,created_at,updated_at) VALUES($username,$display,$hash,'admin',1,0,1,1,$now,$now) RETURNING id",
          sqlserver:
            "INSERT INTO dbo.users(username,display_name,password_hash,org_role,active,must_change_password,auth_version,version,created_at,updated_at) OUTPUT INSERTED.id VALUES(@username,@display,@hash,'admin',1,0,1,1,@now,@now)",
          parameters: {
            username: body.username,
            display: body.display_name,
            hash: passwordHash,
            now,
          },
        });
        const id = user[0]!.id;
        await tx.execute(
          sql(
            'INSERT INTO dbo.user_view_revisions(user_id,revision,updated_at) VALUES(@id,@revision,@now)',
            { id, revision: randomUUID(), now },
          ),
        );
        await tx.execute(
          sql(
            "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@id,'initial_setup','organization',1,@changes,@request,@now)",
            {
              id,
              changes: JSON.stringify({ initial_admin_id: id }),
              request: requestId.toLowerCase(),
              now,
            },
          ),
        );
        const response = {
          item: {
            id,
            username: body.username,
            display_name: body.display_name,
            org_role: 'admin',
            active: true,
            must_change_password: false,
            version: 1,
            created_at: now,
            updated_at: now,
            job_title_id: null,
            job_title: null,
            permission_keys: [],
            permissions_version: 1,
          },
        };
        parseSchema(
          setupOperation.responses['201']!.content!['application/json']!.schema,
          response,
        );
        return response;
      });
      digest?.fill(0);
      digest = undefined;
      return reply;
    },
  };
}
