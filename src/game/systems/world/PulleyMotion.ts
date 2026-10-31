import { readPlayerCollision } from './mechanismCollision';
import type Phaser from 'phaser';
import type { WorldState } from './WorldState';
import { overlaps } from './WorldState';
import { supportedPassengers, onTop } from './mechanismPhysics';
import { movementBlocked, pulleyStep, shifted } from './advancedRules';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import {
  advancedImage,
  advancedClip,
  advancedPath,
} from '../../assets/advancedArt';
type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
type Actor = Phaser.Physics.Arcade.Body;
interface Rig {
  view: Phaser.GameObjects.Container;
  ropes: Phaser.GameObjects.TileSprite[];
  branches: Phaser.GameObjects.TileSprite[];
  wheels: Phaser.GameObjects.Sprite[];
  top: number;
}
export class PulleyMotion {
  private readonly rigs = new Map<string, Rig>();
  constructor(
    scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly bodies: Map<string, Phaser.GameObjects.Rectangle>,
    private readonly solids: Phaser.GameObjects.Rectangle[],
  ) {
    for (const o of state.objects) {
      if (o.behavior.kind !== 'pulley' || !o.behavior.counterweightId) continue;
      const counterweightId = o.behavior.counterweightId;
      const weight = state.objects.find((w) => w.id === counterweightId);
      if (!weight) continue;
      const top = Math.min(o.y, weight.y) - Math.abs(o.behavior.travelY) - 50;
      const view = scene.add
          .container(0, 0)
          .setDepth(o.layer - 1)
          .setVisible(o.visible),
        ropes: Rig['ropes'] = [],
        branches: Rig['branches'] = [],
        wheels: Rig['wheels'] = [];
      const xs = [o.x + o.width / 2, weight.x + weight.width / 2];
      const ropeKey = `world:${advancedPath('pulleys', 'rope_vertical_tile')}`;
      for (const x of xs) {
        if (scene.textures.exists(ropeKey)) {
          const rope = scene.add
            .tileSprite(x, top + 52, 64, 64, ropeKey)
            .setOrigin(0.5, 0)
            .setTileScale(0.25);
          view.add(rope);
          ropes.push(rope);
        }
        const wheel = advancedClip(
          scene,
          view,
          'pulley_rotation',
          x - 64,
          top,
          128,
          128,
        );
        if (wheel) {
          wheel.anims.pause();
          wheels.push(wheel);
        } else
          advancedImage(
            scene,
            view,
            'pulleys',
            'pulley_wheel',
            x - 64,
            top,
            128,
            128,
          );
        advancedImage(
          scene,
          view,
          'pulleys',
          'pulley_housing',
          x - 64,
          top,
          128,
          128,
        );
      }
      if (scene.textures.exists(ropeKey))
        view.add(
          scene.add
            .tileSprite(
              (xs[0]! + xs[1]!) / 2,
              top + 52,
              64,
              Math.abs(xs[1]! - xs[0]!),
              ropeKey,
            )
            .setTileScale(0.25)
            .setRotation(Math.PI / 2),
        );
      if (scene.textures.exists(ropeKey))
        for (let i = 0; i < 2; i++) {
          const branch = scene.add
            .tileSprite(0, 0, 64, 64, ropeKey)
            .setTileScale(0.25);
          view.add(branch);
          branches.push(branch);
        }
      const base = this.bodies.get(o.id)!.body as Body;
      for (const dy of [0, o.behavior.travelY])
        advancedImage(
          scene,
          view,
          'pulleys',
          dy === 0 ? 'upper_mechanical_stop' : 'lower_mechanical_stop',
          base.left - 32,
          base.top + dy - 16,
          32,
          32,
        );
      this.rigs.set(o.id, { view, ropes, branches, wheels, top });
    }
  }
  step(player: PlayablePlayer, actors: readonly Actor[], dt: number): void {
    for (const o of this.state.objects) {
      const b = o.behavior;
      if (b.kind !== 'pulley' || !b.counterweightId) continue;
      const weight = this.state.objects.find((w) => w.id === b.counterweightId);
      if (!weight || weight.behavior.kind !== 'pulleyWeight') continue;
      const platform = this.bodies.get(o.id)!,
        counter = this.bodies.get(weight.id)!,
        a = platform.body as Phaser.Physics.Arcade.StaticBody,
        c = counter.body as Phaser.Physics.Arcade.StaticBody;
      if (!a.enable || !c.enable) continue;
      const ridersA = supportedPassengers(a, actors).filter(
          (r) =>
            r !== player.body ||
            readPlayerCollision(platform).top ||
            !onTop(r, a),
        ),
        ridersC = supportedPassengers(c, actors).filter(
          (r) =>
            r !== player.body ||
            readPlayerCollision(counter).top ||
            !onTop(r, c),
        );
      const load = (riders: Actor[]) =>
        riders.reduce(
          (sum, r) =>
            sum +
            (r === player.body ? (player.element === 'earth' ? 2 : 1) : 3),
          0,
        );
      const s = this.state.get(o.id),
        desired =
          s.active &&
          (b.mode === 'signal' ||
            load(ridersA) - load(ridersC) >=
              b.threshold + weight.behavior.mass);
      const next = pulleyStep(s.progress, desired, b.travelY, b.speed, dt),
        dy = (next - s.progress) * b.travelY;
      const obstacles = this.solids
        .filter(
          (s) =>
            s !== platform &&
            s !== counter &&
            (s.body as Body)?.enable &&
            !s.getData('liquid') &&
            !ridersA.includes(s.body as Actor) &&
            !ridersC.includes(s.body as Actor),
        )
        .map((s) => s.body as Body);
      // Check both halves and their passengers before committing either displacement.
      const freeActors = actors.filter(
        (r) => !ridersA.includes(r) && !ridersC.includes(r),
      );
      const blocked =
        movementBlocked(a, shifted(a, 0, dy), [...obstacles, ...freeActors]) ||
        movementBlocked(c, shifted(c, 0, -dy), [...obstacles, ...freeActors]) ||
        overlaps(shifted(a, 0, dy), shifted(c, 0, -dy), 0.01) ||
        ridersA.some((r) =>
          movementBlocked(r, shifted(r, 0, dy), [...obstacles, ...freeActors]),
        ) ||
        ridersC.some((r) =>
          movementBlocked(r, shifted(r, 0, -dy), [...obstacles, ...freeActors]),
        );
      const moving = !blocked && Math.abs(dy) > 0.00001;
      this.state.get(weight.id).active = moving;
      if (!blocked && next !== s.progress) {
        s.progress = next;
        platform.setPosition(
          o.x + o.collider.x + o.collider.width / 2,
          o.y + o.collider.y + o.collider.height / 2 + b.travelY * next,
        );
        counter.setPosition(
          weight.x + weight.collider.x + weight.collider.width / 2,
          weight.y +
            weight.collider.y +
            weight.collider.height / 2 -
            b.travelY * next,
        );
        a.updateFromGameObject();
        c.updateFromGameObject();
        for (const [riders, offset] of [
          [ridersA, dy],
          [ridersC, -dy],
        ] as const)
          for (const r of riders) {
            r.position.y += offset;
            r.updateCenter();
            r.setVelocityY(0);
            r.blocked.down = true;
            r.blocked.none = false;
          }
      }
      const rig = this.rigs.get(o.id);
      if (rig) {
        const jointY = a.top - Math.min(100, o.height * 0.4);
        rig.ropes[0]?.setSize(64, Math.max(1, jointY - rig.top - 52));
        rig.ropes[1]?.setSize(64, Math.max(1, c.top - rig.top - 52));
        for (const [i, eye] of [282, 742].entries()) {
          const x = o.x + (o.width * eye) / 1024,
            y = a.top - o.collider.y + (o.height * 288) / 512,
            dx = x - (o.x + o.width / 2),
            dy = y - jointY;
          rig.branches[i]
            ?.setPosition((x + o.x + o.width / 2) / 2, (y + jointY) / 2)
            .setSize(64, Math.hypot(dx, dy))
            .setRotation(-Math.atan2(dx, dy));
        }
        for (const wheel of rig.wheels) {
          if (moving) wheel.anims.resume();
          else wheel.anims.pause();
          wheel.setFlipX(dy < 0);
        }
      }
    }
  }
  destroy(): void {
    for (const rig of this.rigs.values()) rig.view.destroy();
    this.rigs.clear();
  }
}
