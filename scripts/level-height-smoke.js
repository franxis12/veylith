// Editor height regression with real UI and Arcade physics. No level files are written.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5178';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/level-height-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
});
page.on('dialog', (d) => d.accept());
const button = (name) => page.getByRole('button', { name, exact: true });
const field = (name) => page.getByRole('spinbutton', { name, exact: true });
const set = async (name, value) => {
  await field(name).fill(String(value));
  await field(name).press('Tab');
};
const read = () => page.evaluate(() => window.smoke.read());
const until = async (fn, arg) => {
  try {
    await page.waitForFunction(fn, arg, { timeout: 20000 });
  } catch (e) {
    throw new Error(`${e.message}\n${JSON.stringify(await read())}`, {
      cause: e,
    });
  }
};
try {
  await page.goto(`${base}/editor`);
  await page.getByRole('status').filter({ hasText: 'Nivel abierto' }).waitFor();
  await button('Nuevo').click();
  await button('Propiedades del nivel').click();
  await set('Alto del nivel', 2100);
  assert.equal(await field('Límite de caída').inputValue(), '2000');
  await button('Deshacer').click();
  assert.equal(await field('Alto del nivel').inputValue(), '1100');
  assert.equal(await field('Límite de caída').inputValue(), '1000');
  await button('Rehacer').click();
  assert.equal(await field('Alto del nivel').inputValue(), '2100');
  assert.equal(await field('Límite de caída').inputValue(), '2000');
  await set('Límite de caída', 1000);
  await button('Llevar límite al fondo').click();
  assert.equal(await field('Límite de caída').inputValue(), '2100');
  await button('Deshacer').click();
  assert.equal(await field('Límite de caída').inputValue(), '1000');
  await button('Rehacer').click();
  assert.equal(await field('Límite de caída').inputValue(), '2100');
  await set('Límite de caída', 2000);
  results.push(
    'Height moves the fall boundary; undo/redo and repair of an old boundary work in the inspector',
  );
  for (const [id, y] of [
    ['terrain', 1650],
    ['spawn', 1476],
    ['exit', 1374],
  ]) {
    await page
      .locator('.object-tree button')
      .filter({ hasText: new RegExp(`^${id}\\s`) })
      .click();
    await set('Posición Y', y);
  }
  await button('Propiedades del nivel').click();
  await button('Encuadrar').click();
  await page.getByRole('checkbox', { name: 'Rejilla', exact: true }).uncheck();
  await page.screenshot({ path: resolve(output, 'expanded-level-editor.png') });
  await button('▶ Probar').click();
  await page.getByRole('button', { name: 'Move right', exact: true }).waitFor();
  await page.waitForFunction(() =>
    /[1-9]\d*\.\d s/.test(
      document.querySelector('.playtest-bar')?.textContent || '',
    ),
  );
  await page.keyboard.down('d');
  await page.getByText(/^Completado ·/).waitFor({ timeout: 20000 });
  await page.keyboard.up('d');
  await page.screenshot({ path: resolve(output, 'lower-floor-complete.png') });
  await button('Reiniciar prueba').click();
  await page.getByRole('button', { name: 'Move right', exact: true }).waitFor();
  await button('■ Detener y volver al editor').click();
  assert.equal(await field('Alto del nivel').inputValue(), '2100');
  assert.equal(await field('Límite de caída').inputValue(), '2000');
  results.push(
    'A level edited below the old limit can be played, completed, restarted and returned to without losing the draft',
  );

  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  const documents = await page.evaluate(async () => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const { EditorModel } = await import('/src/editor/model.ts');
    const model = new EditorModel(newLevel('height-regression'));
    model.resizeHeight(2100);
    model.commit((d) => {
      for (const o of d.objects) if (o.type !== 'spawn') o.y += 1000;
    });
    const lower = model.getSnapshot().document;
    const fall = structuredClone(lower);
    const floor = fall.objects.find((o) => o.type === 'terrain');
    floor.width = 512;
    floor.collider.width = 480;
    const bottom = structuredClone(fall);
    bottom.fallLimit = bottom.height;
    const block = structuredClone(lower);
    const plate = createObject(
      LIBRARY.find((i) => i.id === 'plate'),
      990,
      1624,
      block.objects,
    );
    block.objects.push(plate);
    const heavy = createObject(
      LIBRARY.find((i) => i.id === 'block'),
      1018,
      200,
      block.objects,
    );
    block.objects.push(heavy);
    return { lower, fall, bottom, block };
  });
  const start = async (name) => {
    console.log('Testing', name);
    await page.evaluate(
      async (d) => window.smoke.start('forest-1', d),
      documents[name],
    );
  };
  await start('lower');
  await until(() => {
    const s = window.smoke.read();
    return s.feet > 1600 && s.grounded;
  });
  const landed = await read();
  assert.equal(landed.attempts, 1);
  assert.ok(Math.abs(landed.feet - 1650) < 1);
  assert.ok(landed.camera.y > 900);
  assert.ok(
    landed.feet >= landed.camera.y &&
      landed.feet < landed.camera.y + landed.camera.height,
  );
  await page.evaluate(() => window.smoke.input('move_right'));
  await until(() => window.smoke.read().run.phase === 'complete');
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  assert.equal((await read()).attempts, 1);
  await page.evaluate(() => window.smoke.retry());
  await until(() => window.smoke.read().attempts === 2);
  results.push(
    'Real player falls past the previous limit, lands on the lower floor, stays in camera, wins and restarts',
  );
  for (const name of ['fall', 'bottom']) {
    await start(name);
    await until(() => {
      const s = window.smoke.read();
      return s.feet > 1600 && s.grounded;
    });
    await page.evaluate(() => window.smoke.input('move_right'));
    await until(() => window.smoke.read().attempts === 2);
    await page.evaluate(() => window.smoke.input('move_right', 'released'));
    assert.ok((await read()).feet < 1000);
  }
  results.push(
    'Falling off the lower floor restarts at both an inset fall limit and the exact world bottom',
  );
  await start('block');
  await until(() => window.smoke.read().plateSolved);
  const block = await read();
  assert.equal(block.attempts, 1);
  assert.ok(Math.abs(block.block.bottom - 1649) < 2);
  results.push(
    'A heavy block also falls past the old limit and activates a plate in the added area',
  );
  assert.deepEqual(errors, []);
  const report = { passed: true, results, errors };
  console.log(JSON.stringify(report, null, 2));
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\n${JSON.stringify(errors)}`,
  );
  throw error;
} finally {
  await browser.close();
}
