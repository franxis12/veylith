import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5186',
  output = resolve(process.env.SMOKE_OUTPUT || 'work/advanced-edges');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    headless: true,
  }),
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }),
  checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const read = () => page.evaluate(() => window.smoke.read()),
  wait = (ms) => page.waitForTimeout(ms);
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 18000 });
const cast = async () => {
  await input('use_ability');
  await wait(60);
  await input('use_ability', 'released');
};
const record = (s) => {
  checks.push(s);
  console.log(s);
};
async function start(name, variant) {
  await page.evaluate(
    async ({ name, variant }) => {
      const d = await (
        await fetch('/src/game/levels/data/lab-' + name + '.json')
      ).json();
      const { createObject, LIBRARY } = await import('/src/editor/library.ts');
      const add = (kind, x, y, id) => {
        const o = createObject(
          LIBRARY.find((i) => i.id === kind),
          x,
          y,
          d.objects,
        );
        o.id = id;
        d.objects.push(o);
        return o;
      };
      if (name === 'reflectors') {
        d.objects.find((o) => o.id === 'receiver').behavior.latch = false;
        if (variant !== 'hold')
          d.objects.find((o) => o.id === 'mirror').x = 760;
        if (variant === 'occluded') {
          const wall = add('pillar', 700, 400, 'opaque');
          wall.collider = { enabled: true, x: 0, y: 0, width: 350, height: 2 };
        }
        if (variant === 'source-switch') {
          const sw = add('world:fire_switch', 160, 522, 'source-switch');
          sw.behavior.targets = ['beam'];
        }
      }
      if (name === 'pulleys') {
        const p = d.objects.find((o) => o.id === 'platform');
        p.behavior.mode = 'signal';
        if (variant === 'signal') {
          p.behavior.autostart = false;
          const on = add('world:fire_switch', 600, 230, 'on');
          on.behavior.action = 'activate';
          on.behavior.targets = ['platform'];
          const off = add('world:fire_switch', 600, 460, 'off');
          off.behavior.action = 'deactivate';
          off.behavior.targets = ['platform'];
        }
        if (variant === 'rider-on-cargo') {
          add('plate', 1800, 610, 'plate');
          const block = add('block', 580, 214, 'cargo');
          block.plateId = 'plate';
          d.objects.find((o) => o.type === 'spawn').y = 46;
        }
        if (variant === 'ceiling') {
          p.behavior.travelY = -150;
          const ceiling = add('pillar', 400, 180, 'ceiling');
          ceiling.collider = {
            enabled: true,
            x: 0,
            y: 0,
            width: 500,
            height: 40,
          };
        }
        if (variant === 'counter-stop') {
          const stop = add('pillar', 1040, 400, 'stop');
          stop.collider = { enabled: true, x: 0, y: 0, width: 128, height: 2 };
        }
      }
      if (name === 'directional-gates') {
        d.objects.find((o) => o.id === 'gate').behavior.autostart = true;
        if (variant === 'cargo-right' || variant === 'cargo-wrong') {
          const belt = add('world:conveyor', 400, 610, 'belt');
          belt.behavior.segments = 8;
          belt.width = 1280;
          belt.collider.width = 1256;
          if (variant === 'cargo-wrong') {
            belt.behavior.direction = -1;
            belt.x = 1050;
          }
          add('plate', 1800, 610, 'plate');
          const cargo = add(
            'block',
            variant === 'cargo-wrong' ? 1250 : 550,
            464,
            'cargo',
          );
          cargo.plateId = 'plate';
          if (variant === 'cargo-wrong')
            d.objects.find((o) => o.type === 'spawn').x = 760;
        }
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
  await start('reflectors', 'hold');
  await input('move_right');
  await until(
    () => window.smoke.read().world.find((o) => o.id === 'receiver').active,
  );
  await until(
    () => !window.smoke.read().world.find((o) => o.id === 'receiver').active,
  );
  await input('move_right', 'released');
  record(
    'A non-latching receiver loses its signal when the mirror is pushed past alignment.',
  );
  await start('reflectors', 'occluded');
  await wait(300);
  assert(!(await read()).world.find((o) => o.id === 'receiver').active);
  await start('reflectors', 'source-switch');
  assert((await read()).world.find((o) => o.id === 'receiver').active);
  await cast();
  await wait(100);
  assert(!(await read()).world.find((o) => o.id === 'receiver').active);
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'source-switch')
        .cooldownMs === 0,
  );
  await cast();
  await until(
    () => window.smoke.read().world.find((o) => o.id === 'receiver').active,
  );
  record(
    'A two-unit opaque obstacle interrupts the reflected ray; normal switch input disables and restores the emitter and receiver signal.',
  );
  await start('pulleys', 'signal');
  await wait(300);
  assert.equal(
    (await read()).world.find((o) => o.id === 'platform').progress,
    0,
  );
  await cast();
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'platform').progress >
      0.9999,
  );
  await cast();
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'platform').progress <
      0.0001,
  );
  record(
    'Explicit activate/deactivate commands drive both directions of the pulley in signal mode while carrying the player.',
  );
  await start('pulleys', 'rider-on-cargo');
  await until(
    () =>
      window.smoke.read().world.find((o) => o.id === 'platform').progress >
      0.9999,
  );
  const stacked = await read();
  assert(Math.abs(stacked.feet - stacked.block.top) < 1);
  assert(
    Math.abs(
      stacked.block.bottom -
        stacked.world.find((o) => o.id === 'platform').body.y,
    ) < 1,
  );
  record(
    'The pulley carries a heavy block and its supported player together, preserving both contacts.',
  );
  await start('pulleys', 'ceiling');
  await wait(1200);
  let r = await read();
  assert(r.world.find((o) => o.id === 'platform').progress < 0.06);
  assert(r.feet >= 394);
  assert.equal(r.attempts, 1);
  await start('pulleys', 'counter-stop');
  await wait(1800);
  r = await read();
  assert(r.world.find((o) => o.id === 'platform').progress < 0.51);
  assert(r.world.find((o) => o.id === 'platform').progress > 0.4);
  assert(
    Math.abs(
      r.world.find((o) => o.id === 'platform').body.y +
        r.world.find((o) => o.id === 'weight').body.y -
        902,
    ) < 0.01,
  );
  record(
    'A rider ceiling or thin obstacle on the counterweight stops the whole pair without crushing or desynchronizing.',
  );
  await start('directional-gates', 'cargo-right');
  await until(() => window.smoke.read().block.x > 1180);
  record(
    'A conveyor-driven heavy block crosses an unlocked gate from its allowed side.',
  );
  await start('directional-gates', 'cargo-wrong');
  await input('move_right');
  await until(() => {
    if (window.smoke.read().x < 950) return false;
    window.smoke.input('move_right', 'released');
    return true;
  });
  await wait(1700);
  r = await read();
  assert(r.world.find((o) => o.id === 'gate').contact);
  assert(r.block.x >= 1141.9);
  record(
    'A heavy block approaching the forbidden side stays blocked even while the gate is open for an authorized player inside it.',
  );
  await page.route(
    '**/assets/objects/advanced/**/spritesheets/*.png',
    async (route) => {
      const response = await page.request.get(
        base + '/assets/objects/advanced/reflectors/static/reflector_base.png',
      );
      await route.fulfill({ response });
    },
  );
  await start('conveyors', '');
  const x = (await read()).x;
  await wait(500);
  assert((await read()).x > x + 30);
  await start('directional-gates', '');
  await input('move_right');
  await until(() => window.smoke.read().x > 1150);
  await input('move_right', 'released');
  record(
    'Truncated optional spritesheets fall back to original static art while conveyor transport and directional gate collision remain functional.',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
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
