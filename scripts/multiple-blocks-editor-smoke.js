import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/multiple-blocks-editor');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const id = 'multiple-blocks-check-' + Date.now(),
  url = base + '/__veylith_editor/levels/' + id;
let headers, etag;
const button = (name) => page.getByRole('button', { name, exact: true });
const open = async (name) => {
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(name);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Abierto: ' + name })
    .waitFor();
};
const select = (id) =>
  page
    .locator('.object-tree button')
    .filter({ hasText: new RegExp('^' + id + '\\s') })
    .click();
const set = async (name, value) => {
  const f = page.getByRole('spinbutton', { name, exact: true });
  await f.fill(String(value));
  await f.blur();
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
  await open('lab-multiple-blocks');
  await select('step-block');
  await button('Duplicar objeto').click();
  await set('Posición X', 1850);
  await set('Posición Y', 530);
  assert.equal(
    await page.getByLabel('Placa de destino', { exact: true }).inputValue(),
    '',
  );
  await button('Deshacer').click();
  await button('Rehacer').click();
  await page
    .getByRole('button', { name: 'Bloque pesado', exact: true })
    .click();
  await set('Posición X', 600);
  await set('Posición Y', 400);
  await set('Ancho visual', 96);
  await set('Alto visual', 96);
  await button('Ajustar collider al tamaño visual').click();
  await page
    .getByLabel('Placa de destino', { exact: true })
    .selectOption('plate-a');
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado: ' + id + '.json' })
    .waitFor();
  const saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  assert.equal(
    saved.document.objects.filter((o) => o.type === 'block').length,
    5,
  );
  assert.equal(
    saved.document.objects.find((o) => o.id === 'block').plateId,
    'plate-a',
  );
  assert.equal(
    saved.document.objects.find((o) => o.id === 'step-block-2').plateId,
    '',
  );
  await open(id);
  await select('block');
  assert.equal(
    await page.getByLabel('Placa de destino', { exact: true }).inputValue(),
    'plate-a',
  );
  await page.getByLabel('Placa de destino', { exact: true }).selectOption('');
  await button('Guardar').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado explícitamente:' })
    .waitFor();
  const changed = await (await page.request.get(url, { headers })).json();
  etag = changed.etag;
  assert.equal(
    changed.document.objects.find((o) => o.id === 'block').plateId,
    '',
  );
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .locator('.gameplay-controls,.gesture-controls')
    .waitFor({ timeout: 60000 });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyD');
  await button('Pausar').click();
  await button('Continuar').click();
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.editor-playtest canvas').count(), 1);
  await page.screenshot({ path: out + '/playtest-five-blocks.png' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await button('■ Detener y volver al editor').click();
  assert.equal(
    await page.getByLabel('Placa de destino', { exact: true }).inputValue(),
    '',
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    ledger,
  );
  assert.equal(await page.locator('.editor-playtest canvas').count(), 0);
  await page.screenshot({ path: out + '/editor-five-blocks.png' });
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/results.json',
    JSON.stringify(
      {
        passed: true,
        blocks: 5,
        checks: [
          'add and duplicate',
          'independent plate selection',
          'free blocks',
          'undo/redo',
          'save and reopen v1',
          'playtest',
          'pause/restart/resize/unmount',
          'unchanged campaign progress',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Editor: five blocks added/duplicated, saved, reopened and played successfully.',
  );
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  throw error;
} finally {
  if (headers) {
    const r = await page.request.get(url, { headers });
    if (r.ok()) {
      etag = (await r.json()).etag;
      const removed = await page.request.delete(url, {
        headers: { ...headers, 'If-Match': etag },
      });
      assert.equal(removed.ok(), true);
    }
  }
  await browser.close();
}
