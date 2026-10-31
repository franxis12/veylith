import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/multiple-blocks-smoke');
await mkdir(out, { recursive: true });
const lab = JSON.parse(
  await readFile(
    root + '/src/game/levels/data/lab-multiple-blocks.json',
    'utf8',
  ),
);
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = (fn, arg, timeout = 16000) =>
  page.waitForFunction(fn, arg, { timeout });
async function start(doc) {
  await page.goto(base + '/scripts/browser-harness.html');
  await until(() => window.smoke);
  await page.evaluate((d) => window.smoke.start('forest-1', d), doc);
  await page.waitForTimeout(500);
}
async function move(x, jump = false) {
  await until(() => window.smoke.read().grounded);
  const direction = (await read()).x < x ? 'move_right' : 'move_left';
  await page.evaluate(
    ({ direction, jump }) => {
      window.smoke.input(direction);
      if (jump) window.smoke.input('jump');
    },
    { direction, jump },
  );
  if (jump) await until(() => !window.smoke.read().grounded);
  await until(
    ({ x, direction }) => {
      const s = window.smoke.read();
      if (direction === 'move_right' ? s.x < x : s.x > x) return false;
      window.smoke.input(direction, 'released');
      window.smoke.input('jump', 'released');
      return true;
    },
    { x, direction },
  );
  if (jump) await until(() => window.smoke.read().grounded);
}
async function pushPlate(id, direction) {
  await input(direction);
  await until(
    ({ id, direction }) => {
      if (!window.smoke.read().plates.find((p) => p.id === id)?.solved)
        return false;
      window.smoke.input(direction, 'released');
      return true;
    },
    { id, direction },
  );
}
const pass = (name) => {
  results.push(name);
  console.log(name);
};
try {
  await start(lab);
  assert.equal((await read()).blocks.length, 3);
  await pushPlate('plate-a', 'move_right');
  assert.equal(
    (await read()).plates.find((p) => p.id === 'plate-b').solved,
    false,
  );
  assert.ok(
    (await read()).plates
      .find((p) => p.id === 'plate-a')
      .texture.endsWith('plateActive'),
  );
  await move(650, true);
  await move(990);
  await move(1180, true);
  await pushPlate('plate-b', 'move_left');
  assert.ok((await read()).blocks.slice(0, 2).every((b) => b.docked));
  assert.equal((await read()).blocks[2].docked, false);
  await move(1390);
  await input('move_right');
  await until(() => {
    if (window.smoke.read().blocks.find((b) => b.id === 'step-block').x < 1590)
      return false;
    window.smoke.input('move_right', 'released');
    return true;
  });
  await move(1590, true);
  let s = await read();
  assert.ok(Math.abs(s.feet - s.blocks[2].top) < 2);
  await page.waitForTimeout(400);
  assert.ok(
    Math.abs((await read()).blocks[2].x - s.blocks[2].x) < 1,
    'standing must not push',
  );
  await page.screenshot({ path: out + '/standing-on-free-block.png' });
  await move(1780, true);
  await until(() => window.smoke.read().run.phase === 'complete');
  assert.equal((await read()).attempts, 1);
  pass(
    'Completes lab with two independently pushed/latched blocks and a free block used as a step',
  );
  await page.screenshot({ path: out + '/lab-completed.png' });
  await page.evaluate(() => window.smoke.retry());
  await until(() => window.smoke.read().attempts === 2);
  await page.waitForTimeout(400);
  s = await read();
  assert.ok(s.blocks.every((b) => !b.docked));
  assert.ok(s.plates.every((p) => !p.solved));
  assert.deepEqual(
    s.blocks.map((b) => Math.round(b.x)),
    [358, 1088, 1494],
  );
  pass('Restart restores every block position and both plate signals');

  const free = structuredClone(lab);
  free.objects = free.objects.filter((o) =>
    ['spawn', 'floor', 'cargo-a', 'cargo-b', 'step-block', 'exit'].includes(
      o.id,
    ),
  );
  free.objects.find((o) => o.type === 'exit').requires = [];
  free.objects
    .filter((o) => o.type === 'block')
    .forEach((o) => (o.plateId = ''));
  free.objects.find((o) => o.id === 'cargo-b').x = 560;
  await start(free);
  await input('move_right');
  await page.waitForTimeout(3000);
  await input('move_right', 'released');
  s = await read();
  assert.ok(
    s.blocks[0].right <= s.blocks[1].left + 1,
    'blocks cannot pass through each other',
  );
  assert.ok(Math.abs(s.blocks[1].left - 560) < 1, 'no remote chain push');
  assert.ok(s.blocks[0].left > 310, 'first block must move');
  pass(
    'Free blocks collide without overlap or remotely pushing the next block',
  );

  const stack = structuredClone(free);
  stack.objects.find((o) => o.id === 'cargo-b').x = 310;
  stack.objects.find((o) => o.id === 'cargo-b').y = 250;
  await start(stack);
  await until(() => {
    const b = window.smoke.read().blocks;
    return b[1].grounded && Math.abs(b[1].bottom - b[0].top) < 2;
  });
  await page.waitForTimeout(500);
  s = await read();
  assert.ok(Math.abs(s.blocks[0].bottom - 650) < 2);
  assert.ok(Math.abs(s.blocks[1].bottom - s.blocks[0].top) < 2);
  pass('A falling block lands and remains supported on another block');

  const shared = structuredClone(lab);
  shared.objects = shared.objects.filter(
    (o) => !['plate-b', 'both-door'].includes(o.id),
  );
  shared.objects.find((o) => o.type === 'exit').requires = ['plate-a'];
  shared.objects.find((o) => o.id === 'cargo-b').plateId = 'plate-a';
  await start(shared);
  await pushPlate('plate-a', 'move_right');
  await move(650, true);
  await move(990);
  await move(1180, true);
  await input('move_left');
  await page.waitForTimeout(1000);
  await input('move_left', 'released');
  s = await read();
  assert.ok(s.blocks[1].x < 1060 && !s.blocks[1].docked);
  assert.equal(s.blocks[0].docked, true);
  pass(
    'Activating a shared plate leaves its other block movable until it makes its own contact',
  );

  const water = structuredClone(free);
  water.objects.find((o) => o.type === 'spawn').element = 'water';
  water.objects.find((o) => o.type === 'spawn').x = 950;
  await start(water);
  await input('move_right');
  await page.waitForTimeout(2300);
  await input('move_right', 'released');
  assert.equal(Math.round((await read()).blocks[2].x), 1494);
  pass('Water cannot push the unlinked third block');

  const lost = structuredClone(free);
  const ground = lost.objects.find((o) => o.id === 'floor');
  ground.width = 1280;
  ground.collider.width = 1280;
  lost.objects.find((o) => o.id === 'step-block').y = 200;
  await start(lost);
  await until(() => window.smoke.read().attempts === 2);
  s = await read();
  assert.ok(s.blocks[2].bottom < 600);
  assert.equal(Math.round(s.blocks[0].x), 358);
  pass('Loss of the third block triggers a full automatic restart');
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/results.json',
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  const state = await read().catch(() => null);
  await writeFile(
    out + '/failure.json',
    JSON.stringify({ error: String(error), state, results, errors }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
