import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5194';
const output = resolve(process.env.SMOKE_OUTPUT || '/tmp/veylith-illustrated');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
const errors = [],
  checks = [],
  requests = new Set();
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().includes('/illustrated_levels/'))
    requests.add(request.url());
});
page.on('response', (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
page.on('dialog', (dialog) => dialog.accept());
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
const button = (name) => page.getByRole('button', { name, exact: true });
const set = async (name, value) => {
  const input = page.getByRole('spinbutton', { name, exact: true });
  await input.fill(String(value));
  await input.blur();
};
const id = `illustrated-smoke-${Date.now()}`;
const { token } = await (
  await page.request.get(`${base}/__veylith_editor/session`)
).json();
const headers = { 'X-Veylith-Editor': token };
const url = `${base}/__veylith_editor/levels/${id}`;
let etag;
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('Abrir').click();
  await page
    .getByRole('dialog')
    .getByRole('combobox')
    .selectOption('lab-illustrated');
  await button('Abrir seleccionado').click();
  await page.waitForLoadState('networkidle');
  await button('Encuadrar').click();
  await page
    .locator('.object-tree button')
    .filter({ hasText: /^illustration / })
    .click();
  await set('Escala del escenario (%)', 100);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '1536',
  );
  await button('Deshacer').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '3072',
  );
  await page.getByLabel('Capa foreground', { exact: true }).uncheck();
  await page
    .locator('summary')
    .filter({ hasText: /^upper_right_fall / })
    .click();
  await set('upper_right_fall · X local', 1130);
  await set('upper_right_fall · FPS', 10);
  await page.getByLabel('Dibujar collider', { exact: true }).check();
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.move(canvas.x + 250, canvas.y + 180);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 390, canvas.y + 220, { steps: 8 });
  await page.mouse.up();
  await page.getByLabel('Dibujar collider', { exact: true }).uncheck();
  assert(
    Number(
      await page
        .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
        .inputValue(),
    ) > 0,
  );
  await set('Ancho collider', 333);
  await button('Deshacer').click();
  assert.notEqual(
    await page
      .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
      .inputValue(),
    '333',
  );
  await button('Rehacer').click();
  await page.getByLabel('Editar collider', { exact: true }).check();
  const numeric = async (name) =>
    Number(
      await page.getByRole('spinbutton', { name, exact: true }).inputValue(),
    );
  const boxX = await numeric('Posición X'),
    boxY = await numeric('Posición Y');
  const boxH = await numeric('Alto collider');
  const z = Math.min(canvas.width / 3072, canvas.height / 1400) * 0.9;
  const scrollX = (3072 - canvas.width / z) / 2,
    scrollY = (1400 - canvas.height / z) / 2;
  const handleX = canvas.x + (boxX + 333 - scrollX) * z;
  const handleY = canvas.y + (boxY + boxH - scrollY) * z;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX + 32, handleY + 16, { steps: 8 });
  await page.mouse.up();
  assert((await numeric('Ancho collider')) > 333);
  await button('Deshacer').click();
  assert.equal(await numeric('Ancho collider'), 333);
  await page.getByLabel('Editar collider', { exact: true }).uncheck();
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo').fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}` })
    .waitFor();
  let saved = await (await page.request.get(url, { headers })).json();
  etag = saved.etag;
  assert.equal(
    saved.document.objects.filter((o) => o.type === 'boxCollider').length,
    9,
  );
  const illustration = saved.document.objects.find(
    (o) => o.type === 'illustration',
  );
  assert(!illustration.layers.includes('foreground'));
  assert.equal(
    illustration.overlays.find((o) => o.id === 'upper_right_fall').x,
    1130,
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page.waitForLoadState('networkidle');
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  checks.push(
    'Editor: drawing a collider, numeric edits, undo/redo, uniform scene scale, layer visibility and overlay coordinates/FPS round trip through real file API.',
  );
  await button('▶ Probar').click();
  await button('Reiniciar prueba').waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Reiniciar prueba').click();
  await page.screenshot({ path: resolve(output, 'playtest.png') });
  await button('■ Detener y volver al editor').click();
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    ledger,
  );
  checks.push(
    'Real React/Phaser mount, resize, restart and return preserve one canvas, draft and campaign save.',
  );
  const lab = JSON.parse(
    await readFile('src/game/levels/data/lab-illustrated.json', 'utf8'),
  );
  await page.goto(`${base}/scripts/illustrated-harness.html`);
  await page.waitForFunction(() => window.illustratedTest);
  requests.clear();
  await page.evaluate((doc) => window.illustratedTest.start(doc), lab);
  await page.waitForFunction(() => window.illustratedTest.read().grounded);
  const start = await page.evaluate(() => window.illustratedTest.read());
  assert.equal(start.feet, 1080);
  assert.equal(start.boxes.length, 8);
  assert.equal(start.textures.length, 9);
  assert.equal(start.art.length, 14);
  assert.equal(start.art.filter((o) => o.playing).length, 11);
  const waterfall = start.art.find(
    (o) => o.name === 'illustration:upper_right_fall',
  );
  assert.deepEqual(
    [waterfall.x, waterfall.y, waterfall.width, waterfall.height],
    [2254, 408, 224, 276],
  );
  assert(
    waterfall.depth <
      start.art.find((o) => o.name === 'illustration:static_world').depth,
  );
  assert(
    start.art.find((o) => o.name === 'illustration:static_world').depth < 0,
  );
  assert(start.art.find((o) => o.name === 'illustration:foreground').depth > 0);
  await page.waitForFunction(
    (prior) =>
      window.illustratedTest
        .read()
        .art.find((o) => o.name === 'illustration:upper_right_fall').frame !==
      prior,
    waterfall.frame,
  );
  assert(
    [...requests].every(
      (path) => !/preview|alignment|sections|frames\//.test(path),
    ),
  );
  await page.screenshot({ path: resolve(output, 'physics.png') });
  checks.push(
    'Runtime: exactly nine textures, three correctly ordered layers, eleven animated instances with original positions/sizes; no previews/alignment/sections/loose frames. Player lands on the independent floor.',
  );
  await page.evaluate(() => window.illustratedTest.input('move_right'));
  await page.waitForFunction(
    () => window.illustratedTest.read().element === 'earth',
  );
  await page.waitForFunction(() => window.illustratedTest.read().plate, null, {
    timeout: 20000,
  });
  await page.evaluate(() =>
    window.illustratedTest.input('move_right', 'released'),
  );
  const docked = await page.evaluate(() => window.illustratedTest.read());
  assert(docked.blocks[0].x > start.blocks[0].x + 200);
  checks.push(
    'Real physics: gem immediately changes Water to Earth, the block falls onto the illustrated floor, Earth pushes it and contact activates its plate.',
  );
  // Jump over the docked block, modular ledge and small painted pillar using normal actions.
  await page.evaluate(() => {
    window.illustratedTest.input('move_right');
    window.illustratedTest.input('jump');
  });
  await page.waitForFunction(
    () => window.illustratedTest.read().x > 1510,
    null,
    { timeout: 10000 },
  );
  await page.evaluate(() => window.illustratedTest.input('jump', 'released'));
  for (let i = 0; i < 4; i++) {
    await page.waitForFunction(
      () => {
        const s = window.illustratedTest.read();
        return s.grounded || s.run.phase === 'complete';
      },
      null,
      { timeout: 10000 },
    );
    const s = await page.evaluate(() => window.illustratedTest.read());
    if (s.run.phase === 'complete') break;
    await page.evaluate(() => window.illustratedTest.input('jump'));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.illustratedTest.input('jump', 'released'));
  }
  await page.waitForFunction(
    () => window.illustratedTest.read().run.phase === 'complete',
    null,
    { timeout: 10000 },
  );
  await page.evaluate(() =>
    window.illustratedTest.input('move_right', 'released'),
  );
  const complete = await page.evaluate(() => window.illustratedTest.read());
  assert.equal(complete.attempts, 1);
  await page.screenshot({ path: resolve(output, 'complete.png') });
  await page.evaluate(() => window.illustratedTest.retry());
  await page.waitForFunction(
    () => window.illustratedTest.read().attempts === 2,
  );
  const reset = await page.evaluate(() => window.illustratedTest.read());
  assert.equal(reset.element, 'water');
  assert.equal(reset.plate, false);
  assert.deepEqual(reset.textures, start.textures);
  assert.equal(reset.art.length, start.art.length);
  assert.equal(reset.listeners, start.listeners);
  assert.deepEqual(reset.document, lab);
  checks.push(
    'Playable laboratory completed using normal movement/jumps and mixed modular art; restart restores gem/block/plate without texture, animation-node or listener accumulation.',
  );
  const wallProbe = structuredClone(lab);
  const probeSpawn = wallProbe.objects.find((o) => o.type === 'spawn');
  probeSpawn.x = 1800;
  probeSpawn.y = 900;
  await page.evaluate((doc) => window.illustratedTest.start(doc), wallProbe);
  await page.waitForFunction(() => window.illustratedTest.read().grounded);
  await page.evaluate(() => window.illustratedTest.input('move_right'));
  await page.waitForTimeout(800);
  const blocked = await page.evaluate(() => window.illustratedTest.read());
  assert(blocked.x > 1840 && blocked.x <= 1859.1);
  wallProbe.objects.find((o) => o.id === 'small-pillar-wall').collider.enabled =
    false;
  await page.evaluate((doc) => window.illustratedTest.start(doc), wallProbe);
  await page.evaluate(() => window.illustratedTest.input('move_right'));
  await page.waitForFunction(() => window.illustratedTest.read().x > 1970);
  const fallProbe = structuredClone(lab);
  fallProbe.objects.find((o) => o.id === 'lower-floor').collider.enabled =
    false;
  await page.evaluate((doc) => window.illustratedTest.start(doc), fallProbe);
  await page.waitForFunction(
    () => window.illustratedTest.read().attempts >= 2,
    null,
    { timeout: 10000 },
  );
  checks.push(
    'Negative physics: an independent wall stops the player; disabling it allows passage. Disabling the floor causes a full fall restart despite the visible illustration.',
  );
  await page.evaluate(async () => {
    const { newLevel } = await import('/src/editor/library.ts');
    await window.illustratedTest.start(newLevel());
  });
  const modular = await page.evaluate(() => window.illustratedTest.read());
  assert.deepEqual(modular.textures, []);
  assert.deepEqual(modular.art, []);
  checks.push('A pure modular level loads zero illustrated textures.');
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    checks,
    errors,
    illustratedRequests: [...requests],
  };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  console.error(error);
  console.error(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
} finally {
  if (etag)
    await page.request.delete(url, {
      headers: { ...headers, 'If-Match': etag },
    });
  await browser.close();
}
