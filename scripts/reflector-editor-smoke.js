import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  assert = require('node:assert/strict');
(async () => {
  const base = process.env.VEYLITH_URL || 'http://127.0.0.1:5187',
    out = resolve(process.env.SMOKE_OUTPUT || 'work/reflector-editor');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    headless: true,
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      hasTouch: true,
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const id = 'reflector-hold-check-' + Date.now(),
    url = base + '/__veylith_editor/levels/' + id;
  const { token } = await (
      await page.request.get(base + '/__veylith_editor/session')
    ).json(),
    headers = { 'X-Veylith-Editor': token };
  let etag;
  const button = (name) => page.getByRole('button', { name, exact: true });
  const open = async (name) => {
    await button('Abrir').click();
    await page.getByRole('dialog').getByRole('combobox').selectOption(name);
    await button('Abrir seleccionado').click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Abierto: ' + name })
      .waitFor();
  };
  const select = () =>
    page
      .locator('.object-tree button')
      .filter({ hasText: /^mirror\s/ })
      .click();
  const value = async (n) => {
    const f = page.getByLabel('Ángulo inicial de la cara (°)', { exact: true });
    await f.fill(String(n));
    await f.blur();
  };
  try {
    await page.goto(base + '/editor');
    await page
      .getByRole('status')
      .filter({ hasText: 'Nivel abierto' })
      .waitFor({ timeout: 60000 });
    await open('lab-reflectors');
    await select();
    await value(252.5);
    await page
      .getByLabel('Permitir giro con Acción', { exact: true })
      .uncheck();
    await button('Guardar como').click();
    await page.getByLabel('ID del archivo').fill(id);
    await button('Guardar copia').click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Guardado: ' + id + '.json' })
      .waitFor();
    const saved = await (await page.request.get(url, { headers })).json();
    etag = saved.etag;
    assert.equal(
      saved.document.objects.find((o) => o.id === 'mirror').behavior.angle,
      252.5,
    );
    assert.equal(
      saved.document.objects.find((o) => o.id === 'mirror').behavior.rotatable,
      false,
    );
    await open(id);
    await select();
    assert.equal(
      await page
        .getByLabel('Ángulo inicial de la cara (°)', { exact: true })
        .inputValue(),
      '252.5',
    );
    assert.equal(
      await page
        .getByLabel('Permitir giro con Acción', { exact: true })
        .isChecked(),
      false,
    );
    await page.getByLabel('Permitir giro con Acción', { exact: true }).check();
    await button('Guardar').click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Guardado explícitamente:' })
      .waitFor();
    const edited = await (await page.request.get(url, { headers })).json();
    etag = edited.etag;
    const ledger = await page.evaluate(() =>
      localStorage.getItem('veylith.progress'),
    );
    await button('▶ Probar').click();
    await page
      .locator('.gameplay-controls,.gesture-controls')
      .waitFor({ timeout: 60000 });
    await page.keyboard.down('KeyD');
    await page.locator('.reflector-prompt').waitFor();
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyE');
    await page.locator('.reflector-dial').waitFor();
    const initial = await page
      .locator('.reflector-dial')
      .getAttribute('aria-valuenow');
    assert.equal(Number(initial), 252.5);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    await page.waitForFunction(
      () =>
        Number(
          document
            .querySelector('.reflector-dial')
            .getAttribute('aria-valuenow'),
        ) > 260,
    );
    await button('Pausar').click();
    await page.locator('.reflector-controls').waitFor({ state: 'detached' });
    await page.keyboard.up('KeyE');
    await button('Continuar').click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.reflector-controls').count(), 0);
    await page.keyboard.down('KeyE');
    await page.locator('.reflector-dial').waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.locator('.reflector-controls').waitFor({ state: 'detached' });
    await page.keyboard.up('KeyE');
    await button('Reiniciar prueba').click();
    await page.waitForTimeout(400);
    await page.keyboard.down('KeyD');
    await page.locator('.reflector-prompt').waitFor();
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyE');
    await page.locator('.reflector-dial').waitFor();
    assert.equal(
      Number(
        await page.locator('.reflector-dial').getAttribute('aria-valuenow'),
      ),
      252.5,
    );
    for (const [width, height] of [
      [932, 430],
      [667, 375],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(120);
      const box = await page.locator('.reflector-controls').boundingBox(),
        action = await page
          .locator('[data-action="use_ability"]')
          .boundingBox();
      assert(
        box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= width + 1 &&
          box.y + box.height <= height + 1,
      );
      assert(
        box.x + box.width <= action.x ||
          box.y + box.height <= action.y ||
          action.x + action.width <= box.x,
      );
      assert(
        await page.locator('[data-action="use_ability"]').evaluate((button) => {
          const r = button.getBoundingClientRect();
          return (
            document
              .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
              ?.closest('button') === button
          );
        }),
        'Action must remain reachable, with no overlay covering it',
      );
      await page.screenshot({ path: out + '/hold-' + width + '.png' });
    }
    await page.keyboard.up('KeyE');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await button('■ Detener y volver al editor').click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Se conserva el borrador' })
      .waitFor();
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(
      await page.evaluate(() => localStorage.getItem('veylith.progress')),
      ledger,
    );
    assert.deepEqual(
      (await (await page.request.get(url, { headers })).json()).document,
      edited.document,
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + '/results.json',
      JSON.stringify(
        {
          passed: true,
          checks: [
            'Editor saves and reopens angle/rotatable in JSON v1',
            'Hold E / D rotates in actual playtest',
            'Pause and window blur release control',
            'Restart restores edited angle',
            '932x430,667x375,390x844 keep dial inside viewport and clear of Action',
            'Returning to editor destroys playtest without altering saved document or progress',
          ],
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS: real editor, save/reopen, playtest hold, pause, blur, resize, restart, unmount',
    );
  } catch (e) {
    await page.screenshot({ path: out + '/failure.png' });
    fs.writeFileSync(
      out + '/failure.json',
      JSON.stringify({ error: String(e), errors }, null, 2),
    );
    throw e;
  } finally {
    const current = await page.request.get(url, { headers });
    if (current.ok()) {
      etag = (await current.json()).etag;
      assert(
        (
          await page.request.delete(url, {
            headers: { ...headers, 'If-Match': etag },
          })
        ).ok(),
        'Temporary copy cleanup failed',
      );
    }
    await browser.close();
  }
})();
