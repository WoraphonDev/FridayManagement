import type { Transaction, Row } from '../domain/database.js';
import { sql } from './access-scope.js';

export function userTeams(tx: Transaction, user: number) {
  return tx.query<
    Row & {
      id: number;
      name: string;
      team_role: 'lead' | 'member';
      team_position: 'pm' | 'lead' | 'dev';
    }
  >(
    sql(
      'SELECT t.id,t.name,m.team_role,m.team_position FROM dbo.team_members m JOIN dbo.teams t ON t.id=m.team_id WHERE m.user_id=@user ORDER BY t.id',
      { user },
    ),
  );
}
