import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../../src/api/app.js';
import { pwaWorker } from '../../scripts/pwa-worker.js';

test('T056/T057 native update waits for all clients and preserves an open draft', async ({
  context,
}) => {
  const root = mkdtempSync(join(tmpdir(), 'friday-pwa-update-'));
  cpSync(resolve('dist/frontend'), root, { recursive: true });
  // Public synthetic page: inspect worker lifecycle without storing a real task.
  writeFileSync(
    join(root, 'draft.html'),
    '<!doctype html><html lang="th"><title>Worker update fixture</title><label>Draft<textarea></textarea></label></html>',
  );
  const server = createServer(createApp(root));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('FIXTURE_ADDRESS');
  const origin = `http://127.0.0.1:${address.port}`;
  const firstSource = readFileSync(join(root, 'service-worker.js'), 'utf8');
  const cacheName = (source: string) => source.match(/const CACHE = '([^']+)'/)![1]!;
  const firstCache = cacheName(firstSource);
  const bundle = Object.fromEntries(
    readdirSync(join(root, 'assets')).map((name) => [`assets/${name}`, {}]),
  );
  const secondSource = pwaWorker(bundle, 'synthetic-public-update');
  const secondCache = cacheName(secondSource);
  const page = await context.newPage();
  try {
    await page.goto(origin + '/draft.html');
    expect((await page.request.get(origin + '/offline.html')).headers()['cache-control']).toBe(
      'no-store',
    );
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await page.getByLabel('Draft').fill('ร่างที่ยังไม่ได้บันทึก');
    await page.evaluate(() => {
      (window as unknown as { draftMarker: string }).draftMarker = 'same-document';
    });
    writeFileSync(join(root, 'service-worker.js'), secondSource);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state,
        ),
      )
      .toBe('installed');
    await expect(page.getByLabel('Draft')).toHaveValue('ร่างที่ยังไม่ได้บันทึก');
    expect(
      await page.evaluate(() => (window as unknown as { draftMarker: string }).draftMarker),
    ).toBe('same-document');
    expect(await page.evaluate(() => caches.keys())).toEqual(
      expect.arrayContaining([firstCache, secondCache]),
    );
    // A waiting version must keep the previous cache until its last client closes.
    await page.close();
    const reopened = await context.newPage();
    try {
      await reopened.goto(origin + '/draft.html');
      await expect
        .poll(() =>
          reopened.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration();
            return registration?.active?.state === 'activated' && !registration.waiting;
          }),
        )
        .toBe(true);
      await expect.poll(() => reopened.evaluate(() => caches.keys())).toEqual([secondCache]);
    } finally {
      await reopened.close();
    }
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  }
});
