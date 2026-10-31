import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  assert = require('node:assert/strict');
const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187';
const out = resolve(process.env.SMOKE_OUTPUT || 'work/reflector-browser');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const doc = JSON.parse(
      fs.readFileSync(root + '/src/game/levels/data/lab-reflectors.json'),
    );
    doc.objects.find((o) => o.id === 'receiver').behavior.latch = false;
    await page.goto(base + '/scripts/browser-harness.html');
    await page.waitForFunction(() => window.smoke);
    await page.evaluate(() => {
      window.pointerLog = [];
      for (const type of [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'lostpointercapture',
        'keyup',
        'keydown',
      ])
        window.addEventListener(
          type,
          (e) =>
            window.pointerLog.push({
              type,
              id: e.pointerId,
              key: e.code,
              target: e.target.dataset?.action || e.target.className,
            }),
          true,
        );
    });
    await page.evaluate((doc) => window.smoke.start('forest-1', doc), doc);
    await page.evaluate(() => window.smoke.mountReflectorControls());
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.smoke.read().x >= 400);
    await page.keyboard.up('ArrowRight');
    await page.locator('.reflector-prompt').waitFor();
    const before = await page.evaluate(() => window.smoke.read());
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    assert.equal(
      await page.locator('.reflector-controls').count(),
      0,
      'A tap must not leave the control latched',
    );
    await page.keyboard.down('KeyE');
    await page.locator('.reflector-dial').waitFor();
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator('.reflector-controls').count(),
      1,
      'StrictMode must not cancel a held control',
    );
    const dial = await page.locator('.reflector-dial').boundingBox();
    const point = (angle) => ({
      x:
        dial.x +
        dial.width / 2 +
        Math.cos((angle * Math.PI) / 180) * dial.width * 0.4,
      y:
        dial.y +
        dial.height / 2 +
        Math.sin((angle * Math.PI) / 180) * dial.height * 0.4,
    });
    const p = point(252);
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(
      () => window.smoke.read().world.find((o) => o.id === 'receiver').active,
    );
    const aimed = await page.evaluate(() => window.smoke.read());
    assert(Math.abs(aimed.x - before.x) < 5);
    assert(
      Math.abs(
        aimed.world.find((o) => o.id === 'mirror').body.x -
          before.world.find((o) => o.id === 'mirror').body.x,
      ) < 1,
    );
    assert(
      aimed.beams.some(
        (s) =>
          Math.abs(s.to.x - s.from.x) > 5 && Math.abs(s.to.y - s.from.y) > 5,
      ),
    );
    await page.screenshot({ path: resolve(out, 'desktop-diagonal.png') });
    await page.keyboard.up('KeyE');
    await page.locator('.reflector-controls').waitFor({ state: 'detached' });
    const released = await page.evaluate(() => window.smoke.read());
    assert.equal(
      released.world.find((o) => o.id === 'mirror').mirrorAngle,
      aimed.world.find((o) => o.id === 'mirror').mirrorAngle,
    );
    await page.keyboard.down('KeyE');
    await page.locator('.reflector-dial').waitFor();
    await page.locator('.reflector-dial').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const fine = await page.evaluate(() => window.smoke.read());
    assert(
      Math.abs(
        fine.world.find((o) => o.id === 'mirror').mirrorAngle -
          aimed.world.find((o) => o.id === 'mirror').mirrorAngle -
          1,
      ) < 0.01,
    );
    await page.keyboard.press('Escape');
    await page.locator('.reflector-controls').waitFor({ state: 'detached' });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.reflector-controls').count(), 0);
    await page.keyboard.up('KeyE');
    await page.setViewportSize({ width: 932, height: 430 });
    const cdp = await context.newCDPSession(page);
    const action = await page
      .locator('[data-action="use_ability"]')
      .boundingBox();
    const hold = {
      x: action.x + action.width / 2,
      y: action.y + action.height / 2,
      id: 1,
    };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [hold],
    });
    await page.locator('.reflector-dial').waitFor();
    const actionAfter = await page
      .locator('[data-action="use_ability"]')
      .boundingBox();
    assert.deepEqual(actionAfter, action);
    const mobileDial = await page.locator('.reflector-dial').boundingBox();
    const drag = {
      x: mobileDial.x + mobileDial.width * 0.8,
      y: mobileDial.y + mobileDial.height * 0.5,
      id: 2,
    };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [hold, drag],
    });
    await page.waitForFunction(
      () =>
        window.smoke.read().world.find((o) => o.id === 'mirror').mirrorAngle <
        5,
    );
    await page.waitForFunction(
      () => !window.smoke.read().world.find((o) => o.id === 'receiver').active,
    );
    const drag2 = {
      x: mobileDial.x + mobileDial.width * 0.5,
      y: mobileDial.y + mobileDial.height * 0.85,
      id: 2,
    };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [hold, drag2],
    });
    await page.waitForFunction(
      () =>
        Math.abs(
          window.smoke.read().world.find((o) => o.id === 'mirror').mirrorAngle -
            90,
        ) < 1,
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector('.reflector-dial')
          .getAttribute('aria-valuenow') === '90',
    );
    await page.screenshot({ path: resolve(out, 'touch-hold.png') });
    // Release Action while the second finger is still on the dial. Control must stop immediately.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [hold],
    });
    await page.locator('.reflector-controls').waitFor({ state: 'detached' });
    const stopped = await page.evaluate(
      () =>
        window.smoke.read().world.find((o) => o.id === 'mirror').mirrorAngle,
    );
    assert.equal(
      (await page.evaluate(() => window.smoke.read())).beamSprites,
      aimed.beamSprites,
      'Continuous aiming reuses beam graphics',
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...drag2, x: drag2.x + 20 }],
    });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(
        () =>
          window.smoke.read().world.find((o) => o.id === 'mirror').mirrorAngle,
      ),
      stopped,
    );
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await page.evaluate(() => window.smoke.retry());
    await page.waitForFunction(() => window.smoke.read().attempts > 1);
    assert.equal(
      await page.evaluate(
        () =>
          window.smoke.read().world.find((o) => o.id === 'mirror').mirrorAngle,
      ),
      225,
    );
    assert.deepEqual(await page.evaluate(() => window.smoke.document()), doc);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      resolve(out, 'results.json'),
      JSON.stringify(
        {
          passed: true,
          checks: [
            'Tap does not latch; E hold opens; release closes',
            'Continuous diagonal ray reaches non-latched receiver; turning away deactivates it',
            'Player and base remain still while aiming',
            'Arrow key fine adjustment and Escape cancellation',
            'Two real touch contacts: stationary Action button and independent dial',
            'Releasing Action stops rotation even with finger still on dial',
            'Restart restores original orientation; document unchanged',
          ],
          before,
          aimed,
          released,
          stopped,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS: reflector physics, keyboard hold, two-finger touch, release and restart',
    );
  } catch (e) {
    await page.screenshot({ path: resolve(out, 'failure.png') });
    fs.writeFileSync(
      resolve(out, 'failure.json'),
      JSON.stringify(
        {
          error: String(e),
          errors,
          pointerLog: await page.evaluate(() => window.pointerLog),
          state: await page
            .evaluate(() => window.smoke?.read())
            .catch(() => null),
        },
        null,
        2,
      ),
    );
    throw e;
  } finally {
    await browser.close();
  }
})();
