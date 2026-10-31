import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5180';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/world-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('dialog', (d) => d.accept());
const wait = (ms) => page.waitForTimeout(ms);
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
async function setup(scenario, element = 'water') {
  await page.evaluate(
    async ({ scenario, element }) => {
      const { newLevel, createObject, LIBRARY } =
        await import('/src/editor/library.ts');
      const d = newLevel('world-smoke');
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.element = element;
      const floor = d.objects.find((o) => o.type === 'terrain');
      function add(kind, x, y) {
        const o = createObject(
          LIBRARY.find((i) => i.id === `world:${kind}`),
          x,
          y,
          d.objects,
        );
        d.objects.push(o);
        return o;
      }
      if (scenario === 'elevator') {
        floor.width = 384;
        floor.collider.width = 352;
        spawn.x = 529;
        const elevator = add('mechanical_elevator', 400, 535);
        elevator.behavior.travelY = -300;
        elevator.behavior.speed = 100;
        elevator.behavior.mode = 'once';
        const lever = add('interactive_lever', 520, 520);
        elevator.behavior.requires = [lever.id];
      }
      if (scenario === 'fan') {
        spawn.x = 619;
        const fan = add('wind_fan', 50, 394);
        fan.collider.enabled = false;
        fan.effect = { enabled: true, x: 250, y: 0, width: 800, height: 300 };
      }
      if (scenario === 'lava' || scenario === 'deep_water') {
        floor.width = 384;
        floor.collider.width = 352;
        spawn.x = 269;
        const liquid = add(scenario, 368, 570);
        liquid.width = 512;
        liquid.effect = { enabled: true, x: 0, y: 80, width: 512, height: 400 };
        const bank = structuredClone(floor);
        bank.id = 'bank';
        bank.x = 864;
        bank.width = 1152;
        bank.collider.width = 1120;
        d.objects.push(bank);
      }
      if (scenario === 'wheel') add('waterwheel', 380, 422);
      if (scenario === 'boiler') {
        const boiler = add('steam_boiler', 400, 410);
        boiler.behavior.waterHits = 1;
        boiler.behavior.fireHits = 1;
        const gem = createObject(
          LIBRARY.find((i) => i.id === 'gem:fire'),
          270,
          525,
          d.objects,
        );
        d.objects.push(gem);
      }
      if (scenario === 'wall') {
        spawn.x = 324;
        const wall = add('stone_wall', 350, 410);
        wall.behavior.strikes = 2;
      }
      if (scenario === 'bridge') {
        const lever = add('interactive_lever', 180, 520);
        const bridge = add('retractable_bridge', 500, 505);
        bridge.behavior.requires = [lever.id];
        bridge.behavior.duration = 400;
      }
      await window.smoke.start('forest-1', d);
    },
    { scenario, element },
  );
  await wait(350);
}
try {
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  await setup('elevator');
  let r = await read();
  assert.equal(r.world[0].active, false);
  const feet = r.feet;
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(1800);
  r = await read();
  assert(r.feet < feet - 120, JSON.stringify(r));
  assert.equal(r.attempts, 1);
  checks.push('Lever input activates elevator; the real player rides upward');
  await input('restart_level');
  await wait(500);
  r = await read();
  assert.equal(r.world[0].progress, 0);
  assert.equal(r.world[1].active, false);
  checks.push('Restart restores lift and lever state');
  for (const element of ['water', 'fire', 'air', 'earth']) {
    await setup('fan', element);
    await input('move_left');
    await wait(900);
    await input('move_left', 'released');
    r = await read();
    assert(
      element === 'earth' ? r.x < 500 : r.x > 650,
      JSON.stringify({ element, r }),
    );
  }
  checks.push(
    'Horizontal fan blocks Water, Fire and Air; Earth moves against it',
  );
  for (const [kind, safe] of [
    ['lava', 'fire'],
    ['deep_water', 'water'],
  ]) {
    await setup(kind, safe);
    await input('move_right');
    await wait(1500);
    await input('move_right', 'released');
    r = await read();
    assert(r.x > 650 && r.attempts === 1, JSON.stringify({ kind, r }));
    assert(Math.abs(r.feet - 650) < 8, JSON.stringify(r));
    await setup(kind, 'earth');
    await input('move_right');
    await page.waitForFunction(() => window.smoke.read().attempts > 1, {
      timeout: 10000,
    });
    await input('move_right', 'released');
  }
  checks.push(
    'Matching elements traverse liquid surfaces; wrong elements restart the attempt',
  );
  await setup('wheel', 'fire');
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(650);
  assert.equal((await read()).world[0].active, false);
  await setup('wheel');
  for (let i = 0; i < 3; i++) {
    await input('use_ability');
    await input('use_ability', 'released');
    await wait(650);
  }
  r = await read();
  assert(r.world[0].active, JSON.stringify(r));
  checks.push('Actual Water shots activate the wheel; Fire cannot');
  await setup('boiler');
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(650);
  assert.equal((await read()).world[0].active, false);
  await input('move_right');
  await page.waitForFunction(() => window.smoke.read().element === 'fire');
  await input('move_right', 'released');
  await wait(400);
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(700);
  r = await read();
  assert(r.world[0].active, JSON.stringify(r));
  checks.push(
    'Boiler receives Water, then Fire after an actual gem pickup; no manual transformation',
  );
  await setup('wall', 'earth');
  for (let i = 0; i < 2; i++) {
    await input('use_ability');
    await input('use_ability', 'released');
    await wait(1000);
    r = await read();
    assert.equal(r.world[0].active, i === 1, JSON.stringify(r));
  }
  assert.equal(r.world[0].body.enable, false);
  checks.push(
    'Earth timed strike destroys wall after configured hits and removes collision',
  );
  await setup('bridge');
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(650);
  r = await read();
  assert.equal(r.world[1].progress, 1);
  assert.equal(r.world[1].body.enable, true);
  await input('use_ability');
  await input('use_ability', 'released');
  await wait(100);
  assert.equal((await read()).world[1].body.enable, false);
  await wait(600);
  assert.equal((await read()).world[1].progress, 0);
  checks.push(
    'Lever extends and retracts bridge; collision follows completed extension',
  );
  await page.screenshot({ path: resolve(output, 'playtest.png') });
  assert.deepEqual(errors, []);
  const assets = await page.evaluate(() => window.smoke.assetEvidence());
  const report = { passed: true, checks, errors, assets };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
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
