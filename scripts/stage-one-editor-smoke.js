import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5184',
  output = resolve(process.env.SMOKE_OUTPUT || 'work/stage-one-editor');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
page.on('dialog', (d) => d.accept());
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
const id = 'stage-one-smoke-' + Date.now(),
  url = base + '/__veylith_editor/levels/' + id;
const { token } = await (
  await page.request.get(base + '/__veylith_editor/session')
).json();
const headers = { 'X-Veylith-Editor': token };
let etag;
const button = (name) => page.getByRole('button', { name, exact: true }),
  field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).blur();
};
try {
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await button('Nuevo').click();
  await page.getByText('Pack · Funcionales', { exact: true }).click();
  await button('Puerta temporizada').click();
  await set('Posición X', 600);
  await set('Posición Y', 207);
  await set('Tiempo abierta (ms)', 4000);
  await set('Aviso antes del cierre (ms)', 500);
  await page.getByLabel('Reactivación', { exact: true }).selectOption('ignore');
  await button('Plataforma evanescente').click();
  await set('Posición X', 1000);
  await set('Posición Y', 350);
  await page.getByLabel('Modo de desaparición').selectOption('contact');
  await set('Tiempo sólida (ms)', 600);
  await set('Tiempo oculta (ms)', 2000);
  await button('Plataforma de rebote').click();
  await set('Posición X', 1400);
  await set('Posición Y', 526);
  await set('Velocidad de rebote', 1050);
  await set('Espera entre rebotes (ms)', 350);
  await button('Bloque flotante').click();
  await set('Posición X', 1200);
  await set('Posición Y', 455);
  await set('Fracción sumergida (0–0.9)', 0.4);
  await set('Velocidad vertical en agua', 130);
  await set('Corriente horizontal', -40);
  await button('Barrera mágica').click();
  await set('Posición X', 1750);
  await set('Posición Y', 224);
  await page.getByLabel('Activo sin conexiones', { exact: true }).uncheck();
  await button('Interruptor de fuego').click();
  await set('Posición X', 160);
  await set('Posición Y', 522);
  await page.getByLabel('Acción del interruptor').selectOption('activate');
  await page.getByLabel('Disparador', { exact: true }).selectOption('fire');
  await set('Espera del interruptor (ms)', 400);
  await page.getByLabel('timed-door', { exact: true }).check();
  await page.getByLabel('energy-barrier', { exact: true }).check();
  await set('Ancho efecto', 220);
  checks.push(
    'All six functional palette entries expose their gameplay parameters and ID links.',
  );
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  let saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  const w = saved.document.objects.filter((o) => o.type === 'world');
  assert.equal(w.length, 6);
  assert.equal(w[0].behavior.openMs, 4000);
  assert.equal(w[0].behavior.retrigger, 'ignore');
  assert.equal(w[1].behavior.mode, 'contact');
  assert.equal(w[1].behavior.hiddenMs, 2000);
  assert.equal(w[2].behavior.speed, 1050);
  assert.equal(w[3].behavior.currentSpeed, -40);
  assert.equal(w[3].behavior.draft, 0.4);
  assert.equal(w[4].behavior.autostart, false);
  assert.deepEqual(w[5].behavior.targets, ['timed-door', 'energy-barrier']);
  assert.equal(w[5].behavior.trigger, 'fire');
  assert.equal(w[5].effect.width, 220);
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  assert.deepEqual(
    (await (await page.request.get(url, { headers })).json()).document,
    saved.document,
  );
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await button('Encuadrar').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(output, 'editor.png') });
  checks.push(
    'Explicit save and reopen preserve every parameter and connection in JSON v1.',
  );
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 60000 });
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  await button('Pausar').click();
  await button('Continuar').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(300);
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
    'Playtest mounts, pauses, resumes, resizes, restarts and unmounts without modifying the draft or campaign save.',
  );
  assert.deepEqual(errors, []);
  const report = { passed: true, checks, errors };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e);
  await page.screenshot({ path: resolve(output, 'failure.png') });
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
