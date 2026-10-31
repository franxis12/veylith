import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5186',
  output = resolve(process.env.SMOKE_OUTPUT || 'work/advanced-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = (fn, arg, timeout = 18000) =>
  page.waitForFunction(fn, arg, { timeout });
const wait = (ms) => page.waitForTimeout(ms);
const record = (text) => {
  checks.push(text);
  console.log(text);
};
const cast = async () => {
  await input('use_ability');
  await wait(50);
  await input('use_ability', 'released');
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
async function restart() {
  const n = (await read()).attempts;
  await input('restart_level');
  await until((n) => window.smoke.read().attempts > n, n);
  await input('restart_level', 'released');
  await wait(100);
}
async function start(name, variant = '') {
  await page.evaluate(
    async ({ name, variant }) => {
      const d = await (
        await fetch('/src/game/levels/data/lab-' + name + '.json')
      ).json();
      if (variant === 'water')
        d.objects.find((o) => o.type === 'spawn').element = 'water';
      if (variant === 'left') {
        d.objects.find(
          (o) => o.kind === 'directional_gate',
        ).behavior.direction = -1;
        d.objects.find((o) => o.type === 'spawn').x = 1300;
      }
      if (variant === 'occupied') {
        d.objects.find(
          (o) => o.kind === 'directional_gate',
        ).behavior.autostart = true;
        d.objects.find((o) => o.type === 'spawn').x = 760;
        d.objects.find((o) => o.id === 'relock').x = 900;
      }
      if (variant === 'reverse-belt')
        d.objects.find((o) => o.kind === 'conveyor').behavior.direction = -1;
      if (variant === 'hold-receiver')
        d.objects.find((o) => o.kind === 'light_receiver').behavior.latch =
          false;
      if (variant === 'thin-wall') {
        const { createObject, LIBRARY } =
          await import('/src/editor/library.ts');
        const wall = createObject(
          LIBRARY.find((i) => i.id === 'pillar'),
          600,
          0,
          d.objects,
        );
        wall.collider = { enabled: true, x: 0, y: 0, width: 1, height: 650 };
        d.objects.push(wall);
        d.objects = d.objects.filter(
          (o) => o.type !== 'block' && o.type !== 'plate',
        );
      }
      await window.smoke.start('forest-1', d);
    },
    { name, variant },
  );
  await wait(200);
}
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await until(() => window.smoke);
  await start('reflectors', 'water');
  await input('move_right');
  await wait(3300);
  await input('move_right', 'released');
  assert(
    Math.abs((await read()).world.find((o) => o.id === 'mirror').body.x - 490) <
      1,
  );
  record('Water cannot push the mirror through normal movement.');
  await start('reflectors');
  await input('move_right');
  await until(
    () => window.smoke.read().world.find((o) => o.id === 'receiver').active,
  );
  await input('move_right', 'released');
  let r = await read();
  assert(r.world.find((o) => o.id === 'mirror').body.x > 700);
  assert.equal(r.element, 'earth');
  await page.screenshot({ path: resolve(output, 'reflector-lit.png') });
  await input('jump');
  await wait(50);
  await input('jump', 'released');
  await move(1500);
  assert.equal((await read()).attempts, 1);
  record(
    'Earth pushes the real gravity-driven mirror; reflected light activates the receiver and opens the linked classic door.',
  );
  await restart();
  assert(!(await read()).world.find((o) => o.id === 'receiver').active);
  assert(
    Math.abs((await read()).world.find((o) => o.id === 'mirror').body.x - 490) <
      1,
  );
  record('Restart resets mirror position and receiver latch.');
  await start('pulleys', 'water');
  await wait(800);
  assert.equal(
    (await read()).world.find((o) => o.id === 'platform').progress,
    0,
  );
  await start('pulleys');
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'platform').progress >
      0.9999,
  );
  r = await read();
  assert(
    Math.abs(r.feet - r.world.find((o) => o.id === 'platform').body.y) < 1,
  );
  assert(Math.abs(r.world.find((o) => o.id === 'weight').body.y - 302) < 1);
  await page.screenshot({ path: resolve(output, 'pulley-weight.png') });
  await move(970);
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'platform').progress <
      0.01,
  );
  record(
    'Earth weight lowers the platform with its rider and raises the separate counterweight equally; unloading returns both. Water alone is too light.',
  );
  await restart();
  assert((await read()).world.find((o) => o.id === 'platform').progress < 0.1);
  await start('conveyors');
  const startX = (await read()).x;
  await wait(700);
  r = await read();
  assert(r.x > startX + 50);
  assert(r.block.x > 850);
  await page.screenshot({ path: resolve(output, 'conveyor-moving.png') });
  await until(() => window.smoke.read().plateSolved);
  record(
    'Conveyor transports the player and heavy block; the block drops onto and activates its existing plate.',
  );
  await restart();
  assert(!(await read()).plateSolved);
  await cast();
  const stopped = (await read()).x;
  await wait(700);
  assert(Math.abs((await read()).x - stopped) < 3);
  await cast();
  await wait(600);
  assert((await read()).x > stopped + 40);
  record(
    'Normal power input toggles conveyor off/on; stopped belt holds its rider and restart restores cargo.',
  );
  await start('conveyors', 'reverse-belt');
  const reverse = (await read()).x;
  await wait(500);
  assert((await read()).x < reverse - 30);
  record(
    'Leftward conveyor moves supported bodies in the configured direction.',
  );
  await start('conveyors', 'thin-wall');
  await wait(1800);
  assert((await read()).x <= 569.1);
  record('Conveyor carry stops at a one-unit wall instead of tunnelling.');
  await start('directional-gates');
  await input('move_right');
  await wait(3500);
  await input('move_right', 'released');
  assert((await read()).x <= 835.1);
  await restart();
  await cast();
  assert((await read()).world.find((o) => o.id === 'gate').active);
  await move(1200);
  await input('move_left');
  await wait(1600);
  await input('move_left', 'released');
  assert((await read()).x >= 1076.9);
  record(
    'Locked gate blocks; unlocked gate passes rightward and blocks return from the opposite side.',
  );
  await page.screenshot({ path: resolve(output, 'gate-return-blocked.png') });
  await start('directional-gates', 'left');
  await cast();
  await move(760);
  await input('move_right');
  await wait(1000);
  await input('move_right', 'released');
  assert((await read()).x <= 835.1);
  record('Leftward gate mirrors the permitted and blocked approaches.');
  await start('directional-gates', 'occupied');
  await move(950);
  await cast();
  assert(!(await read()).world.find((o) => o.id === 'gate').active);
  await move(1200);
  await input('move_left');
  await wait(1400);
  await input('move_left', 'released');
  assert((await read()).x >= 1076.9);
  record(
    'Relocking while inside allows the authorized body to finish crossing, then blocks re-entry without ejecting or trapping it.',
  );
  await start('pulleys');
  await wait(300);
  await page.evaluate(() => window.smoke.pause());
  const paused = (await read()).world.find((o) => o.id === 'platform').progress;
  await wait(350);
  assert.equal(
    (await read()).world.find((o) => o.id === 'platform').progress,
    paused,
  );
  await page.evaluate(() => window.smoke.resume());
  await page.setViewportSize({ width: 1280, height: 720 });
  await restart();
  const resources = await page.evaluate(() => window.smoke.resources());
  for (let i = 0; i < 3; i++) await restart();
  assert.deepEqual(
    await page.evaluate(() => window.smoke.resources()),
    resources,
  );
  record(
    'Pause freezes simulation; resize and repeated restart retain stable object, texture and physics-listener counts.',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(
      {
        passed: true,
        checks,
        errors,
        assets: await page.evaluate(() => window.smoke.assetEvidence()),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  console.error(error);
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        error: String(error),
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
