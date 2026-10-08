import { randomUUID } from 'node:crypto';
import type { Database } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { ApiFault } from '../api/errors.js';
/** Runtime admission gate. Installer CLI additionally holds the exclusive instance guards. */
export class Maintenance {
  private blocked = false;
  private active = 0;
  private drained: (() => void)[] = [];
  constructor(private readonly database: Database) {}
  closeAdmission() {
    this.blocked = true;
  }
  async drain() {
    this.closeAdmission();
    if (this.active) await new Promise<void>((resolve) => this.drained.push(resolve));
  }
  enter(): (() => void) | undefined {
    if (this.blocked) return undefined;
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.active === 0) this.drained.splice(0).forEach((resolve) => resolve());
    };
  }
  async freeze() {
    if (this.blocked) throw new ApiFault('MAINTENANCE');
    this.blocked = true;
    const owner = randomUUID();
    try {
      if (this.active) await new Promise<void>((resolve) => this.drained.push(resolve));
      const now = new Date().toISOString();
      await runTransaction(this.database, async (tx) => {
        if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
          throw new ApiFault('MAINTENANCE');
        await tx.execute(
          sql(
            "INSERT INTO dbo.maintenance_state(id,owner_id,state,lease_expires_at,created_at,updated_at) VALUES(1,@owner,'frozen',@expires,@now,@now)",
            { owner, expires: new Date(Date.parse(now) + 86400000).toISOString(), now },
          ),
        );
      });
    } catch (error) {
      // Failed ownership acquisition never removes somebody else's persistent freeze.
      this.blocked = true;
      throw error;
    }
    let released = false;
    return async () => {
      if (released) return;
      await runTransaction(this.database, async (tx) => {
        const rows = await tx.query(sql('SELECT owner_id FROM dbo.maintenance_state WHERE id=1'));
        if (rows[0]?.owner_id !== owner) throw new Error('MAINTENANCE_OWNER_LOST');
        await tx.execute(
          sql('DELETE FROM dbo.maintenance_state WHERE id=1 AND owner_id=@owner', { owner }),
        );
      });
      released = true;
      this.blocked = false;
    };
  }
}
