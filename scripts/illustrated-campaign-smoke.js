import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/puzzle-browser');
await mkdir(out, { recursive: true });
const routes = JSON.parse(
  await readFile(
    process.env.ROUTES || root + '/scripts/illustrated-routes.json',
    'utf8',
  ),
);
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const read = () => page.evaluate(() => window.smoke.read());
const input = (type, phase = 'pressed') =>
  page.evaluate(([t, p]) => window.smoke.input(t, p), [type, phase]);
const until = (f, a, timeout = 12000) =>
  page.waitForFunction(f, a, { timeout });
async function move(x, jump = false) {
  if (jump) await until(() => window.smoke.read().grounded);
  const direction = (await read()).x < x ? 'move_right' : 'move_left';
  await page.evaluate(
    ({ direction, jump }) => {
      window.smoke.input(direction);
      if (jump) window.smoke.input('jump');
    },
    { direction, jump },
  );
  await until(
    ({ x, direction }) => {
      const s = window.smoke.read();
      if (direction === 'move_right' ? s.x < x : s.x > x) return false;
      window.smoke.input(direction, 'released');
      window.smoke.input('jump', 'released');
      return true;
    },
    { x, direction },
  );
  if (jump) await until(() => window.smoke.read().grounded);
}
async function cast() {
  await input('use_ability');
  await page.waitForTimeout(90);
  await input('use_ability', 'released');
  await page.waitForTimeout(300);
}
async function push(target, direction) {
  await input(direction === 'left' ? 'move_left' : 'move_right');
  await until(
    ({ target, direction }) => {
      const s = window.smoke.read(),
        done =
          target === 'plate'
            ? s.plateSolved
            : s.plates.find((o) => o.id === target)?.solved ||
              s.world.find((o) => o.id === target)?.active;
      if (!done) return false;
      window.smoke.input(
        direction === 'left' ? 'move_left' : 'move_right',
        'released',
      );
      return true;
    },
    { target, direction },
    25000,
  );
}
for (const id of (process.env.LEVELS || Object.keys(routes).join(',')).split(
  ',',
)) {
  let step,
    trace = [];
  try {
    await page.goto(base + '/scripts/browser-harness.html');
    await until(() => window.smoke);
    await page.evaluate((id) => window.smoke.start(id), id);
    await page.waitForTimeout(300);
    const doc = JSON.parse(
      await readFile(root + '/src/game/levels/data/' + id + '.json', 'utf8'),
    );
    assert.deepEqual(await page.evaluate(() => window.smoke.document()), doc);
    const initial = await read();
    const art = await page.evaluate(() => window.smoke.illustratedArt());
    const illustration = doc.objects.find((o) => o.type === 'illustration');
    const catalog = JSON.parse(
      await readFile(
        root + '/src/game/assets/illustratedManifest.json',
        'utf8',
      ),
    )[illustration.sceneId];
    const scale = illustration.width / catalog.width;
    assert.equal(
      art.art.length,
      catalog.layers.length +
        illustration.overlays.filter((o) => o.visible).length,
    );
    for (const l of catalog.layers) {
      const actual = art.art.find(
        (o) => o.name === illustration.id + ':' + l.id,
      );
      assert.deepEqual(
        [actual.x, actual.y, actual.width, actual.height],
        [
          illustration.x + l.x * scale,
          illustration.y + l.y * scale,
          l.width * scale,
          l.height * scale,
        ],
      );
    }
    assert(art.art.find((o) => o.name.endsWith(':static_world')).depth < 0);
    assert(art.art.find((o) => o.name.endsWith(':foreground')).depth > 0);
    for (const o of illustration.overlays.filter((o) => o.visible)) {
      const actual = art.art.find(
        (a) => a.name === illustration.id + ':' + o.id,
      );
      assert.deepEqual(
        [actual.x, actual.y, actual.width, actual.height],
        [
          illustration.x + o.x * scale,
          illustration.y + o.y * scale,
          o.width * scale,
          o.height * scale,
        ],
      );
      assert(actual.playing);
    }
    await until(
      (prior) => {
        const now = window.smoke.illustratedArt().art;
        return prior
          .filter((o) => o.playing)
          .every((o) => now.find((n) => n.name === o.name).frame !== o.frame);
      },
      art.art,
      5000,
    );
    await page.screenshot({ path: out + '/' + id + '-start.png' });
    for (step of routes[id]) {
      console.log(id, JSON.stringify(step));
      if (step[0] === 'm') await move(step[1]);
      if (step[0] === 'j') await move(step[1], true);
      if (step[0] === 'cast') await cast();
      if (step[0] === 'wait') await page.waitForTimeout(step[1]);
      if (step[0] === 'push') await push(step[1], step[2]);
      if (step[0] === 'signal')
        await until(
          (id) =>
            window.smoke.read().world.find((o) => o.id === id)?.active ||
            window.smoke.read().plates.find((o) => o.id === id)?.solved,
          step[1],
        );
      if (step[0] === 'ride')
        await until(
          ({ id, progress }) =>
            window.smoke.read().world.find((o) => o.id === id).progress >
            progress,
          { id: step[1], progress: step[2] },
          20000,
        );
      if (step[0] === 'bottom')
        await until(
          ({ id, progress }) =>
            window.smoke.read().world.find((o) => o.id === id).progress <
            progress,
          { id: step[1], progress: step[2] },
          20000,
        );
      if (step[0] === 'feet')
        await until(
          (y) => window.smoke.read().feet > y && window.smoke.read().grounded,
          step[1],
        );
      if (step[0] === 'end')
        await until(() => window.smoke.read().run.phase === 'complete');
      const s = await read();
      assert.equal(s.element, 'earth');
      assert.equal(s.attempts, 1, 'Unexpected reset');
      trace.push({
        step,
        x: s.x,
        feet: s.feet,
        block: s.block,
        signals: s.world.filter((o) => o.active).map((o) => o.id),
      });
    }
    const s = await read();
    assert.equal(s.run.phase, 'complete');
    await page.screenshot({ path: out + '/' + id + '-complete.png' });
    const banked = await page.evaluate(() => window.smoke.savedProgress());
    const restartStart = Date.now();
    await page.evaluate(() => window.smoke.retry());
    await until(() => window.smoke.read().attempts === 2);
    await page.waitForTimeout(300);
    const reset = await read(),
      resetArt = await page.evaluate(() => window.smoke.illustratedArt());
    assert.equal(reset.element, 'earth');
    assert.equal(reset.run.phase, 'playing');
    assert.equal(reset.snapshot.coinValue, 0);
    assert.deepEqual(reset.plates, initial.plates);
    for (const b of initial.blocks) {
      const restored = reset.blocks.find((o) => o.id === b.id);
      assert(!restored.docked);
      assert(
        Math.abs(restored.x - b.x) < 2 && Math.abs(restored.top - b.top) < 2,
      );
    }
    assert.deepEqual(
      reset.world.map((o) => [o.id, o.active, o.progress]),
      initial.world.map((o) => [o.id, o.active, o.progress]),
    );
    assert.deepEqual(await page.evaluate(() => window.smoke.document()), doc);
    assert.deepEqual(
      await page.evaluate(() => window.smoke.savedProgress()),
      banked,
    );
    assert.deepEqual(resetArt.textures, art.textures);
    assert.equal(resetArt.art.length, art.art.length);
    assert.equal(resetArt.listeners, art.listeners);
    assert(reset.run.elapsedMs < 2000);
    results.push({
      id,
      passed: true,
      victory: s.run.result,
      attempts: s.attempts,
      element: s.element,
      collectedCoinValue: s.snapshot.coinValue,
      nextRememberedLevel: banked.lastLevel,
      artNodes: art.art.length,
      animatedInstances: art.art.filter((o) => o.playing).length,
      restartVerified: true,
      restartMs: Date.now() - restartStart,
      elapsedMs: s.run.result.elapsedMs,
      sha256: createHash('sha256').update(JSON.stringify(doc)).digest('hex'),
      trace,
    });
  } catch (e) {
    console.error(id, step, String(e));
    const state = await read().catch(() => null);
    await page.screenshot({ path: out + '/' + id + '-failure.png' });
    results.push({
      id,
      passed: false,
      step,
      error: String(e),
      state,
      trace,
      diagnostics: await page.evaluate(() => window.smoke.pulleyDiagnostics()),
    });
  }
  await writeFile(
    out + '/results.json',
    JSON.stringify(
      {
        passed: results.every((r) => r.passed) && !errors.length,
        results,
        errors,
      },
      null,
      2,
    ),
  );
}
await browser.close();
process.exitCode = results.every((r) => r.passed) && !errors.length ? 0 : 1;
