import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/earth-block-jump');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }),
  errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  const fixture = await page.evaluate(async () => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const d = newLevel('test-earth-block-jump');
    const block = createObject(
      LIBRARY.find((o) => o.id === 'block'),
      400,
      464,
      d.objects,
    );
    d.objects.push(block);
    d.objects.find((o) => o.type === 'spawn').element = 'earth';
    return d;
  });
  for (const fitCollider of [false, true])
    for (const side of ['left', 'right']) {
      const d = structuredClone(fixture),
        b = d.objects.find((o) => o.type === 'block'),
        spawn = d.objects.find((o) => o.type === 'spawn');
      if (fitCollider)
        b.collider = {
          enabled: true,
          x: 0,
          y: 0,
          width: b.width,
          height: b.height,
        };
      spawn.x =
        (side === 'left' ? b.x - 39 : b.x + b.width + 39) - spawn.width / 2;
      await page.evaluate((d) => window.smoke.start('forest-1', d), d);
      await page.waitForTimeout(300);
      const outcome = await page.evaluate(async (side) => {
        const direction = side === 'left' ? 'move_right' : 'move_left',
          start = window.smoke.read(),
          target = start.blocks[0].x;
        let airborne = false,
          minFeet = start.feet;
        window.smoke.input(direction);
        window.smoke.input('jump');
        const began = performance.now();
        while (performance.now() - began < 3000) {
          await new Promise(requestAnimationFrame);
          const s = window.smoke.read(),
            b = s.blocks[0];
          minFeet = Math.min(minFeet, s.feet);
          if (s.feet < start.feet - 5) airborne = true;
          if (side === 'left' ? s.x >= target : s.x <= target)
            window.smoke.input(direction, 'released');
          if (airborne && s.grounded && Math.abs(s.feet - b.top) < 1) {
            window.smoke.input(direction, 'released');
            window.smoke.input('jump', 'released');
            return {
              landed: true,
              height: start.feet - minFeet,
              blockHeight: b.height,
              feet: s.feet,
              blockTop: b.top,
              attempts: s.attempts,
            };
          }
        }
        window.smoke.input(direction, 'released');
        window.smoke.input('jump', 'released');
        return { landed: false, state: window.smoke.read() };
      }, side);
      assert.equal(outcome.landed, true, JSON.stringify(outcome));
      assert.equal(outcome.attempts, 1);
      results.push({ side, fitCollider, ...outcome });
      await page.screenshot({
        path: out + `/on-block-${side}-${fitCollider ? '186' : '180'}.png`,
      });
    }
  const heights = {};
  for (const element of ['earth', 'water']) {
    const d = structuredClone(fixture);
    d.objects = d.objects.filter((o) => o.type !== 'block');
    d.objects.find((o) => o.type === 'spawn').element = element;
    await page.evaluate((d) => window.smoke.start('forest-1', d), d);
    await page.waitForTimeout(300);
    heights[element] = await page.evaluate(async () => {
      const feet = window.smoke.read().feet;
      let min = feet;
      window.smoke.input('jump');
      const start = performance.now();
      while (performance.now() - start < 1500) {
        await new Promise(requestAnimationFrame);
        min = Math.min(min, window.smoke.read().feet);
      }
      window.smoke.input('jump', 'released');
      return feet - min;
    });
  }
  assert.ok(heights.earth > 200 && heights.earth < 215);
  assert.ok(heights.water > 165 && heights.water < 175);
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/results.json',
    JSON.stringify({ passed: true, heights, results, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ passed: true, heights, landings: results.length }),
  );
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
