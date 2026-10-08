import { z } from 'zod';
export const organizationReply = z
  .object({
    item: z
      .object({
        id: z.literal(1),
        name: z.string().min(1).max(100),
        timezone: z.literal('Asia/Bangkok'),
        version: z.number().int().min(1).max(2147483647),
      })
      .strict(),
  })
  .strict();
