import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const port = Number(process.env.FRIDAY_TEST_PORT ?? 43171);
const fixture =
  process.env.FRIDAY_BROWSER_FIXTURE ?? mkdtempSync(join(tmpdir(), 'friday-browser-'));
process.env.FRIDAY_BROWSER_FIXTURE = fixture;
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // Default Chromium; FRIDAY_BROWSER_NAME=firefox|webkit runs the same suite for the T-058 matrix.
    browserName: (process.env.FRIDAY_BROWSER_NAME as 'chromium' | 'firefox' | 'webkit') ?? 'chromium',
    ...(process.env.FRIDAY_BROWSER_CHANNEL === 'chrome' ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'node dist/server/api/main.js',
    env: {
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: join(fixture, 'data'),
      LOG_DIR: join(fixture, 'logs'),
      SQLITE_DB_PATH: join(fixture, 'data', 'local.sqlite'),
    },
    url: `http://127.0.0.1:${port}/health/live`,
    reuseExistingServer: false,
    timeout: 15000,
  },
  globalTeardown: './tests/browser/teardown.ts',
});
