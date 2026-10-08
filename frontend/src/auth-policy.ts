import { z } from 'zod';
export const currentPassword = z
  .string()
  .refine(
    (v) => Array.from(v).length >= 1 && Array.from(v).length <= 128,
    "Enter your current password (1–128 characters)",
  );
export const newPassword = z
  .string()
  .refine(
    (v) => Array.from(v).length >= 6 && Array.from(v).length <= 128,
    "Password must contain 6–128 characters",
  );
export const username = z
  .string()
  .min(1, "Enter your username")
  .max(60)
  .regex(/^[A-Za-z0-9._-]+$/, "Use English letters, numbers, dots, hyphens or underscores");
export const displayName = z
  .string()
  .trim()
  .min(1, "Enter a display name")
  .max(100, "Display name must be at most 100 characters");
export const loginSchema = z.object({ username, password: currentPassword }).strict();
export const passwordSchema = z
  .object({ current_password: currentPassword, new_password: newPassword, confirm: newPassword })
  .strict()
  .refine((v) => v.new_password === v.confirm, {
    path: ['confirm'],
    message: "New passwords do not match",
  });
export function failureMessage(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    if (error.code === 'INVALID_CREDENTIALS') return "Incorrect username or password";
    if (error.code === 'LAST_ACTIVE_ADMIN') return "At least one active administrator is required";
    if (error.code === 'PASSWORD_CHANGE_REQUIRED') return "Change your password to continue";
    if (error.code === 'RATE_LIMITED')
      return `Too many requests. Please wait ${'retryAfter' in error ? error.retryAfter : 5} seconds`;
  }
  return error instanceof Error ? error.message : "Unable to complete the action";
}
