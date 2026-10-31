// Canonical editor documents + real Arcade physics. Only gameplay input actions.
// This is a reproducible solution witness, not a general puzzle solver.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const routes = JSON.parse(
  await readFile(new URL('./earth-routes.json', import.meta.url), 'utf8'),
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5182';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/earth-campaign');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const errors = [],
  results = [],
  assets = [],
  trace = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
const read = () => page.evaluate(() => window.smoke.read());
const input = (t, p = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [t, p]);
const wait = (ms) => page.waitForTimeout(ms);
async function until(fn, arg, timeout = 30000) {
  await page.waitForFunction(fn, arg, { timeout });
}
async function move(x) {
  const d = (await read()).x < x ? 'move_right' : 'move_left';
  await input(d);
  await until(
    ({ x, d }) => {
      const s = window.smoke.read();
      if (d === 'move_right' ? s.x < x : s.x > x) return false;
      window.smoke.input(d, 'released');
      return true;
    },
    { x, d },
  );
}
async function jump(x) {
  await until(() => window.smoke.read().grounded);
  const d = (await read()).x < x ? 'move_right' : 'move_left';
  await page.evaluate((d) => {
    window.smoke.input('jump');
    window.smoke.input(d);
  }, d);
  await until(
    ({ x, d }) => {
      const s = window.smoke.read();
      if (d === 'move_right' ? s.x < x : s.x > x) return false;
      window.smoke.input(d, 'released');
      window.smoke.input('jump', 'released');
      return true;
    },
    { x, d },
  );
  await until(() => window.smoke.read().grounded);
}
async function cast() {
  await input('use_ability');
  await wait(80);
  await input('use_ability', 'released');
  await wait(850);
}
async function wall(id, x) {
  await move(x - 75);
  for (
    let n = 0;
    n < 4 && !(await read()).world.find((o) => o.id === id).active;
    n++
  )
    await cast();
  assert((await read()).world.find((o) => o.id === id).active, id);
}
async function ride(id, left, bank, top, horizontal) {
  await move(left - 55);
  await until(
    (id) => window.smoke.read().world.find((o) => o.id === id).progress < 0.045,
    id,
    45000,
  );
  if (horizontal) await jump(left + 160);
  else await move(left + 160);
  assert.equal((await read()).attempts, 1, 'Boarding reset the level');
  if (horizontal) {
    await input('move_right');
    await until((id) => {
      const s = window.smoke.read(),
        b = s.world.find((o) => o.id === id).body;
      if (s.x < b.x + b.width - 65) return false;
      window.smoke.input('move_right', 'released');
      return true;
    }, id);
    await until(
      (id) => {
        const f = window.smoke.read().world.find((o) => o.id === id);
        return f.progress > 0.96 && f.direction === 1;
      },
      id,
      45000,
    );
    await jump(bank + 85);
  } else {
    const width = (await read()).world.find((o) => o.id === id).body.width;
    await move(left + width - 60);
    await until(
      ({ id, top }) => {
        const s = window.smoke.read();
        return (
          s.world.find((o) => o.id === id).progress > 0.93 && s.feet < top + 35
        );
      },
      { id, top },
      45000,
    );
    await jump(bank + 85);
  }
  assert((await read()).feet < top + 5, JSON.stringify(await read()));
}
let current, step;
try {
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
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
  for (const id of order.filter(
    (id) => !process.env.LEVELS || process.env.LEVELS.split(',').includes(id),
  )) {
    current = id;
    // Release the previous Phaser/WebGL page before loading another complete asset set.
    if (results.length) {
      await page.reload();
      await page.waitForFunction(() => window.smoke);
    }
    trace.length = 0;
    await page.evaluate((id) => window.smoke.start(id), id);
    const canonical = JSON.parse(
      await readFile(
        new URL(`../src/game/levels/data/${id}.json`, import.meta.url),
        'utf8',
      ),
    );
    assert.deepEqual(
      await page.evaluate(() => window.smoke.document()),
      canonical,
      'Browser must load the current canonical document',
    );
    const documentSha256 = createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
    await wait(250);
    await page.screenshot({ path: resolve(output, `${id}-start.png`) });
    const routeId =
      id === 'forest-10' && process.env.DIRECT_ROUTE ? 'forest-10-direct' : id;
    for (const [index, a] of routes[routeId].entries()) {
      step = a;
      console.log(id, index, JSON.stringify(a));
      if (a[0] === 'm') await move(a[1]);
      if (a[0] === 'j') await jump(a[1]);
      if (a[0] === 's') {
        await move(a[1] - 80);
        await jump(a[1] + 65);
      }
      if (a[0] === 'w') await wall(a[1], a[2]);
      if (a[0] === 'l') {
        await move(a[2]);
        await cast();
        assert((await read()).world.find((o) => o.id === a[1]).active);
      }
      if (a[0] === 'dropplate') {
        const floor = (await read()).block.bottom;
        await input('move_right');
        await until((floor) => {
          if (window.smoke.read().block.bottom < floor + 10) return false;
          window.smoke.input('move_right', 'released');
          return true;
        }, floor);
        await until((floor) => {
          const b = window.smoke.read().block;
          return b.grounded && b.bottom > floor + 100;
        }, floor);
        await move((await read()).block.x - 170);
        await until(() => {
          const s = window.smoke.read();
          return s.grounded && s.feet >= s.block.bottom - 1;
        });
      }
      if (a[0] === 'p' || a[0] === 'dropplate' || a[0] === 'leftplate') {
        await until(() => window.smoke.read().grounded);
        const floor = (await read()).block.bottom,
          direction = a[0] === 'leftplate' ? 'move_left' : 'move_right';
        await input(direction);
        if (id === 'forest-1' || id === 'forest-4') {
          await until(() => window.smoke.read().animation === 'push_start');
          await until(() => window.smoke.read().animation === 'push_loop');
          const first = await read();
          await wait(150);
          const second = await read();
          assert.notEqual(second.animationFrame, first.animationFrame);
          assert(Math.abs(second.block.x - first.block.x) > 1);
          await page.screenshot({ path: resolve(output, `${id}-pushing.png`) });
          await input(direction, 'released');
          // Docking can finish the push while the screenshot is being captured.
          await until(() => {
            const s = window.smoke.read();
            return s.animation === 'push_end' || s.plateSolved;
          });
          await until(() => window.smoke.read().animation === 'idle');
          await input(direction);
        }
        await until(
          ({ floor, direction }) => {
            const s = window.smoke.read();
            if (!s.plateSolved && s.block.bottom < floor + 10) return false;
            window.smoke.input(direction, 'released');
            return true;
          },
          { floor, direction },
        );
        await until(() => window.smoke.read().plateSolved);
        if (a[0] !== 'leftplate') {
          const b = (await read()).block;
          await jump(b.x);
          await jump(b.x + 200);
        }
      }
      if (a[0] === 'v' || a[0] === 'f')
        await ride(a[1], a[2], a[3], a[4], a[0] === 'f');
      if (a[0] === 'c') {
        await move(a[1]);
        await input('jump');
        await wait(750);
        await input('jump', 'released');
      }
      if (a[0] === 'end') {
        await input('move_right');
        await until(() => {
          if (window.smoke.read().run.phase !== 'complete') return false;
          window.smoke.input('move_right', 'released');
          return true;
        });
      }
      const s = await read();
      assert.equal(s.element, 'earth');
      assert.equal(s.attempts, 1, `${id} restarted at ${a}`);
      trace.push({
        step: a,
        x: s.x,
        feet: s.feet,
        plate: s.plateSolved,
        signals: s.world.filter((o) => o.active).map((o) => o.id),
      });
      if (['p', 'w', 'v', 'f', 'c', 'end'].includes(a[0]))
        await page.screenshot({ path: resolve(output, `${id}-${index}.png`) });
    }
    const s = await read();
    assert.equal(s.run.phase, 'complete');
    assert(s.run.result.elapsedMs > 15000);
    results.push({
      id,
      ...s.run.result,
      attempts: s.attempts,
      element: s.element,
      documentSha256,
      route: routeId,
      trace: [...trace],
    });
    await writeFile(
      resolve(output, 'results.json'),
      JSON.stringify(
        { passed: false, inProgress: true, results, errors },
        null,
        2,
      ),
    );
    assets.push(
      ...(await page.evaluate(() => window.smoke.assetEvidence())).map((a) => ({
        ...a,
        context: id,
      })),
    );
    console.log('COMPLETE', id, s.run.result.elapsedMs);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, results, errors, assets }, null, 2),
  );
} catch (e) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        id: current,
        step,
        error: String(e),
        trace,
        results,
        errors,
        state: await read().catch(() => null),
      },
      null,
      2,
    ),
  );
  console.error(current, step, e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
