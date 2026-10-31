// Real React + Phaser + native multi-touch input. Uses an external Playwright install.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5182';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/options-gestures');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const errors = [],
  checks = [];
let page;
async function setup(context) {
  const p = await context.newPage();
  p.setDefaultTimeout(20000);
  p.on('pageerror', (error) => errors.push(error.message));
  await p.routeWebSocket('**/*', (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (!String(message).includes('full-reload')) socket.send(message);
    });
  });
  return p;
}
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  page = await setup(desktop);
  await page.goto(base);
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  const save = await page.evaluate(() =>
    localStorage.getItem('veylith.progress'),
  );
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('es');
  await page.getByLabel('Volumen del juego').fill('0.35');
  await page.getByRole('button', { name: 'Silenciar', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Controles móviles', exact: true })
    .selectOption('buttons');
  await page.screenshot({
    path: resolve(output, 'options-spanish-desktop.png'),
  });
  await page.getByRole('button', { name: 'Cerrar opciones' }).click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'es');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('veylith.progress')),
    save,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Jugar', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Opciones', exact: true }).click();
  assert.equal(
    await page
      .getByRole('combobox', { name: 'Controles móviles', exact: true })
      .inputValue(),
    'buttons',
  );
  assert.equal(await page.getByLabel('Volumen del juego').inputValue(), '0.35');
  await page
    .getByRole('button', { name: 'Activar sonido', exact: true })
    .waitFor();
  await page
    .getByRole('combobox', { name: 'Idioma', exact: true })
    .selectOption('en');
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.getByRole('button', { name: 'Level select', exact: true }).click();
  await page
    .getByRole('button', { name: '1. The First Awakening', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: '10. The Stone Sanctuary', exact: true })
    .waitFor();
  await page.screenshot({ path: resolve(output, 'levels-english.png') });
  checks.push(
    'English first launch; Spanish/English switch; mute, volume and button mode survive reload; progress unchanged; translated campaign',
  );
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  page = await setup(mobile);
  await page.goto(base);
  await page.evaluate(async () => {
    // Read-only observation of the real scene; no player teleport, fake physics or action injection.
    await import('/src/game/core/Game.ts');
    const audioUrl = performance
      .getEntriesByType('resource')
      .find(
        (r) => new URL(r.name).pathname === '/src/services/audio/gameAudio.ts',
      )?.name;
    const { gameAudio } = await import(
      audioUrl || '/src/services/audio/gameAudio.ts'
    );
    window.audioEngine = gameAudio;
    window.accepted = [];
    window.creates = 0;
    const original = window.Phaser.Game.prototype.boot;
    window.Phaser.Game.prototype.boot = function (...args) {
      window.optionsGame = this;
      return original.apply(this, args);
    };
    let observedPlayer;
    window.readOptions = () => {
      const scene = window.optionsGame?.scene.getScene('MainScene');
      if (!scene?.player) return null;
      window.optionsScene = scene;
      if (scene.player !== observedPlayer) {
        observedPlayer = scene.player;
        window.creates++;
        const update = scene.player.update.bind(scene.player);
        scene.player.update = (...input) => {
          const frame = update(...input);
          if (frame.jumped || frame.cast)
            window.accepted.push({ jumped: frame.jumped, cast: frame.cast });
          return frame;
        };
      }
      const body = scene.player.body;
      const texts = [];
      const visit = (view) => {
        if (typeof view.text === 'string') texts.push(view.text);
        if (Array.isArray(view.list)) view.list.forEach(visit);
      };
      scene.children.list.forEach(visit);
      return {
        x: body.center.x,
        y: body.bottom,
        vx: body.velocity.x,
        vy: body.velocity.y,
        grounded:
          (body.blocked.down || body.touching.down) && body.velocity.y >= 0,
        element: scene.player.element,
        run: scene.run.getSnapshot(),
        creates: window.creates,
        texts,
        accepted: window.accepted,
        audio: gameAudio.diagnostics,
      };
    };
  });
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.locator('[data-gesture-zone="left"]').waitFor({ timeout: 45000 });
  await page.waitForFunction(() => window.readOptions()?.grounded);
  const initial = await page.evaluate(() => window.readOptions());
  assert.equal(initial.element, 'earth');
  assert(initial.texts.some((text) => text.includes('Jump over the roots')));
  const cdp = await mobile.newCDPSession(page);
  const point = (id, x, y) => ({ id, x, y, radiusX: 6, radiusY: 6, force: 1 });
  const touch = (type, touchPoints) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const left = point(1, 165, 320);
  await touch('touchStart', [point(1, 100, 320)]);
  await touch('touchMove', [left]);
  await page.waitForFunction((x) => window.readOptions().x > x + 25, initial.x);
  await touch('touchStart', [left, point(2, 750, 320)]);
  await touch('touchMove', [left, point(2, 750, 255)]);
  await page.waitForFunction(() =>
    window.readOptions().accepted.some((f) => f.jumped),
  );
  assert((await page.evaluate(() => window.readOptions())).vy < 0);
  await touch('touchMove', [left]);
  await page.waitForFunction(() => window.readOptions()?.grounded);
  await touch('touchEnd', []);
  await page.waitForFunction(() => window.readOptions().vx === 0);
  const landed = await page.evaluate(() => window.readOptions());
  assert(landed.x > initial.x + 80);
  assert.equal(landed.accepted.filter((f) => f.jumped).length, 1);
  assert.equal(landed.accepted.filter((f) => f.cast).length, 0);
  await touch('touchStart', [point(3, 750, 320)]);
  await touch('touchEnd', []);
  await page.waitForFunction(() =>
    window.readOptions().accepted.some((f) => f.cast === 'earth'),
  );
  assert.equal(
    (await page.evaluate(() => window.readOptions())).accepted.filter(
      (f) => f.cast,
    ).length,
    1,
  );
  await page.screenshot({ path: resolve(output, 'mobile-earth-power.png') });
  checks.push(
    'Native two-finger touch moves and jumps in real Earth physics; swipe never casts; one tap casts exactly once; release stops',
  );

  await touch('touchStart', [point(4, 120, 320)]);
  await touch('touchMove', [point(4, 70, 320)]);
  await page.waitForFunction(() => window.readOptions().vx < 0);
  await touch('touchCancel', []);
  await page.waitForFunction(() => window.readOptions().vx === 0);
  await page.getByRole('button', { name: 'Options', exact: true }).tap();
  const paused = await page.evaluate(() => window.readOptions());
  assert.equal(paused.run.phase, 'paused');
  await page.waitForTimeout(450);
  const still = await page.evaluate(() => window.readOptions());
  assert.equal(still.x, paused.x);
  assert.equal(still.run.elapsedMs, paused.run.elapsedMs);
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('es');
  const translated = await page.evaluate(() => window.readOptions());
  assert(translated.texts.some((text) => text.includes('Salta las raíces')));
  assert.equal(translated.creates, 1);
  await page.getByRole('button', { name: 'Silenciar', exact: true }).tap();
  await page.waitForFunction(() => window.audioEngine.diagnostics.voices === 0);
  await page.getByLabel('Volumen del juego').fill('0.4');
  await page.screenshot({
    path: resolve(output, 'options-spanish-mobile.png'),
  });
  await page.getByRole('button', { name: 'Cerrar opciones' }).tap();
  await page.waitForFunction(
    () => window.readOptions().run.phase === 'playing',
  );
  assert.equal((await page.evaluate(() => window.readOptions())).vx, 0);
  assert.equal(
    (await page.evaluate(() => window.readOptions())).audio.voices,
    0,
  );
  await page.getByRole('button', { name: 'Pausar', exact: true }).tap();
  await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
  await page.getByRole('button', { name: 'Activar sonido', exact: true }).tap();
  await page
    .getByRole('combobox', { name: 'Controles móviles', exact: true })
    .selectOption('buttons');
  await page.getByRole('button', { name: 'Cerrar opciones' }).tap();
  assert.equal(
    (await page.evaluate(() => window.readOptions())).run.phase,
    'paused',
  );
  await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
  await page.getByRole('button', { name: 'Saltar', exact: true }).waitFor();
  assert.equal(await page.locator('[data-gesture-zone]').count(), 0);
  await page.getByRole('button', { name: 'Saltar', exact: true }).tap();
  await page.waitForFunction(
    () => window.readOptions().accepted.filter((f) => f.jumped).length === 2,
  );
  await page.waitForFunction(() => window.readOptions()?.grounded);
  await page.waitForFunction(() => window.audioEngine.diagnostics.voices > 0);
  await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
  await page
    .getByRole('combobox', { name: 'Controles móviles', exact: true })
    .selectOption('gestures');
  await page.getByRole('button', { name: 'Cerrar opciones' }).tap();
  await page.locator('[data-gesture-zone="left"]').waitFor();
  await page.screenshot({
    path: resolve(output, 'mobile-gestures-spanish.png'),
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.getByRole('button', { name: 'Opciones', exact: true }).tap();
  await page.screenshot({ path: resolve(output, 'options-portrait.png') });
  assert.equal(await page.locator('canvas').count(), 1);
  await page.getByRole('button', { name: 'Cerrar opciones' }).tap();
  await page.setViewportSize({ width: 932, height: 430 });
  await page.getByRole('button', { name: 'Pausar', exact: true }).tap();
  await page.getByRole('button', { name: 'Menú principal', exact: true }).tap();
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Jugar', exact: true }).tap();
  await page.locator('[data-gesture-zone="left"]').waitFor({ timeout: 45000 });
  await page
    .getByRole('button', { name: 'Reiniciar nivel', exact: true })
    .tap();
  await page.waitForFunction(() => window.readOptions().creates === 3);
  assert.equal(await page.locator('canvas').count(), 1);
  checks.push(
    'Touch cancellation, pause/frozen time, live canvas translation, mute/unmute, buttons fallback, rotation, remount and restart; world remains one instance',
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    checks,
    errors,
    final: await page.evaluate(() => window.readOptions()),
  };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  await page?.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\n${JSON.stringify(errors)}\n${JSON.stringify(await page.evaluate(() => window.readOptions?.()).catch(() => null))}`,
  );
  throw error;
} finally {
  await browser.close();
}
