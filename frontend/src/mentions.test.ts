import { test, expect } from 'vitest';
import { mentionQuery, mentionToken, splitMentions } from './mentions';
test('T087 mention tokens round-trip and stay text-only', () => {
  const token = mentionToken('สมชาย (PM)', 2);
  expect(token).toBe('@[สมชาย  PM](#user-2)');
  expect(splitMentions(`Hi ${token}, see <b>this</b>`)).toEqual([
    { text: 'Hi ' },
    { mention: { name: 'สมชาย  PM', id: 2 } },
    { text: ', see <b>this</b>' },
  ]);
  expect(splitMentions('@[x](#user-0) plain')).toEqual([{ text: '@[x](#user-0) plain' }]);
});
test('T087 mention query detects @word before the caret only', () => {
  expect(mentionQuery('hello @som', 10)).toEqual({ start: 6, query: 'som' });
  expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  expect(mentionQuery('mail a@b', 8)).toBeNull();
  expect(mentionQuery('done @som ', 10)).toBeNull();
});
