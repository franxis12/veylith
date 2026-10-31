// Real input only; no writes to user saves, physics bodies or mechanism state.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5182';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/earth-resets');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const read = () => page.evaluate(() => window.smoke.read());
const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
async function move(x, jump = false) {
  if (jump) await until(() => window.smoke.read().grounded);
  await page.evaluate((j) => {
    if (j) window.smoke.input('jump');
    window.smoke.input('move_right');
  }, jump);
  await until((x) => {
    if (window.smoke.read().x < x) return false;
    window.smoke.input('move_right', 'released');
    window.smoke.input('jump', 'released');
    return true;
  }, x);
  if (jump) await until(() => window.smoke.read().grounded);
}
async function stairs() {
  for (const edge of [512, 768]) {
    await move(edge - 80);
    await move(edge + 65, true);
  }
}
try {
  await page.goto(`${base}/scripts/browser-harness.html`);
  await until(() => window.smoke);
  await page.evaluate(() => window.smoke.start('forest-1'));
  await until(() => window.smoke.read().grounded);
  const initial = await read();
  await stairs();
  await input('move_right');
  await until((x) => window.smoke.read().block.x > x + 30, initial.block.x);
  await input('move_right', 'released');
  await page.evaluate(() => window.smoke.retry());
  await until(
    () => window.smoke.read().attempts === 2 && window.smoke.read().grounded,
  );
  let s = await read();
  assert.equal(s.plateSolved, false);
  assert.equal(s.block.x, initial.block.x);
  assert.equal(s.block.width, 192);
  assert.equal(s.block.height, 180);
  assert.equal(s.element, 'earth');
  assert.equal(s.coins, 0);
  assert.equal(s.snapshot.coinValue, 0);
  assert.equal(s.animation, 'idle');
  assert(s.world.every((o) => !o.active));
  checks.push(
    'Restart restores the displaced large block, plate, mechanisms, animation and unbanked coins.',
  );
  await page.screenshot({ path: resolve(output, 'block-reset.png') });
  await page.reload();
  await until(() => window.smoke);
  await page.evaluate(() => window.smoke.start('forest-7'));
  await stairs();
  await input('move_right');
  await until(() => window.smoke.read().attempts === 2);
  await input('move_right', 'released');
  await until(() => window.smoke.read().grounded);
  s = await read();
  assert.equal(s.element, 'earth');
  assert.equal(s.coins, 0);
  assert.equal(s.snapshot.coinValue, 0);
  assert(s.world.every((o) => !o.active));
  assert(s.x < 300);
  checks.push(
    'Walking into the lake under the unpowered first bridge restarts Earth at spawn with mechanisms and attempt coins cleared.',
  );
  await page.screenshot({ path: resolve(output, 'lake-reset.png') });
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(
      {
        passed: false,
        error: String(e),
        checks,
        errors,
        state: await read().catch(() => null),
      },
      null,
      2,
    ),
  );
  throw e;
} finally {
  await browser.close();
}
