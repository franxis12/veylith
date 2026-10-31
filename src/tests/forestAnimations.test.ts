import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import {
  FOREST_ANIMATION_SHEETS,
  FOREST_DOOR_CYCLE,
  PORTAL_FRAME,
  forestAnimationKey,
  queueForestAnimations,
  registerForestAnimations,
} from '../game/assets/forestAnimations';
import { createForestAnimatedProps } from '../game/levels/ancientForest/ForestAnimatedProps';

function setup(missing: string[] = [], malformed = '') {
  const animations = new Map<string, Phaser.Types.Animations.Animation>();
  const spritesheet = vi.fn();
  const image = vi.fn();
  const scene = {
    textures: {
      exists: (key: string) => !missing.includes(key),
      get: (key: string) => {
        const sheet = Object.entries(FOREST_ANIMATION_SHEETS).find(
          ([id]) =>
            forestAnimationKey(id as keyof typeof FOREST_ANIMATION_SHEETS) ===
            key,
        )?.[1];
        return {
          getSourceImage: () => ({
            width:
              key === malformed
                ? 1
                : sheet
                  ? sheet.width * sheet.columns
                  : PORTAL_FRAME.width,
            height: sheet
              ? sheet.height * Math.ceil(sheet.frames / sheet.columns)
              : PORTAL_FRAME.height,
          }),
          getFrameNames: () =>
            Array.from({ length: sheet?.frames ?? 1 }, (_, i) => String(i)),
        };
      },
    },
    load: { spritesheet, image },
    anims: {
      exists: (key: string) => animations.has(key),
      create: (config: Phaser.Types.Animations.Animation) =>
        animations.set(config.key!, config),
      remove: (key: string) => animations.delete(key),
      generateFrameNumbers: (
        key: string,
        { start, end }: { start: number; end: number },
      ) =>
        Array.from({ length: end - start + 1 }, (_, i) => ({
          key,
          frame: start + i,
        })),
    },
  } as unknown as Phaser.Scene;
  return { scene, animations, spritesheet, image };
}

it('matches the audited grid dimensions and original hashes, with only 46.5 MiB of new textures', () => {
  const inventory = JSON.parse(
    readFileSync('docs/forest-animation-inventory.json', 'utf8'),
  ) as { path: string; sha256: string }[];
  for (const file of inventory)
    expect(
      createHash('sha256')
        .update(readFileSync(`public/${file.path}`))
        .digest('hex'),
    ).toBe(file.sha256);
  let bytes = PORTAL_FRAME.width * PORTAL_FRAME.height * 4;
  for (const sheet of Object.values(FOREST_ANIMATION_SHEETS)) {
    const png = readFileSync(`public/${sheet.path}`);
    expect(png.readUInt32BE(16)).toBe(sheet.width * sheet.columns);
    expect(png.readUInt32BE(20)).toBe(
      sheet.height * Math.ceil(sheet.frames / sheet.columns),
    );
    bytes += png.readUInt32BE(16) * png.readUInt32BE(20) * 4;
  }
  expect(bytes / 1024 ** 2).toBe(46.5);
});

it('reuses cached textures and loads only one door sheet plus two loops and the empty portal frame', () => {
  const cached = setup();
  queueForestAnimations(cached.scene);
  expect(cached.spritesheet).not.toHaveBeenCalled();
  expect(cached.image).not.toHaveBeenCalled();
  const fresh = setup([
    'forest-anim:door',
    'forest-anim:portal',
    'forest-anim:water',
    PORTAL_FRAME.key,
  ]);
  queueForestAnimations(fresh.scene);
  expect(fresh.spritesheet).toHaveBeenCalledTimes(3);
  expect(fresh.image).toHaveBeenCalledExactlyOnceWith(
    PORTAL_FRAME.key,
    expect.stringContaining('portal_inactive.png'),
  );
});

it('loops water and energy and plays opening/closing in the correct order with endpoint holds', () => {
  const { scene, animations } = setup();
  registerForestAnimations(scene);
  expect(animations.get('forest-anim:water')?.repeat).toBe(-1);
  expect(animations.get('forest-anim:portal')?.repeat).toBe(-1);
  const cycle = animations.get(FOREST_DOOR_CYCLE)!;
  const frames = cycle.frames as Phaser.Types.Animations.AnimationFrame[];
  expect(frames.map((frame) => frame.frame)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0,
  ]);
  expect(frames[7]!.duration).toBeGreaterThan(1000);
  expect(frames[15]!.duration).toBeGreaterThanOrEqual(1000);
  expect(cycle.repeat).toBe(-1);
  registerForestAnimations(scene);
  expect(animations.size).toBe(5);
});

it('rejects malformed grid art and skips unavailable animations without blocking other props', () => {
  const { scene, animations } = setup(
    ['forest-anim:portal'],
    'forest-anim:door',
  );
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  registerForestAnimations(scene);
  expect(animations.has(FOREST_DOOR_CYCLE)).toBe(false);
  expect(animations.has('forest-anim:portal')).toBe(false);
  expect(animations.has('forest-anim:water')).toBe(true);
});

it.each([false, true])(
  'composes aligned visual layers with static fallback=%s and no physics bodies',
  (fallback) => {
    const { scene } = setup(
      fallback
        ? [
            PORTAL_FRAME.key,
            'forest-anim:door',
            'forest-anim:water',
            'forest-anim:portal',
          ]
        : [],
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerForestAnimations(scene);
    const objects: {
      name: string;
      originY: number;
      scale: number;
      depth: number;
      texture: string;
      body?: unknown;
      play: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    }[] = [];
    const create = (_x: number, _y: number, texture: string) => {
      const object = {
        name: '',
        originY: 0,
        scale: 0,
        depth: 0,
        texture,
        setOrigin(_x: number, y: number) {
          this.originY = y;
          return this;
        },
        setScale(scale: number) {
          this.scale = scale;
          return this;
        },
        setDepth(depth: number) {
          this.depth = depth;
          return this;
        },
        setName(name: string) {
          this.name = name;
          return this;
        },
        play: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      };
      objects.push(object);
      return object;
    };
    Object.assign(scene, { add: { image: create, sprite: create } });
    const props = createForestAnimatedProps(scene);
    expect(props).toHaveLength(fallback ? 3 : 5);
    expect(objects.every((object) => object.body === undefined)).toBe(true);
    const portal = objects.find(
      (object) => object.name === 'forest-prop:portal',
    )!;
    expect(portal.texture).toBe(fallback ? 'forest:portal' : PORTAL_FRAME.key);
    if (!fallback) {
      const water = objects.find(
        (object) => object.name === 'forest-prop:water',
      )!;
      const tank = objects.find(
        (object) => object.name === 'forest-prop:tank',
      )!;
      expect([water.originY, water.scale]).toEqual([tank.originY, tank.scale]);
      expect(water.depth).toBeLessThan(tank.depth);
      expect(
        objects.find((object) => object.name === 'forest-prop:door')!.play,
      ).toHaveBeenCalledWith(FOREST_DOOR_CYCLE);
    }
    props.forEach((prop) => prop.destroy());
    expect(
      objects.every((object) => object.destroy.mock.calls.length === 1),
    ).toBe(true);
  },
);
