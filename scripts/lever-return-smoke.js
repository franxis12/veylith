import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/lever-return-smoke');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const press = async () => {
  await input('use_ability');
  await page.waitForTimeout(90);
  await input('use_ability', 'released');
};
const endpoint = async (progress) =>
  page.waitForFunction(
    (p) =>
      window.smoke.read().world.find((o) => o.id === 'lift').progress === p,
    progress,
    { timeout: 10000 },
  );
const lift = (r) => r.world.find((o) => o.id === 'lift');
async function setup(two) {
  const document = await page.evaluate(async (two) => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const d = newLevel('lab-lever-return');
    d.name = 'Laboratorio · Palancas de ida y regreso';
    const spawn = d.objects.find((o) => o.type === 'spawn');
    spawn.element = 'earth';
    spawn.x = 529;
    const floor = d.objects.find((o) => o.type === 'terrain');
    floor.width = 384;
    floor.collider.width = 352;
    const add = (kind, id, x, y) => {
      const o = createObject(
        LIBRARY.find((i) => i.id === `world:${kind}`),
        x,
        y,
        d.objects,
      );
      o.id = id;
      d.objects.push(o);
      return o;
    };
    const lift = add('mechanical_elevator', 'lift', 400, 535);
    lift.behavior = {
      kind: 'elevator',
      requires: [],
      autostart: false,
      travelX: two ? 0 : 120,
      travelY: two ? -300 : 0,
      speed: 160,
      mode: 'controlled',
    };
    const go = add('interactive_lever', 'go', two ? 520 : 580, 520);
    go.behavior = {
      kind: 'lever',
      initiallyActive: false,
      action: 'toggle',
      targets: ['lift'],
    };
    if (two) {
      const back = add('interactive_lever', 'back', 520, 220);
      back.behavior = {
        kind: 'lever',
        initiallyActive: false,
        action: 'deactivate',
        targets: ['lift'],
      };
    }
    const { validateLevel } =
      await import('/src/game/levels/schema/validate.ts');
    const errors = validateLevel(d);
    if (errors.length) throw Error(errors.join('\n'));
    await window.smoke.start('forest-1', d);
    return d;
  }, two);
  await page.waitForTimeout(500);
  return document;
}
try {
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  await setup(false);
  const initial = await read();
  await input('use_ability');
  await endpoint(1);
  await page.waitForTimeout(500);
  assert.equal(
    lift(await read()).progress,
    1,
    'Holding Action must not repeat the lever',
  );
  await input('use_ability', 'released');
  await press();
  await endpoint(0);
  let r = await read();
  assert(
    Math.abs(r.x - initial.x) < 3 && Math.abs(r.feet - initial.feet) < 3,
    JSON.stringify(r),
  );
  assert.equal(r.attempts, 1);
  checks.push(
    'Same lever: held input acts once; next press returns lift and rider to original dock',
  );
  await press();
  await page.waitForTimeout(180);
  const before = lift(await read()).progress;
  assert(before > 0 && before < 1);
  await press();
  await page.waitForTimeout(80);
  assert(lift(await read()).progress < before);
  await endpoint(0);
  checks.push('Mid-journey press reverses continuously');
  const doc = await setup(true);
  await writeFile(
    out + '/lab-lever-return.json',
    JSON.stringify(doc, null, 2) + '\n',
  );
  const feet = (await read()).feet;
  for (let i = 0; i < 2; i++) {
    await press();
    await endpoint(1);
    await page.waitForTimeout(200);
    r = await read();
    assert(
      Math.abs(r.feet - (feet - 300)) < 3 && r.grounded,
      JSON.stringify(r),
    );
    assert.equal(r.attempts, 1);
    if (i === 0) await page.screenshot({ path: out + '/upper-dock.png' });
    await press();
    await endpoint(0);
    await page.waitForTimeout(200);
    r = await read();
    assert(Math.abs(r.feet - feet) < 3 && r.grounded, JSON.stringify(r));
    assert.equal(r.attempts, 1);
  }
  checks.push(
    'Two levers: two complete 300 px rides up and down, carrying Earth with real collisions',
  );
  await press();
  await page.waitForTimeout(500);
  await input('restart_level');
  await page.waitForTimeout(500);
  r = await read();
  assert.equal(lift(r).progress, 0);
  assert.equal(r.world.find((o) => o.id === 'go').active, false);
  assert.equal(r.world.find((o) => o.id === 'back').active, false);
  await press();
  await endpoint(1);
  checks.push(
    'Restart resets lift, lever signals and commands; next ride works',
  );
  await page.screenshot({ path: out + '/return-controls.png' });
  const example = JSON.parse(
    await readFile(
      new URL('../src/game/levels/data/lab-lever-return.json', import.meta.url),
      'utf8',
    ),
  );
  await page.evaluate((d) => window.smoke.start('forest-1', d), example);
  await page.waitForTimeout(500);
  await press();
  await endpoint(1);
  await press();
  await endpoint(0);
  await press();
  await endpoint(1);
  await input('move_right');
  await page.waitForFunction(() => window.smoke.read().x > 800);
  await input('jump');
  await page.waitForTimeout(200);
  await input('jump', 'released');
  await page.waitForFunction(
    () => window.smoke.read().run.phase === 'complete',
    null,
    { timeout: 12000 },
  );
  await input('move_right', 'released');
  assert.equal((await read()).attempts, 1);
  checks.push(
    'Saved editable lab: return ride and normal movement/jump route to the exit',
  );
  await page.screenshot({ path: out + '/laboratory-complete.png' });
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/results.json',
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  await writeFile(
    out + '/failure.json',
    JSON.stringify(
      {
        error: String(error),
        state: await read().catch(() => null),
        checks,
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
