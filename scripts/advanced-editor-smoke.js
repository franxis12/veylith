import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5186',
  output = resolve(process.env.SMOKE_OUTPUT || 'work/advanced-editor');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } }),
  errors = [],
  checks = [];
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => errors.push(e.message));
const id = 'advanced-smoke-' + Date.now(),
  url = base + '/__veylith_editor/levels/' + id;
const { token } = await (
    await page.request.get(base + '/__veylith_editor/session')
  ).json(),
  headers = { 'X-Veylith-Editor': token };
let etag;
const button = (name) => page.getByRole('button', { name, exact: true });
const set = async (name, value) => {
  const f = page.getByRole('spinbutton', { name, exact: true });
  await f.fill(String(value));
  await f.blur();
};
try {
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await button('Nuevo').click();
  await page.getByText('Pack · Funcionales', { exact: true }).click();
  await button('Espejo móvil').click();
  await set('Posición X', 400);
  await set('Posición Y', 410);
  await page
    .getByLabel('Orientación del espejo', { exact: true })
    .selectOption('ne');
  await page.getByLabel('Empujable por Tierra', { exact: true }).uncheck();
  await button('Origen de haz').click();
  await set('Posición X', 1300);
  await page
    .getByLabel('Dirección del haz', { exact: true })
    .selectOption('left');
  await set('Alcance total del haz', 1800);
  await set('Máximo de reflexiones', 7);
  await button('Receptor de luz').click();
  await set('Posición X', 500);
  await set('Posición Y', 150);
  await page
    .getByLabel('Mantener señal hasta reiniciar', { exact: true })
    .check();
  await set('Ancho efecto', 60);
  await button('Contrapeso de polea').click();
  await set('Posición X', 1100);
  await set('Masa del contrapeso', 2);
  await button('Plataforma de polea').click();
  await set('Posición X', 700);
  await set('Posición Y', 250);
  await page
    .getByLabel('Contrapeso enlazado', { exact: true })
    .selectOption('pulley-counterweight');
  await page
    .getByLabel('Control de polea', { exact: true })
    .selectOption('signal');
  await set('Recorrido vertical de polea', 180);
  await set('Velocidad de polea', 80);
  await page.getByLabel('light-receiver', { exact: true }).check();
  await button('Cinta transportadora').click();
  await set('Posición X', 300);
  await set('Posición Y', 500);
  await set('Segmentos centrales', 5);
  await set('Velocidad de cinta', 160);
  await page
    .getByLabel('Dirección permitida', { exact: true })
    .selectOption('-1');
  await button('Compuerta direccional').click();
  await set('Posición X', 1400);
  await set('Posición Y', 173);
  await page
    .getByLabel('Dirección permitida', { exact: true })
    .selectOption('-1');
  await page.getByLabel('light-receiver', { exact: true }).check();
  checks.push(
    'All seven palette parts expose the four families, physical parameters, orientations, segments and receiver/counterweight ID links.',
  );
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  const saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  const w = saved.document.objects.filter((o) => o.type === 'world');
  assert.equal(w.length, 7);
  assert.equal(w[0].behavior.orientation, 'ne');
  assert.equal(w[0].behavior.pushable, false);
  assert.equal(w[1].behavior.maxBounces, 7);
  assert.equal(w[2].behavior.latch, true);
  assert.equal(w[2].effect.width, 60);
  assert.equal(w[3].behavior.mass, 2);
  assert.equal(w[4].behavior.counterweightId, 'pulley-counterweight');
  assert.deepEqual(w[4].behavior.requires, ['light-receiver']);
  assert.equal(w[5].behavior.segments, 5);
  assert.equal(w[5].width, 896);
  assert.equal(w[5].collider.width, 872);
  assert.equal(w[5].behavior.direction, -1);
  assert.equal(w[6].behavior.direction, -1);
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  await page.waitForLoadState('networkidle');
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  checks.push(
    'Explicit JSON v1 save and reopen preserve all values and the extended conveyor collider.',
  );
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 60000 });
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  await button('Pausar').click();
  await button('Continuar').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(350);
  await button('■ Detener y volver al editor').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Se conserva el borrador' })
    .waitFor();
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
    'Real playtest mounts, pauses, resumes, resizes, restarts and unmounts with one canvas; editor data and campaign ledger stay intact.',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  console.error(error);
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify({ error: String(error), checks, errors }, null, 2),
  );
  process.exitCode = 1;
} finally {
  if (etag)
    await page.request.delete(url, {
      headers: { ...headers, 'If-Match': etag },
    });
  await browser.close();
}
