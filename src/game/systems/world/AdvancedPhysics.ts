import type Phaser from 'phaser';
import type { WorldState } from './WorldState';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import {
  blockPushVelocity,
  BLOCK,
} from '../../levels/forestPuzzles/heavyBlockRules';
import { mechanismCollision } from './mechanismCollision';
import { AdvancedOptics } from './AdvancedOptics';
import { DirectionalGates } from './DirectionalGates';
import { PulleyMotion } from './PulleyMotion';
import { transportSurfaces } from './SurfaceTransport';
import { renderAdvanced } from '../../assets/advancedArt';
import { isAdvancedKind } from './advancedTypes';
type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;

/** Additional adapters share the world's existing bodies, signals and lifecycle. */
export class AdvancedPhysics {
  readonly optics: AdvancedOptics;
  private readonly gates: DirectionalGates;
  private readonly pulley: PulleyMotion;
  private readonly collisions: Phaser.Physics.Arcade.Collider[] = [];
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly bodies: Map<string, Phaser.GameObjects.Rectangle>,
    private readonly solids: Phaser.GameObjects.Rectangle[],
    private readonly views: Map<string, Phaser.GameObjects.Container>,
  ) {
    this.optics = new AdvancedOptics(scene, state, bodies, solids);
    this.gates = new DirectionalGates(state, bodies);
    this.pulley = new PulleyMotion(scene, state, bodies, solids);
    for (const o of state.objects)
      if (o.behavior.kind === 'reflector') {
        const solid = bodies.get(o.id)!,
          body = solid.body as Phaser.Physics.Arcade.Body;
        body.pushable = false;
        body
          .setBounce(0)
          .setMaxVelocity(BLOCK.speed, BLOCK.maxFall)
          .setAllowGravity(o.behavior.pushable)
          .setImmovable(!o.behavior.pushable);
        this.collisions.push(
          scene.physics.add.collider(
            solid,
            solids.filter((s) => s !== solid),
            undefined,
            mechanismCollision,
          ),
        );
      }
  }
  private actors(player: PlayablePlayer): Phaser.Physics.Arcade.Body[] {
    return [
      player.body,
      ...this.solids
        .filter(
          (s) =>
            (s.body as Phaser.Physics.Arcade.Body)?.moves &&
            (s.body as Body).enable,
        )
        .map((s) => s.body as Phaser.Physics.Arcade.Body),
    ];
  }
  canPush(player: PlayablePlayer, direction: number): boolean {
    return this.state.objects.some(
      (o) =>
        o.behavior.kind === 'reflector' &&
        o.behavior.pushable &&
        this.pushVelocity(o.id, player, direction) !== 0,
    );
  }
  private pushVelocity(
    id: string,
    player: PlayablePlayer,
    direction: number,
  ): number {
    const body = this.bodies.get(id)!.body as Phaser.Physics.Arcade.Body,
      p = player.body;
    return blockPushVelocity(
      player.element,
      p,
      (p.blocked.down || p.touching.down) && p.velocity.y >= 0,
      direction,
      body,
      (body.blocked.down || body.touching.down) && body.velocity.y >= 0,
    );
  }
  update(player: PlayablePlayer, fallLimit: number): boolean {
    for (const o of this.state.objects)
      if (o.behavior.kind === 'reflector' && o.behavior.pushable) {
        const body = this.bodies.get(o.id)!.body as Phaser.Physics.Arcade.Body;
        if (body.enable && body.bottom >= fallLimit) return true;
        if ((body.blocked.down || body.touching.down) && body.velocity.y >= 0)
          body.setVelocityX(
            this.pushVelocity(o.id, player, player.body.velocity.x),
          );
      }
    return false;
  }
  step(player: PlayablePlayer, dt: number): void {
    const actors = this.actors(player);
    this.gates.step(actors);
    this.pulley.step(player, actors, dt);
    transportSurfaces(
      this.state,
      this.bodies,
      this.solids,
      actors,
      dt,
      player.body,
    );
    this.optics.step();
  }
  render(): void {
    for (const o of this.state.objects)
      if (isAdvancedKind(o.kind)) {
        const s = this.state.get(o.id),
          body = this.bodies.get(o.id)!.body as Body,
          view = this.views.get(o.id)!;
        if (['reflector', 'pulley', 'pulleyWeight'].includes(o.behavior.kind))
          view.setPosition(body.left - o.collider.x, body.top - o.collider.y);
        renderAdvanced(this.scene, view, o, {
          active: s.active,
          open: s.contact,
          mirrorAngle: s.mirrorAngle,
        });
      }
  }
  destroy(): void {
    for (const collider of this.collisions) collider.destroy();
    this.optics.destroy();
    this.pulley.destroy();
  }
}
