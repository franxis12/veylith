import {
  BLOCKER_FACES,
  PLATFORM_FACES,
  SOLID_FACES,
} from '../game/levels/schema/playerCollision';
import { createRequire } from 'node:module';
import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { playerCollision } from '../game/systems/world/mechanismCollision';
import { PLAYER_BODY } from '../game/config/elements';
import { PlayablePlayer } from '../game/entities/player/PlayablePlayer';
import type { Element } from '../game/types/character';

vi.mock('../game/entities/player/Player', () => ({
  Player: class {
    element: Element = 'earth';
    setElement(element: Element) {
      this.element = element;
    }
    setPosition() {}
  },
}));

// Use the installed Arcade integrator and separation, mocking only the artwork.
const require = createRequire(import.meta.url);
const World =
  require('phaser/src/physics/arcade/World') as typeof Phaser.Physics.Arcade.World;
const Body =
  require('phaser/src/physics/arcade/Body') as typeof Phaser.Physics.Arcade.Body;
const StaticBody =
  require('phaser/src/physics/arcade/StaticBody') as typeof Phaser.Physics.Arcade.StaticBody;

function setup() {
  const scene = {
    sys: { scale: { width: 1280, height: 1100 } },
  } as unknown as Phaser.Scene;
  const world = new World(scene, { gravity: { x: 0, y: 0 } });
  const body = new Body(world);
  body.setSize(PLAYER_BODY.width, PLAYER_BODY.height);
  const collider = {
    body,
    setVisible() {
      return this;
    },
  };
  Object.assign(scene, {
    add: { rectangle: () => collider },
    physics: { add: { existing() {} } },
  });
  new PlayablePlayer(scene, 331, 650, 'earth');
  const solid = new StaticBody(world);
  solid.setSize(512, 20);
  solid.position.set(150, 460);
  const data = new Map<string, unknown>();
  const solidObject = { body: solid, getData: (key: string) => data.get(key) };
  const collision = playerCollision(body);
  const process = () =>
    collision(
      collider as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody,
      solidObject as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody,
    );
  const step = (x: number, y: number, vx: number, vy: number) => {
    body.position.set(x, y);
    body.setVelocity(vx, vy);
    body.preUpdate(true, 1 / 60);
    return world.collide(body, solid, undefined, process);
  };
  return { world, body, solid, step, data };
}

it('passes upward through the underside without stopping the jump or creating a head contact', () => {
  const { body, step } = setup();
  step(300, 480, 0, -240);
  expect(body.top).toBe(476);
  expect(body.velocity.y).toBe(-240);
  expect(body.blocked.up || body.touching.up).toBe(false);
});

it('lands on the top while descending and keeps the feet supported', () => {
  const { body, step } = setup();
  expect(step(300, 459 - PLAYER_BODY.height, 0, 120)).toBe(true);
  expect(body.bottom).toBe(460);
  expect(body.velocity.y).toBe(0);
  expect(body.blocked.down).toBe(true);
});

it.each([-1, 1])(
  'passes through ordinary collider sides in direction %i without slowing or gaining support',
  (direction) => {
    const { body, solid, step } = setup();
    solid.setSize(30, 400);
    solid.position.set(400, 250);
    const start = direction === 1 ? 400 - PLAYER_BODY.width : 430;
    step(start, 476, direction * 120, 0);
    expect(body.left).toBe(start + direction * 2);
    expect(body.velocity.x).toBe(direction * 120);
    expect(body.blocked.left || body.blocked.right || body.blocked.down).toBe(
      false,
    );
  },
);

it.each([-1, 1])(
  'keeps side contacts on puzzle barriers and pushable objects in direction %i',
  (direction) => {
    const { body, solid, step, data } = setup();
    data.set('player-collision', BLOCKER_FACES);
    solid.setSize(30, 400);
    solid.position.set(400, 250);
    expect(
      step(
        direction === 1 ? 400 - PLAYER_BODY.width : 430,
        476,
        direction * 120,
        0,
      ),
    ).toBe(true);
    expect(direction === 1 ? body.right : body.left).toBe(
      direction === 1 ? 400 : 430,
    );
    expect(body.velocity.x).toBe(0);
  },
);

it('does not leak the last solid’s side policy into the next pair', () => {
  const { body, solid, step, data } = setup();
  solid.setSize(30, 400);
  solid.position.set(400, 250);
  for (const sides of [true, false, true, false]) {
    data.set('player-collision', sides ? BLOCKER_FACES : PLATFORM_FACES);
    step(400 - PLAYER_BODY.width, 476, 120, 0);
    expect(body.right).toBe(sides ? 400 : 402);
  }
});

it('respects a directional gate’s admission decision', () => {
  const { body, solid, step, data } = setup();
  solid.setSize(30, 400);
  solid.position.set(400, 250);
  data.set('player-collision', BLOCKER_FACES);
  data.set('directional-blocks', () => false);
  step(400 - PLAYER_BODY.width, 476, 120, 0);
  expect(body.right).toBe(402);
  data.set('directional-blocks', () => true);
  step(400 - PLAYER_BODY.width, 476, 120, 0);
  expect(body.right).toBe(400);
});

it('does not turn the collider off for other bodies or remove the world ceiling', () => {
  const { world, body, solid, step } = setup();
  const block = new Body(world);
  block.position.set(300, 480);
  block.setVelocityY(-240);
  block.preUpdate(true, 1 / 60);
  expect(world.collide(block, solid)).toBe(true);
  expect(block.top).toBe(480);
  expect(block.velocity.y).toBe(0);
  step(300, 1, 0, -240);
  expect(body.top).toBe(0);
  expect(body.blocked.up).toBe(true);
  step(1, 476, -240, 0);
  expect(body.left).toBe(0);
  expect(body.blocked.left).toBe(true);
});

it('uses the solid face, not the actor direction, for asymmetric walls', () => {
  const { body, solid, step, data } = setup();
  solid.setSize(30, 400);
  solid.position.set(400, 250);
  data.set('player-collision', { ...PLATFORM_FACES, left: true });
  step(400 - PLAYER_BODY.width, 476, 120, 0);
  expect(body.right).toBe(400);
  step(430, 476, -120, 0);
  expect(body.left).toBe(428);
  expect(body.velocity.x).toBe(-120);
});
it('allows a saved solid ceiling to stop the head again', () => {
  const { body, step, data } = setup();
  data.set('player-collision', SOLID_FACES);
  step(300, 480, 0, -240);
  expect(body.top).toBe(480);
  expect(body.velocity.y).toBe(0);
  expect(body.blocked.up).toBe(true);
});
it('falls through a disabled top face without inventing support', () => {
  const { body, step, data } = setup();
  data.set('player-collision', { ...PLATFORM_FACES, top: false });
  step(300, 459 - PLAYER_BODY.height, 0, 120);
  expect(body.bottom).toBe(461);
  expect(body.velocity.y).toBe(120);
  expect(body.blocked.down || body.touching.down).toBe(false);
});
