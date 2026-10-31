import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5180',
  output = resolve(process.env.SMOKE_OUTPUT || 'work/world-editor-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.routeWebSocket('**/*', (s) => {
  const server = s.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) s.send(m);
  });
});
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const id = `world-editor-smoke-${Date.now()}`;
const { token } = await (
  await page.request.get(`${base}/__veylith_editor/session`)
).json();
const headers = { 'X-Veylith-Editor': token };
const url = `${base}/__veylith_editor/levels/${id}`;
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).blur();
};
let etag;
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await button('Nuevo').click();
  await page.getByText('Pack · Funcionales', { exact: true }).click();
  await button('Palanca').dragTo(page.locator('.editor-canvas'), {
    targetPosition: { x: 200, y: 370 },
  });
  await set('Posición X', 220);
  await set('Posición Y', 520);
  await button('Ascensor mecánico').click();
  await set('Posición X', 900);
  await set('Posición Y', 535);
  await set('Desplazamiento X', 96);
  await set('Desplazamiento Y', -250);
  await set('Velocidad del ascensor', 80);
  await page.getByLabel('interactive-lever', { exact: true }).check();
  await button('Ventilador horizontal').click();
  await set('Posición X', 1200);
  await set('Posición Y', 400);
  await set('Ancho efecto', 500);
  await set('Offset efecto X', 260);
  await set('Ancho collider', 170);
  await page.getByLabel('Dirección del viento').selectOption('-1');
  const width = await field('Ancho visual').inputValue();
  await set('Ancho visual', 300);
  assert.equal(await field('Ancho efecto').inputValue(), '500');
  assert.equal(await field('Ancho collider').inputValue(), '170');
  assert.notEqual(width, '300');
  await page.getByLabel('Editar efecto', { exact: true }).check();
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'editor-effect.png') });
  await button('Deshacer').click();
  assert.equal(await field('Ancho visual').inputValue(), width);
  await button('Rehacer').click();
  await page.getByText('Pack · Visuales', { exact: true }).click();
  await button('Engranaje').click();
  await set('Posición X', 1050);
  await set('Posición Y', 400);
  await page.getByLabel('Estado visual').selectOption('gear_rotating');
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  let saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  const worlds = saved.document.objects.filter((o) => o.type === 'world');
  assert.equal(worlds.length, 4);
  assert.deepEqual(worlds[1].behavior.requires, ['interactive-lever']);
  assert.equal(worlds[2].effect.width, 500);
  assert.equal(worlds[2].collider.width, 170);
  assert.equal(worlds[3].state, 'gear_rotating');
  checks.push(
    'Library thumbnails, drag/drop, properties, independent collider/effect, undo/redo and animated prop selection',
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  checks.push(
    'Explicit JSON save and reopen preserve settings, state, rectangles and ID links',
  );
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 60000 });
  await page.keyboard.press('e');
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(output, 'editor-playtest.png') });
  await button('Pausar').click();
  await button('Continuar').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(500);
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
  checks.push(
    'Playtest mounts, pauses, resizes, restarts and returns to the saved editor without changing campaign progress',
  );
  assert.deepEqual(errors, []);
  const report = { passed: true, checks, errors };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  console.error(e);
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify({ error: String(e), checks, errors }, null, 2),
  );
  process.exitCode = 1;
} finally {
  if (etag)
    await page.request.delete(url, {
      headers: { ...headers, 'If-Match': etag },
    });
  await browser.close();
}
