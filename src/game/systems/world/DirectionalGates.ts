import type Phaser from 'phaser';
import type { WorldState, Rect } from './WorldState';
import { overlaps } from './WorldState';
import { gateCanEnter } from './advancedRules';
type Actor = Phaser.Physics.Arcade.Body;
type Static = Phaser.Physics.Arcade.StaticBody;

export class DirectionalGates {
  private readonly passengers = new Map<string, Set<Actor>>();
  constructor(
    private readonly state: WorldState,
    private readonly bodies: Map<string, Phaser.GameObjects.Rectangle>,
  ) {
    for (const o of state.objects)
      if (o.behavior.kind === 'directionalGate') {
        const b = o.behavior,
          solid = bodies.get(o.id)!;
        this.passengers.set(o.id, new Set());
        solid.setData('directional-blocks', (actor: Actor) => {
          const gate = solid.body as Static,
            pass = this.passengers.get(o.id)!;
          if (pass.has(actor)) return false;
          const previous: Rect = {
            left: actor.prev.x,
            right: actor.prev.x + actor.width,
            top: actor.prev.y,
            bottom: actor.prev.y + actor.height,
          };
          if (
            this.state.get(o.id).active &&
            gateCanEnter(previous, gate, b.direction, actor.velocity.x)
          ) {
            pass.add(actor);
            return false;
          }
          return true;
        });
      }
  }
  step(actors: readonly Actor[]): void {
    for (const o of this.state.objects)
      if (o.behavior.kind === 'directionalGate') {
        const solid = this.bodies.get(o.id)!,
          gate = solid.body as Static,
          pass = this.passengers.get(o.id)!;
        for (const actor of pass)
          if (!actor.enable || !overlaps(actor, gate)) pass.delete(actor);
        const b = o.behavior;
        const approaching =
          this.state.get(o.id).active &&
          actors.some(
            (a) =>
              a.bottom > gate.top &&
              a.top < gate.bottom &&
              (b.direction === 1
                ? a.right <= gate.left + 1 &&
                  a.right > gate.left - 70 &&
                  a.velocity.x > 0
                : a.left >= gate.right - 1 &&
                  a.left < gate.right + 70 &&
                  a.velocity.x < 0),
          );
        const open = pass.size > 0 || approaching;
        this.state.get(o.id).contact = open;
        solid.setData('directional-open', open);
      }
  }
}
