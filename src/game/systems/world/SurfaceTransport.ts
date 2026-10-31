import { readPlayerCollision } from './mechanismCollision';
import type Phaser from 'phaser';
import type { WorldState } from './WorldState';
import { onTop } from './mechanismPhysics';
import { safeDisplacement, shifted, sweptRect } from './advancedRules';
import { overlaps } from './WorldState';
type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
export function transportSurfaces(
  state: WorldState,
  bodies: Map<string, Phaser.GameObjects.Rectangle>,
  solids: Phaser.GameObjects.Rectangle[],
  actors: readonly Phaser.Physics.Arcade.Body[],
  dt: number,
  player: Phaser.Physics.Arcade.Body,
): void {
  for (const actor of actors) {
    if (!actor.enable || actor.immovable) continue;
    const conveyors = state.objects.filter(
      (o) =>
        o.behavior.kind === 'conveyor' &&
        state.get(o.id).active &&
        (bodies.get(o.id)!.body as Body).enable &&
        (actor !== player || readPlayerCollision(bodies.get(o.id)!).top) &&
        onTop(actor, bodies.get(o.id)!.body as Body),
    );
    // A body straddling adjoining modules receives one carry per physics step.
    conveyors.sort((a, b) => {
      const width = (id: string) => {
        const r = bodies.get(id)!.body as Body;
        return Math.min(r.right, actor.right) - Math.max(r.left, actor.left);
      };
      return width(b.id) - width(a.id) || a.id.localeCompare(b.id);
    });
    const conveyor = conveyors[0];
    if (!conveyor || conveyor.behavior.kind !== 'conveyor') continue;
    const amount =
      conveyor.behavior.speed *
      conveyor.behavior.direction *
      Math.min(0.05, Math.max(0, dt));
    const swept = sweptRect(actor, shifted(actor, amount, 0));
    const obstacles = solids
      .filter((s) => {
        const body = s.body as Body;
        if (!body?.enable || body === actor || s.getData('liquid'))
          return false;
        // Belts use the same lateral policy as the player's normal movement.
        if (actor === player) {
          const faces = readPlayerCollision(s);
          if (!(amount > 0 ? faces.left : faces.right)) return false;
        }
        const blocks = s.getData('directional-blocks') as
          ((a: Phaser.Physics.Arcade.Body) => boolean) | undefined;
        return !blocks || !overlaps(swept, body) || blocks(actor);
      })
      .map((s) => s.body as Body);
    actor.position.x += safeDisplacement(actor, amount, 'x', obstacles);
    actor.updateCenter();
  }
}
