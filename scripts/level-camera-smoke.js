// Exercises saved gameplay zoom through the real editor and campaign scene.
// Only a uniquely named temporary level is saved; it is deleted in finally.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5190';
const output = resolve(
  process.env.SMOKE_OUTPUT || '/tmp/veylith-level-camera/browser',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1700, height: 1050 },
  deviceScaleFactor: 2,
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [],
  checks = [];
const id = `camera-smoke-${Date.now()}`;
let saved, token;
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).press('Enter');
  await field(name).blur();
};
const observe = () =>
  page.evaluate(async () => {
    await import('/src/game/core/GameConfig.ts');
    const url = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .findLast(
        (url) => new URL(url).pathname === '/src/game/scenes/MainScene.ts',
      );
    if (!url) throw new Error('MainScene module was not loaded');
    const { MainScene } = await import(url);
    const create = MainScene.prototype.create;
    window.cameraTestStarts = 0;
    MainScene.prototype.create = function (...args) {
      create.apply(this, args);
      window.cameraTestScene = this;
      window.cameraTestStarts++;
    };
  });
const read = () =>
  page.evaluate(() => {
    const scene = window.cameraTestScene;
    const c = scene.cameras.main,
      b = scene.player.body;
    return {
      zoom: c.zoom,
      renderScale: scene.renderScale,
      view: {
        x: c.worldView.x,
        y: c.worldView.y,
        width: c.displayWidth,
        height: c.displayHeight,
      },
      viewport: { width: c.width, height: c.height },
      player: {
        x: b.center.x,
        feet: b.bottom,
        width: b.width,
        height: b.height,
      },
      bounds: {
        width: scene.physics.world.bounds.width,
        height: scene.physics.world.bounds.height,
      },
      background: scene.forestPuzzle.backdrop.layers.map(({ image }) => ({
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
        scale: image.scaleX,
      })),
      document: structuredClone(scene.forestPuzzle.layout.document),
    };
  });
