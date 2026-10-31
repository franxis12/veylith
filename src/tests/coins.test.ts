import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CoinState } from '../game/systems/coins/CoinState';
import type { CoinObject } from '../game/systems/coins/CoinState';
import { COIN_ASSET } from '../game/assets/coinAsset';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';

function coin(id = 'coin', value = 1): CoinObject {
  return {
    ...createObject(
      LIBRARY.find((i) => i.id === 'coin')!,
      400,
      550,
      [],
    ),
    type: 'coin',
    id,
    value,
  };
}
const player = { left: 380, right: 442, top: 476, bottom: 650 };
describe('collectible coins', () => {
  it('consumes each coin once on overlap, supports multiple values, and restores on a fresh attempt', () => {
    const placements = [coin(), coin('bonus', 5)],
      state = new CoinState(placements);
    expect(state.totalValue).toBe(6);
    expect(state.collect(player)).toHaveLength(2);
    expect(state.value).toBe(6);
    expect(state.collect(player)).toEqual([]);
    expect(state.ids).toEqual(['coin', 'bonus']);
    expect(new CoinState(placements).collect(player)).toHaveLength(2);
  });
  it('uses independent collider bounds and excludes disabled pickups from the available value', () => {
    const shifted = coin();
    shifted.collider.x = 300;
    const disabled = coin('disabled', 10);
    disabled.collider.enabled = false;
    const state = new CoinState([shifted, disabled]);
    expect(state.collect(player)).toEqual([]);
    expect(state.totalValue).toBe(1);
    expect(state.collect({ ...player, left: 700, right: 750 })).toEqual([
      shifted,
    ]);
  });
  it('does not collect through an edge without overlap or when above/below the player', () => {
    const state = new CoinState([coin()]);
    for (const bounds of [
      { ...player, right: 400 },
      { ...player, left: 448, right: 510 },
      { ...player, bottom: 550 },
      { ...player, top: 598, bottom: 772 },
    ])
      expect(state.collect(bounds)).toEqual([]);
    expect(state.value).toBe(0);
  });
  it('keeps coins optional for victory and stops collecting after completion', () => {
    const doc = newLevel();
    doc.objects.push(coin());
    const layout = compileLevel(doc),
      state = new ForestPuzzleState(layout),
      exit = layout.exits[0]!;
    expect(state.snapshot).toMatchObject({
      total: 0,
      coinValue: 0,
      coinTotal: 1,
    });
    state.update({
      x: exit.x,
      feetY: exit.feetY,
      grounded: true,
      element: 'water',
      gliding: false,
    });
    expect(state.snapshot.phase).toBe('complete');
    expect(state.collectCoins(player)).toEqual([]);
  });
  it('round trips an editable coin with its value, size, collider and undo history', () => {
    const model = new EditorModel(newLevel());
    model.commit((d) => {
      d.objects.push(coin('bonus', 7));
    });
    model.select(['bonus']);
    model.duplicate();
    const doc = model.getSnapshot().document;
    expect(parseLevel(JSON.parse(serializeLevel(doc)))).toEqual(doc);
    expect(
      doc.objects.filter((o) => o.type === 'coin').map((o) => o.id),
    ).toEqual(['bonus', 'bonus-2']);
    model.undo();
    model.undo();
    expect(model.getSnapshot().document).toEqual(newLevel());
    model.redo();
    expect(model.getSnapshot().document.objects.at(-1)).toMatchObject({
      type: 'coin',
      value: 7,
    });
  });
  it.each([0, -1, 1.5, 1001, NaN, Infinity])(
    'rejects invalid currency value %s',
    (value) => {
      const doc = newLevel();
      doc.objects.push(coin('bad', value));
      expect(validateLevel(doc).join(' ')).toContain('valor de la moneda');
    },
  );
  it('uses the supplied small RGBA coin artwork without adding a sprite sheet', () => {
    const png = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../public',
        COIN_ASSET.path,
      ),
    );
    expect(png.readUInt32BE(16)).toBe(COIN_ASSET.width);
    expect(png.readUInt32BE(20)).toBe(COIN_ASSET.height);
    expect(png[25]).toBe(6);
    expect(COIN_ASSET.width * COIN_ASSET.height * 4).toBe(262144);
  });
});
