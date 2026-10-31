// Real editor/game regression. Only a temporary custom level is written, then removed.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5178';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/coins-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
});
page.on('dialog', (d) => d.accept());
const id = `coins-smoke-${Date.now()}`;
const { token } = await (
  await page.request.get(`${base}/__veylith_editor/session`)
).json();
const headers = { 'X-Veylith-Editor': token };
const path = `${base}/__veylith_editor/levels/${id}`;
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).blur();
};
const count = (value) =>
  page
    .getByLabel('Monedas recogidas', { exact: true })
    .filter({ hasText: `Monedas: ${value} / 10` })
    .waitFor({ timeout: 20000 });
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await button('Nuevo').click();
  await button('Moneda').dragTo(page.locator('.editor-canvas'), {
    targetPosition: { x: 280, y: 350 },
  });
  await field('Valor de la moneda').waitFor();
  assert.equal(await field('Valor de la moneda').inputValue(), '1');
  await set('Posición X', 400);
  await set('Posición Y', 550);
  await set('Valor de la moneda', 7);
  await button('Duplicar objeto').click();
  await set('Posición X', 800);
  await set('Posición Y', 550);
  await set('Valor de la moneda', 3);
  await button('Deshacer').click();
  assert.equal(await field('Valor de la moneda').inputValue(), '7');
  await button('Rehacer').click();
  assert.equal(await field('Valor de la moneda').inputValue(), '3');
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'coins-editor.png') });
  checks.push(
    'Visible library coin supports drag/drop, configurable values, duplicate and undo/redo',
  );
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  const stored = await (await page.request.get(path, { headers })).json();
  assert.deepEqual(
    stored.document.objects
      .filter((o) => o.type === 'coin')
      .map((o) => o.value),
    [7, 3],
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  checks.push(
    'Explicit JSON save and reopen preserve both coins and their values',
  );
  const progressBefore = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 60000 });
  await count(0);
  await page.keyboard.down('d');
  await count(7);
  await page.keyboard.up('d');
  await button('Pausar').click();
  await button('Continuar').click();
  await page.keyboard.down('a');
  await page.waitForTimeout(700);
  await page.keyboard.up('a');
  await count(7);
  await page.screenshot({ path: resolve(output, 'coin-collected.png') });
  await button('Reiniciar prueba').click();
  await count(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.keyboard.down('d');
  await page.getByText(/^Completado ·/).waitFor({ timeout: 20000 });
  await page.keyboard.up('d');
  await count(10);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    progressBefore,
  );
  await button('■ Detener y volver al editor').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Se conserva el borrador' })
    .waitFor();
  assert.equal(await page.locator('canvas').count(), 1);
  checks.push(
    'Real contact consumes once, updates counter, resets on retry and allows victory; pause/resize/unmount preserve isolation',
  );

  // Automatic fall retry also restores pickups, including a coin overlapped at spawn.
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  await page.evaluate(async () => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const d = newLevel('coin-fall');
    const c = createObject(
      LIBRARY.find((o) => o.id === 'coin'),
      170,
      540,
      d.objects,
    );
    d.objects.push(c);
    const floor = d.objects.find((o) => o.type === 'terrain');
    floor.width = 512;
    floor.collider.width = 480;
    await window.smoke.start('forest-1', d);
  });
  await page.waitForFunction(
    () => window.smoke.read().snapshot.coinValue === 1,
  );
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(() => window.smoke.read().attempts === 2);
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  await page.waitForFunction(
    () => window.smoke.read().snapshot.coinValue === 1,
  );
  assert.equal((await page.evaluate(() => window.smoke.read())).coins, 0);
  checks.push('Falling restores coin pickups and never awards currency');
  assert.deepEqual(errors, []);
  const report = { passed: true, checks, errors };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\n${JSON.stringify(errors)}`,
  );
  throw error;
} finally {
  const existing = await page.request.get(path, { headers });
  if (existing.ok()) {
    const current = await existing.json();
    const deleted = await page.request.delete(path, {
      headers: { ...headers, 'If-Match': current.etag },
    });
    assert.ok(deleted.ok(), 'Remove only this temporary smoke-test level');
  }
  await browser.close();
}
