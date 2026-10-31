import { readPlayerCollision } from './mechanismCollision';
import type Phaser from 'phaser';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { WorldState } from './WorldState';
import { effectBounds, overlaps } from './WorldState';
import { floatStep, onTop } from './mechanismPhysics';
import { planPlatformMotion } from './PlatformMotion';

type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
/** Uses the existing solid list: projectiles, heavy blocks and the player see the same colliders. */
export class StageOnePhysics {
  private readonly fallSpeeds = new Map<string, number>();
  constructor(
    private readonly state: WorldState,
    private readonly bodies: Map<string, Phaser.GameObjects.Rectangle>,
    private readonly solids: Phaser.GameObjects.Rectangle[],
    private readonly views: Map<string, Phaser.GameObjects.Container>,
  ) {}

  step(player: PlayablePlayer, deltaMs: number): void {
    const lakes = this.state.objects
      .filter((o) => o.behavior.kind === 'lake' && o.effect.enabled)
      .map(effectBounds);
    for (const o of this.state.objects) {
      const solid = this.bodies.get(o.id)!;
      const body = solid.body as Phaser.Physics.Arcade.StaticBody;
      if (!body.enable) continue;
      if (
        o.behavior.kind === 'phasePlatform' &&
        readPlayerCollision(solid).top &&
        onTop(player.body, body)
      )
        this.state.standOn(o.id);
      if (
        o.behavior.kind === 'bounce' &&
        readPlayerCollision(solid).top &&
        onTop(player.body, body) &&
        this.state.bounce(o.id)
      ) {
        player.bounce(o.behavior.speed);
      }
      if (o.behavior.kind !== 'float') continue;
      const obstacles = this.solids
        .filter(
          (s) =>
            s !== solid && (s.body as Body)?.enable && !s.getData('liquid'),
        )
        .map((s) => s.body as Body);
      const step = floatStep(
        body,
        this.fallSpeeds.get(o.id) ?? 0,
        o.behavior,
        lakes,
        obstacles,
        deltaMs,
      );
      const motion = planPlatformMotion(
        body,
        step.next,
        {
          left: player.body.left,
          right: player.body.right,
          top: player.body.top,
          bottom: player.body.bottom,
          velocityY: player.body.velocity.y,
          grounded:
            readPlayerCollision(solid).top &&
            (player.body.blocked.down || player.body.touching.down),
        },
        obstacles,
      );
      if (!motion.riding && overlaps(step.next, player.body, 0.01))
        motion.blocked = true;
      this.fallSpeeds.set(o.id, motion.blocked ? 0 : step.vy);
      this.state.get(o.id).active = step.floating;
      if (motion.blocked) continue;
      solid.setPosition(
        (step.next.left + step.next.right) / 2,
        (step.next.top + step.next.bottom) / 2,
      );
      body.updateFromGameObject();
      if (motion.riding) {
        player.body.position.x += motion.dx;
        player.body.position.y = body.top - player.body.height;
        player.body.updateCenter();
        player.body.setVelocityY(0);
        player.body.blocked.down = true;
        player.body.blocked.none = false;
      }
      this.views
        .get(o.id)
        ?.setPosition(body.left - o.collider.x, body.top - o.collider.y);
    }
  }
}
