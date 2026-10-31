import type Phaser from 'phaser';
import { beforeEach, expect, it, vi } from 'vitest';
import { Player } from '../game/entities/player/Player';
import { CHARACTER_ANIMATIONS } from '../game/systems/animation/animationRegistry';

vi.mock('phaser', () => ({
  default: {
    Animations: {
      Events: { ANIMATION_UPDATE: 'update', ANIMATION_COMPLETE: 'complete' },
    },
  },
}));

const keys = new Set<string>(CHARACTER_ANIMATIONS.map((clip) => clip.id));
let sprite: ReturnType<typeof makeSprite>;
let scene: Phaser.Scene;

function makeSprite(x: number, y: number) {
  return {
    x,
    y,
    frame: { name: 0 },
    flipX: false,
    scaleX: 1,
    originX: 0,
    originY: 0,
    scene: { anims: { exists: (key: string) => keys.has(key) } },
    anims: { resume: vi.fn(), pause: vi.fn() },
    play: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    setOrigin(x: number, y: number) {
      this.originX = x;
      this.originY = y;
      return this;
    },
    setScale(value: number) {
      this.scaleX = value;
      return this;
    },
    setFlipX(value: boolean) {
      this.flipX = value;
      return this;
    },
  };
}

beforeEach(() => {
  scene = {
    anims: { exists: (key: string) => keys.has(key) },
    add: {
      sprite: (x: number, y: number) => {
        sprite = makeSprite(x, y);
        return sprite;
      },
    },
  } as unknown as Phaser.Scene;
});

it('starts as Water idle and preserves position, facing, and scale across element changes', () => {
  const player = new Player(scene, 640, 460);
  expect(player.element).toBe('water');
  expect(player.animation).toBe('idle');
  const scale = sprite.scaleX;
  player.setFacing('left');
  for (const element of ['fire', 'air', 'earth', 'water'] as const) {
    player.setElement(element);
    expect([player.x, player.y, player.facing, player.animation]).toEqual([
      640,
      460,
      'left',
      'idle',
    ]);
    expect(sprite.scaleX).toBe(scale);
    expect(sprite.flipX).toBe(true);
  }
  player.destroy();
});

it('previews loops and one-shots without moving, and rejects missing animations without changing state', () => {
  const player = new Player(scene, 640, 460);
  expect(player.playAnimation('run')).toBe(true);
  expect(sprite.play).toHaveBeenLastCalledWith({
    key: 'water:run',
    repeat: -1,
  });
  player.playAnimation('run', 'once');
  expect(sprite.play).toHaveBeenLastCalledWith({ key: 'water:run', repeat: 0 });
  player.setElement('earth');
  expect(player.playAnimation('attack')).toBe(false);
  expect(player.animation).toBe('idle');
  expect([player.x, player.y]).toEqual([640, 460]);
  player.destroy();
});

it('removes animation listeners and destroys its sprite once', () => {
  const player = new Player(scene, 0, 0);
  player.destroy();
  player.destroy();
  expect(sprite.off).toHaveBeenCalledTimes(2);
  expect(sprite.destroy).toHaveBeenCalledTimes(1);
});
