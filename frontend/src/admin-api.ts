import { z } from 'zod';
import { apiClient, permissionKey, selfSchema } from './api';
const id = z.number().int().min(1).max(2147483647),
  timestamp = z.string().datetime(),
  hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
// FR-41/BR-19: job titles are labels; they never decide permissions.
export const jobTitleSchema = z
  .object({
    id,
    name: z.string().min(1).max(50),
    color: hex,
    is_active: z.boolean(),
    sort_order: z.number().int().min(0).max(10000),
    user_count: z.number().int().min(0),
    version: id,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict();
export const jobTitles = z.object({ items: z.array(jobTitleSchema).max(1000) }).strict();
export const jobTitleItem = z.object({ item: jobTitleSchema }).strict();
export const catalogSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            key: permissionKey,
            label: z.string().min(1).max(200),
            description: z.string().min(1).max(500),
            scope: z.enum(['managed_project', 'member_team']),
            preset_pm_sm: z.boolean(),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export const userPermissions = z
  .object({
    user_id: id,
    keys: z.array(permissionKey).max(10),
    permissions_version: id,
    manager_project_ids: z.array(id).max(10000),
  })
  .strict();
export const matrixResult = z.object({ items: z.array(userPermissions).max(100) }).strict();
export const adminUserItem = z.object({ item: selfSchema.shape.user }).strict();
export type JobTitle = z.infer<typeof jobTitleSchema>;
export type Catalog = z.infer<typeof catalogSchema>['items'];
export async function loadJobTitles(signal?: AbortSignal, includeInactive = false) {
  return apiClient().request(`/api/job-titles?includeInactive=${includeInactive}`, {
    ...(signal ? { signal } : {}),
    parse: (v) => jobTitles.parse(v).items,
  });
}
export async function loadCatalog(signal?: AbortSignal) {
  return apiClient().request('/api/permissions/catalog', {
    ...(signal ? { signal } : {}),
    parse: (v) => catalogSchema.parse(v).items,
  });
}