const verify = (state, zoom, renderScale) => {
  const close = (actual, expected) =>
    assert(Math.abs(actual - expected) < 0.00001);
  assert.equal(state.renderScale, renderScale);
  assert.equal(state.zoom, zoom * renderScale);
  assert.equal(state.view.width, 1280 / zoom);
  assert.equal(state.view.height, 720 / zoom);
  assert.equal(state.bounds.width, state.document.width);
  assert.equal(state.bounds.height, state.document.height);
  assert(
    state.player.x >= state.view.x &&
      state.player.x <= state.view.x + state.view.width,
  );
  assert(
    state.player.feet >= state.view.y &&
      state.player.feet <= state.view.y + state.view.height,
  );
  for (const image of state.background) {
    assert.deepEqual([image.width, image.height], [1280, 720]);
    close(image.width * image.scale, state.view.width);
    close(image.height * image.scale, state.view.height);
    close(
      (image.x - state.viewport.width / 2) * state.zoom +
        state.viewport.width / 2,
      0,
    );
  }
  const sky = state.background[0];
  close(
    (sky.y - state.viewport.height / 2) * state.zoom +
      state.viewport.height / 2,
    0,
  );
};
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await button('Nuevo').click();
  await button('Propiedades del nivel').click();
  await set('Zoom del lienzo (%)', 50);
  await button('Aplicar zoom al juego').click();
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '50');
  await button('Deshacer').click();
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '100');
  await button('Rehacer').click();
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '50');
  await set('Zoom del lienzo (%)', 5);
  assert(await button('Aplicar zoom al juego').isDisabled());
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '50');
  await button('Guardar como').click();
  await page.getByLabel('ID del archivo', { exact: true }).fill(id);
  await button('Guardar copia').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Guardado: ${id}.json` })
    .waitFor();
  token = (
    await (await page.request.get(`${base}/__veylith_editor/session`)).json()
  ).token;
  const open = await page.request.get(`${base}/__veylith_editor/levels/${id}`, {
    headers: { 'X-Veylith-Editor': token },
  });
  assert(open.ok());
  saved = (await open.json()).document;
  assert.equal(saved.cameraZoom, 0.5);
  await button('Nuevo').click();
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  await button('Propiedades del nivel').click();
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '50');
  checks.push(
    'Apply editor zoom, undo/redo, explicit save and reopen retain gameplay zoom; navigation alone preserves it.',
  );
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  await observe();
  await button('▶ Probar').click();
  await page.waitForFunction(
    () => window.cameraTestScene?.player?.body.blocked.down,
    { timeout: 60000 },
  );
  const initial = await read();
  verify(initial, 0.5, 2);
  await page.screenshot({ path: resolve(output, 'playtest-50-percent.png') });
  await button('Pausar').click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await button('Continuar').click();
  verify(await read(), 0.5, 2);
  await button('Reiniciar prueba').click();
  await page.waitForFunction(
    () =>
      window.cameraTestStarts >= 2 &&
      window.cameraTestScene?.player?.body.blocked.down,
  );
  verify(await read(), 0.5, 2);
  assert.equal(await page.locator('canvas').count(), 1);
  await button('■ Detener y volver al editor').click();
  await field('Zoom del lienzo (%)').waitFor();
  await button('Propiedades del nivel').click();
  assert.equal(await field('Zoom al jugar (%)').inputValue(), '50');
  assert.equal(
    await page.evaluate(() => JSON.stringify(localStorage)),
    storage,
  );
  assert.equal(await page.locator('canvas').count(), 1);
  checks.push(
    'Retina playtest shows twice the world area at 50%, preserves geometry, backgrounds, restart, resize and editor/progression isolation.',
  );
  // Replace one module response in this test browser only. This exercises the
  // canonical campaign loading branch without editing the user's campaign.
  await page.route('**/src/game/levels/data/forest-1.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify({ ...saved, id: 'forest-1' })};`,
    }),
  );
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => !!window.smoke);
  await observe();
  await page.evaluate(() => window.smoke.start('forest-1'));
  await page.waitForFunction(
    () => window.cameraTestScene?.player?.body.blocked.down,
  );
  const campaign = await read();
  verify(campaign, 0.5, 1);
  assert.equal(campaign.player.width, initial.player.width);
  assert.equal(campaign.player.height, initial.player.height);
  assert.deepEqual(campaign.document.objects, saved.objects);
  checks.push(
    'The canonical campaign path applies saved zoom on a standard display, with the same player collider and level geometry.',
  );
  for (const zoom of [0.25, 1, 1.5]) {
    await page.evaluate(
      async ({ saved, zoom }) => {
        const doc = { ...saved, cameraZoom: zoom };
        if (zoom === 1) delete doc.cameraZoom;
        await window.smoke.start('forest-1', doc);
      },
      { saved, zoom },
    );
    await page.waitForFunction(
      () => window.cameraTestScene?.player?.body.blocked.down,
    );
    verify(await read(), zoom, 1);
  }
  checks.push(
    'Minimum/maximum zoom and legacy documents without cameraZoom render correctly with bounded background surfaces.',
  );
  assert.deepEqual(errors, []);
  const result = { passed: true, checks, errors };
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
  token ??= (
    await (await page.request.get(`${base}/__veylith_editor/session`)).json()
  ).token;
  const response = await page.request.get(
    `${base}/__veylith_editor/levels/${id}`,
    { headers: { 'X-Veylith-Editor': token } },
  );
  if (response.ok()) {
    const { etag } = await response.json();
    const deleted = await page.request.delete(
      `${base}/__veylith_editor/levels/${id}`,
      { headers: { 'X-Veylith-Editor': token, 'If-Match': etag } },
    );
    assert(deleted.ok(), 'Temporary test level must be cleaned up');
  }
  await browser.close();
}
