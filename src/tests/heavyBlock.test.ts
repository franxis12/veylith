import { describe, expect, it } from 'vitest';
import {
  BLOCK,
  blockPressesPlate,
  blockSupportsPlayer,
  blockPushVelocity,
} from '../game/levels/forestPuzzles/heavyBlockRules';
import { LEVEL_DOCUMENTS } from '../game/levels/forestPuzzles/layouts';
import { parseLevel, validateLevel } from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import { colliderBounds } from '../game/levels/schema/types';
const block = { left: 400, right: 528, top: 554, bottom: 650, enable: true };
const left = { left: 338, right: 400, top: 476, bottom: 650, enable: true };
const right = { ...left, left: 528, right: 590 };
describe('heavy block physical contacts', () => {
  it.each(['water', 'fire', 'air'] as const)(
    '%s cannot push a heavy block',
    (element) => {
      expect(blockPushVelocity(element, left, true, 300, block, true)).toBe(0);
      expect(blockPushVelocity(element, right, true, -300, block, true)).toBe(
        0,
      );
    },
  );
  it('lets Earth push either way with any block size, but not remotely or while standing on it', () => {
    expect(blockPushVelocity('earth', left, true, 240, block, true)).toBe(
      BLOCK.speed,
    );
    expect(blockPushVelocity('earth', right, true, -240, block, true)).toBe(
      -BLOCK.speed,
    );
    expect(blockPushVelocity('earth', left, true, -240, block, true)).toBe(0);
    expect(
      blockPushVelocity(
        'earth',
        { ...left, left: 100, right: 162 },
        true,
        240,
        block,
        true,
      ),
    ).toBe(0);
    expect(
      blockPushVelocity(
        'earth',
        { ...left, left: 400, right: 462, top: 380, bottom: 554 },
        true,
        240,
        block,
        true,
      ),
    ).toBe(0);
    expect(blockPushVelocity('earth', left, false, 240, block, true)).toBe(0);
    expect(blockPushVelocity('earth', left, true, 240, block, false)).toBe(0);
  });
  it('requires enabled colliders, sufficient horizontal overlap, correct height and supported landing', () => {
    const plate = {
      left: 432,
      right: 496,
      top: 649,
      bottom: 650,
      enable: true,
    };
    expect(blockPressesPlate(block, plate, true)).toBe(true);
    expect(
      blockPressesPlate({ ...block, top: 100, bottom: 196 }, plate, true),
    ).toBe(false);
    expect(
      blockPressesPlate({ ...block, top: 700, bottom: 796 }, plate, true),
    ).toBe(false);
    expect(blockPressesPlate(block, plate, false)).toBe(false);
    expect(blockPressesPlate({ ...block, enable: false }, plate, true)).toBe(
      false,
    );
    expect(blockPressesPlate(block, { ...plate, enable: false }, true)).toBe(
      false,
    );
    expect(
      blockPressesPlate({ ...block, left: 490, right: 618 }, plate, true),
    ).toBe(false);
    // Small blocks and large blocks are both valid weights.
    expect(
      blockPressesPlate({ ...block, left: 448, right: 464 }, plate, true),
    ).toBe(true);
  });
});
describe('editor block placement', () => {
  it('accepts a resized block above a plate to its left and compiles the actual collider', () => {
    const doc = structuredClone(LEVEL_DOCUMENTS['forest-2']);
    const b = doc.objects
      .filter((o) => o.type === 'block')
      .find((o) => o.plateId)!;
    b.x = 1500;
    b.y = 150;
    b.width = 192;
    b.height = 96;
    b.collider = { enabled: true, x: 12, y: 8, width: 160, height: 80 };
    expect(validateLevel(doc)).toEqual([]);
    const result = compileLevel(parseLevel(JSON.parse(JSON.stringify(doc))));
    expect(result.document.objects.find((o) => o.id === b.id)).toEqual(b);
    expect(result.blocks.find((o) => o.id === b.id)!.x).toBe(1592);
    expect(result.blocks.find((o) => o.id === b.id)!.floorY).toBe(238);
    expect(result.blocks.find((o) => o.id === b.id)!.plateBounds).toEqual(
      colliderBounds(doc.objects.find((o) => o.id === b.plateId)!),
    );
  });
  it('still rejects a missing plate or disabled mechanism colliders', () => {
    const doc = structuredClone(LEVEL_DOCUMENTS['forest-2']);
    const block = doc.objects
      .filter((o) => o.type === 'block')
      .find((o) => o.plateId)!;
    block.collider.enabled = false;
    expect(validateLevel(doc).join(' ')).toContain('activa los colliders');
    block.collider.enabled = true;
    doc.objects = doc.objects.filter((o) => o.type !== 'plate');
    expect(validateLevel(doc).join(' ')).toContain(
      'placa de destino no existe',
    );
  });
});

describe('stable support on a free block', () => {
  const rider = { ...left, left: 420, right: 482, top: 380.25, bottom: 554.25 };
  it('keeps subpixel top contact jumpable on a resting block', () => {
    expect(blockSupportsPlayer(rider, 15, block, true)).toBe(true);
    expect(
      blockSupportsPlayer({ ...rider, bottom: 553.75 }, 0, block, true),
    ).toBe(true);
  });
  it('does not snap an ascending player, a side contact, a fall or a disabled body', () => {
    expect(blockSupportsPlayer(rider, -560, block, true)).toBe(false);
    expect(blockSupportsPlayer(left, 0, block, true)).toBe(false);
    expect(
      blockSupportsPlayer({ ...rider, bottom: 552 }, 15, block, true),
    ).toBe(false);
    expect(blockSupportsPlayer(rider, 15, block, false)).toBe(false);
    expect(
      blockSupportsPlayer(rider, 15, { ...block, enable: false }, true),
    ).toBe(false);
  });
});
