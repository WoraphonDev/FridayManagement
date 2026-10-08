import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, basename } from 'node:path';
import assert from 'node:assert/strict';
export default async function teardown() {
  const fixture = process.env.FRIDAY_BROWSER_FIXTURE;
  assert(
    fixture &&
      dirname(fixture) === tmpdir() &&
      /^friday-browser-[A-Za-z0-9]+$/.test(basename(fixture)),
  );
  rmSync(fixture, { recursive: true, force: true });
}
