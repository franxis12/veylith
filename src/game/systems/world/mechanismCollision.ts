import { PLATFORM_FACES } from '../../levels/schema/playerCollision';
import type { PlayerCollisionFaces } from '../../levels/schema/types';
import type Phaser from 'phaser';

/** Shared by player, heavy block and movable mirrors; ordinary solids keep Arcade's rules. */
export const mechanismCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
  (a, b) => {
    for (const [gate, actor] of [
      [a, b],
      [b, a],
    ] as const) {
      if (!('getData' in gate) || !('body' in actor)) continue;
      const blocks = gate.getData('directional-blocks') as
        ((body: Phaser.Physics.Arcade.Body) => boolean) | undefined;
      if (
        blocks &&
        actor.body &&
        !blocks(actor.body as Phaser.Physics.Arcade.Body)
      )
        return false;
    }
    return true;
  };

/** Resolve every pair independently, including asymmetric left/right faces. */
export function readPlayerCollision(solid: {
  getData(key: string): unknown;
}): Readonly<PlayerCollisionFaces> {
  return (
    (solid.getData('player-collision') as PlayerCollisionFaces | undefined) ??
    PLATFORM_FACES
  );
}
export function playerCollision(
  player: Phaser.Physics.Arcade.Body,
): Phaser.Types.Physics.Arcade.ArcadePhysicsCallback {
  return (a, b) => {
    const solid = a === player || ('body' in a && a.body === player) ? b : a;
    const faces =
      'getData' in solid ? readPlayerCollision(solid) : PLATFORM_FACES;
    // Actor contact directions are opposite the touched face of the solid.
    player.checkCollision.up = faces.bottom;
    player.checkCollision.down = faces.top;
    player.checkCollision.left = faces.right;
    player.checkCollision.right = faces.left;
    return mechanismCollision(a, b);
  };
}
