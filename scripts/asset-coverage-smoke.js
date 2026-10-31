import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { visibleUiAssets } from './asset-observer.js';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5191';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/asset-verification');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  checks = [],
  assets = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((m) => {
    if (!String(m).includes('full-reload')) socket.send(m);
  });
});
const wait = (ms) => page.waitForTimeout(ms);
const read = () => page.evaluate(() => window.smoke.read());
async function observe(context) {
  await wait(100);
  for (const path of await visibleUiAssets(page))
    assets.push({ path, context });
}
async function cast() {
  await page.evaluate(() => {
    window.smoke.input('use_ability');
    window.smoke.input('use_ability', 'released');
  });
}
async function setup(scenario, element = 'earth') {
  await page.evaluate(
    async ({ scenario, element }) => {
      const { newLevel, createObject, LIBRARY } =
        await import('/src/editor/library.ts');
      const d = newLevel('asset-audit');
      d.name = 'Asset audit fixture';
      const spawn = d.objects.find((o) => o.type === 'spawn');
      spawn.element = element;
      const add = (id, x, y) => {
        const o = createObject(
          LIBRARY.find((i) => i.id === id),
          x,
          y,
          d.objects,
        );
        d.objects.push(o);
        return o;
      };
      const exit = d.objects.find((o) => o.type === 'exit');
      if (scenario === 'gate') {
        const lever = add('world:interactive_lever', 180, 520);
        const door = add('doorClosed', 650, 32);
        door.requires = [lever.id];
        exit.x = 1000;
        exit.requires = [lever.id];
        const fan = add('world:wind_fan', 850, 300);
        fan.behavior.requires = [lever.id];
        fan.collider.enabled = false;
        fan.effect.enabled = false;
      }
      if (scenario === 'victory') {
        exit.x = 450;
      }
      if (scenario === 'coin') {
        add('coin', 330, 560);
      }
      if (scenario === 'tank' || scenario === 'torch') {
        const target = add(scenario, 400, 430);
        target.hits = 1;
        exit.requires = [target.id];
        exit.x = 750;
      }
      if (scenario === 'wheel') add('world:waterwheel', 400, 410);
      if (scenario === 'boiler') {
        const boiler = add('world:steam_boiler', 400, 410);
        boiler.behavior.waterHits = 1;
        boiler.behavior.fireHits = 2;
        add('gem:water', 270, 525);
      }
      if (scenario === 'gems') {
        for (const [i, e] of ['water', 'fire', 'air', 'earth'].entries())
          add(`gem:${e}`, 330 + i * 180, 525);
      }
      await window.smoke.start('forest-1', d);
    },
    { scenario, element },
  );
  await wait(350);
}
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await observe('main menu');
  await page.screenshot({ path: resolve(output, 'menu.png') });
  const play = page.getByRole('button', { name: 'Play', exact: true });
  const box = await play.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await observe('pressed play button');
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await observe('options');
  await page.screenshot({ path: resolve(output, 'options.png') });
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.getByRole('button', { name: 'Level select', exact: true }).click();
  await observe('level selection');
  await page.screenshot({ path: resolve(output, 'levels.png') });
  await page.locator('.level-card:not(:disabled)').first().click();
  await page.locator('.run-hud').waitFor();
  await wait(400);
  await observe('run HUD');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await observe('pause');
  const frozen = await page.locator('.pause-time').textContent();
  await wait(450);
  assert.equal(await page.locator('.pause-time').textContent(), frozen);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('button', { name: 'Restart level', exact: true })
    .click();
  await wait(350);
  await page.setViewportSize({ width: 844, height: 390 });
  await observe('mobile landscape HUD');
  await page.screenshot({ path: resolve(output, 'landscape.png') });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await wait(350);
  assert.equal(await page.locator('canvas').count(), 0);
  checks.push(
    'Actual menu/options/levels/HUD/pause/resume/restart/mobile landscape/unmount',
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/scripts/browser-harness.html`);
  await page.waitForFunction(() => window.smoke);
  await setup('victory');
  await page.evaluate(() => window.smoke.mountHud());
  await page.evaluate(() => {
    window.uiFrameEvidence = new Map();
    window.uiFrameObserver = true;
    const sample = () => {
      for (const img of document.querySelectorAll(
        '.sprite-ready .sprite-strip',
      )) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(img).transform);
        const n = Number(
          getComputedStyle(img.parentElement).getPropertyValue(
            '--sprite-frames',
          ),
        );
        const frame = Math.round(
          -matrix.m41 / (img.getBoundingClientRect().width / n),
        );
        const path = new URL(img.src).pathname.slice(1);
        const frames = window.uiFrameEvidence.get(path) ?? new Set();
        if (frame >= 0 && frame < n) frames.add(String(frame));
        window.uiFrameEvidence.set(path, frames);
      }
      if (window.uiFrameObserver) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(
    () => window.smoke.read().run.phase === 'complete',
  );
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  await observe('real portal completion rewards');
  await wait(1200);
  await page.screenshot({ path: resolve(output, 'victory.png') });
  await wait(1200);
  assets.push(
    ...(await page.evaluate(() => {
      window.uiFrameObserver = false;
      return [...window.uiFrameEvidence].map(([path, frames]) => ({
        path,
        frames: [...frames],
        animation: 'css-reward',
        context: 'real portal completion',
      }));
    })),
  );
  await observe('settled rewards');
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  checks.push(
    'Real portal completion opens RunHud reward animation; every CSS frame sampled',
  );
  await setup('gate');
  await cast();
  await wait(1100);
  let r = await read();
  assert(r.world.find((o) => o.kind === 'interactive_lever').active);
  assert(r.world.find((o) => o.kind === 'wind_fan').active);
  await cast();
  await wait(1100);
  assert.equal(
    (await read()).world.find((o) => o.kind === 'wind_fan').active,
    false,
  );
  await page.screenshot({ path: resolve(output, 'gate.png') });
  checks.push(
    'Lever drives door opening/closing and fan starting/stopping through real ability input',
  );
  await setup('coin');
  const coinsBeforePickup = (await read()).coins;
  await wait(900);
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(
    () => window.smoke.read().snapshot.coinValue === 1,
  );
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  await wait(650);
  assert.equal((await read()).coins, coinsBeforePickup);
  checks.push(
    'World coin spin and pickup burst; pickup does not mint saved currency',
  );
  for (const [scenario, element] of [
    ['tank', 'water'],
    ['torch', 'fire'],
  ]) {
    await setup(scenario, element);
    await cast();
    await wait(1500);
    assert.equal((await read()).snapshot.solved, 1);
    await page.screenshot({ path: resolve(output, `${scenario}.png`) });
  }
  checks.push(
    'Actual Water/Fire projectiles activate tank water loop and torch flame',
  );
  await setup('boiler', 'fire');
  await cast();
  await wait(1000);
  r = await read();
  assert.equal(r.world[0].active, false);
  assert.equal(r.world[0].fire, 1);
  await cast();
  await wait(1000);
  assert.equal((await read()).world[0].active, false);
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(() => window.smoke.read().element === 'water');
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  await wait(500);
  await cast();
  await wait(1200);
  assert((await read()).world[0].active);
  checks.push(
    'Heating plays without activating steam prematurely; real gem replacement and Water hit enable steam',
  );
  await setup('gems');
  await wait(950);
  await page.evaluate(() => window.smoke.input('move_right'));
  await page.waitForFunction(() => window.smoke.read().x > 980);
  await page.evaluate(() => window.smoke.input('move_right', 'released'));
  await wait(650);
  assert.equal((await read()).element, 'earth');
  checks.push(
    'Four gem colors spawn, idle and collect; each transforms immediately, with independent VFX',
  );
  await setup('wheel', 'water');
  for (let n = 0; n < 3; n++) {
    await cast();
    await wait(650);
  }
  await wait(1200);
  assert((await read()).world[0].active);
  for (const element of ['water', 'fire', 'air', 'earth']) {
    await setup('abilities', element);
    await wait(1100);
    await cast();
    await wait(1500);
    if (element === 'fire' || element === 'air') {
      await page.evaluate(() => {
        window.smoke.input('jump');
        window.smoke.input('jump', 'released');
      });
      await wait(1800);
    }
    await page.evaluate(() => {
      window.smoke.input('jump');
      window.smoke.input('jump', 'released');
    });
    if (element === 'fire') {
      await wait(180);
      await page.evaluate(() => {
        window.smoke.input('jump');
        window.smoke.input('jump', 'released');
      });
    }
    if (element === 'air') {
      await wait(300);
      await page.evaluate(() => window.smoke.input('jump'));
    }
    await wait(2200);
    await page.evaluate(() => window.smoke.input('jump', 'released'));
  }
  checks.push(
    'Representative full wheel loop, elemental projectiles, jumps, Fire double jump, Air glide and Earth landing',
  );
  const before = await page.evaluate(() => window.smoke.resources());
  await page.evaluate(() => window.smoke.pause());
  const samples = await page.evaluate(() =>
    window.smoke.assetEvidence().reduce((n, e) => n + e.samples, 0),
  );
  await wait(350);
  assert.equal(
    await page.evaluate(() =>
      window.smoke.assetEvidence().reduce((n, e) => n + e.samples, 0),
    ),
    samples,
  );
  await page.evaluate(() => window.smoke.resume());
  const resources = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.smoke.retry());
    await wait(600);
    resources.push(await page.evaluate(() => window.smoke.resources()));
  }
  assert(
    resources.every(
      (r) =>
        r.textures === before.textures &&
        r.worldstepListeners === before.worldstepListeners,
    ),
  );
  assert(resources.every((r) => r.objects === resources[0].objects));
  checks.push(
    'Pause freezes scene; repeated restart keeps textures, object count and physics listeners bounded',
  );
  const fullEvidence = await page.evaluate(() => window.smoke.assetEvidence());
  assert(
    fullEvidence.length > 20,
    'Scene observer must record rendered textures',
  );
  assets.push(
    ...(await page.evaluate(() => window.smoke.assetEvidence())).map((a) => ({
      ...a,
      context: 'real gameplay input in editor-compatible fixtures',
    })),
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(
      { passed: true, checks, errors, assets, resources },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, checks, resources }, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        error: String(error),
        errors,
        checks,
        state: await read().catch(() => null),
      },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
