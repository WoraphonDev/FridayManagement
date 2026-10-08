import { z } from 'zod';
const schema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32, "Enter the setup token from the installer console")
      .max(128, "Token is too long"),
    organization_name: z
      .string()
      .min(1, "Enter your organization name")
      .max(100, "Organization name must be at most 100 characters")
      .regex(/\S/, "Enter your organization name"),
    username: z
      .string()
      .min(1, "Enter your username")
      .max(60, "Username must be at most 60 characters")
      .regex(/^[A-Za-z0-9._-]+$/, "Use English letters, numbers, dots, hyphens or underscores"),
    display_name: z
      .string()
      .trim()
      .min(1, "Enter a display name")
      .max(100, "Display name must be at most 100 characters"),
    password: z
      .string()
      .refine(
        (value) => Array.from(value).length >= 6 && Array.from(value).length <= 128,
        "Password must contain 6–128 characters",
      ),
  })
  .strict();
export function validateSetup(value: unknown) {
  return schema.safeParse(value);
}
