import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/jump-through-smoke');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const read = () => page.evaluate(() => window.smoke.read());
async function setup({
  kind = 'boxCollider',
  top = 460,
  height = 20,
  element = 'earth',
  wall = 0,
  conveyor = 0,
} = {}) {
  await page.evaluate(
    async ({ kind, top, height, element, wall, conveyor }) => {
      const { newLevel, createObject, LIBRARY } =
        await import('/src/editor/library.ts');
      const d = newLevel('jump-through-check');
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.x = 609;
      spawn.element = element;
      const surface = createObject(
        LIBRARY.find((i) => i.id === kind),
        wall ? (wall === 1 ? 820 : 420) : 200,
        wall ? 250 : top,
        d.objects,
      );
      Object.assign(surface, {
        id: 'surface',
        width: wall ? 60 : 1024,
        height: wall ? 400 : height,
        collider: {
          enabled: true,
          x: 0,
          y: 0,
          width: wall ? 60 : 1024,
          height: wall ? 400 : height,
        },
      });
      if (conveyor) {
        const belt = createObject(
          LIBRARY.find((i) => i.id === 'world:conveyor'),
          200,
          650,
          d.objects,
        );
        Object.assign(belt, {
          width: 1024,
          height: 32,
          collider: { enabled: true, x: 0, y: 0, width: 1024, height: 32 },
          behavior: {
            kind: 'conveyor',
            direction: conveyor,
            speed: 320,
            segments: 3,
            requires: [],
            autostart: true,
          },
        });
        d.objects.push(belt);
      }
      if (kind === 'world:directional_gate') {
        surface.behavior = {
          kind: 'directionalGate',
          direction: 1,
          requires: [],
          autostart: true,
        };
      }
      if (kind === 'doorClosed') {
        const lock = createObject(
          LIBRARY.find((i) => i.id === 'world:interactive_lever'),
          1200,
          300,
          d.objects,
        );
        lock.id = 'lock';
        surface.requires = [lock.id];
        d.objects.push(lock);
      }
      if (kind === 'world:mechanical_elevator') {
        surface.behavior = {
          kind: 'elevator',
          requires: [],
          autostart: false,
          mode: 'controlled',
          travelX: 0,
          travelY: -100,
          speed: 160,
        };
        const lever = createObject(
          LIBRARY.find((i) => i.id === 'world:interactive_lever'),
          650,
          300,
          d.objects,
        );
        lever.behavior = {
          kind: 'lever',
          initiallyActive: false,
          action: 'toggle',
          targets: ['surface'],
        };
        lever.effect = {
          enabled: true,
          x: -100,
          y: 0,
          width: 300,
          height: 350,
        };
        d.objects.push(lever);
      }
      d.objects.push(surface);
      const { validateLevel } =
        await import('/src/game/levels/schema/validate.ts');
      assertValid(validateLevel(d));
      function assertValid(issues) {
        if (issues.length) throw Error(issues.join('\n'));
      }
      await window.smoke.start('forest-1', d);
    },
    { kind, top, height, element, wall, conveyor },
  );
  await page.waitForTimeout(300);
}
async function jump(direction = 0, duration = 1600) {
  return page.evaluate(
    async ({ direction, duration }) => {
      const move = direction === 1 ? 'move_right' : 'move_left';
      if (direction) window.smoke.input(move);
      window.smoke.input('jump');
      window.smoke.input('jump', 'released');
      const samples = [],
        end = performance.now() + duration;
      while (performance.now() < end) {
        await new Promise(requestAnimationFrame);
        const { x, feet, vy, headContact, grounded, attempts } =
          window.smoke.read();
        samples.push({ x, feet, vy, headContact, grounded, attempts });
      }
      if (direction) window.smoke.input(move, 'released');
      return samples;
    },
    { direction, duration },
  );
}
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  for (const scenario of [
    { kind: 'boxCollider', element: 'earth', top: 460 },
    { kind: 'platform', element: 'earth', top: 460 },
    { kind: 'boxCollider', element: 'water', top: 500 },
    { kind: 'boxCollider', element: 'fire', top: 500 },
    { kind: 'boxCollider', element: 'air', top: 440 },
    { kind: 'boxCollider', element: 'earth', top: 460, height: 140 },
    { kind: 'world:mechanical_elevator', element: 'earth', top: 460 },
  ]) {
    await setup(scenario);
    const samples = await jump(),
      final = samples.at(-1);
    assert(samples.every((s) => !s.headContact && s.attempts === 1));
    assert(Math.min(...samples.map((s) => s.feet)) < scenario.top);
    assert(
      Math.abs(final.feet - scenario.top) < 1 && final.grounded,
      JSON.stringify(final),
    );
    checks.push({
      scenario,
      minFeet: Math.min(...samples.map((s) => s.feet)),
      final,
    });
    if (scenario.kind === 'world:mechanical_elevator') {
      await page.evaluate(() => {
        window.smoke.input('use_ability');
        window.smoke.input('use_ability', 'released');
      });
      await page.waitForFunction(
        () =>
          window.smoke.read().world.find((o) => o.id === 'surface').progress ===
          1,
      );
      const r = await read();
      assert(Math.abs(r.feet - 360) < 1 && r.grounded, JSON.stringify(r));
      checks.push({ elevatorCarriesPlayerAfterLanding: true });
    }
  }
  await setup({ top: 360 });
  const insufficient = await jump();
  assert(
    insufficient.every(
      (s) => !s.headContact && (!s.grounded || Math.abs(s.feet - 650) < 1),
    ),
  );
  assert(
    insufficient.at(-1).grounded &&
      Math.abs(insufficient.at(-1).feet - 650) < 1,
  );
  checks.push({ insufficientHeightFallsBack: true });
  for (const direction of [-1, 1]) {
    await setup();
    const samples = await jump(direction, 1200);
    assert(samples.every((s) => !s.headContact));
    assert(Math.abs(samples.at(-1).feet - 460) < 1 && samples.at(-1).grounded);
    checks.push({ diagonalPassAndLanding: direction });
    await setup({ wall: direction });
    const wall = await jump(direction, 1800);
    assert(
      direction === 1 ? wall.at(-1).x > 911 : wall.at(-1).x < 389,
      JSON.stringify(wall.at(-1)),
    );
    assert(wall.every((s) => !s.headContact));
    assert(Math.abs(wall.at(-1).feet - 650) < 1);
    checks.push({ lateralColliderPass: direction });
    await setup({ kind: 'doorClosed', wall: direction });
    const door = await jump(direction, 1800);
    const halfWidth = (await read()).playerSize.width / 2;
    assert(
      door.every((s) =>
        direction === 1
          ? s.x <= 820 - halfWidth + 0.1
          : s.x >= 480 + halfWidth - 0.1,
      ),
    );
    assert(Math.abs(door.at(-1).feet - 650) < 1);
    checks.push({ closedDoorStillBlocks: direction });
    await setup({ kind: 'world:directional_gate', wall: direction });
    const gate = await jump(direction, 1800);
    assert(
      direction === 1
        ? gate.at(-1).x > 911
        : gate.at(-1).x >= 480 + halfWidth - 0.1,
    );
    checks.push({ directionalGateRespected: direction });
    await setup({ wall: direction, conveyor: direction });
    await page.waitForTimeout(2000);
    const carried = await read();
    assert(
      direction === 1 ? carried.x > 911 : carried.x < 389,
      JSON.stringify(carried),
    );
    assert(Math.abs(carried.feet - 650) < 1 && carried.grounded);
    checks.push({ conveyorPassesColliderSides: direction });
  }
  await setup();
  const resources = await page.evaluate(() => window.smoke.resources());
  for (let i = 0; i < 3; i++) {
    const before = await read();
    await page.evaluate(() => window.smoke.retry());
    await page.waitForFunction(
      (n) => window.smoke.read().attempts > n,
      before.attempts,
    );
    await page.waitForTimeout(200);
    const samples = await jump();
    assert(samples.every((s) => !s.headContact));
    assert(Math.abs(samples.at(-1).feet - 460) < 1 && samples.at(-1).grounded);
    const after = await page.evaluate(() => window.smoke.resources());
    assert.equal(after.worldstepListeners, resources.worldstepListeners);
    assert.equal(after.objects, resources.objects);
  }
  checks.push({ repeatedRestarts: 3 });
  await page.screenshot({ path: out + '/landed.png' });
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/result.json',
    JSON.stringify({ checks, errors }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ passed: checks.length, output: out }));
} finally {
  await browser.close();
}
