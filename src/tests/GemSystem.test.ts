import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { GemSystem } from '../game/systems/gems/GemSystem';
import type { PlayablePlayer } from '../game/entities/player/PlayablePlayer';

function makeVisual() {
  const result = {
    name: '',
    x: 0,
    y: 0,
    destroyed: false,
    setName(name: string) {
      this.name = name;
      return this;
    },
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
    setDisplaySize() {
      return this;
    },
    setStrokeStyle() {
      return this;
    },
    setAlpha() {
      return this;
    },
    setVisible() {
      return this;
    },
    setDepth() {
      return this;
    },
    play: vi.fn().mockReturnThis(),
    destroy() {
      this.destroyed = true;
    },
  };
  return result;
}

function setup(animations = true) {
  const visuals: ReturnType<typeof makeVisual>[] = [];
  function visual() {
    const result = makeVisual();
    visuals.push(result);
    return result;
  }
  const scene = {
    anims: { exists: () => animations },
    add: { sprite: visual, circle: visual, polygon: visual },
  } as unknown as Phaser.Scene;
  const transform = vi.fn();
  const player = {
    body: { left: 80, right: 120, top: 20, bottom: 180, center: { x: 100 } },
    transform,
  } as unknown as PlayablePlayer;
  const placements = [{ id: 'gem', element: 'fire' as const, x: 100, y: 100 }];
  return { visuals, scene, player, transform, placements };
}

it.each([true, false])(
  'collects immediately during spawn and cleans up with animations=%s',
  (animations) => {
    const { scene, player, transform, placements, visuals } = setup(animations);
    const gems = new GemSystem(scene, placements);
    gems.update(player, 16);
    expect(transform).toHaveBeenCalledExactlyOnceWith('fire');
    const effect = visuals.find((v) => v.name === 'transform:fire')!;
    expect(effect).toMatchObject({ x: 100, y: 80 });
    player.body.center.x = 150;
    gems.update(player, 100);
    expect(effect.x).toBe(150);
    for (let frame = 0; frame < 100; frame++) gems.update(player, 16);
    expect(transform).toHaveBeenCalledTimes(1);
    expect(visuals.every((v) => v.destroyed)).toBe(true);
    gems.destroy();
    gems.destroy();
    const restarted = new GemSystem(scene, placements);
    restarted.update(player, 16);
    expect(transform).toHaveBeenCalledTimes(2);
    restarted.destroy();
  },
);

it('plays Spawn then Idle, suppresses pickups after completion, and destroys live effects on restart', () => {
  const { scene, player, transform, placements, visuals } = setup();
  const gems = new GemSystem(scene, placements);
  expect(visuals[0]!.play).toHaveBeenCalledWith('gem:fire:spawn');
  gems.update(player, 400, false);
  expect(visuals[1]!.play).toHaveBeenCalledWith('gem:fire:idle');
  expect(transform).not.toHaveBeenCalled();
  gems.update(player, 16);
  expect(
    visuals.some((v) =>
      v.play.mock.calls.some(([key]) => key === 'gem:fire:collect'),
    ),
  ).toBe(true);
  gems.destroy();
  expect(visuals.every((v) => v.destroyed)).toBe(true);
});
