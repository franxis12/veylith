// Real Arcade physics regression for editor-placed blocks. No level files are written.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5178';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/heavy-block-smoke');
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
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = async (fn, arg, timeout = 20000) => {
  try {
    await page.waitForFunction(fn, arg, { timeout });
  } catch (e) {
    throw new Error(`${e.message}\n${JSON.stringify(await read())}`, {
      cause: e,
    });
  }
};
try {
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  const documents = await page.evaluate(async () => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const make = (
      name,
      bx,
      feet,
      width = 64,
      height = 56,
      px = 1050,
      element = 'earth',
    ) => {
      const d = newLevel(`test-${name}`);
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.element = element;
      const plate = createObject(
        LIBRARY.find((i) => i.id === 'plate'),
        px - 60,
        624,
        d.objects,
      );
      d.objects.push(plate);
      d.objects.find((o) => o.type === 'exit').requires = [plate.id];
      const block = createObject(
        LIBRARY.find((i) => i.id === 'block'),
        bx - width / 2,
        feet - height,
        d.objects,
      );
      block.width = width;
      block.height = height;
      block.collider = { enabled: true, x: 0, y: 0, width, height };
      d.objects.push(block);
      return d;
    };
    const fall = make('fall', 1050, 200, 192, 96, 1050, 'water');
    const left = make('left', 900, 650, 128, 96, 600);
    left.objects.find((o) => o.type === 'spawn').x = 1150 - 31;
    const ledge = make('ledge', 560, 350);
    const floor = ledge.objects.find((o) => o.type === 'terrain');
    floor.x = 768;
    floor.width = 1280;
    floor.collider.width = 1248;
    const upper = createObject(
      LIBRARY.find((i) => i.id === 'platform'),
      0,
      350,
      ledge.objects,
    );
    upper.width = 768;
    upper.collider.width = 736;
    ledge.objects.push(upper);
    ledge.objects.find((o) => o.type === 'spawn').y = 350 - 174;
    const water = make('water', 450, 650, 64, 56, 1050, 'water');
    const wall = make('wall', 450, 650);
    const obstacle = createObject(
      LIBRARY.find((i) => i.id === 'column'),
      700,
      300,
      wall.objects,
    );
    obstacle.width = 80;
    obstacle.height = 350;
    obstacle.collider = { enabled: true, x: 0, y: 0, width: 80, height: 350 };
    wall.objects.push(obstacle);
    const lost = make('lost', 1000, 200, 64, 56, 1300);
    const small = lost.objects.find((o) => o.type === 'terrain');
    small.width = 512;
    small.collider.width = 480;
    return { fall, left, ledge, water, wall, lost };
  });
  const start = async (name) => {
    await page.evaluate(
      async (d) => window.smoke.start('forest-4', d),
      documents[name],
    );
    await page.waitForTimeout(120);
    console.log('Testing', name);
  };
  await start('fall');
  assert.equal((await read()).block.width, 192);
  assert.equal((await read()).block.height, 96);
  await until(() => window.smoke.read().plateSolved);
  const landed = await read();
  assert.ok(Math.abs(landed.block.bottom - 649) <= 2);
  assert.ok(Math.abs(landed.block.x - 1050) < 1);
  await page.waitForTimeout(400);
  assert.equal((await read()).block.vy, 0);
  assert.equal((await read()).block.bottom, landed.block.bottom);
  await page.evaluate(() => window.smoke.retry());
  await until(() => window.smoke.read().attempts === 2);
  assert.equal((await read()).plateSolved, false);
  assert.ok((await read()).block.bottom < 300);
  results.push(
    'Resized block falls from above onto plate, latches and restores on restart',
  );
  await start('left');
  await input('move_left');
  await until(() => window.smoke.read().plateSolved);
  await input('move_left', 'released');
  assert.ok((await read()).block.x < 665);
  results.push('Earth pushes a resized block toward a plate on the left');
  await start('ledge');
  await input('move_right');
  await until(() => {
    const b = window.smoke.read().block;
    return b.bottom > 352 && b.vy > 20;
  });
  assert.equal((await read()).plateSolved, false);
  await input('move_right', 'released');
  await until(() => {
    const b = window.smoke.read().block;
    return b.grounded && b.bottom >= 648;
  });
  // Follow the dropped block: walk off the ledge, land to its left, then push.
  await input('move_right');
  await until(() => window.smoke.read().x >= 800);
  await input('move_right', 'released');
  await until(() => {
    const s = window.smoke.read();
    return s.grounded && s.feet >= 648;
  });
  await input('move_right');
  await until(() => window.smoke.read().plateSolved);
  await input('move_right', 'released');
  assert.equal((await read()).attempts, 1);
  results.push(
    'Earth pushes a block off an upper ledge; it falls, lands and reaches the lower plate',
  );
  await start('water');
  await input('move_right');
  await page.waitForTimeout(1800);
  await input('move_right', 'released');
  assert.ok(Math.abs((await read()).block.x - 450) < 1);
  assert.equal((await read()).plateSolved, false);
  results.push('Water cannot push the heavy block');
  await start('wall');
  await input('move_right');
  await page.waitForTimeout(4500);
  await input('move_right', 'released');
  const stopped = await read();
  assert.ok(
    stopped.block.x > 600 && stopped.block.x + stopped.block.width / 2 <= 700.1,
  );
  assert.equal(stopped.plateSolved, false);
  results.push(
    'A solid obstacle stops a pushed block without teleporting it to its plate',
  );
  await start('lost');
  await until(() => window.smoke.read().attempts === 2);
  assert.equal((await read()).plateSolved, false);
  assert.ok((await read()).block.bottom < 300);
  results.push(
    'Losing the block below the fall limit automatically restores the whole attempt',
  );
  await page.goto(`${base}/editor`);
  await page.getByRole('status').filter({ hasText: 'Nivel abierto' }).waitFor();
  const button = (name) => page.getByRole('button', { name, exact: true });
  await button('Abrir').click();
  await page.getByRole('dialog').getByRole('combobox').selectOption('forest-4');
  await button('Abrir seleccionado').click();
  await page
    .locator('.object-tree button')
    .filter({ hasText: /^heavy-block\s/ })
    .click();
  const field = (name) => page.getByRole('spinbutton', { name, exact: true });
  for (const [name, value] of [
    ['Posición X', '1500'],
    ['Posición Y', '100'],
    ['Ancho visual', '192'],
    ['Alto visual', '96'],
  ]) {
    await field(name).fill(value);
    await field(name).blur();
  }
  await button('Ajustar collider al tamaño visual').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="Ancho collider"]')?.value === '192',
  );
  assert.equal(await field('Alto collider').inputValue(), '96');
  await button('▶ Probar').click();
  await page.locator('.playtest-bar').waitFor();
  await page.waitForFunction(() =>
    /\d+\.\d s/.test(
      document.querySelector('.playtest-bar')?.textContent || '',
    ),
  );
  await page.waitForTimeout(1300);
  await button('■ Detener y volver al editor').click();
  await field('Posición Y').waitFor();
  assert.equal(await field('Posición Y').inputValue(), '100');
  await page.screenshot({ path: resolve(output, 'resized-block-editor.png') });
  results.push(
    'Editor accepts different height/side and resizes collider via the inspector; unsaved playtest preserves edits',
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
