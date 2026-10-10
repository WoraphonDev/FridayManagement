import { useEffect, useState } from 'react';
import { apiClient } from './api';
import { directoryPage } from './workspace-api';
import { failureMessage } from './auth-policy';
export type InitialTeamMember = { user_id: number; team_position: 'pm' | 'lead' | 'dev' };
export function InitialTeamMembers({
  value,
  onChange,
}: {
  value: InitialTeamMember[];
  onChange: (v: InitialTeamMember[]) => void;
}) {
  const [users, setUsers] = useState<{ id: number; display_name: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const all: { id: number; display_name: string }[] = [];
      for (let page = 1; ; page++) {
        const result = await apiClient().request(`/api/directory?page=${page}&pageSize=100`, {
          signal: controller.signal,
          parse: (v) => directoryPage.parse(v),
        });
        all.push(...result.items);
        if (page * result.pageSize >= result.total) break;
      }
      if (!controller.signal.aborted) setUsers(all);
    })().catch((e) => {
      if (!controller.signal.aborted) setError(failureMessage(e));
    });
    return () => controller.abort();
  }, []);
  return (
    <div className="initial-team-members">
      <h3>Add Member</h3>
      <p className="hint">
        PM, Lead and Dev are team positions. Members keep the existing permission rules.
      </p>
      {error && <p role="alert">{error}</p>}
      {value.map((member, index) => (
        <div className="initial-member-row" key={index}>
          <label>
            Member {index + 1}
            <select
              required
              value={member.user_id || ''}
              onChange={(e) =>
                onChange(
                  value.map((m, i) =>
                    i === index ? { ...m, user_id: Number(e.target.value) } : m,
                  ),
                )
              }
            >
              <option value="">Choose member</option>
              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                  disabled={value.some((m, i) => i !== index && m.user_id === user.id)}
                >
                  {user.display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Position {index + 1}
            <select
              value={member.team_position}
              onChange={(e) =>
                onChange(
                  value.map((m, i) =>
                    i === index
                      ? {
                          ...m,
                          team_position: e.target.value as InitialTeamMember['team_position'],
                        }
                      : m,
                  ),
                )
              }
            >
              <option value="pm">PM</option>
              <option value="lead">Lead</option>
              <option value="dev">Dev</option>
            </select>
          </label>
          <button
            type="button"
            aria-label={`Remove member ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={!users.length || value.length >= Math.min(100, users.length)}
        onClick={() => onChange([...value, { user_id: 0, team_position: 'dev' }])}
      >
        Add Member
      </button>
    </div>
  );
}
