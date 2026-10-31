import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = process.env.SMOKE_OUTPUT || 'work/exit-door';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  samples = [];
page.on('pageerror', (e) => {
  errors.push(e.message);
  console.error('PAGE ERROR', e);
});
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
const state = () => page.evaluate(() => window.smoke.exitPresentation());
const wait = (f, a, timeout = 20000) => page.waitForFunction(f, a, { timeout });
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
async function activate() {
  await input('use_ability');
  await page.waitForTimeout(80);
  await input('use_ability', 'released');
}
async function start(mode = 'locked') {
  await page.goto(base + '/scripts/browser-harness.html');
  await wait(() => window.smoke);
  await page.evaluate(async (mode) => {
    const { newLevel, createObject, LIBRARY } =
      await import('/src/editor/library.ts');
    const d = newLevel('exit-presentation-test');
    d.objects.find((o) => o.type === 'spawn').element = 'earth';
    const lever = createObject(
      LIBRARY.find((o) => o.id === 'world:interactive_lever'),
      180,
      510,
      d.objects,
    );
    d.objects.push(lever);
    const exit = d.objects.find((o) => o.type === 'exit');
    exit.width = 174;
    exit.height = 195;
    exit.x = 1713;
    exit.y = 455;
    exit.collider = { enabled: true, x: 22, y: 192, width: 130, height: 6 };
    exit.requires = mode === 'open' ? [] : [lever.id];
    if (mode === 'overlap') {
      const dx = 180 - exit.x - exit.width / 2;
      exit.x += dx;
    }
    await window.smoke.start('forest-2', d);
  }, mode);
  await wait(() => window.smoke.read().grounded);
}
try {
  await start();
  assert.equal((await state()).exits[0].frameTexture, 'exit:frame');
  const initial = await state();
  assert.equal(initial.exits[0].seal.animation, 'exit:seal:idle');
  await activate();
  await wait(() => window.smoke.exitPresentation().active);
  const frozen = await page.evaluate(() => window.smoke.read());
  while ((await state()).active) {
    samples.push(await state());
    const now = await page.evaluate(() => window.smoke.read());
    assert(Math.abs(now.x - frozen.x) < 0.01);
    assert(Math.abs(now.feet - frozen.feet) < 0.01);
    if (samples.length === 8)
      await page.screenshot({ path: out + '/door-breaking.png' });
    await page.waitForTimeout(90);
  }
  const open = await state();
  assert(samples.some((s) => s.camera.zoom > initial.camera.zoom * 1.12));
  assert(samples.some((s) => s.camera.x > initial.camera.x + 200));
  assert(
    samples.some(
      (s) =>
        s.exits[0].seal.animation === 'exit:seal:break' &&
        s.exits[0].seal.playing,
    ),
  );
  assert.equal(open.exits[0].seal.visible, false);
  assert.equal(open.physicsPaused, false);
  assert.equal(open.camera.zoom, initial.camera.zoom);
  assert(Math.abs(open.camera.x - initial.camera.x) < 2);
  assert(samples.at(-1).run.elapsedMs - samples[0].run.elapsedMs < 120);
  await page.screenshot({ path: out + '/door-open-return.png' });
  // Relock with the real lever: supplied activate frames return to idle.
  await activate();
  await wait(
    () =>
      window.smoke.exitPresentation().exits[0].seal.animation ===
      'exit:seal:activate',
  );
  await wait(
    () =>
      window.smoke.exitPresentation().exits[0].seal.animation ===
      'exit:seal:idle',
  );
  assert.equal((await state()).exits[0].ready, false);
  await activate();
  await wait(() => window.smoke.exitPresentation().active);
  await page.evaluate(() => window.smoke.pause());
  const paused = await state();
  await page.waitForTimeout(350);
  assert.deepEqual((await state()).camera, paused.camera);
  await page.evaluate(() => window.smoke.resume());
  await page.evaluate(() => window.smoke.resize(1440, 810));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.smoke.retry());
  await wait(() => window.smoke.ready() && window.smoke.read().attempts === 2);
  assert.equal((await state()).active, false);
  assert.equal((await state()).physicsPaused, false);
  assert.equal((await state()).camera.zoom, initial.camera.zoom);
  assert.equal((await state()).exits[0].seal.animation, 'exit:seal:idle');
  await wait(() => window.smoke.read().grounded);
  await activate();
  await wait(() => window.smoke.exitPresentation().active);
  await wait(() => !window.smoke.exitPresentation().active);
  await input('move_right');
  await wait(() => window.smoke.read().run.phase === 'complete');
  await input('move_right', 'released');
  assert.equal((await state()).run.phase, 'complete');
  await page.screenshot({ path: out + '/door-victory.png' });
  await start('overlap');
  await activate();
  await wait(() => window.smoke.exitPresentation().active);
  assert.notEqual((await state()).run.phase, 'complete');
  await wait(() => window.smoke.read().run.phase === 'complete');
  await start('open');
  assert.equal((await state()).active, false);
  assert.equal((await state()).exits[0].seal.visible, false);
  assert.equal(await page.locator('canvas').count(), 1);
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/validation.json',
    JSON.stringify(
      {
        passed: true,
        tests: [
          'idle',
          'pan',
          'zoom',
          'break',
          'return',
          'clock-freeze',
          'physics-freeze',
          'relock',
          'pause-resume',
          'resize',
          'restart-mid-reveal',
          'victory',
          'overlap-victory-waits',
          'initially-open',
          'remount',
        ],
        errors,
        samples,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('EXIT PRESENTATION PASS');
} catch (e) {
  await page.screenshot({ path: out + '/failure.png' });
  console.error(e, errors, await state().catch(() => null));
  process.exitCode = 1;
} finally {
  await browser.close();
}
