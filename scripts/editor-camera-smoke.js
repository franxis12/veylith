// Real editor zoom/fit/lifecycle regression. Draft-only edits; no files are saved.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5190';
const output = resolve(
  process.env.SMOKE_OUTPUT || '/tmp/veylith-editor-camera/browser',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
const errors = [],
  checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).press('Enter');
  await field(name).blur();
};
const camera = () =>
  page.evaluate(() => {
    const scene = window.editorCameraTest;
    const c = scene.cameras.main;
    return {
      zoom: c.zoom,
      scrollX: c.scrollX,
      scrollY: c.scrollY,
      width: c.width,
      height: c.height,
      backgroundSizes: scene.background.map((image) => [
        image.width,
        image.height,
      ]),
      document: scene.model.getSnapshot().document,
      dirty: scene.model.getSnapshot().dirty,
    };
  });
const fits = (view) => {
  assert(view.scrollX <= 0 && view.scrollY <= 0);
  assert(view.scrollX + view.width / view.zoom >= view.document.width);
  assert(view.scrollY + view.height / view.zoom >= view.document.height);
  assert(
    Math.abs(
      -view.scrollX -
        (view.scrollX + view.width / view.zoom - view.document.width),
    ) < 0.001,
  );
  assert(
    Math.abs(
      -view.scrollY -
        (view.scrollY + view.height / view.zoom - view.document.height),
    ) < 0.001,
  );
};
try {
  await page.goto(`${base}/editor`);
  await page
    .getByRole('status')
    .filter({ hasText: 'Nivel abierto' })
    .waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
  // Observe the actual scene; all camera changes below go through the UI.
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .findLast(
        (url) => new URL(url).pathname === '/src/editor/EditorScene.ts',
      );
    if (!url) throw new Error('EditorScene module was not loaded');
    const { EditorScene } = await import(url);
    const original = EditorScene.prototype.zoom;
    EditorScene.prototype.zoom = function (...args) {
      window.editorCameraTest = this;
      return original.apply(this, args);
    };
    window.editorDisposals = 0;
    const dispose = EditorScene.prototype.dispose;
    EditorScene.prototype.dispose = function (...args) {
      window.editorDisposals++;
      return dispose.apply(this, args);
    };
  });
  for (let attempt = 0; attempt < 30; attempt++) {
    await button('−').click();
    if (await page.evaluate(() => !!window.editorCameraTest)) break;
    await page.waitForTimeout(200);
  }
  const original = await camera();
  await set('Zoom del lienzo (%)', 5);
  assert.equal((await camera()).zoom, 0.05);
  await button('−').click();
  assert(Math.abs((await camera()).zoom - 0.04) < 0.00001);
  await set('Zoom del lienzo (%)', 1);
  await button('−').click();
  assert.equal((await camera()).zoom, 0.01);
  assert.equal(await field('Zoom del lienzo (%)').inputValue(), '1');
  assert.deepEqual((await camera()).backgroundSizes, [
    [1280, 720],
    [1280, 720],
    [1280, 720],
  ]);
  await set('Zoom del lienzo (%)', 400);
  assert.equal((await camera()).zoom, 3);
  await set('Zoom del lienzo (%)', 5);
  const beforeWheel = await camera();
  const box = await page.getByLabel('Lienzo del nivel').boundingBox();
  const point = { x: 420, y: 260 };
  await page.mouse.move(box.x + point.x, box.y + point.y);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(
    () => window.editorCameraTest.cameras.main.zoom < 0.05,
  );
  const afterWheel = await camera();
  assert(
    Math.abs(
      beforeWheel.scrollX +
        point.x / beforeWheel.zoom -
        afterWheel.scrollX -
        point.x / afterWheel.zoom,
    ) < 0.01,
  );
  assert(
    Math.abs(
      beforeWheel.scrollY +
        point.y / beforeWheel.zoom -
        afterWheel.scrollY -
        point.y / afterWheel.zoom,
    ) < 0.01,
  );
  assert.deepEqual(afterWheel.document, original.document);
  assert.equal(afterWheel.dirty, original.dirty);
  checks.push(
    'Numeric zoom, buttons and cursor-anchored wheel work down to 1%, without changing the draft or allocating larger background canvases.',
  );
  await button('Propiedades del nivel').click();
  await set('Ancho del nivel', 32768);
  await set('Alto del nivel', 32768);
  const large = (await camera()).document;
  await button('Encuadrar').click();
  const fitted = await camera();
  fits(fitted);
  assert(fitted.zoom < 0.1);
  await page.screenshot({ path: resolve(output, 'whole-level.png') });
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForFunction(() => window.editorCameraTest.scale.width < 700);
  await button('Encuadrar').click();
  fits(await camera());
  assert.deepEqual((await camera()).document, large);
  assert.equal(await page.locator('canvas').count(), 1);
  checks.push(
    'Fit centers all four edges of a 32768×32768 level, including after viewport resize; camera changes preserve objects and colliders.',
  );
  await button('Nuevo').click();
  await page.waitForLoadState('networkidle');
  await button('−').click();
  assert((await page.evaluate(() => window.editorDisposals)) > 0);
  assert.equal(await page.locator('canvas').count(), 1);
  await set('Zoom del lienzo (%)', 25);
  await button('Encuadrar').click();
  fits(await camera());
  assert.deepEqual(errors, []);
  checks.push(
    'Real StrictMode mount, resize and editor teardown/remount preserve one canvas and responsive controls.',
  );
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
  await browser.close();
}
