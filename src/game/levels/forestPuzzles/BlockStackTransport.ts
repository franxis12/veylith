import type Phaser from 'phaser';
import type { SolidBounds } from '../../systems/powers/projectileCollision';
import {
  safeDisplacement,
  shifted,
  sweptRect,
} from '../../systems/world/advancedRules';
import { overlaps } from '../../systems/world/WorldState';

type Body = Phaser.Physics.Arcade.Body;
type Solid = Body | Phaser.Physics.Arcade.StaticBody;
export interface StackContact extends SolidBounds {
  id: string;
  velocityY: number;
}

/** One supporting block per rider: choose the widest contact, then a stable ID. */
export function stackSupport(
  rider: StackContact,
  candidates: readonly StackContact[],
): StackContact | undefined {
  if (!rider.enable || rider.velocityY < 0) return;
  const width = (b: StackContact) =>
    Math.min(rider.right, b.right) - Math.max(rider.left, b.left);
  return candidates
    .filter(
      (b) =>
        b.id !== rider.id &&
        b.enable &&
        b.top > rider.top &&
        Math.abs(rider.bottom - b.top) <= 1 &&
        width(b) > 2,
    )
    .sort((a, b) => width(b) - width(a) || a.id.localeCompare(b.id))[0];
}

/** Carries stacked blocks once per fixed step, after collisions and moving surfaces. */
export class BlockStackTransport {
  private previous = new Map<Body, StackContact>();
  private player: Body | undefined;
  constructor(
    private readonly world: Phaser.Physics.Arcade.World,
    private readonly blocks: readonly Body[],
    private readonly solids: readonly Phaser.GameObjects.Rectangle[],
  ) {
    this.capture();
    world.on('worldstep', this.step);
  }
  setPlayer(body: Body): void {
    this.player = body;
  }
  private capture(): void {
    for (const b of this.blocks)
      this.previous.set(b, {
        id: b.gameObject.name,
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        enable: b.enable,
        velocityY: b.velocity.y,
      });
  }
  private step = (): void => {
    const contacts = [...this.previous.values()];
    const byId = new Map(this.blocks.map((b) => [b.gameObject.name, b]));
    // A lower block's committed carry becomes the displacement of its own rider.
    const ordered = [...this.blocks].sort(
      (a, b) =>
        this.previous.get(b)!.top - this.previous.get(a)!.top ||
        a.gameObject.name.localeCompare(b.gameObject.name),
    );
    for (const actor of ordered) {
      if (!actor.enable || actor.immovable || actor.velocity.y < 0) continue;
      const contact = stackSupport(this.previous.get(actor)!, contacts);
      if (!contact) continue;
      const support = byId.get(contact.id)!;
      if (!support.enable || Math.abs(actor.bottom - support.top) > 2) continue;
      const dx = support.left - contact.left;
      const swept = sweptRect(actor, shifted(actor, dx, 0));
      const obstacles = this.solids
        .filter((o) => {
          const body = o.body as Solid;
          if (
            !body?.enable ||
            body === actor ||
            body === support ||
            o.getData('liquid')
          )
            return false;
          const blocks = o.getData('directional-blocks') as
            ((body: Body) => boolean) | undefined;
          return !blocks || !overlaps(swept, body) || blocks(actor);
        })
        .map((o) => o.body as Solid);
      if (this.player?.enable) obstacles.push(this.player);
      // Arcade may leave small penetrations between several non-pushable bodies.
      // Settle an existing top contact on a resting support before the next step.
      const resting =
        support.immovable ||
        ((support.blocked.down || support.touching.down) &&
          support.velocity.y === 0);
      const dy = support.top - actor.bottom;
      if (
        resting &&
        Math.abs(safeDisplacement(actor, dy, 'y', obstacles) - dy) < 0.00001
      ) {
        actor.position.y += dy;
        actor.velocity.y = 0;
        actor.blocked.down = true;
        actor.blocked.none = false;
      }
      // A wall can stop the cargo while its support slides out; gravity remains real.
      actor.position.x += safeDisplacement(actor, dx, 'x', obstacles);
      actor.updateCenter();
    }
    this.capture();
  };
  destroy(): void {
    this.world.off('worldstep', this.step);
    this.previous.clear();
    this.player = undefined;
  }
}
