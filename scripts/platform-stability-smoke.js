// Runs actual Arcade integration and postUpdate, never moves the player body by hand.
// Fixture is a canonical editor document with spawn on an initially stationary platform.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const output = resolve(process.env.SMOKE_OUTPUT || 'work/platform-stability');
await mkdir(output, { recursive: true });
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
const original = JSON.parse(
  await readFile(
    new URL('../src/game/levels/data/forest-3.json', import.meta.url),
    'utf8',
  ),
);
const read = () => page.evaluate(() => window.smoke.read());
const input = (t, p = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [t, p]);
const trace = (ms) => page.evaluate((ms) => window.smoke.trace(ms), ms);
const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
let current;
try {
  for (const fps of (process.env.FPS || '30,60,120').split(',').map(Number))
    for (const axis of (process.env.AXIS || 'horizontal,vertical').split(',')) {
      current = `${axis}-${fps}`;
      console.log('SCENARIO', current);
      const d = structuredClone(original);
      d.id = 'platform-regression';
      d.name = 'Platform regression';
      d.objects = d.objects.filter(
        (o) =>
          ['spawn', 'ferry', 'ferry-lever'].includes(o.id) ||
          o.type === 'terrain' ||
          o.type === 'exit',
      );
      d.objects.find((o) => o.type === 'exit').requires = ['ferry-lever'];
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.x = 897;
      const lever = d.objects.find((o) => o.id === 'ferry-lever');
      lever.x = 864;
      const platform = d.objects.find((o) => o.id === 'ferry');
      platform.behavior.travelX = axis === 'horizontal' ? 256 : 0;
      platform.behavior.travelY = axis === 'vertical' ? -256 : 0;
      platform.behavior.speed = 128;
      await page.goto(`${base}/scripts/platform-harness.html?fps=${fps}`);
      await until(() => window.smoke);
      await page.evaluate((d) => window.smoke.start('forest-3', d), d);
      await until(() => window.smoke.read().grounded);
      const stationary = await read();
      await input('use_ability');
      await page.waitForTimeout(100);
      await input('use_ability', 'released');
      const samples = await trace(8500);
      const initialOffset =
        stationary.x - stationary.world.find((o) => o.id === 'ferry').body.x;
      const summary = {
        scenario: current,
        samples: samples.length,
        grounded: samples.filter((s) => s.grounded).length,
        maxHorizontalDrift: Math.max(
          ...samples.map((s) =>
            Math.abs(s.x - s.platform.body.x - initialOffset),
          ),
        ),
        maxFootError: Math.max(
          ...samples.map((s) => Math.abs(s.feet - s.platform.body.y)),
        ),
        maxVisualError: Math.max(
          ...samples.map((s) => Math.abs(s.visualFeet - s.feet)),
        ),
        maxColliderError: Math.max(
          ...samples.map((s) => Math.abs(s.colliderFeet - s.feet)),
        ),
        directions: [...new Set(samples.map((s) => s.platform.direction))],
        animations: [...new Set(samples.map((s) => s.animation))],
        attempts: (await read()).attempts,
      };
      await writeFile(
        resolve(output, current + '-trace.json'),
        JSON.stringify({ summary, samples }, null, 2),
      );
      console.log(summary);
      await page.screenshot({ path: resolve(output, current + '.png') });
      assert.equal(summary.attempts, 1);
      assert.equal(summary.grounded, summary.samples);
      assert(summary.maxHorizontalDrift < 0.05);
      assert(summary.maxFootError < 0.05);
      assert(summary.maxVisualError < 0.05);
      assert(summary.maxColliderError < 0.05);
      assert.deepEqual(summary.animations, ['idle']);
      assert.equal(summary.directions.length, 2);
      // Jump must detach, then fall back to the moving platform.
      await input('jump');
      await page.waitForTimeout(50);
      await input('jump', 'released');
      const jump = await trace(1300);
      assert(jump.some((s) => s.feet < s.platform.body.y - 20));
      assert(jump.at(-1).grounded);
      assert(Math.abs(jump.at(-1).feet - jump.at(-1).platform.body.y) < 0.05);
      // A rider can still walk off; there is no magnetic attachment beyond the edge.
      await input('move_right');
      await until(() => {
        const s = window.smoke.read(),
          p = s.world.find((o) => o.id === 'ferry').body;
        return s.x - 31 > p.x + p.width;
      });
      await input('move_right', 'released');
      await page.waitForTimeout(200);
      assert(!(await read()).grounded);
      await page.evaluate(() => window.smoke.retry());
      await until(
        () =>
          window.smoke.read().attempts === 2 && window.smoke.read().grounded,
      );
      assert.equal((await read()).platformListeners, 1);
      results.push({
        ...summary,
        jumpDetachAndReland: true,
        walkOff: true,
        restartListenerCount: 1,
      });
    }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
} catch (e) {
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(
      {
        passed: false,
        current,
        error: String(e),
        results,
        errors,
        state: await read().catch(() => null),
      },
      null,
      2,
    ),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
