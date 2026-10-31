import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/startup-speed-smoke');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  // Only the diagnostic browser runs at half its normal RAF frequency.
  await page.addInitScript(() => {
    const native = requestAnimationFrame.bind(window),
      cancel = cancelAnimationFrame.bind(window),
      pending = new Map();
    let next = 0;
    window.requestAnimationFrame = (callback) => {
      const id = ++next;
      pending.set(
        id,
        native(() => {
          pending.set(
            id,
            native((t) => {
              pending.delete(id);
              callback(t);
            }),
          );
        }),
      );
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      cancel(pending.get(id));
      pending.delete(id);
    };
  });
  await page.goto(base + '/scripts/browser-harness.html');
  await page.waitForFunction(() => window.smoke);
  const samples = await page.evaluate(async () => {
    const { newLevel } = await import('/src/editor/library.ts');
    const d = newLevel('startup-speed');
    d.width = 8192;
    const floor = d.objects.find((o) => o.type === 'terrain');
    floor.width = 8192;
    floor.collider.width = 8160;
    d.objects.find((o) => o.type === 'spawn').element = 'earth';
    d.objects.find((o) => o.type === 'exit').x = 7800;
    await window.smoke.start('forest-1', d);
    window.smoke.input('move_right');
    const samples = [],
      start = performance.now();
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        const { x, vx, timing } = window.smoke.read();
        samples.push({ ms: performance.now() - start, x, vx, ...timing });
        if (performance.now() - start >= 6500) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
    window.smoke.input('move_right', 'released');
    return samples;
  });
  const speeds = [0, 1000, 2000, 3000, 4000, 5000].map((t) => {
    const a = samples.find((r) => r.ms >= t),
      b = samples.find((r) => r.ms >= t + 900);
    return {
      at: t,
      speed: (b.x - a.x) / ((b.ms - a.ms) / 1000),
      delta: a.delta,
      rawDelta: a.rawDelta,
    };
  });
  assert(
    samples.every((s) => s.vx === 245),
    'Movement intent is immediate and constant',
  );
  assert(
    speeds.every((s) => Math.abs(s.speed - 245) < 22),
    JSON.stringify(speeds),
  );
  await writeFile(
    out + '/results.json',
    JSON.stringify({ passed: true, speeds, samples }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, speeds }));
} finally {
  await browser.close();
}
