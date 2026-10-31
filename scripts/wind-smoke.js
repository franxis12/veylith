import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5180';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/wind-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

try {
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  for (const direction of [-1, 1]) {
    for (const element of ['water', 'fire', 'air', 'earth']) {
      const samples = await page.evaluate(
        async ({ direction, element }) => {
          const { newLevel, createObject, LIBRARY } =
            await import('/src/editor/library.ts');
          const d = newLevel('wind-smoke');
          const spawn = d.objects.find((o) => o.type === 'spawn');
          spawn.element = element;
          spawn.x = direction === -1 ? 669 : 1069;
          const fan = createObject(
            LIBRARY.find((i) => i.id === 'world:wind_fan'),
            400,
            394,
            d.objects,
          );
          fan.behavior.direction = direction;
          fan.collider.enabled = false;
          fan.effect = {
            enabled: true,
            x: direction === -1 ? 400 : 0,
            y: 0,
            width: 600,
            height: 300,
          };
          d.objects.push(fan);
          await window.smoke.start('forest-1', d);
          window.smoke.input(direction === -1 ? 'move_right' : 'move_left');
          const samples = await window.smoke.trace(
            element === 'earth' ? 3000 : 6000,
          );
          window.smoke.input(
            direction === -1 ? 'move_right' : 'move_left',
            'released',
          );
          return samples;
        },
        { direction, element },
      );
      const boundary = direction === -1 ? 769 : 1031;
      // Positive depth is inside the wind zone, measured with the player's leading edge.
      const depths = samples.map((s) => (boundary - s.x) * direction);
      const late = samples.filter((s) => s.ms > 3000);
      const turns = samples.filter(
        (s, i) => i > 0 && Math.sign(s.vx) !== Math.sign(samples[i - 1].vx),
      );
      const result = {
        direction,
        element,
        maxDepth: Math.max(...depths),
        lateMaxDepth: Math.max(
          ...late.map((s) => (boundary - s.x) * direction),
        ),
        lateRetreat: Math.max(...late.map((s) => (s.x - boundary) * direction)),
        turns: turns.length,
        shortestTurnMs:
          turns.length > 1
            ? Math.min(...turns.slice(1).map((s, i) => s.ms - turns[i].ms))
            : null,
        maxVelocityStep: Math.max(
          ...samples.slice(1).map((s, i) => Math.abs(s.vx - samples[i].vx)),
        ),
        maxCameraStep: Math.max(
          ...samples
            .slice(1)
            .map((s, i) => Math.abs(s.cameraX - samples[i].cameraX)),
        ),
        maxCameraExcess: Math.max(
          ...samples
            .slice(1)
            .map(
              (s, i) =>
                Math.abs(s.cameraX - samples[i].cameraX) -
                Math.abs(s.x - samples[i].x),
            ),
        ),
      };
      results.push(result);
      await writeFile(
        resolve(output, `${element}-${direction}.json`),
        JSON.stringify(samples),
      );
      if (element === 'earth') {
        assert(result.maxDepth > 500, JSON.stringify(result));
        assert(
          samples.every((s) => s.vx * direction === -245),
          JSON.stringify(result),
        );
      } else {
        assert(
          result.maxDepth > 15 && result.maxDepth < 60,
          JSON.stringify(result),
        );
        assert(
          result.lateMaxDepth > 12 && result.lateRetreat > 45,
          JSON.stringify(result),
        );
        assert(
          result.turns >= 4 && result.shortestTurnMs > 220,
          JSON.stringify(result),
        );
        assert(result.maxVelocityStep < 110, JSON.stringify(result));
        // Dropped frames may travel farther. The camera must never add movement
        // beyond the player, whose reversals and retreat amplitude are checked above.
        assert(result.maxCameraExcess < 0.01, JSON.stringify(result));
      }
      assert.equal(
        (await page.evaluate(() => window.smoke.read())).attempts,
        1,
      );
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
}
