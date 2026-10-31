import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { animateDoor } from '../game/levels/schema/animateObject';
import { CoinEffects } from '../game/systems/coins/CoinEffects';
import type { CoinObject } from '../game/systems/coins/CoinState';
import { registerOptionalSheet } from '../game/assets/optionalSheet';
import { COIN_SHEETS } from '../game/assets/coinAsset';
import {
  missingWorldAssets,
  WORLD_ART,
  worldTexture,
} from '../game/assets/worldAssets';

it('door signals play full forward/reverse animation while initial state and missing art settle safely', () => {
  let before: boolean | undefined;
  const art = {
    removeAllListeners: vi.fn(),
    setTexture: vi.fn(),
    stop: vi.fn(),
    once: vi.fn(),
    play: vi.fn(),
    playReverse: vi.fn(),
  };
  const available = vi.fn(() => true);
  const view = {
    getByName: () => art,
    getData: () => before,
    setData: (_key: string, value: boolean) => (before = value),
    scene: { anims: { exists: available } },
  } as unknown as Phaser.GameObjects.Container;
  animateDoor(view, false);
  expect(art.play).not.toHaveBeenCalled();
  expect(art.setTexture).toHaveBeenLastCalledWith('forest:doorClosed');
  animateDoor(view, true);
  animateDoor(view, true);
  expect(art.play).toHaveBeenCalledTimes(1);
  expect(art.play).toHaveBeenCalledWith('forest-anim:door');
  animateDoor(view, false);
  expect(art.playReverse).toHaveBeenCalledWith('forest-anim:door');
  available.mockReturnValue(false);
  animateDoor(view, true);
  expect(art.setTexture).toHaveBeenLastCalledWith('forest:door');
});

it('pickup bursts are bounded and expire only when game time advances; destroy clears survivors', () => {
  const visuals: { destroy: ReturnType<typeof vi.fn> }[] = [];
  const sprite = () => {
    const v = {
      destroy: vi.fn(),
      setName: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
    };
    visuals.push(v);
    return v;
  };
  const scene = {
    anims: { exists: () => true },
    add: { sprite },
  } as unknown as Phaser.Scene;
  const effects = new CoinEffects(scene);
  const coin = {
    x: 0,
    y: 0,
    width: 48,
    height: 48,
    layer: 3,
    visible: true,
  } as CoinObject;
  for (let n = 0; n < 20; n++) effects.collect(coin);
  expect(visuals.filter((v) => v.destroy.mock.calls.length)).toHaveLength(4);
  effects.update(0);
  expect(visuals.filter((v) => v.destroy.mock.calls.length)).toHaveLength(4);
  effects.update(600);
  expect(visuals.every((v) => v.destroy.mock.calls.length === 1)).toBe(true);
  effects.collect(coin);
  effects.destroy();
  expect(visuals.every((v) => v.destroy.mock.calls.length === 1)).toBe(true);
});

it('rejects a truncated optional sheet, removes stale animation, and registers every valid frame', () => {
  let width = 1;
  const create = vi.fn(),
    remove = vi.fn();
  const scene = {
    textures: {
      exists: () => true,
      get: () => ({
        getSourceImage: () => ({ width, height: 256 }),
        getFrameNames: () => Array(6).fill(''),
      }),
    },
    anims: {
      exists: () => width === 1,
      remove,
      create,
      generateFrameNumbers: (
        _key: string,
        { start, end }: { start: number; end: number },
      ) => Array.from({ length: end - start + 1 }, (_, frame) => ({ frame })),
    },
  } as unknown as Phaser.Scene;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  registerOptionalSheet(scene, 'coin:collect', COIN_SHEETS.collect);
  expect(remove).toHaveBeenCalledWith('coin:collect');
  expect(create).not.toHaveBeenCalled();
  width = 1536;
  registerOptionalSheet(scene, 'coin:collect', COIN_SHEETS.collect);
  expect(
    create.mock.calls[0]![0].frames.map((f: { frame: number }) => f.frame),
  ).toEqual([0, 1, 2, 3, 4, 5]);
  expect(create.mock.calls[0]![0].repeat).toBe(0);
});

it('missing optional world animations do not block the mechanism if static fallback exists', () => {
  const thumbnail = worldTexture(WORLD_ART.wind_fan.thumbnail);
  const scene = {
    textures: { exists: (key: string) => key === thumbnail },
  } as unknown as Phaser.Scene;
  expect(missingWorldAssets(scene, ['wind_fan'])).toEqual([]);
  expect(missingWorldAssets(scene, ['waterwheel'])).toEqual([
    WORLD_ART.waterwheel.thumbnail,
  ]);
});
