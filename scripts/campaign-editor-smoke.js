import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5182';
const output = resolve(
  process.env.SMOKE_OUTPUT || 'work/campaign-editor-smoke',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const button = (name) => page.getByRole('button', { name, exact: true });
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  const listing = await page.evaluate(async () => {
    const { levelApi } = await import('/src/editor/api.ts');
    return levelApi.list();
  });
  for (let n = 1; n <= 10; n++) {
    const entry = listing.find((l) => l.id === `forest-${n}`);
    assert(entry && !entry.error && entry.protected, JSON.stringify(entry));
  }
  assert(listing.some((l) => l.id === 'forest-1-saved-draft' && !l.error));
  checks.push(
    'All ten canonical campaign files open through the validated editor API and are protected; original draft remains editable',
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption('forest-9');
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Abierto: forest-9' })
    .waitFor();
  await button('Encuadrar').click();
  await button('lift world').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Desplazamiento Y', exact: true })
      .inputValue(),
    '-320',
  );
  assert(await page.getByLabel('engine-lever', { exact: true }).isChecked());
  assert(await button('Eliminar nivel').isDisabled());
  await page.screenshot({ path: resolve(output, 'earth-editor.png') });
  const before = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await button('Move right').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.screenshot({
    path: resolve(output, 'earth-editor-playtest.png'),
  });
  await button('■ Detener y volver al editor').click();
  await button('▶ Probar').waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    before,
  );
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Desplazamiento Y', exact: true })
      .inputValue(),
    '-320',
  );
  checks.push(
    'Canonical Earth lever/elevator opens visually with its connections, runs in editor playtest, preserves draft and leaves campaign storage unchanged',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${e.stack}\n${JSON.stringify(errors)}`,
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
