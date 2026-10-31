import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/lever-return-editor');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const id = 'lever-return-check-' + Date.now(),
  url = base + '/__veylith_editor/levels/' + id;
let headers;
const button = (name) => page.getByRole('button', { name, exact: true });
const select = (id) =>
  page
    .locator('.object-tree button')
    .filter({ hasText: new RegExp('^' + id + '\\s') })
    .click();
const open = async (name) => {
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(name);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Abierto: ' + name })
    .waitFor();
};
try {
  const { token } = await (
    await page.request.get(base + '/__veylith_editor/session')
  ).json();
  headers = { 'X-Veylith-Editor': token };
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await open('lab-lever-return');
  await select('lift');
  await page.getByLabel('Recorrido', { exact: true }).selectOption('once');
  await page
    .getByLabel('Recorrido', { exact: true })
    .selectOption('controlled');
  await select('go');
  await page.getByLabel('Acción de la palanca').selectOption('toggle');
  await page
    .getByRole('group', { name: 'Destinos de órdenes por ID', exact: true })
    .getByLabel('lift', { exact: true })
    .uncheck();
  await page
    .getByRole('group', { name: 'Destinos de órdenes por ID', exact: true })
    .getByLabel('lift', { exact: true })
    .check();
  await select('back');
  await page.getByLabel('Acción de la palanca').selectOption('activate');
  await page.getByLabel('Acción de la palanca').selectOption('deactivate');
  await button('Deshacer').click();
  assert.equal(
    await page.getByLabel('Acción de la palanca').inputValue(),
    'activate',
  );
  await button('Rehacer').click();
  assert.equal(
    await page.getByLabel('Acción de la palanca').inputValue(),
    'deactivate',
  );
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado: ' + id + '.json' })
    .waitFor();
  const saved = await (await page.request.get(url, { headers })).json();
  assert.equal(saved.document.version, 1);
  for (const [objectId, expected] of [
    ['lift', { mode: 'controlled' }],
    ['go', { action: 'toggle', targets: ['lift'] }],
    ['back', { action: 'deactivate', targets: ['lift'] }],
  ]) {
    const b = saved.document.objects.find((o) => o.id === objectId).behavior;
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(b[key], value);
  }
  await open(id);
  await select('lift');
  assert.equal(
    await page.getByLabel('Recorrido', { exact: true }).inputValue(),
    'controlled',
  );
  await select('back');
  assert.equal(
    await page.getByLabel('Acción de la palanca').inputValue(),
    'deactivate',
  );
  assert.equal(
    await page
      .getByRole('group', { name: 'Destinos de órdenes por ID', exact: true })
      .getByLabel('lift', { exact: true })
      .isChecked(),
    true,
  );
  await page.screenshot({ path: out + '/return-lever-inspector.png' });
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .locator('.gameplay-controls,.gesture-controls')
    .waitFor({ timeout: 60000 });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '/ride-up.png' });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2500);
  await button('Pausar').click();
  await button('Continuar').click();
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.editor-playtest canvas').count(), 1);
  await page.screenshot({ path: out + '/return-playtest.png' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await button('■ Detener y volver al editor').click();
  assert.equal(await page.locator('.editor-playtest canvas').count(), 0);
  assert.equal(
    await page.getByLabel('Acción de la palanca').inputValue(),
    'deactivate',
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    ledger,
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    checks: [
      'Configure lift mode and both lever actions/targets',
      'Undo and redo',
      'Explicit save and reopen JSON v1',
      'Real playtest, pause, resume, restart, resize and unmount',
      'Draft and campaign progress unchanged after playtest',
    ],
    errors,
  };
  await writeFile(out + '/results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  throw error;
} finally {
  if (headers) {
    const response = await page.request.get(url, { headers });
    if (response.ok()) {
      const { etag } = await response.json();
      assert.equal(
        (
          await page.request.delete(url, {
            headers: { ...headers, 'If-Match': etag },
          })
        ).ok(),
        true,
      );
    }
  }
  await browser.close();
}
