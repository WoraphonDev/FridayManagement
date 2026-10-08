import type { Self } from './api.js';
/** Synthetic HTTP/UI fixtures only; never imported by the application entry point. */
export function selfFixture(
  role: 'admin' | 'member' = 'member',
  lead = false,
  forced = false,
): Self {
  return {
    user: {
      id: 1,
      username: 'Fixture',
      display_name: 'ผู้ทดสอบ',
      org_role: role,
      active: true,
      must_change_password: forced,
      version: 1,
      created_at: '2026-10-06T00:00:00.000Z',
      updated_at: '2026-10-06T00:00:00.000Z',
      job_title_id: null,
      job_title: null,
      permission_keys: [],
      permissions_version: 1,
    },
    csrf: 'synthetic-fixture-csrf-00000000000000',
    effective_summary: { lead_team_ids: lead ? [1] : [], project_ids: [1] },
    must_change_password: forced,
    maintenance: false,
    view_revision: '00000000-0000-4000-8000-000000000001',
    bangkok_today: '2026-10-06',
  };
}
