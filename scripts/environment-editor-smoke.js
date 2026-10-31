import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5190';
const output = resolve(
  process.env.SMOKE_OUTPUT || '/tmp/veylith-assets/browser',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
const errors = [],
  checks = [];
// Importing the physics harness can trigger Vite's dependency-optimizer reload.
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().includes('/assets/'))
    errors.push(`${response.status()}: ${response.url()}`);
});
page.on('dialog', (dialog) => dialog.accept());
const id = `environment-smoke-${Date.now()}`;
const url = `${base}/__veylith_editor/levels/${id}`;
const { token } = await (
  await page.request.get(`${base}/__veylith_editor/session`)
).json();
const headers = { 'X-Veylith-Editor': token };
let etag;
const button = (name) => page.getByRole('button', { name, exact: true });
const set = async (name, value) => {
  const field = page.getByRole('spinbutton', { name, exact: true });
  await field.fill(String(value));
  await field.blur();
};
const place = async (name, x, y) => {
  await page.getByRole('searchbox', { name: 'Buscar recursos' }).fill(name);
  await button(name).click();
  await set('Posición X', x);
  await set('Posición Y', y);
};
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await button('Nuevo').click();
  await page.waitForLoadState('networkidle');
  const decoded = await page.evaluate(async () => {
    const { ENVIRONMENT_ASSETS } =
      await import('/src/game/assets/environmentCatalog.ts');
    for (const asset of Object.values(ENVIRONMENT_ASSETS)) {
      const image = new Image();
      image.src = `/${asset.path}`;
      await image.decode();
      if (
        image.naturalWidth !== asset.width ||
        image.naturalHeight !== asset.height
      )
        throw new Error(asset.path);
    }
    return Object.keys(ENVIRONMENT_ASSETS).length;
  });
  assert.equal(decoded, 155);
  checks.push('Browser decodes all 155 original PNGs at their measured sizes.');
  await place('Plataforma · Madera', 64, 468);
  const oldCollider = await page
    .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
    .inputValue();
  await set('Ancho visual', 768);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
      .inputValue(),
    oldCollider,
  );
  await button('Ajustar collider a la plataforma').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
      .inputValue(),
    '745',
  );
  await set('Escala visual (%)', 25);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '192',
  );
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '32',
  );
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
      .inputValue(),
    '745',
  );
  await button('Deshacer').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Escala visual (%)', exact: true })
      .inputValue(),
    '100',
  );
  await button('Rehacer').click();
  await set('Ancho visual', 224);
  await button('Ajustar collider a la plataforma').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho collider', exact: true })
      .inputValue(),
    '218.25',
  );
  await place('ruined archway', 64, 100);
  await set('Ancho visual', 700);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '350',
  );
  await set('Escala visual (%)', 50);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '512',
  );
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '256',
  );
  assert.equal(
    await page.getByRole('checkbox', { name: 'Collision enabled' }).isChecked(),
    false,
  );
  await place('bush a', 600, 430);
  await place('suspension ring earth', 620, 350);
  await place('slope rising left', 950, 200);
  assert.equal(
    await page.getByRole('checkbox', { name: 'Collision enabled' }).isChecked(),
    false,
  );
  await place('wood support', 64, 596);
  await place('dirt interior', 850, 650);
  await set('Ancho visual', 512);
  await set('Alto visual', 256);
  await set('Escala visual (%)', 50);
  await set('Ancho visual', 300);
  await place('distant ruins', 1100, 80);
  await place('hanging leaves', 0, -50);
  await page.getByRole('searchbox').fill('Plataforma · Cristal');
  await button('Plataforma · Cristal').dragTo(
    page.getByLabel('Lienzo del nivel'),
    { targetPosition: { x: 700, y: 350 } },
  );
  await set('Posición X', 900);
  await set('Posición Y', 468);
  await place('chain segment', 1450, 100);
  await set('Alto visual', 333);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '128',
  );
  await button('Deshacer').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '128',
  );
  await button('Rehacer').click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '333',
  );
  await set('Escala visual (%)', 200);
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Ancho visual', exact: true })
      .inputValue(),
    '256',
  );
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Alto visual', exact: true })
      .inputValue(),
    '666',
  );
  await set('Alto visual', 777);
  await page.screenshot({ path: resolve(output, 'scale-control.png') });
  checks.push(
    'Scale control shrinks platforms and fills, enlarges chain links, preserves colliders, and supports undo/redo followed by modular extension.',
  );
  checks.push(
    'Search, click and drag placement, full-canvas dimensions, default layers, independent colliders and explicit platform fitting.',
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
  const newObjects = saved.document.objects.filter((o) =>
    o.asset?.startsWith('environment:'),
  );
  assert.equal(newObjects.length, 11);
  assert.equal(newObjects.filter((o) => o.type === 'platform').length, 2);
  assert.equal(
    newObjects.find((o) => o.asset === 'environment:dirt_interior').tileScale,
    0.5,
  );
  assert.equal(
    newObjects.find((o) => o.asset === 'environment:wood_center').width,
    224,
  );
  assert.equal(
    newObjects.find((o) => o.asset === 'environment:chain_segment').height,
    777,
  );
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption(id);
  await button('Abrir seleccionado').click();
  await page
    .getByRole('status')
    .filter({ hasText: `Abierto: ${id}` })
    .waitFor();
  await page.waitForLoadState('networkidle');
  await page.getByRole('searchbox').fill('Plataforma');
  await button('Encuadrar').click();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  checks.push(
    'Explicit JSON v1 save/reopen preserves all objects, platform families, proportional art, extended chain, tiled terrain and independent colliders.',
  );
  const ledger = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await button('▶ Probar').click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await button('Pausar').click();
  await button('Continuar').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await button('Reiniciar prueba').click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(output, 'playtest.png') });
  await button('■ Detener y volver al editor').click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Se conserva el borrador' })
    .waitFor();
  await page.waitForLoadState('networkidle');
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
    'Real StrictMode editor/playtest mount, resize, pause, restart and teardown leave one canvas and preserve campaign storage.',
  );
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  const solution = await page.evaluate(async () => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const { platformCollider } =
      await import('/src/game/assets/environmentCatalog.ts');
    const { scaleEnvironment, environmentSize } =
      await import('/src/editor/environmentResize.ts');
    const doc = newLevel('environment-solution');
    doc.objects = doc.objects.filter((o) => o.type !== 'terrain');
    const spawn = doc.objects.find((o) => o.type === 'spawn');
    spawn.y = 100;
    spawn.element = 'earth';
    const exit = doc.objects.find((o) => o.type === 'exit');
    exit.y = 140;
    const platform = createObject(
      LIBRARY.find((i) => i.id === 'platform:wood_center'),
      0,
      400,
      doc.objects,
    );
    platform.width = 2048;
    Object.assign(platform, scaleEnvironment(platform, 0.5));
    Object.assign(
      platform,
      environmentSize(platform, 2048, platform.height, 'width'),
    );
    platform.collider = platformCollider('wood_center', 2048, 64);
    doc.objects.push(platform);
    for (const [id, x, y, width, height] of [
      ['chain_segment', 450, 40, 128, 333],
      ['wood_beam_segment', 450, 40, 333, 128],
      ['dirt_interior', 450, 500, 333, 222],
      ['ruined_archway', 800, 50, 700, 350],
    ]) {
      const piece = createObject(
        LIBRARY.find((i) => i.id === `environment:${id}`),
        x,
        y,
        doc.objects,
      );
      piece.width = width;
      piece.height = height;
      Object.assign(
        piece,
        scaleEnvironment(piece, id === 'wood_beam_segment' ? 2 : 0.5),
      );
      doc.objects.push(piece);
    }
    await window.smoke.start('forest-1', doc);
    return doc;
  });
  await page.waitForFunction(() => {
    const s = window.smoke.read();
    return s.grounded && Math.abs(s.feet - 416) < 2;
  });
  const art = await page.evaluate(() => window.smoke.environmentArt());
  const images = (id) =>
    art.find((entry) => entry.asset === `environment:${id}`).images;
  assert.equal(images('chain_segment').length, 3);
  assert.deepEqual(
    images('chain_segment').map((image) => image.y),
    [0, 64, 128],
  );
  assert(images('chain_segment').at(-1).cropped);
  assert.equal(images('wood_beam_segment').length, 3);
  assert.deepEqual(
    images('wood_beam_segment').map((image) => image.x),
    [0, 256, 512],
  );
  assert.equal(images('dirt_interior').length, 6);
  for (const entry of art)
    for (const image of entry.images) assert.equal(image.scaleX, image.scaleY);
  assert.equal(images('chain_segment')[0].scaleX, 0.5);
  assert.equal(images('wood_beam_segment')[0].scaleX, 2);
  assert.equal(images('dirt_interior')[0].scaleX, 0.5);
  assert.equal(images('ruined_archway')[0].scaleX, 0.5);
  assert.equal(images('wood_center')[0].scaleX, 0.5);
  await page.screenshot({ path: resolve(output, 'resize-patterns.png') });
  checks.push(
    'Real renderer uses 50% platforms, chains, fills and unique art and 200% beam modules; partial repeats crop without distortion.',
  );
  const before = await page.evaluate(() => window.smoke.resources());
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(
    () => window.smoke.read().run.phase === 'complete',
    null,
    { timeout: 20000 },
  );
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  assert.equal((await page.evaluate(() => window.smoke.read())).attempts, 1);
  const evidence = await page.evaluate(() => window.smoke.assetEvidence());
  for (const part of ['wood_left', 'wood_center', 'wood_right'])
    assert(evidence.some((e) => e.path.endsWith(`/${part}.png`)));
  await page.evaluate(() => window.smoke.retry());
  await page.waitForFunction(() => window.smoke.read().attempts === 2);
  assert.equal(
    (await page.evaluate(() => window.smoke.resources())).textures,
    before.textures,
  );
  assert.deepEqual(
    await page.evaluate(() => window.smoke.document()),
    solution,
  );
  checks.push(
    'Earth lands on the supplied platform surface, crosses module seams, reaches the exit and restarts without accumulating textures.',
  );
  assert.deepEqual(errors, []);
  const result = { passed: true, decoded, checks, errors };
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
