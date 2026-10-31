// @vitest-environment node
import { EventEmitter } from 'node:events';
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  BlockStackTransport,
  stackSupport,
} from '../game/levels/forestPuzzles/BlockStackTransport';
import type { StackContact } from '../game/levels/forestPuzzles/BlockStackTransport';

const rect = (
  id: string,
  left: number,
  top: number,
  width = 100,
  height = 100,
): StackContact => ({
  id,
  left,
  right: left + width,
  top,
  bottom: top + height,
  enable: true,
  velocityY: 0,
});
function body(id: string, x: number, y: number, width = 100, height = 100) {
  const position = { x, y };
  return {
    gameObject: { name: id },
    position,
    velocity: { x: 0, y: 0 },
    blocked: { down: true, none: false },
    touching: { down: true },
    enable: true,
    immovable: false,
    get left() {
      return position.x;
    },
    get right() {
      return position.x + width;
    },
    get top() {
      return position.y;
    },
    get bottom() {
      return position.y + height;
    },
    updateCenter() {},
  } as unknown as Phaser.Physics.Arcade.Body;
}
function fixture() {
  const world = new EventEmitter(),
    low = body('low', 200, 400),
    mid = body('mid', 210, 300),
    high = body('high', 220, 200);
  const blocks = [high, low, mid];
  const solids = blocks.map((body) => ({
    body,
    getData: () => undefined,
  })) as unknown as Phaser.GameObjects.Rectangle[];
  const transport = new BlockStackTransport(
    world as unknown as Phaser.Physics.Arcade.World,
    blocks,
    solids,
  );
  return { world, low, mid, high, solids, transport };
}
describe('stack contacts and committed horizontal transport', () => {
  it('chooses one support by contact width and stable ID, never a side contact or airborne block', () => {
    const a = rect('a', 0, 100),
      b = rect('b', 100, 100),
      rider = rect('rider', 75, 0);
    expect(stackSupport(rider, [a, b])?.id).toBe('b');
    const centered = rect('rider', 50, 0);
    expect(stackSupport(centered, [b, a])?.id).toBe('a');
    expect(
      stackSupport({ ...centered, velocityY: -5 }, [a, b]),
    ).toBeUndefined();
    expect(stackSupport(rect('gap', 0, -10), [a])).toBeUndefined();
    expect(stackSupport(rect('side', -100, 100), [a])).toBeUndefined();
    expect(stackSupport(rider, [{ ...b, enable: false }])).toBeUndefined();
  });
  it.each([25, -25])(
    'carries three blocks by the resolved %i px exactly once, independent of object order',
    (dx) => {
      const { world, low, mid, high, transport } = fixture();
      low.position.x += dx;
      world.emit('worldstep');
      expect(mid.left).toBe(210 + dx);
      expect(high.left).toBe(220 + dx);
      world.emit('worldstep');
      expect(mid.left).toBe(210 + dx);
      expect(high.left).toBe(220 + dx);
      transport.destroy();
      expect(world.listenerCount('worldstep')).toBe(0);
    },
  );
  it('uses actual displacement, not a blocked support’s requested velocity', () => {
    const { world, low, mid } = fixture();
    low.velocity.x = 150;
    world.emit('worldstep');
    expect(mid.left).toBe(210);
  });
  it('preserves independent cargo displacement while adding its support’s carry', () => {
    const { world, low, mid, high } = fixture();
    low.position.x += 10;
    mid.position.x -= 3;
    world.emit('worldstep');
    expect(mid.left).toBe(217);
    expect(high.left).toBe(227);
  });
  it('clamps at an upper obstacle and propagates only the cargo’s allowed movement', () => {
    const { world, low, mid, high, solids } = fixture();
    solids.push({
      body: body('wall', 325, 200, 10, 200),
      getData: () => undefined,
    } as unknown as Phaser.GameObjects.Rectangle);
    low.position.x += 25;
    world.emit('worldstep');
    expect(mid.right).toBe(325);
    expect(high.right).toBe(325);
  });
  it('does not carry latched or disabled blocks', () => {
    const { world, low, mid, high } = fixture();
    mid.immovable = true;
    high.enable = false;
    low.position.x += 10;
    world.emit('worldstep');
    expect(mid.left).toBe(210);
    expect(high.left).toBe(220);
  });
  it('does not pull a detached cargo block back onto a support', () => {
    const { world, low, mid } = fixture();
    mid.position.y -= 8;
    low.position.x += 10;
    world.emit('worldstep');
    expect(mid.left).toBe(210);
  });
});

it('settles stacked contact jitter bottom-up without suspending a falling support', () => {
  const { world, low, mid, high } = fixture();
  mid.position.y += 0.875;
  high.position.y += 1.875;
  mid.velocity.y = 45;
  high.velocity.y = 60;
  world.emit('worldstep');
  expect(mid.bottom).toBe(low.top);
  expect(high.bottom).toBe(mid.top);
  expect(mid.velocity.y).toBe(0);
  expect(high.velocity.y).toBe(0);
  low.velocity.y = 60;
  mid.velocity.y = 60;
  high.velocity.y = 60;
  world.emit('worldstep');
  expect(mid.velocity.y).toBe(60);
  expect(high.velocity.y).toBe(60);
});

it('does not carry cargo through the player', () => {
  const { world, low, mid, transport } = fixture();
  transport.setPlayer(body('player', 315, 280, 62, 174));
  low.position.x += 25;
  world.emit('worldstep');
  expect(mid.right).toBe(315);
});
