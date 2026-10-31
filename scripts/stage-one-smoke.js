import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5184';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/stage-one-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const wait = (ms) => page.waitForTimeout(ms),
  read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = (fn, arg, timeout = 12000) =>
  page.waitForFunction(fn, arg, { timeout });
const cast = async () => {
  await input('use_ability');
  await wait(60);
  await input('use_ability', 'released');
};
const restart = async () => {
  const n = (await read()).attempts;
  await input('restart_level');
  await until((n) => window.smoke.read().attempts > n, n);
  await input('restart_level', 'released');
  await wait(100);
};
async function move(x) {
  const dir = (await read()).x < x ? 'move_right' : 'move_left';
  await input(dir);
  await until(
    ({ x, dir }) => {
      const r = window.smoke.read();
      if (dir === 'move_right' ? r.x < x : r.x > x) return false;
      window.smoke.input(dir, 'released');
      return true;
    },
    { x, dir },
  );
}
async function start(name, variant) {
  await page.evaluate(
    async ({ name, variant }) => {
      const d = await (
        await fetch('/src/game/levels/data/lab-' + name + '.json')
      ).json();
      if (variant === 'projectile') {
        d.objects.find((o) => o.type === 'spawn').element = 'water';
        const sw = d.objects.find((o) => o.kind === 'fire_switch');
        sw.x = 400;
        sw.y = 490;
        sw.effect = { enabled: true, x: 0, y: 0, width: 128, height: 128 };
        sw.behavior.trigger = 'fire';
        const { createObject, LIBRARY } =
          await import('/src/editor/library.ts');
        d.objects.push(
          createObject(
            LIBRARY.find((i) => i.id === 'gem:fire'),
            250,
            535,
            d.objects,
          ),
        );
      }
      await window.smoke.start('forest-1', d);
    },
    { name, variant },
  );
}
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await until(() => window.smoke);
  await start('timed-door');
  await wait(200);
  assert.equal(
    (await read()).world.find((o) => o.kind === 'timed_door').body.enable,
    true,
  );
  await cast();
  assert.equal(
    (await read()).world.find((o) => o.kind === 'timed_door').body.enable,
    false,
  );
  await page.evaluate(() => window.smoke.pause());
  const paused = (await read()).world.find(
    (o) => o.kind === 'timed_door',
  ).remainingMs;
  await wait(500);
  assert.equal(
    (await read()).world.find((o) => o.kind === 'timed_door').remainingMs,
    paused,
  );
  await page.evaluate(() => window.smoke.resume());
  await move(750);
  await wait(1800);
  let r = await read();
  let door = r.world.find((o) => o.kind === 'timed_door');
  assert.equal(door.active, false);
  assert.equal(door.body.enable, false, 'must not close through player');
  await move(950);
  await wait(100);
  assert.equal(
    (await read()).world.find((o) => o.kind === 'timed_door').body.enable,
    true,
  );
  await restart();
  r = await read();
  assert.equal(r.world.find((o) => o.kind === 'timed_door').body.enable, true);
  assert.equal(r.world.find((o) => o.kind === 'fire_switch').active, false);
  checks.push(
    'Door opens by input, pauses its clock, expires, waits for player clearance, closes and resets.',
  );
  await start('phase-platform');
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'disappearing_platform')
        .contact,
  );
  await until(
    () =>
      !window.smoke.read().world.find((o) => o.kind === 'disappearing_platform')
        .body.enable,
  );
  await wait(400);
  r = await read();
  assert(r.feet > 540, JSON.stringify(r));
  assert.equal(r.world[0].body.enable, false);
  await move(820);
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'disappearing_platform')
        .body.enable,
  );
  await restart();
  assert.equal((await read()).world[0].phaseMs, 0);
  checks.push(
    'Contact platform drops its rider after the delay, returns after hidden interval and resets.',
  );
  await start('bounce');
  await until(() => window.smoke.read().world[0].launches > 0);
  await until(() => window.smoke.read().feet < 300);
  r = await read();
  assert.equal(r.element, 'earth');
  assert.equal(r.attempts, 1);
  await page.screenshot({ path: resolve(output, 'bounce.png') });
  await restart();
  assert.equal((await read()).world[0].launches, 0);
  checks.push(
    'Bounce launches the real player upward and resets; element stays Earth.',
  );
  await start('floating-block');
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'floating_wooden_block')
        .active,
  );
  await until(() => window.smoke.read().x > 720);
  r = await read();
  const raft = r.world.find((o) => o.kind === 'floating_wooden_block');
  assert.equal(r.attempts, 1, JSON.stringify(r));
  assert(Math.abs(r.feet - raft.body.y) < 2, JSON.stringify(r));
  assert(Math.abs(raft.body.y - 539) < 2, JSON.stringify(r));
  await page.screenshot({ path: resolve(output, 'float.png') });
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'floating_wooden_block')
        .body.x >= 1257,
    undefined,
    15000,
  );
  await move(1470);
  assert.equal((await read()).attempts, 1);
  await restart();
  assert(
    (await read()).world.find((o) => o.kind === 'floating_wooden_block').body
      .x < 500,
  );
  checks.push(
    'Floating block falls into water, reaches its draft and carries Earth with the current, without a water retry.',
  );
  await start('energy-barrier');
  await input('move_right');
  await wait(3000);
  await input('move_right', 'released');
  r = await read();
  assert(r.x <= 709, JSON.stringify(r));
  await restart();
  await wait(150);
  await cast();
  assert.equal(
    (await read()).world.find((o) => o.kind === 'energy_barrier').body.enable,
    false,
  );
  const barrierAttempt = (await read()).attempts;
  await move(1050);
  assert.equal((await read()).attempts, barrierAttempt);
  checks.push(
    'Active barrier blocks real movement; switch off removes collision and restart restores it.',
  );
  await start('switch');
  await wait(150);
  await cast();
  r = await read();
  assert(r.world.find((o) => o.kind === 'timed_door').active);
  assert(r.world.find((o) => o.kind === 'energy_barrier').body.enable);
  await move(470);
  await cast();
  r = await read();
  assert(!r.world.find((o) => o.kind === 'timed_door').active);
  assert(!r.world.find((o) => o.kind === 'energy_barrier').body.enable);
  await move(730);
  await cast();
  r = await read();
  assert(r.world.find((o) => o.kind === 'timed_door').active);
  assert(r.world.find((o) => o.kind === 'energy_barrier').body.enable);
  checks.push(
    'Activate / deactivate / toggle switches command two mechanism IDs using normal input.',
  );
  await start('timed-door', 'projectile');
  await cast();
  await wait(650);
  assert.equal(
    (await read()).world.find((o) => o.kind === 'fire_switch').active,
    false,
  );
  await input('move_right');
  await until(() => window.smoke.read().element === 'fire');
  await input('move_right', 'released');
  await wait(250);
  await cast();
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'fire_switch').active,
  );
  assert((await read()).world.find((o) => o.kind === 'timed_door').active);
  checks.push(
    'Wrong element is ignored; a real Fire gem pickup and projectile activate the configured switch.',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(200);
  await restart();
  const resources = await page.evaluate(() => window.smoke.resources());
  for (let i = 0; i < 3; i++) {
    await restart();
    await wait(100);
  }
  assert.deepEqual(
    await page.evaluate(() => window.smoke.resources()),
    resources,
  );
  // Simulate an imperfect export using a real static PNG as a truncated sheet.
  // No source asset is changed; optional-sheet validation must choose fallback art.
  await page.route('**/assets/objects/**/*_spritesheet.png', async (route) => {
    const response = await page.request.get(
      base + '/assets/objects/mechanisms/timed_door/door_closed.png',
    );
    await route.fulfill({ response });
  });
  await start('timed-door');
  await wait(150);
  await cast();
  assert.equal(
    (await read()).world.find((o) => o.kind === 'timed_door').body.enable,
    false,
  );
  await until(
    () =>
      window.smoke.read().world.find((o) => o.kind === 'timed_door').body
        .enable,
  );
  checks.push(
    'Invalid optional sheets use original static fallback art while door timing and collision remain functional.',
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    checks,
    errors,
    assets: await page.evaluate(() => window.smoke.assetEvidence()),
  };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (e) {
  console.error(e);
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        error: String(e),
        checks,
        errors,
        state: await read().catch(() => null),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
