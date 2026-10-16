import { z } from 'zod';
export const registrationSchema = z
  .object({
    id: z.number().int().positive(),
    user_id: z.number().int().positive(),
    email: z.email().max(254),
    display_name: z.string().min(1).max(100),
    status: z.enum(['pending', 'approved', 'rejected']),
    version: z.number().int().positive(),
    created_at: z.iso.datetime(),
    reviewed_at: z.iso.datetime().nullable(),
  })
  .strict();
export const registrationsPage = z
  .object({
    items: z.array(registrationSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .strict();
export const registrationAccepted = z
  .object({
    message: z.literal('Registration received. Contact your Admin for approval before signing in.'),
  })
  .strict();
export type Registration = z.infer<typeof registrationSchema>;
