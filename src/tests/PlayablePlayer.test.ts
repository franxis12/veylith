import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { PlayablePlayer } from '../game/entities/player/PlayablePlayer';
import type { Element } from '../game/types/character';

vi.mock('../game/entities/player/Player', () => ({
  Player: class {
    element: Element = 'water';
    facing = 'left';
    setElement(element: Element) {
      this.element = element;
    }
    setPosition() {}
    destroy() {}
  },
}));

it('replaces the form immediately without changing body, position, facing or either velocity, including same-element pickups', () => {
  const body = {
    center: { x: 440, y: 200 },
    bottom: 287,
    velocity: { x: -245, y: -300 },
    setCollideWorldBounds: vi.fn(),
    checkCollision: { up: true, down: true, left: true, right: true },
  };
  const collider = {
    body,
    setVisible() {
      return this;
    },
    destroy: vi.fn(),
  };
  const scene = {
    add: { rectangle: vi.fn(() => collider) },
    physics: { add: { existing: vi.fn() } },
  } as unknown as Phaser.Scene;
  const player = new PlayablePlayer(scene, 440, 287, 'earth');
  // The reduced collider keeps the original feet and horizontal spawn anchor.
  expect(scene.add.rectangle).toHaveBeenCalledWith(440, 208.7, 55.8, 156.6);
  expect(player.element).toBe('earth');
  const before = JSON.stringify(body);
  for (const element of ['fire', 'air', 'air', 'water', 'earth'] as const) {
    player.transform(element);
    expect(player.element).toBe(element);
    expect(player.facing).toBe(-1);
    expect(player.body).toBe(body);
    expect(JSON.stringify(body)).toBe(before);
  }
  player.destroy();
});
