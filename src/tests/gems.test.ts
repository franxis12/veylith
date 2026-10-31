import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { GemState } from '../game/systems/gems/GemState';
import { GEM_SHEETS } from '../game/assets/gemSheets';
import { TRANSFORMATION_SHEETS } from '../game/assets/effectSheets';
import { registerOptionalSheet } from '../game/assets/optionalSheet';
import { ANCIENT_FOREST } from '../game/levels/ancientForest/layout';
import { allowElementTesting } from '../game/levels/levelSelection';
import { PlayerMotor } from '../game/entities/player/PlayerMotor';
import type { InputFrame } from '../game/systems/input/ActionState';

const bounds = { left: 80, right: 120, top: 50, bottom: 150 };
const gems = [{ id: 'fire', element: 'fire', x: 100, y: 100 }] as const;
const input: InputFrame = {
  direction: 1,
  jumpPressed: false,
  abilityPressed: false,
  restartPressed: false,
  glideHeld: false,
  element: undefined,
};

it('collects by collision once per ID, including overlapping gems of the same element, and restores a new attempt', () => {
  const placements = [...gems, { ...gems[0], id: 'another-fire' }];
  const state = new GemState(placements);
  expect(state.collect({ ...bounds, left: 122, right: 180 })).toEqual([]);
  expect(state.collect({ ...bounds, top: 140, bottom: 160 })).toEqual([]);
  expect(state.collect(bounds)).toEqual(placements);
  for (let frame = 0; frame < 100; frame++)
    expect(state.collect(bounds)).toEqual([]);
  expect(new GemState(placements).collect(bounds)).toEqual(placements);
  expect(() => new GemState([...gems, ...gems])).toThrow('unique');
});

it('cannot recharge Fire through gem transformations, including same-element pickups and gliding', () => {
  const motor = new PlayerMotor();
  motor.step({ ...input, jumpPressed: true }, true, 0);
  motor.transform('fire');
  expect(
    motor.step({ ...input, jumpPressed: true }, false, -100).doubleJumped,
  ).toBe(true);
  for (let cycle = 0; cycle < 20; cycle++) {
    motor.transform('air');
    expect(
      motor.step({ ...input, glideHeld: true }, false, 200).vy,
    ).toBeGreaterThan(0);
    motor.transform('earth');
    motor.transform('water');
    motor.transform('fire');
    motor.transform('fire');
    expect(
      motor.step({ ...input, jumpPressed: true }, false, 50),
    ).toMatchObject({ doubleJumped: false, vy: 50 });
  }
  motor.step(input, true, 0);
  expect(
    motor.step({ ...input, jumpPressed: true }, false, 50).doubleJumped,
  ).toBe(true);
});

it('glide does not create upward momentum and exits when leaving Air', () => {
  const motor = new PlayerMotor();
  motor.transform('air');
  expect(motor.step({ ...input, glideHeld: true }, false, -200)).toMatchObject({
    vy: -200,
    gliding: false,
  });
  expect(motor.step({ ...input, glideHeld: true }, false, 200).gliding).toBe(
    true,
  );
  motor.transform('water');
  expect(motor.step({ ...input, glideHeld: true }, false, 100)).toMatchObject({
    gliding: false,
    vy: 100,
  });
});

it('requires explicit development opt-in for manual controls, regardless of production URL', () => {
  expect(allowElementTesting('', true)).toBe(false);
  expect(allowElementTesting('?devElements=1', true)).toBe(true);
  expect(allowElementTesting('?devElements=1&level=test', false)).toBe(false);
});

it('matches all original gem/effect PNG hashes and the 16 loaded sheet dimensions (52 MiB)', () => {
  const inventory = JSON.parse(
    readFileSync('docs/gem-asset-inventory.json', 'utf8'),
  ) as { path: string; sha256: string }[];
  for (const file of inventory)
    expect(
      createHash('sha256')
        .update(readFileSync(`public/${file.path}`))
        .digest('hex'),
    ).toBe(file.sha256);
  let bytes = 0;
  for (const sheet of [
    ...GEM_SHEETS,
    ...Object.values(TRANSFORMATION_SHEETS),
  ]) {
    const png = readFileSync(`public/${sheet.path}`);
    expect(png.readUInt32BE(16)).toBe(sheet.width * sheet.frames);
    expect(png.readUInt32BE(20)).toBe(sheet.height);
    expect(png[25]).toBe(6);
    bytes += sheet.width * sheet.height * sheet.frames * 4;
  }
  expect(bytes).toBe(52 * 1024 * 1024);
  expect(ANCIENT_FOREST.initialElement).toBe('water');
  expect(new Set(ANCIENT_FOREST.gems.map((gem) => gem.element)).size).toBe(4);
});

it.each(['missing', 'truncated', 'wrong-size'])(
  'leaves %s optional art unregistered for the visible fallback',
  (failure) => {
    const sheet = GEM_SHEETS[0]!;
    const create = vi.fn();
    const scene = {
      textures: {
        exists: () => failure !== 'missing',
        get: () => ({
          getSourceImage: () => ({
            width: failure === 'wrong-size' ? 1 : sheet.width * sheet.frames,
            height: sheet.height,
          }),
          getFrameNames: () =>
            Array(failure === 'truncated' ? 1 : sheet.frames).fill('frame'),
        }),
      },
      anims: { exists: () => false, create },
    } as unknown as Phaser.Scene;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerOptionalSheet(scene, sheet.key, sheet);
    expect(create).not.toHaveBeenCalled();
  },
);
