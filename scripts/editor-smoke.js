// Optional integration against a local Vite server. Uses a temporary custom level only.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5178';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/editor-smoke');
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
page.on('dialog', (dialog) => dialog.accept());
const id = `editor-smoke-${Date.now()}`;
const { token } = await (
  await page.request.get(`${base}/__veylith_editor/session`)
).json();
const headers = { 'X-Veylith-Editor': token };
const stored = async (key) =>
  (
    await page.request.get(`${base}/__veylith_editor/levels/${key}`, {
      headers,
    })
  ).json();
const before = await Promise.all(
  [1, 2, 3, 4, 5].map((n) => stored(`forest-${n}`)),
);
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const readNumber = async (name) => Number(await field(name).inputValue());
const setNumber = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).blur();
};
const waitNumber = async (name, expected) => {
  for (let i = 0; i < 30; i++) {
    if ((await readNumber(name)) === expected) return;
    await page.waitForTimeout(100);
  }
  assert.equal(await readNumber(name), expected, name);
};
const tree = (id) =>
  page
    .locator('.object-tree button')
    .filter({ hasText: new RegExp(`^${id}\\s`) })
    .first();
let box;
const dragWorld = async (x, y, dx, dy) => {
  await page.mouse.move(box.x + x * 0.65, box.y + y * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + (x + dx) * 0.65, box.y + (y + dy) * 0.65, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await page.locator('canvas').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('canvas').count(), 1);
  await button('Duplicar nivel').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Crear copia sin guardar').click();
  await page.getByRole('status').filter({ hasText: 'Copia creada' }).waitFor();
  await page.waitForTimeout(1000);
  assert.equal(
    (
      await page.request.get(`${base}/__veylith_editor/levels/${id}`, {
        headers,
      })
    ).status(),
    404,
  );
  box = await page.locator('.editor-canvas').boundingBox();
  await button('Antorcha').dragTo(page.locator('.editor-canvas'), {
    targetPosition: { x: 300, y: 200 },
  });
  await page.getByLabel('ID del objeto').waitFor();
  assert.equal(await page.getByLabel('ID del objeto').inputValue(), 'torch');
  await waitNumber('Posición X', 448);
  await waitNumber('Posición Y', 320);
  checks.push(
    'HTML5 asset drop uses snapped world coordinates, duplicate is unsaved',
  );
  await setNumber('Posición X', 640);
  await setNumber('Posición Y', 128);
  await setNumber('Ancho visual', 128);
  await setNumber('Alto visual', 128);
  await dragWorld(700, 180, 64, 32);
  await waitNumber('Posición X', 704);
  await waitNumber('Posición Y', 160);
  await page.keyboard.press('Control+z');
  await waitNumber('Posición X', 640);
  await page.keyboard.press('Control+Shift+z');
  await waitNumber('Posición X', 704);
  const originalCollider = await readNumber('Ancho collider');
  await dragWorld(832, 288, 64, 32);
  await waitNumber('Ancho visual', 192);
  await waitNumber('Alto visual', 160);
  assert.equal(await readNumber('Ancho collider'), originalCollider);
  await setNumber('Offset collider X', 0);
  await setNumber('Offset collider Y', 0);
  await setNumber('Ancho collider', 96);
  await setNumber('Alto collider', 96);
  await page.getByLabel('Editar collider').check();
  await page.waitForTimeout(100);
  await dragWorld(800, 256, 32, 32);
  await waitNumber('Ancho collider', 128);
  await waitNumber('Alto collider', 128);
  await dragWorld(750, 200, 32, 32);
  await waitNumber('Offset collider X', 32);
  await waitNumber('Offset collider Y', 32);
  assert.equal(await readNumber('Ancho visual'), 192);
  await page.keyboard.press('Control+z');
  await waitNumber('Offset collider X', 0);
  await page.keyboard.press('Control+Shift+z');
  await waitNumber('Offset collider X', 32);
  checks.push(
    'Real canvas move, resize, independent collider handles/offset and grouped undo/redo',
  );
  // Zoom and pan do not rewrite world coordinates. Escape cancels an active drag.
  await page.getByLabel('Editar collider').uncheck();
  await page.mouse.move(box.x + 740 * 0.65, box.y + 190 * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + 900 * 0.65, box.y + 200 * 0.65, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await waitNumber('Posición X', 704);
  await button('+').click();
  await button('−').click();
  await page.mouse.move(box.x + 400, box.y + 200);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(box.x + 500, box.y + 170, { steps: 4 });
  await page.mouse.up({ button: 'middle' });
  assert.equal(await readNumber('Posición X'), 704);
  assert.equal(await readNumber('Posición Y'), 160);
  await page.setViewportSize({ width: 1450, height: 900 });
  assert.equal(await page.locator('canvas').count(), 1);
  checks.push(
    'Pan, zoom, resize and Escape preserve positions and a single canvas',
  );
  await tree('spawn').click();
  await page.keyboard.press('Delete');
  await button('▶ Probar').click();
  await page
    .getByRole('alert')
    .filter({ hasText: 'exactamente un punto de inicio' })
    .waitFor();
  assert.equal(await page.locator('.editor-playtest').count(), 0);
  await button('Deshacer').click();
  // Save via shortcut while a field is still focused; it must include that last edit.
  await tree('torch').click();
  await field('Posición X').fill('736');
  await page.keyboard.press('Control+s');
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado explícitamente' })
    .waitFor();
  const saved = await stored(id);
  assert.equal(saved.document.objects.find((o) => o.id === 'torch').x, 736);
  checks.push(
    'Missing spawn blocks playtest; explicit shortcut save flushes current field',
  );
  await setNumber('Posición X', 768);
  const progressBefore = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page.locator('.playtest-bar').waitFor();
  await page.waitForFunction(
    () => {
      const t = document.querySelector('.playtest-bar')?.textContent;
      return t && !t.includes('Cargando') && /[1-9]\d*\.\d s/.test(t);
    },
    undefined,
    { timeout: 60000 },
  );
  assert.equal(await page.locator('canvas').count(), 1);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await button('Pausar').click();
  await button('Continuar').waitFor();
  await button('Continuar').click();
  await button('Reiniciar prueba').click();
  await button('■ Detener y volver al editor').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Se conserva el borrador' })
    .waitFor();
  await waitNumber('Posición X', 768);
  await button('Deshacer').click();
  await waitNumber('Posición X', 736);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    progressBefore,
  );
  assert.equal(
    (await stored(id)).document.objects.find((o) => o.id === 'torch').x,
    736,
  );
  checks.push(
    'Unsaved real playtest, pause/restart/stop, history and isolated progress',
  );
  await button('Duplicar objeto').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="ID del objeto"]')?.value ===
      'torch-2',
  );
  await button('Eliminar objeto').click();
  await button('Deshacer').click();
  await tree('torch-2').click();
  await button('Eliminar objeto').click();
  await button('Guardar').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado explícitamente' })
    .waitFor();
  await button('Nuevo').click();
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  await tree('torch').click();
  await waitNumber('Posición X', 736);
  await page.getByLabel('Editar collider').check();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  await button('Eliminar nivel').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Archivo eliminado' })
    .waitFor();
  assert.equal(
    (
      await page.request.get(`${base}/__veylith_editor/levels/${id}`, {
        headers,
      })
    ).status(),
    404,
  );
  checks.push(
    'Duplicate/delete object, save/open round trip and confirmed custom level deletion',
  );
  const after = await Promise.all(
    [1, 2, 3, 4, 5].map((n) => stored(`forest-${n}`)),
  );
  assert.deepEqual(
    after,
    before,
    'Base levels must remain unchanged by editor smoke',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\n${JSON.stringify(errors)}\n${await page.locator('body').innerText()}`,
  );
  throw error;
} finally {
  const existing = await page.request.get(
    `${base}/__veylith_editor/levels/${id}`,
    { headers },
  );
  if (existing.ok()) {
    const { etag } = await existing.json();
    await page.request.delete(`${base}/__veylith_editor/levels/${id}`, {
      headers: { ...headers, 'If-Match': etag },
    });
  }
  await browser.close();
}
