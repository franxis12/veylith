import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.env.SMOKE_OUTPUT || 'work/earth-negative');
await mkdir(output, { recursive: true });
const order = [
  'forest-1',
  'forest-2',
  'forest-6',
  'forest-7',
  'forest-8',
  'forest-9',
  'forest-10',
  'forest-3',
  'forest-4',
  'forest-5',
];
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }),
  errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  for (const id of order.filter(
    (id) => !process.env.LEVELS || process.env.LEVELS.split(',').includes(id),
  )) {
    await page.goto(base + '/scripts/browser-harness.html');
    await page.waitForFunction(() => window.smoke);
    await page.evaluate((id) => window.smoke.start(id), id);
    await page.waitForTimeout(200);
    const document = JSON.parse(
      await readFile(root + '/src/game/levels/data/' + id + '.json', 'utf8'),
    );
    assert.deepEqual(
      await page.evaluate(() => window.smoke.document()),
      document,
    );
    const initial = await page.evaluate(() => window.smoke.read());
    const policies = [];
    for (const policy of ['walk-right', 'right-jump-power']) {
      if (policies.length) {
        await page.evaluate(() => window.smoke.retry());
        await page.waitForFunction(
          (n) => window.smoke.read().attempts > n,
          initial.attempts,
        );
      }
      // Only normal input. Bounded adversarial replay, not exhaustive search or human difficulty measurement.
      const result = await page.evaluate(async (policy) => {
        const start = performance.now();
        let maxX = window.smoke.read().x,
          lastAdvance = start,
          lastPulse = 0,
          iterations = 0;
        while (performance.now() - start < 25000) {
          const now = performance.now(),
            s = window.smoke.read();
          if (s.run.phase === 'complete')
            return { won: true, policy, x: s.x, iterations };
          if (s.x > maxX + 4) {
            maxX = s.x;
            lastAdvance = now;
          }
          window.smoke.input('move_right');
          if (policy === 'right-jump-power' && now - lastPulse > 550) {
            window.smoke.input('jump');
            window.smoke.input('use_ability');
            lastPulse = now;
          } else if (now - lastPulse > 100) {
            window.smoke.input('jump', 'released');
            window.smoke.input('use_ability', 'released');
          }
          iterations++;
          if (now - lastAdvance > 4000) break;
          await new Promise((r) => setTimeout(r, 40));
        }
        for (const type of ['move_right', 'jump', 'use_ability'])
          window.smoke.input(type, 'released');
        const s = window.smoke.read();
        return {
          policy,
          won: s.run.phase === 'complete',
          durationMs: performance.now() - start,
          maxX,
          x: s.x,
          feet: s.feet,
          iterations,
          attempts: s.attempts,
          signals: s.world.filter((o) => o.active).map((o) => o.id),
          plate: s.plateSolved,
        };
      }, policy);
      assert.equal(result.won, false, `${id}: naive ${policy} won`);
      policies.push(result);
    }
    // Restart restores positions, source signals, plate and optional pickups with no payment.
    const previous = await page.evaluate(() => window.smoke.read());
    await page.evaluate(() => window.smoke.retry());
    await page.waitForFunction(
      (n) => window.smoke.read().attempts > n,
      previous.attempts,
    );
    await page.waitForTimeout(200);
    const reset = await page.evaluate(() => window.smoke.read());
    assert.equal(reset.element, 'earth');
    assert.equal(reset.run.phase, 'playing');
    assert.equal(reset.plateSolved, false);
    assert.equal(reset.coins, 0);
    assert.equal(reset.snapshot.coinValue, 0);
    assert(Math.abs(reset.x - initial.x) < 5);
    for (const s of initial.world.filter((o) =>
      ['fire_switch', 'light_receiver'].includes(o.kind),
    ))
      assert.equal(reset.world.find((o) => o.id === s.id).active, s.active);
    if (initial.block)
      assert(
        Math.abs(initial.block.x - reset.block.x) < 100,
        'Reset cargo begins at its configured position, with live belts allowed to move it.',
      );
    results.push({
      id,
      passed: true,
      documentSha256: createHash('sha256')
        .update(JSON.stringify(document))
        .digest('hex'),
      policies,
      restart: true,
    });
    await page.screenshot({ path: resolve(output, id + '-reset.png') });
    await writeFile(
      resolve(output, 'results.json'),
      JSON.stringify(
        { passed: false, inProgress: true, results, errors },
        null,
        2,
      ),
    );
    console.log('REJECTED BOTH POLICIES + RESET', id);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        error: String(e),
        state: await page
          .evaluate(() => window.smoke?.read())
          .catch(() => null),
        results,
        errors,
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
