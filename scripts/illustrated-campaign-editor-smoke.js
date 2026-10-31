import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/illustrated-editor');
await mkdir(output, { recursive: true });
const ids = process.env.LEVELS?.split(',') ?? [
  'forest-1',
  'forest-2',
  'forest-6',
  'forest-7',
  'forest-8',
  'forest-9',
  'forest-10',
  'forest-3',
  'forest-4',
  'forest-5',
];
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
const errors = [],
  results = [];
page.on('pageerror', (e) => {
  errors.push(e.message);
  console.error(e.stack);
});
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
page.on('requestfailed', (r) =>
  console.error('REQUEST FAILED', r.url(), r.failure()?.errorText),
);
page.on('console', (m) => {
  if (m.type() === 'warning' || m.type() === 'error')
    console.error('BROWSER', m.text());
});
page.on('dialog', (d) => d.accept());
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const button = (name) => page.getByRole('button', { name, exact: true });
const open = async (id) => {
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page.waitForLoadState('networkidle');
  await button('Encuadrar').click();
};
const { token } = await (
  await page.request.get(base + '/__veylith_editor/session')
).json();
const headers = { 'X-Veylith-Editor': token };
let copyId, etag;
try {
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  for (const id of ids) {
    const original = JSON.parse(
      await readFile('src/game/levels/data/' + id + '.json', 'utf8'),
    );
    await open(id);
    await page
      .locator('.object-tree button')
      .filter({ hasText: /^illustrated-world / })
      .click();
    assert.equal(
      await page
        .getByRole('spinbutton', {
          name: 'Escala del escenario (%)',
          exact: true,
        })
        .inputValue(),
      '150',
    );
    for (const layer of ['background', 'static_world', 'foreground'])
      assert(
        await page.getByLabel('Capa ' + layer, { exact: true }).isChecked(),
      );
    const width = page.getByRole('spinbutton', {
      name: 'Ancho visual',
      exact: true,
    });
    assert.equal(await width.inputValue(), '2592');
    await page.getByLabel('Capa foreground', { exact: true }).uncheck();
    await button('Deshacer').click();
    assert(
      await page.getByLabel('Capa foreground', { exact: true }).isChecked(),
    );
    // Save a disposable editable copy, preserving each canonical document and real saves.
    copyId = `campaign-smoke-${Date.now()}`;
    await button('Guardar como').click();
    await page.getByLabel('ID del archivo').fill(copyId);
    await button('Guardar copia').click();
    await page
      .getByRole('status')
      .filter({ hasText: `Guardado: ${copyId}` })
      .waitFor();
    const url = base + '/__veylith_editor/levels/' + copyId;
    const saved = await (await page.request.get(url, { headers })).json();
    etag = saved.etag;
    assert.deepEqual(saved.document, {
      ...original,
      id: copyId,
      name: original.name + ' — copia',
    });
    await open(copyId);
    await page.screenshot({ path: output + '/' + id + '-editor.png' });
    await button('▶ Probar').click();
    await button('Reiniciar prueba').waitFor({ timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });
    await button('Reiniciar prueba').click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: output + '/' + id + '-playtest.png' });
    await button('■ Detener y volver al editor').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(
      await page.evaluate(() => localStorage.getItem('veylith.progress')),
      ledger,
    );
    assert.deepEqual(
      JSON.parse(
        await readFile('src/game/levels/data/' + id + '.json', 'utf8'),
      ),
      original,
    );
    await page.setViewportSize({ width: 1700, height: 1050 });
    const deleted = await page.request.delete(url, {
      headers: { ...headers, 'If-Match': etag },
    });
    assert(deleted.ok());
    etag = undefined;
    results.push({
      id,
      passed: true,
      roundTrip: true,
      playtest: true,
      restart: true,
      resize: true,
      oneCanvas: true,
      campaignSaveUnchanged: true,
    });
    console.log('EDITOR SAVE/LOAD/PLAYTEST/RESTART', id);
  }
  assert.deepEqual(errors, []);
} catch (e) {
  console.error(e);
  await page.screenshot({ path: output + '/failure.png' });
  results.push({ id: ids[results.length], passed: false, error: String(e) });
  process.exitCode = 1;
} finally {
  if (etag)
    await page.request.delete(base + '/__veylith_editor/levels/' + copyId, {
      headers: { ...headers, 'If-Match': etag },
    });
  await writeFile(
    output + '/results.json',
    JSON.stringify(
      {
        passed:
          results.length === ids.length &&
          results.every((r) => r.passed) &&
          !errors.length,
        results,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
  await browser.close();
}
