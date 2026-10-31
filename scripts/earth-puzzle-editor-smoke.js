import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/earth-editor');
await mkdir(output, { recursive: true });
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }),
  errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const button = (name) => page.getByRole('button', { name, exact: true });
const id = 'earth-review-' + Date.now();
let etag;
const { token } = await (
  await page.request.get(base + '/__veylith_editor/session')
).json();
const headers = { 'X-Veylith-Editor': token };
const url = base + '/__veylith_editor/levels/' + id;
try {
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  for (let n = 1; n <= 10; n++) {
    const result = await (
      await page.request.get(base + '/__veylith_editor/levels/forest-' + n, {
        headers,
      })
    ).json();
    assert.deepEqual(
      result.document,
      JSON.parse(
        await readFile(
          root + '/src/game/levels/data/forest-' + n + '.json',
          'utf8',
        ),
      ),
    );
    await button('Abrir').click();
    await page
      .getByRole('dialog')
      .getByRole('combobox')
      .selectOption('forest-' + n);
    await button('Abrir seleccionado').click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Abierto: forest-' + n })
      .waitFor();
    await button('Propiedades del nivel').click();
    assert.equal(
      await page.getByLabel('Pista 1', { exact: true }).inputValue(),
      result.document.puzzle.hints[0],
    );
  }
  checks.push(
    'Ten canonical documents opened in the real editor; clues match persisted JSON.',
  );
  await page
    .getByLabel('Pista 1', { exact: true })
    .fill('Pista de prueba guardada en una copia.');
  await page.getByLabel('Pista 1', { exact: true }).blur();
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  const saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  assert.equal(
    saved.document.puzzle.hints[0],
    'Pista de prueba guardada en una copia.',
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  await button('Propiedades del nivel').click();
  assert.equal(
    await page.getByLabel('Pista 1', { exact: true }).inputValue(),
    'Pista de prueba guardada en una copia.',
  );
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await button('Move right').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.puzzle-hint-panel').count(), 0);
  await button('Optional hint').click();
  assert.equal(await page.locator('.puzzle-hint-panel li').count(), 1);
  await button('Next hint (2/3)').click();
  assert.equal(await page.locator('.puzzle-hint-panel li').count(), 2);
  await button('Pausar').click();
  await button('Continuar').click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(500);
  await button('■ Detener y volver al editor').click();
  await button('▶ Probar').waitFor();
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    ledger,
  );
  assert.deepEqual(
    (await (await page.request.get(url, { headers })).json()).document,
    saved.document,
  );
  checks.push(
    'Hints edit/save/reopen, progressive reveal, pause/resume/restart/resize and playtest isolation passed.',
  );
  // Public application: actual controls, optional hints, mobile landscape layout.
  await page.goto(base);
  await button('Play').click();
  await button('Optional hint').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.puzzle-hint-panel').count(), 0);
  await button('Optional hint').click();
  await button('Next hint (2/3)').click();
  await button('Next hint (3/3)').click();
  assert.equal(await page.locator('.puzzle-hint-panel li').count(), 3);
  await page.screenshot({
    path: resolve(output, 'campaign-hints-desktop.png'),
  });
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, 'campaign-hints-mobile.png') });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  assert.equal(overflow, false);
  await button('Hide hints').click();
  await button('Restart level').click();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  checks.push(
    'Public HUD and quick restart work at desktop and mobile landscape sizes; no horizontal overflow.',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(checks);
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify({ error: String(e), checks, errors }, null, 2),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  if (etag) {
    const removed = await page.request.delete(url, {
      headers: { ...headers, 'If-Match': etag },
    });
    assert(removed.ok());
  }
  await browser.close();
}
