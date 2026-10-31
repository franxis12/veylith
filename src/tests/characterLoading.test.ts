import type Phaser from 'phaser';
import { afterEach, expect, it, vi } from 'vitest';
import {
  assetUrl,
  failedCharacterAssets,
  queueCharacterAssets,
} from '../game/assets/loadCharacterAssets';
import {
  CHARACTER_ANIMATIONS,
  registerCharacterAnimations,
} from '../game/systems/animation/animationRegistry';

afterEach(() => vi.unstubAllEnvs());

it('uses base-aware asset URLs for web subdirectories and native relative bundles', () => {
  vi.stubEnv('BASE_URL', '/elements/');
  expect(
    assetUrl('assets/characters/water/idle/water_idle_spritesheet.png'),
  ).toBe('/elements/assets/characters/water/idle/water_idle_spritesheet.png');
  vi.stubEnv('BASE_URL', './');
  expect(assetUrl('assets/test.png')).toBe('./assets/test.png');
});

it('keeps idle, gameplay and preview scopes separate without loading unused character poses for gameplay', () => {
  const spritesheet = vi.fn();
  const scene = {
    textures: { exists: () => false },
    load: { spritesheet },
  } as unknown as Phaser.Scene;
  expect(queueCharacterAssets(scene, 'idle')).toHaveLength(4);
  expect(spritesheet).toHaveBeenCalledTimes(4);
  spritesheet.mockClear();
  const gameplay = queueCharacterAssets(scene, 'gameplay');
  expect(gameplay).toHaveLength(24);
  expect(gameplay.some((clip) => clip.action === 'land')).toBe(false);
  expect(
    gameplay.reduce(
      (bytes, clip) =>
        bytes + clip.frameWidth * clip.frameHeight * clip.frameCount * 4,
      0,
    ),
  ).toBe(146 * 1024 * 1024);
  for (const action of ['push_start', 'push_loop', 'push_end'])
    expect(
      gameplay.some(
        (clip) => clip.element === 'earth' && clip.action === action,
      ),
    ).toBe(true);
  spritesheet.mockClear();
  expect(queueCharacterAssets(scene, 'all')).toHaveLength(29);
  expect(spritesheet).toHaveBeenCalledTimes(29);
});

it('reports actual filenames for missing or incorrectly sliced textures', () => {
  const textures = {
    exists: (key: string) => key === 'character:water:idle',
    get: () => ({ getFrameNames: () => ['0'] }),
  } as unknown as Phaser.Textures.TextureManager;
  expect(failedCharacterAssets(textures, CHARACTER_ANIMATIONS)).toEqual(
    CHARACTER_ANIMATIONS.map((clip) => clip.path),
  );
});

it('registers only loaded textures, preserving per-animation frame counts and default playback', () => {
  const create = vi.fn();
  const generateFrameNumbers = vi.fn(() => []);
  const anims = {
    exists: () => false,
    create,
    generateFrameNumbers,
  } as unknown as Phaser.Animations.AnimationManager;
  const textures = {
    exists: (key: string) =>
      key === 'character:water:idle' || key === 'character:earth:push_end',
  } as unknown as Phaser.Textures.TextureManager;
  registerCharacterAnimations(anims, textures);
  expect(create).toHaveBeenCalledTimes(2);
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'water:idle', repeat: -1, frameRate: 8 }),
  );
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      key: 'earth:push_end',
      repeat: 0,
      frameRate: 10,
    }),
  );
  expect(generateFrameNumbers).toHaveBeenCalledWith(
    'character:earth:push_end',
    { start: 0, end: 2 },
  );
});
