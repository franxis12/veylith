import { readPlayerCollision } from './mechanismCollision';
import { playerCollisionFaces } from '../../levels/schema/playerCollision';
import { ReflectorInteraction } from './ReflectorInteraction';
import type Phaser from 'phaser';
import { AdvancedPhysics } from './AdvancedPhysics';
import { isAdvancedKind } from './advancedTypes';
import type { SceneSound } from '../audio/SceneSound';
import { WorldAudio } from '../audio/WorldAudio';
import type { SoundId } from '../../../services/audio/catalog';
import {
  renderWorldState,
  WORLD_ANIMATIONS,
  worldAnimation,
  worldTexture,
} from '../../assets/worldAssets';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { LevelDocument } from '../../levels/schema/types';
import { colliderBounds } from '../../levels/schema/types';
import type { ForestPuzzleState } from '../../levels/forestPuzzles/ForestPuzzleState';
import { WorldState, effectBounds, overlaps, safeElement } from './WorldState';
import { WindMotion } from './WindMotion';
import { planPlatformMotion } from './PlatformMotion';
import type { WindContact } from './WindMotion';
import { sourceBehavior } from './types';
import type { WorldObject } from './types';
import { StageOnePhysics } from './StageOnePhysics';
import { StageOneVisuals } from './StageOneVisuals';
import { canMaterialize, wantsSolid } from './mechanismPhysics';

