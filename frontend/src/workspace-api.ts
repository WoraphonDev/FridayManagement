import { z } from 'zod';
import { projectTypes, projectCategories } from '../../src/domain/project-metadata';
const id = z.number().int().min(1).max(2147483647),
  timestamp = z.string().datetime(),
  person = z.object({ id, display_name: z.string().min(1).max(100), active: z.boolean() }).strict();
export const teamSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    description: z.string().max(1000),
    archived_at: timestamp.nullable(),
    version: id,
    own_role: z.enum(['lead', 'member']).nullable(),
    members: z
      .array(
        z
          .object({
            user: person,
            team_role: z.enum(['lead', 'member']),
            team_position: z.enum(['pm', 'lead', 'dev']),
            joined_at: timestamp,
          })
          .strict(),
      )
      .max(10000)
      .optional(),
  })
  .strict();
export const projectSchema = z
  .object({
    id,
    owner_team_id: id,
    owner_team_name: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    description: z.string().max(2000),
    project_type: z.enum(projectTypes),
    project_category: z.enum(projectCategories),
    code: z.string().min(1).max(16).nullable(),
    archived_at: timestamp.nullable(),
    version: id,
    created_by: id,
    created_at: timestamp,
    updated_at: timestamp,
    effective_access: z.enum(['admin', 'lead', 'manager', 'editor', 'viewer']),
  })
  .strict();
const pageFields = {
  page: id,
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0).max(2147483647),
};
export const teamPage = z.object({ ...pageFields, items: z.array(teamSchema).max(100) }).strict();
export const projectPage = z
  .object({ ...pageFields, items: z.array(projectSchema).max(100) })
  .strict();
export const directoryPage = z
  .object({
    ...pageFields,
    items: z
      .array(
        z
          .object({
            id,
            display_name: z.string().min(1).max(100),
            job_title: z.string().min(1).max(50).nullable(),
            teams: z.array(z.object({ id, name: z.string().min(1).max(100) }).strict()).max(10000),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export const projectMembers = z
  .object({
    membership_version: id,
    items: z
      .array(
        z
          .object({
            user: person,
            job_title: z.string().min(1).max(50).nullable(),
            explicit_access: z.enum(['manager', 'editor', 'viewer']).nullable(),
            effective_access: z.enum(['admin', 'lead', 'manager', 'editor', 'viewer']),
            assignee_eligible: z.boolean(),
          })
          .strict(),
      )
      .max(10000),
  })
  .strict();
export type Team = z.infer<typeof teamSchema>;
export type Project = z.infer<typeof projectSchema>;
