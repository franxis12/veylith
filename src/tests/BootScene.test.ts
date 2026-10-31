import type { LevelObject } from '../game/levels/schema/types';
import { newLevel } from '../editor/library';
import {
  FOREST_ANIMATION_SHEETS,
  forestAnimationKey,
} from '../game/assets/forestAnimations';
import type { OptionalSheet } from '../game/assets/optionalSheet';
import { GEM_SHEETS } from '../game/assets/gemSheets';
import { ELEMENTS } from '../game/types/character';
import { expect, it, vi } from 'vitest';
import { BootScene } from '../game/scenes/BootScene';
import {
  EFFECT_SHEETS,
  effectKey,
  TRANSFORMATION_SHEETS,
  transformationKey,
} from '../game/assets/effectSheets';
import { CHARACTER_ANIMATIONS } from '../game/systems/animation/animationRegistry';
import type { EnvironmentName } from '../game/assets/environmentCatalog';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));

function boot(
  missing: string,
  scope: 'gameplay' | 'all' = 'gameplay',
  forest = false,
  environment: readonly EnvironmentName[] = [],
  objects: readonly LevelObject[] = [],
) {
  const onError = vi.fn();
  const start = vi.fn();
  const registered = new Set<string>();
  const create = vi.fn((config: { key: string }) => registered.add(config.key));
  const load = { spritesheet: vi.fn(), image: vi.fn() };
  const scene = new BootScene(
    'MainScene',
    scope,
    onError,
    forest,
    [],
    environment,
    objects,
  );
  Object.assign(scene, {
    load,
    textures: {
      exists: (key: string) => key !== missing,
      get: (key: string) => ({
        getSourceImage: () => {
          const sheet: OptionalSheet | undefined =
            Object.entries(FOREST_ANIMATION_SHEETS).find(
              ([id]) =>
                forestAnimationKey(
                  id as keyof typeof FOREST_ANIMATION_SHEETS,
                ) === key,
            )?.[1] ??
            GEM_SHEETS.find((clip) => clip.key === key) ??
            ELEMENTS.map((element) => ({
              ...TRANSFORMATION_SHEETS[element],
              key: transformationKey(element),
            })).find((clip) => clip.key === key);
          return {
            width: sheet ? sheet.width * (sheet.columns ?? sheet.frames) : 0,
            height: sheet
              ? sheet.height *
                Math.ceil(sheet.frames / (sheet.columns ?? sheet.frames))
              : 0,
          };
        },
        getFrameNames: () =>
          Array(
            Object.entries(FOREST_ANIMATION_SHEETS).find(
              ([id]) =>
                forestAnimationKey(
                  id as keyof typeof FOREST_ANIMATION_SHEETS,
                ) === key,
            )?.[1].frames ??
              CHARACTER_ANIMATIONS.find((clip) => clip.texture === key)
                ?.frameCount ??
              GEM_SHEETS.find((clip) => clip.key === key)?.frames ??
              (key.startsWith('transform:') ? 8 : undefined) ??
              Object.entries(EFFECT_SHEETS).find(
                ([id]) => effectKey(id as keyof typeof EFFECT_SHEETS) === key,
              )?.[1].frames ??
              0,
          ).fill('frame'),
      }),
    },
    anims: {
      exists: (key: string) => registered.has(key),
      create,
      generateFrameNumbers: () => [],
    },
    scene: { start },
  });
  scene.preload();
  scene.create();
  return { onError, start, create, load };
}

it('continues gameplay when an optional animation fails and leaves it unregistered for idle fallback', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const result = boot('character:fire:double_jump');
  expect(result.onError).not.toHaveBeenCalled();
  expect(result.start).toHaveBeenCalledWith('MainScene');
  expect(result.create).not.toHaveBeenCalledWith(
    expect.objectContaining({ key: 'fire:double_jump' }),
  );
});

it('reports a missing essential idle sprite and blocks startup', () => {
  const result = boot('character:water:idle');
  expect(result.start).not.toHaveBeenCalled();
  expect(result.onError.mock.calls[0]?.[0].message).toContain(
    'water_idle_spritesheet.png',
  );
});

it('keeps strict asset checks in the character inspection lab', () => {
  const result = boot('character:fire:double_jump', 'all');
  expect(result.start).not.toHaveBeenCalled();
  expect(result.onError).toHaveBeenCalledTimes(1);
});

it('starts gameplay with a visible fallback when an effect sheet is unavailable', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const result = boot('effect:waterProjectile');
  expect(result.onError).not.toHaveBeenCalled();
  expect(result.start).toHaveBeenCalledWith('MainScene');
  expect(result.create).not.toHaveBeenCalledWith(
    expect.objectContaining({ key: 'effect:waterProjectile' }),
  );
});

it('reports a missing environment texture instead of creating invisible forest terrain', () => {
  const result = boot('forest:ground', 'gameplay', true);
  expect(result.start).not.toHaveBeenCalled();
  expect(result.onError.mock.calls[0]?.[0].message).toContain(
    'terrain/ground_center.png',
  );
});

it('blocks a level when a placed expansion asset is missing, while other levels do not require it', () => {
  const result = boot('environment:wood_left', 'gameplay', true, ['wood_left']);
  expect(result.start).not.toHaveBeenCalled();
  expect(result.onError.mock.calls[0]?.[0].message).toContain(
    'platforms/wood/wood_left.png',
  );
  expect(
    boot('environment:wood_left', 'gameplay', true).start,
  ).toHaveBeenCalledWith('MainScene');
});

it.each([
  'gem:fire:idle',
  'gem:air:spawn',
  'gem:earth:collect',
  'transform:water',
])('starts the level when optional %s is unavailable', (key) => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const result = boot(key);
  expect(result.onError).not.toHaveBeenCalled();
  expect(result.start).toHaveBeenCalledWith('MainScene');
  expect(result.create).not.toHaveBeenCalledWith(
    expect.objectContaining({ key }),
  );
});

it.each([
  'forest-anim:door',
  'forest-anim:water',
  'forest-anim:portal',
  'forest:portal-frame',
])('starts the forest with a static fallback when %s is missing', (key) => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const result = boot(key, 'gameplay', true);
  expect(result.start).toHaveBeenCalledWith('MainScene');
  expect(result.onError).not.toHaveBeenCalled();
  expect(result.create).not.toHaveBeenCalledWith(
    expect.objectContaining({ key }),
  );
});

it('does not register or request forest animations in other levels or the character lab', () => {
  for (const scope of ['gameplay', 'all'] as const) {
    const result = boot('forest-anim:water', scope, false);
    expect(result.load.spritesheet).not.toHaveBeenCalledWith(
      'forest-anim:water',
      expect.anything(),
      expect.anything(),
    );
    expect(result.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'forest-anim:water' }),
    );
  }
});

it('blocks an editor puzzle with missing new exit art instead of showing an invisible exit', () => {
  const result = boot('exit:frame', 'gameplay', true, [], newLevel().objects);
  expect(result.start).not.toHaveBeenCalled();
  expect(result.onError.mock.calls[0]?.[0].message).toContain(
    'ancient_doorway_frame.png',
  );
});
