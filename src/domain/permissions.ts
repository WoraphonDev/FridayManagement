export type EffectiveRole = 'admin' | 'lead' | 'manager' | 'editor' | 'viewer' | 'none';
export type Membership = 'manager' | 'editor' | 'viewer';
export const permissionKeys = [
  'P-01',
  'P-02',
  'P-03',
  'P-04',
  'P-05',
  'P-06',
  'P-07',
  'P-08',
  'P-09',
  'P-10',
] as const;
export type PermissionKey = (typeof permissionKeys)[number];
/** Project-scoped keys; a manager appointment needs at least one (FR-42, BR-22). */
export const managerKeys: readonly PermissionKey[] = permissionKeys.slice(0, 7);
export function effectiveRole(
  admin: boolean,
  ownerLead: boolean,
  membership: Membership | null,
): EffectiveRole {
  return admin ? 'admin' : ownerLead ? 'lead' : (membership ?? 'none');
}
export function rights(role: EffectiveRole) {
  return {
    read: role !== 'none',
    write: ['admin', 'lead', 'manager', 'editor'].includes(role),
    manage: ['admin', 'lead'].includes(role),
  };
}
/** Admin/Lead keep full rights; a manager gets only ticked project keys (deny by default). */
export function grants(role: EffectiveRole, keys: string | null, key: PermissionKey) {
  if (role === 'admin' || role === 'lead') return true;
  return role === 'manager' && managerKeys.includes(key) && (keys ?? '').split(',').includes(key);
}
