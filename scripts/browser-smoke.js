// Optional real-browser integration. Requires Playwright and a running Vite server.
// PLAYWRIGHT_MODULE can point to an already-installed package; no project dependency is added.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5178';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/browser-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// Editing an unrelated file must not reload and erase an active physics replay.
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const results = [];
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'Level select', exact: true }).click();
  for (const title of [
    'The First Awakening',
    'The Sunken Quarry',
    'The High Path',
    'The Weight of Choice',
    'The Stone Sanctuary',
  ]) {
    assert.equal(
      await page.getByRole('button', { name: new RegExp(title) }).isEnabled(),
      true,
    );
  }
  await page.screenshot({ path: resolve(output, 'level-selection.png') });
  await page
    .getByRole('button', { name: '1. The First Awakening', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 30000 });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.setViewportSize({ width: 932, height: 430 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Level select', exact: true }).click();
  await page
    .getByRole('button', { name: '2. The Sunken Quarry', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 30000 });
  assert.equal(await page.locator('canvas').count(), 1);
  await page
    .getByRole('button', { name: 'Restart level', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  results.push({
    check:
      'React selection, mount, resize, pause, unmount, remount and restart',
    passed: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\nBrowser errors: ${JSON.stringify(errors)}`,
  );
  throw error;
} finally {
  await browser.close();
}
