// Optional integration test using an already installed Playwright and running Vite.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright',
);
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5173';
const output = resolve(process.env.SMOKE_OUTPUT || 'work/audio-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(20000);
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.url().includes('/assets/audio/') && !r.ok()) errors.push(r.url());
});
await page.routeWebSocket('**/*', (socket) => {
  const server = socket.connectToServer();
  server.onMessage((message) => {
    if (!String(message).includes('full-reload')) socket.send(message);
  });
});
const events = () => page.evaluate(() => window.audioEvents.map((e) => e.id));
const clear = () =>
  page.evaluate(() => {
    window.audioEvents.length = 0;
  });
const diagnostics = () => page.evaluate(() => window.audioEngine.diagnostics);
const waitForCue = (id) =>
  page.waitForFunction(
    (cue) => window.audioEvents.some((e) => e.id === cue),
    id,
  );
try {
  await page.goto(base);
  await page.evaluate(async () => {
    // Use the module URL already loaded by Vite, including its current HMR revision.
    const moduleUrl = performance
      .getEntriesByType('resource')
      .find(
        (r) => new URL(r.name).pathname === '/src/services/audio/gameAudio.ts',
      )?.name;
    const { gameAudio } = await import(
      moduleUrl || '/src/services/audio/gameAudio.ts'
    );
    window.audioEngine = gameAudio;
    window.audioEvents = [];
    const original = gameAudio.start.bind(gameAudio);
    gameAudio.start = (...args) => {
      const voice = original(...args);
      if (voice) window.audioEvents.push({ id: args[0], loop: args[2] });
      return voice;
    };
  });
  assert.equal((await diagnostics()).contextState, undefined);
  await page.getByRole('button', { name: 'Level select', exact: true }).click();
  await waitForCue('ui_confirm');
  await page
    .getByRole('button', { name: '1. The First Awakening', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move right', exact: true })
    .waitFor({ timeout: 30000 });
  await waitForCue('forest_ambience');
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal((await diagnostics()).scopes, 3);
  await page.locator('canvas').click({ position: { x: 500, y: 350 } });
  await page.keyboard.down('ArrowRight');
  await waitForCue('earth_step');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await waitForCue('earth_jump');
  await waitForCue('earth_land');
  checks.push(
    'Trusted gesture unlocks one context; real movement, jump, landing and forest ambience play',
  );
  await page.setViewportSize({ width: 932, height: 430 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await waitForCue('ui_pause');
  await page.waitForFunction(() => window.audioEngine.diagnostics.voices === 0);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.screenshot({ path: resolve(output, 'paused-audio-settings.png') });
  await page.getByRole('button', { name: 'Mute', exact: true }).click();
  await clear();
  await page.getByRole('button', { name: 'Close options' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForTimeout(250);
  assert.deepEqual(await events(), []);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await page.getByLabel('Game volume').fill('0.35');
  const preferences = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('veylith.audio.v1')),
  );
  assert.deepEqual(preferences, { enabled: true, volume: 0.35 });
  await page.getByRole('button', { name: 'Close options' }).click();
  await waitForCue('forest_ambience');
  await clear();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('dialog').waitFor();
  assert.equal((await diagnostics()).voices, 0);
  assert(!(await events()).includes('ui_pause'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await waitForCue('ui_resume');
  await waitForCue('forest_ambience');
  await clear();
  await page
    .getByRole('button', { name: 'Restart level', exact: true })
    .click();
  await waitForCue('ui_restart');
  assert.equal((await events()).filter((e) => e === 'ui_restart').length, 1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await waitForCue('ui_back');
  assert.equal(await page.locator('canvas').count(), 0);
  assert.equal((await diagnostics()).scopes, 1);
  await page.waitForFunction(() => window.audioEngine.diagnostics.voices === 0);
  checks.push(
    'Resize, pause, mute, volume persistence, automatic background pause, resume, restart and unmount clean up audio',
  );

  // Real portal traversal with an in-memory level. Never write campaign files or saved currency.
  await page.evaluate(async () => {
    const moduleUrl = performance
      .getEntriesByType('resource')
      .find((r) => new URL(r.name).pathname === '/src/game/core/Game.ts')?.name;
    const { createGame } = await import(moduleUrl || '/src/game/core/Game.ts');
    const { newLevel } = await import('/src/editor/library.ts');
    const { ActionState } =
      await import('/src/game/systems/input/ActionState.ts');
    const { RunSession } = await import('/src/game/session/RunSession.ts');
    const level = newLevel('audio-smoke');
    level.objects.find((o) => o.type === 'spawn').element = 'earth';
    level.objects.find((o) => o.type === 'exit').x = 400;
    const host = document.createElement('div');
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
    });
    document.body.append(host);
    const actions = new ActionState();
    const run = new RunSession((ms) => ({
      level: 'forest-1',
      elapsedMs: ms,
      bestTimeMs: ms,
      stars: 3,
      earnedCoins: 5,
      newRecord: true,
    }));
    const handle = await new Promise((resolve, reject) => {
      const game = createGame(host, () => resolve(game), {
        document: level,
        input: actions,
        run,
        level: 'forest-1',
        onError: reject,
      });
    });
    window.audioFixture = {
      run,
      actions,
      stop: () => {
        handle.destroy();
        run.dispose();
        host.remove();
      },
    };
  });
  await page.waitForFunction(
    () => window.audioEngine.diagnostics.pending === 0,
  );
  await clear();
  await page.evaluate(() =>
    window.audioFixture.actions.dispatch(
      { type: 'move_right', phase: 'pressed' },
      'audio-smoke',
    ),
  );
  await page.waitForFunction(
    () => window.audioFixture.run.getSnapshot().phase === 'complete',
  );
  await waitForCue('reward_bank');
  const victory = await events();
  assert.equal(victory.filter((e) => e === 'level_victory').length, 1);
  assert.equal(victory.filter((e) => e === 'star_award').length, 3);
  assert.equal(victory.filter((e) => e === 'new_record').length, 1);
  assert.equal(victory.filter((e) => e === 'reward_bank').length, 1);
  await page.evaluate(() => window.audioFixture.stop());
  assert.equal(await page.locator('canvas').count(), 0);
  assert.equal((await diagnostics()).scopes, 1);
  checks.push(
    'A real portal collision plays one victory, three earned stars, record and reward; teardown cancels the result sequence',
  );

  const decoded = await page.evaluate(async () => {
    const { SOUNDS } = await import('/src/services/audio/catalog.ts');
    const ids = Object.keys(SOUNDS);
    const loaded = await Promise.all(
      ids.map((id) => window.audioEngine.load(id)),
    );
    return { count: loaded.filter(Boolean).length, registered: ids.length };
  });
  assert.deepEqual(decoded, { count: 74, registered: 74 });
  assert.deepEqual((await diagnostics()).failed, []);
  checks.push('All 74 registered WAVs fetch and decode in the browser');
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    checks,
    errors,
    diagnostics: await diagnostics(),
  };
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(
    resolve(output, 'failure.txt'),
    `${error.stack}\n${JSON.stringify({ errors, events: await events(), diagnostics: await diagnostics() })}`,
  );
  throw error;
} finally {
  await browser.close();
}
