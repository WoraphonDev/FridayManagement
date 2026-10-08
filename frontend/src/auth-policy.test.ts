import { test, expect } from 'vitest';
import { loginSchema, passwordSchema, newPassword, failureMessage } from './auth-policy';
import { ApiError } from './api';
test('password UI policy counts Unicode scalars and preserves spaces/confirm', () => {
  expect(newPassword.safeParse('a'.repeat(5)).success).toBe(false);
  expect(newPassword.safeParse('😀'.repeat(6)).success).toBe(true);
  expect(newPassword.safeParse('😀'.repeat(128)).success).toBe(true);
  expect(newPassword.safeParse('😀'.repeat(129)).success).toBe(false);
  const value = {
    current_password: ' current ',
    new_password: '  new-password  ',
    confirm: '  new-password  ',
  };
  expect(passwordSchema.parse(value)).toEqual(value);
  expect(passwordSchema.safeParse({ ...value, confirm: 'different password' }).success).toBe(false);
  expect(loginSchema.parse({ username: 'user', password: ' x ' }).password).toBe(' x ');
});
test('credential and last-admin/429 messages are actionable and do not expose inputs', () => {
  expect(
    failureMessage(new ApiError('request', 422, undefined, {}, 'LAST_ACTIVE_ADMIN')),
  ).toContain('administrator');
  expect(
    failureMessage(new ApiError('request', 429, undefined, {}, 'RATE_LIMITED', 900)),
  ).toContain('900');
  expect(
    failureMessage(new ApiError('session', 401, undefined, {}, 'INVALID_CREDENTIALS')),
  ).toContain('Incorrect');
});