type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
/** Scene adapter: artwork, contact rectangles and effect zones remain independent. */
export class WorldSystem {
  readonly state: WorldState;
  readonly reflectors: ReflectorInteraction;
  retryCue?: SoundId;
  private readonly soundscape: WorldAudio | undefined;
  private readonly liquidContacts = new Set<string>();
  private readonly bodies = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly previous = new Map<string, boolean>();
  private readonly wind = new WindMotion();
  private readonly stageOne: StageOnePhysics;
  private readonly advanced: AdvancedPhysics;
  private readonly stageOneVisuals = new StageOneVisuals();
  private readonly fallLimit: number;
  private readonly splashes: {
    sprite: Phaser.GameObjects.Sprite;
    remaining: number;
  }[] = [];
  private player: PlayablePlayer | undefined;
  private readonly physicsWorld: Phaser.Physics.Arcade.World;
  constructor(
    private readonly scene: Phaser.Scene,
    document: LevelDocument,
    private readonly solids: Phaser.GameObjects.Rectangle[],
    private readonly views: Map<string, Phaser.GameObjects.Container>,
    private readonly puzzle: ForestPuzzleState,
    private readonly audio?: SceneSound,
  ) {
    this.physicsWorld = scene.physics.world;
    this.fallLimit = document.fallLimit;
    this.state = new WorldState(
      document.objects.filter((o): o is WorldObject => o.type === 'world'),
    );
    for (const o of this.state.objects) {
      const b = colliderBounds(o);
      const liquid = o.behavior.kind === 'heat' || o.behavior.kind === 'lake';
      const e = effectBounds(o);
      const body = scene.add
        .rectangle(
          liquid ? (e.left + e.right) / 2 : (b.left + b.right) / 2,
          liquid ? e.top + 6 : (b.top + b.bottom) / 2,
          liquid ? o.effect.width : o.collider.width,
          liquid ? 12 : o.collider.height,
        )
        .setVisible(false)
        .setName(o.id)
        .setData(
          'kinematic',
          o.behavior.kind === 'pulley' || o.behavior.kind === 'pulleyWeight',
        )
        .setData('reflector', o.behavior.kind === 'reflector')
        .setData('player-collision', playerCollisionFaces(o))
        .setData('liquid', liquid)
        .setData('floating', o.behavior.kind === 'float')
        .setData('breakable', o.behavior.kind === 'breakable');
      scene.physics.add.existing(body, o.behavior.kind !== 'reflector');
      (body.body as Body).enable = false;
      this.bodies.set(o.id, body);
      solids.push(body);
    }
    this.stageOne = new StageOnePhysics(
      this.state,
      this.bodies,
      this.solids,
      this.views,
    );
    this.advanced = new AdvancedPhysics(
      scene,
      this.state,
      this.bodies,
      this.solids,
      this.views,
    );
    this.reflectors = new ReflectorInteraction(
      this.state,
      (id) => {
        const b = this.bodies.get(id)?.body as Body | undefined;
        return b?.enable ? b : undefined;
      },
      () =>
        this.solids
          .filter(
            (s) =>
              (s.body as Body)?.enable &&
              !s.getData('liquid') &&
              !s.getData('directional-open'),
          )
          .map((s) => s.body as Body),
    );
    this.syncSignals();
    this.state.advance(0, (id) => this.puzzle.isSolved(id));
    this.sync();
    this.soundscape = audio ? new WorldAudio(this.state, audio) : undefined;
    this.physicsWorld.on('worldstep', this.stepMechanisms, this);
  }
  targets() {
    return this.state.objects
      .filter(
        (o) =>
          ['waterwheel', 'boiler'].includes(o.behavior.kind) ||
          (o.behavior.kind === 'switch' && o.behavior.trigger !== 'interact'),
      )
      .map((o) => ({
        ...effectBounds(o),
        id: o.id,
        enable:
          o.effect.enabled &&
          (o.behavior.kind === 'switch' || !this.state.get(o.id).active),
      }));
  }
  hit(id: string, element: 'water' | 'fire'): void {
    this.state.hit(id, element);
    this.syncSignals();
    this.state.advance(0, (id) => this.puzzle.isSolved(id));
    this.sync();
  }
  strike(id: string): void {
    this.state.strike(id);
    this.syncSignals();
    this.sync();
  }
  interact(player: PlayablePlayer): boolean {
    const lever = this.state.objects
      .filter(
        (o) =>
          (o.behavior.kind === 'lever' ||
            (o.behavior.kind === 'switch' &&
              o.behavior.trigger === 'interact')) &&
          o.effect.enabled &&
          overlaps(player.body, effectBounds(o)),
      )
      .sort(
        (a, b) =>
          Math.abs(a.x - player.body.center.x) -
          Math.abs(b.x - player.body.center.x),
      )[0];
    if (!lever) return false;
    if (lever.behavior.kind === 'switch') this.state.trigger(lever.id);
    else this.state.toggle(lever.id);
    this.syncSignals();
    this.state.advance(0, (id) => this.puzzle.isSolved(id));
    this.sync();
    return true;
  }
  private syncSignals(): void {
    for (const o of this.state.objects)
      if (sourceBehavior(o.behavior))
        this.puzzle.setWorldSignal(o.id, this.state.get(o.id).active);
  }
  /** Arcade emits this after collision resolution for EACH fixed physics step.
   * Carry only the Body; Arcade postUpdate moves its GameObject exactly once.
   * Render-only frames must never advance a platform or its passenger.
   */
  private stepMechanisms(deltaSeconds: number): void {
    const player = this.player;
    if (!player) return;
    const prior = new Map(
      this.state.objects.map((o) => [o.id, { ...this.state.get(o.id) }]),
    );
    this.state.advance(deltaSeconds * 1000, (id) => this.puzzle.isSolved(id));
    this.stageOne.step(player, deltaSeconds * 1000);
    this.advanced.step(player, deltaSeconds);
    this.syncSignals();
    this.state.advance(0, (id) => this.puzzle.isSolved(id));
    for (const o of this.state.objects) {
      const b = o.behavior;
      if (b.kind !== 'elevator') continue;
      const s = this.state.get(o.id),
        old = prior.get(o.id)!,
        solid = this.bodies.get(o.id)!,
        body = solid.body as Phaser.Physics.Arcade.StaticBody;
      const base = colliderBounds(o);
      const next = {
        left: base.left + b.travelX * s.progress,
        right: base.right + b.travelX * s.progress,
        top: base.top + b.travelY * s.progress,
        bottom: base.bottom + b.travelY * s.progress,
      };
      const motion = planPlatformMotion(
        body,
        next,
        {
          left: player.body.left,
          right: player.body.right,
          top: player.body.top,
          bottom: player.body.bottom,
          velocityY: player.body.velocity.y,
          grounded:
            body.enable &&
            readPlayerCollision(solid).top &&
            (player.body.blocked.down || player.body.touching.down),
        },
        this.solids
          .filter(
            (other) =>
              body.enable &&
              other !== solid &&
              (other.body as Body | null)?.enable,
          )
          .map((other) => other.body as Body),
      );
      if (motion.blocked) {
        s.progress = old.progress;
        s.direction = old.direction;
      } else {
        // Absolute placement also prevents accumulating roundoff at flush docks.
        solid.setPosition(
          (next.left + next.right) / 2,
          (next.top + next.bottom) / 2,
        );
        body.updateFromGameObject();
      }
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
        ?.setPosition(
          o.x + b.travelX * s.progress,
          o.y + b.travelY * s.progress,
        );
    }
    this.sync();
  }
  /** Runs after the motor so movement intent does not erase accumulated wind. */
  update(player: PlayablePlayer, deltaMs: number): boolean {
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i]!;
      splash.remaining -= Math.max(0, deltaMs);
      if (splash.remaining <= 0) {
        splash.sprite.destroy();
        this.splashes.splice(i, 1);
      }
    }
    const winds: WindContact[] = [];
    this.player = player;
    if (this.advanced.update(player, this.fallLimit)) return true;
    for (const o of this.state.objects) {
      const s = this.state.get(o.id),
        b = o.behavior,
        solid = this.bodies.get(o.id)!,
        body = solid.body as Phaser.Physics.Arcade.StaticBody;
      if (b.kind === 'float' && body.enable && body.bottom >= this.fallLimit)
        return true;
      if (
        b.kind === 'fan' &&
        s.active &&
        o.effect.enabled &&
        overlaps(player.body, effectBounds(o))
      ) {
        winds.push({ id: o.id, direction: b.direction, strength: b.strength });
      }
      if ((b.kind === 'heat' || b.kind === 'lake') && o.effect.enabled) {
        const e = effectBounds(o),
          safe = safeElement(b.kind, player.element);
        body.enable = safe;
        const touching =
          overlaps(player.body, e) ||
          (safe &&
            Math.abs(player.body.bottom - e.top) < 3 &&
            player.body.right > e.left &&
            player.body.left < e.right);
        if (
          touching &&
          !this.liquidContacts.has(o.id) &&
          safe &&
          b.kind === 'lake'
        ) {
          this.audio?.at('lake_entry', player.body.center.x, e.top, 0.7);
          const clip = WORLD_ANIMATIONS.find((a) => a.id === 'water_splash')!;
          if (o.visible && this.scene.anims.exists(worldAnimation(clip.id))) {
            if (this.splashes.length >= 16)
              this.splashes.shift()!.sprite.destroy();
            const sprite = this.scene.add
              .sprite(
                player.body.center.x,
                e.top,
                worldTexture(clip.spritesheet),
              )
              .setName('world:water-entry')
              .setDepth(o.layer + 1)
              .setOrigin(0.5, 0.5)
              .setDisplaySize(128, 128)
              .play(worldAnimation(clip.id));
            this.splashes.push({
              sprite,
              remaining: (1000 * clip.frames.length) / clip.frameRate + 50,
            });
          }
        }
        if (touching) this.liquidContacts.add(o.id);
        else this.liquidContacts.delete(o.id);
        if (overlaps(player.body, e)) {
          if (!safe) {
            this.retryCue = b.kind === 'lake' ? 'lake_entry' : 'lava_entry';
            return true;
          }
          // The matching element traverses a stable surface; art waves never move physics.
          if (player.body.velocity.y >= 0) {
            player.body.position.y = e.top - player.body.height;
            player.body.updateCenter();
            player.collider.setPosition(
              player.body.center.x,
              player.body.center.y,
            );
            player.body.setVelocityY(0);
            player.body.blocked.down = true;
          }
        }
      }
    }
    const vx = this.wind.step(
      player.body.velocity.x,
      player.element,
      winds,
      deltaMs,
    );
    player.body.setMaxVelocity(
      Math.max(player.body.maxVelocity.x, Math.abs(vx)),
      player.body.maxVelocity.y,
    );
    player.body.setVelocityX(vx);
    this.sync();
    this.soundscape?.update(
      deltaMs,
      (id) => this.views.get(id)?.getData('world-state') as string | undefined,
    );
    return false;
  }
  private sync(): void {
    for (const o of this.state.objects) {
      const s = this.state.get(o.id),
        b = o.behavior,
        body = this.bodies.get(o.id)!.body as Body,
        view = this.views.get(o.id)!;
      if (b.kind !== 'heat' && b.kind !== 'lake') {
        const desired = wantsSolid(o, s);
        const closing =
          ['timedDoor', 'barrier', 'phasePlatform'].includes(b.kind) &&
          desired &&
          !body.enable;
        const occupants = this.solids
          .filter(
            (other) =>
              other !== this.bodies.get(o.id) &&
              (other.body as Body)?.enable &&
              ((other.body as Phaser.Physics.Arcade.Body).moves ||
                other.getData('floating') ||
                other.getData('kinematic')),
          )
          .map((other) => other.body as Body);
        if (this.player) occupants.push(this.player.body);
        body.enable = desired && (!closing || canMaterialize(body, occupants));
      }
      if (isAdvancedKind(o.kind)) continue;
      if (this.stageOneVisuals.render(this.scene, view, o, s, body.enable))
        continue;
      if (b.kind === 'prop' && view.getData('prop-initialized')) continue;
      if (b.kind === 'prop') view.setData('prop-initialized', true);
      let state = o.state,
        progress: number | undefined;
      switch (b.kind) {
        case 'elevator':
          state = s.active ? 'elevator_gears' : 'idle';
          break;
        case 'fan':
          state = s.active ? 'fan_blades' : 'off';
          break;
        case 'heat':
          state = 'surface';
          break;
        case 'lake':
          state = 'water_surface';
          break;
        case 'waterwheel':
          state = s.active ? 'spinning' : 'idle';
          break;
        case 'boiler':
          state = s.active
            ? 'boiler_steam'
            : s.fire > 0
              ? 'boiler_heating'
              : 'cold';

          break;
        case 'bridge':
          state =
            s.progress === 1
              ? 'extended'
              : s.progress === 0
                ? 'retracted'
                : s.active
                  ? 'bridge_extending'
                  : 'bridge_retracting';
          if (s.progress > 0 && s.progress < 1)
            progress = s.active ? s.progress : 1 - s.progress;
          break;
        case 'breakable':
          state = s.active ? 'broken' : s.strikes ? 'wall_cracking' : 'intact';

          break;
        case 'lever':
          state = s.active ? 'on' : 'off';
          break;
      }
      const active =
        b.kind === 'elevator'
          ? b.mode === 'controlled'
            ? s.active
              ? s.progress < 1
              : s.progress > 0
            : s.active && (b.mode === 'pingpong' || s.progress < 1)
          : s.active;
      const previous = this.previous.get(o.id);
      if (b.kind === 'elevator') state = active ? 'elevator_gears' : 'idle';
      if (b.kind === 'fan' || b.kind === 'elevator') {
        const starting =
          b.kind === 'fan' ? 'fan_starting' : 'elevator_activated';
        const stopping = b.kind === 'fan' ? 'fan_stopping' : 'idle';
        if (previous !== active)
          state = active ? starting : previous === undefined ? state : stopping;
        else if (
          [starting, stopping].some((name) =>
            view.getData('world-state')?.startsWith(`${name}:`),
          )
        )
          continue;
      }
      if (previous !== undefined && previous !== s.active && b.kind === 'lever')
        state = s.active ? 'lever_activate' : 'lever_deactivate';
      if (
        previous === s.active &&
        b.kind === 'lever' &&
        view.getData('world-state')?.includes('lever_')
      )
        continue;
      if (
        previous !== undefined &&
        !previous &&
        s.active &&
        b.kind === 'breakable'
      )
        state = 'wall_breaking';
      if (
        previous === s.active &&
        s.active &&
        b.kind === 'breakable' &&
        view.getData('world-state')?.includes('wall_breaking')
      )
        continue;
      this.previous.set(o.id, active);
      renderWorldState(
        this.scene,
        view,
        o,
        state,
        false,
        progress,
        b.kind === 'boiler' && !s.active
          ? { next: null, revision: s.fire }
          : b.kind === 'breakable' && !s.active
            ? { next: null, revision: s.strikes }
            : undefined,
      );
    }
    this.advanced.render();
  }
  canPush(player: PlayablePlayer, direction: number): boolean {
    return this.advanced.canPush(player, direction);
  }
  destroy(): void {
    this.advanced.destroy();
    this.physicsWorld.off('worldstep', this.stepMechanisms, this);
    this.player = undefined;
    for (const splash of this.splashes) splash.sprite.destroy();
    this.splashes.length = 0;
    for (const body of this.bodies.values()) body.destroy();
    this.bodies.clear();
  }
}
