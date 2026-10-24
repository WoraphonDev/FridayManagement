import { expect, test } from 'vitest';
import { createDocIntent, hasDocChanges, clearsPrivateDraft } from './docs-editor';

test('create requires a nonblank title and retains the exact keyed payload after lost ack', () => {
  expect(createDocIntent('   ')).toBeUndefined();
  const intent = createDocIntent(' ข้อกำหนด 📝 ');
  expect(intent?.title).toBe('ข้อกำหนด 📝');
  expect(intent?.key).toMatch(/^[0-9a-f-]{36}$/);
  expect(createDocIntent('changed after timeout', intent)).toBe(intent);
  expect(createDocIntent('', intent)).toBe(intent);
  expect(createDocIntent(' ข้อกำหนด 📝 ')?.key).not.toBe(intent?.key);
});

test('dirty title/body require explicit discard; unchanged document is clean', () => {
  const doc = { title: 'เดิม', body_html: '<p>original</p>' };
  expect(hasDocChanges(doc, doc.title, doc.body_html)).toBe(false);
  expect(hasDocChanges(doc, 'ใหม่', doc.body_html)).toBe(true);
  expect(hasDocChanges(doc, doc.title, '<p>draft</p>')).toBe(true);
});

test('privacy revocation wins; conflict, validation/denied and maintenance retain allowed context', () => {
  for (const status of [401, 403, 404]) expect(clearsPrivateDraft(status)).toBe(true);
  for (const status of [0, 409, 422, 503]) expect(clearsPrivateDraft(status)).toBe(false);
});
