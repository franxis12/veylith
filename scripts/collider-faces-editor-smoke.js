import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/collider-faces-editor');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [],
  checks = [],
  id = 'collider-faces-check-' + Date.now();
const url = base + '/__veylith_editor/levels/' + id;
let headers;
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const button = (name) => page.getByRole('button', { name, exact: true });
const checkbox = (name) => page.getByRole('checkbox', { name, exact: true });
const select = (id) =>
  page
    .locator('.object-tree button')
    .filter({ hasText: new RegExp('^' + id + '\\s') })
    .click();
async function open() {
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Abierto: ' + id })
    .waitFor();
  await select('test-wall');
}
async function save() {
  await button('Guardar').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Guardado explícitamente:' })
    .waitFor();
  return (await (await page.request.get(url, { headers })).json()).document;
}
async function playSaved(
  doc,
  start = 300,
  movement = 'move_right',
  jumping = false,
) {
  const test = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  test.on('pageerror', (e) => errors.push(e.message));
  await test.goto(base + '/scripts/browser-harness.html');
  await test.waitForFunction(() => window.smoke);
  // Only initial placement changes for the opposite approach; saved collider settings stay exact.
  await test.evaluate(
    async ({ doc, start }) => {
      doc.objects.find((o) => o.type === 'spawn').x = start;
      await window.smoke.start('forest-1', doc);
    },
    { doc, start },
  );
  await test.waitForTimeout(250);
  await test.evaluate(
    ({ movement, jumping }) => {
      if (movement) window.smoke.input(movement);
      if (jumping) {
        window.smoke.input('jump');
        window.smoke.input('jump', 'released');
      }
    },
    { movement, jumping },
  );
  await test.waitForTimeout(2500);
  const result = await test.evaluate(() => window.smoke.read());
  await test.close();
  return result;
}
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  const doc = await page.evaluate(async (id) => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const d = newLevel(id);
    d.objects.find((o) => o.type === 'spawn').element = 'earth';
    const wall = createObject(
      LIBRARY.find((i) => i.id === 'boxCollider'),
      800,
      250,
      d.objects,
    );
    Object.assign(wall, {
      id: 'test-wall',
      width: 60,
      height: 400,
      collider: { enabled: true, x: 0, y: 0, width: 60, height: 400 },
    });
    d.objects.push(wall);
    return d;
  }, id);
  const { token } = await (
    await page.request.get(base + '/__veylith_editor/session')
  ).json();
  headers = { 'X-Veylith-Editor': token };
  const created = await page.request.put(url, {
    headers: { ...headers, 'If-Match': '*' },
    data: doc,
  });
  assert(created.ok(), await created.text());
  await page.goto(base + '/editor');
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await open();
  assert(await checkbox('Arriba · apoyarse').isChecked());
  assert(!(await checkbox('Lado izquierdo').isChecked()));
  await button('Pared sólida').click();
  for (const label of [
    'Arriba · apoyarse',
    'Abajo · detener la cabeza',
    'Lado izquierdo',
    'Lado derecho',
  ])
    assert(await checkbox(label).isChecked());
  await checkbox('Lado izquierdo').uncheck();
  await button('Deshacer').click();
  assert(await checkbox('Lado izquierdo').isChecked());
  await button('Rehacer').click();
  assert(!(await checkbox('Lado izquierdo').isChecked()));
  const asymmetric = await save();
  await open();
  assert(!(await checkbox('Lado izquierdo').isChecked()));
  assert(await checkbox('Lado derecho').isChecked());
  checks.push(
    'Each face is editable; undo, redo, save and reopen preserve asymmetric settings',
  );
  assert((await playSaved(asymmetric)).x > 900);
  const blocked = await playSaved(asymmetric, 1050, 'move_left');
  assert(
    Math.abs(blocked.x - (860 + blocked.playerSize.width / 2)) < 1,
    JSON.stringify(blocked),
  );
  checks.push(
    'Saved left face allows entry; saved right face blocks the opposite approach',
  );
  await button('Pared sólida').click();
  const solid = await save();
  const wall = await playSaved(solid);
  assert(
    Math.abs(wall.x - (800 - wall.playerSize.width / 2)) < 1,
    JSON.stringify(wall),
  );
  checks.push('Solid wall preset blocks entry from the left');
  await button('Solo superficie').click();
  // Place the same collider overhead within the normal Earth jump range using inspector fields.
  for (const [label, value] of [
    ['Posición X', 200],
    ['Posición Y', 460],
    ['Ancho visual', 1024],
    ['Alto visual', 20],
  ]) {
    const f = page.getByRole('spinbutton', { name: label, exact: true });
    await f.fill(String(value));
    await f.blur();
  }
  const platform = await save();
  const landed = await playSaved(platform, 609, null, true);
  assert(
    Math.abs(landed.feet - 460) < 1 && landed.grounded,
    JSON.stringify(landed),
  );
  checks.push(
    'Surface preset and resized collider allow upward passage and landing on top',
  );
  await button('Pared sólida').click();
  const ceiling = await save();
  const stopped = await playSaved(ceiling, 609, null, true);
  assert(
    Math.abs(stopped.feet - 650) < 1 && stopped.grounded,
    JSON.stringify(stopped),
  );
  checks.push('Bottom face stops the head when restored to a solid collider');
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .locator('.gameplay-controls,.gesture-controls')
    .waitFor({ timeout: 60000 });
  await button('Pausar').click();
  await button('Continuar').click();
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.editor-playtest canvas').count(), 1);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await button('■ Detener y volver al editor').click();
  assert.equal(await page.locator('.editor-playtest canvas').count(), 0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    ledger,
  );
  await button('Restablecer caras').click();
  const reset = await save();
  assert.equal(
    reset.objects.find((o) => o.id === 'test-wall').collider.playerCollision,
    undefined,
  );
  await page
    .getByText('Caras sólidas para el personaje', { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: out + '/collider-options.png' });
  checks.push(
    'Editor playtest mounts, pauses, restarts, resizes and stops without changing campaign progress; reset removes the optional override',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/result.json',
    JSON.stringify({ checks, errors }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ passed: checks.length, output: out }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  throw error;
} finally {
  if (headers) {
    const r = await page.request.get(url, { headers });
    if (r.ok()) {
      const { etag } = await r.json();
      const deleted = await page.request.delete(url, {
        headers: { ...headers, 'If-Match': etag },
      });
      assert(deleted.ok());
    }
  }
  await browser.close();
}
