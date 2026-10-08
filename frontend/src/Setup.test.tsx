import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect } from 'vitest';
import { Setup } from './Setup';
import { validateSetup } from './setup-policy';
import { metaSchema, setupReplySchema } from './api';
test('setup validation matches scalar password limits/allowlist, trims display/token and preserves password', () => {
  const value = {
    token: 'a'.repeat(64),
    organization_name: 'องค์กรทดสอบ',
    username: 'Admin_1',
    display_name: ' Admin ',
    password: '  password-fixture  ',
  };
  const valid = validateSetup(value);
  expect(valid.success).toBe(true);
  if (valid.success) {
    expect(valid.data.password).toBe(value.password);
    expect(valid.data.display_name).toBe('Admin');
  }
  expect(validateSetup({ ...value, password: '😀'.repeat(5) }).success).toBe(false);
  expect(validateSetup({ ...value, password: '😀'.repeat(6) }).success).toBe(true);
  expect(validateSetup({ ...value, password: '😀'.repeat(128) }).success).toBe(true);
  expect(validateSetup({ ...value, password: '😀'.repeat(129) }).success).toBe(false);
  expect(validateSetup({ ...value, org_role: 'admin' }).success).toBe(false);
});
test('setup form has labelled fields/masked credentials, disabled offline submit and no default secrets', () => {
  const html = renderToStaticMarkup(<Setup online={false} onDone={() => {}} />);
  expect(html.match(/<input/g)?.length).toBe(5);
  expect(html.match(/type="password"/g)?.length).toBe(2);
  expect(html).toContain('aria-label="First-time setup"');
  expect(html).toContain('disabled');
  expect(html).not.toContain('password123');
});
test('public meta and successful setup DTO reject secrets/additional fields', () => {
  expect(() =>
    metaSchema.parse({ setupRequired: true, version: '0.1.0', token: 'secret' }),
  ).toThrow();
  expect(() => setupReplySchema.parse({ item: { password: 'secret' } })).toThrow();
});
