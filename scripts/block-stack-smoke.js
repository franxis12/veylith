import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/block-stack-smoke');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }),
  errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
async function start(scenario = 'pair', direction = 1) {
  await page.evaluate(
    async ({ scenario, direction }) => {
      const { newLevel, createObject, LIBRARY } =
        await import('/src/editor/library.ts');
      const d = newLevel('block-stack-check');
      d.width = 4096;
      d.height = 1200;
      d.fallLimit = 1100;
      const floor = d.objects.find((o) => o.type === 'terrain');
      floor.width = 4096;
      floor.collider.width = 4064;
      floor.height = floor.collider.height = 550;
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.element = scenario === 'water' ? 'water' : 'earth';
      spawn.x = direction === 1 ? 300 : 730;
      d.objects.find((o) => o.type === 'exit').x = 3800;
      const add = (kind, id, x, y, width, height) => {
        const o = createObject(
          LIBRARY.find((i) => i.id === kind),
          x,
          y,
          d.objects,
        );
        o.id = id;
        Object.assign(o, {
          width,
          height,
          collider: { enabled: true, x: 0, y: 0, width, height },
        });
        if (o.type === 'block') o.plateId = '';
        if (o.type === 'platform') o.width = Math.ceil(width / 128) * 128;
        d.objects.push(o);
        return o;
      };
      const lower = add('block', 'lower', 480, 470, 192, 180);
      add('block', 'upper', 512, 374, 128, 96);
      if (scenario === 'triple') add('block', 'third', 544, 278, 64, 96);
      if (scenario === 'wall') add('platform', 'wall', 900, 300, 32, 350);
      if (scenario === 'upper-wall') add('platform', 'wall', 900, 310, 32, 160);
      if (scenario === 'plate') {
        const plate = add('plate', 'dock', 800, 649, 240, 1);
        lower.plateId = plate.id;
      }
      if (scenario === 'fall') {
        floor.width = 896;
        floor.collider.width = 832;
      }
      const { validateLevel } =
        await import('/src/game/levels/schema/validate.ts');
      const issues = validateLevel(d);
      if (issues.length) throw Error(issues.join('\n'));
      await window.smoke.start('forest-1', d);
    },
    { scenario, direction },
  );
  await page.waitForTimeout(500);
}
const offsets = (r) => r.blocks.slice(1).map((b) => b.left - r.blocks[0].left);
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  for (const direction of [1, -1])
    for (const scenario of ['pair', 'triple']) {
      await start(scenario, direction);
      const initial = await read(),
        expected = offsets(initial);
      await input(direction === 1 ? 'move_right' : 'move_left');
      const samples = [];
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(100);
        const r = await read();
        samples.push(r.blocks);
        offsets(r).forEach((x, j) =>
          assert(
            Math.abs(x - expected[j]) < 1.5,
            JSON.stringify({ scenario, direction, expected, r }),
          ),
        );
        assert.equal(r.attempts, 1);
      }
      await input(direction === 1 ? 'move_right' : 'move_left', 'released');
      await page.waitForTimeout(200);
      const stop = await read();
      assert(Math.abs(stop.blocks[0].left - initial.blocks[0].left) > 100);
      await page.waitForTimeout(350);
      const settled = await read();
      settled.blocks.forEach((b, j) =>
        assert(Math.abs(b.left - stop.blocks[j].left) < 1),
      );
      await writeFile(
        out + `/${scenario}-${direction}.json`,
        JSON.stringify(samples),
      );
      checks.push(
        `${scenario}: carries in direction ${direction}, keeps relative positions and stops together`,
      );
    }
  await page.screenshot({ path: out + '/three-stacked-blocks.png' });
  const listeners = await page.evaluate(
    () => window.smoke.resources().worldstepListeners,
  );
  await page.evaluate(() => window.smoke.retry());
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() => window.smoke.resources().worldstepListeners),
    listeners,
  );
  assert.deepEqual(
    (await read()).blocks.map((b) => Math.round(b.left)),
    [480, 512, 544],
  );
  checks.push(
    'Restart restores all three blocks and does not accumulate physics listeners',
  );
  await start('wall');
  await input('move_right');
  await page.waitForTimeout(4000);
  await input('move_right', 'released');
  let r = await read();
  assert(Math.abs(r.blocks[0].right - 900) < 1);
  assert(Math.abs(offsets(r)[0] - 32) < 1.5);
  checks.push('A wall stops the lower block and its cargo together');
  await start('upper-wall');
  await input('move_right');
  await page.waitForTimeout(5000);
  await input('move_right', 'released');
  r = await read();
  assert(r.blocks[1].right <= 900.1, JSON.stringify(r));
  assert(r.blocks[1].bottom > 600, JSON.stringify(r));
  assert.equal(r.attempts, 1);
  checks.push(
    'Upper obstacle stops cargo; it falls naturally when the lower block moves out',
  );
  await start('plate');
  await input('move_right');
  await page.waitForFunction(() => window.smoke.read().blocks[0].docked);
  await input('move_right', 'released');
  await page.waitForTimeout(300);
  r = await read();
  assert.equal(r.blocks[1].docked, false);
  assert(Math.abs(offsets(r)[0] - 32) < 1.5);
  checks.push('Plate docks only the lower block; its cargo stays supported');
  await start('water');
  await input('move_right');
  await page.waitForTimeout(1800);
  await input('move_right', 'released');
  assert.deepEqual(
    (await read()).blocks.map((b) => Math.round(b.left)),
    [480, 512],
  );
  checks.push('Water still cannot push the lower block or the stack');
  await start('fall');
  await input('move_right');
  await page.waitForFunction(() => window.smoke.read().attempts > 1, null, {
    timeout: 12000,
  });
  await input('move_right', 'released');
  await page.waitForTimeout(500);
  assert.deepEqual(
    (await read()).blocks.map((b) => Math.round(b.left)),
    [480, 512],
  );
  checks.push('A lost block still restarts the entire stack and attempt');
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/results.json',
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  await writeFile(
    out + '/failure.json',
    JSON.stringify(
      {
        error: String(error),
        checks,
        state: await read().catch(() => null),
        errors,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
