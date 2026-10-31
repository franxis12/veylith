import type Phaser from 'phaser';
import type { SceneSound } from '../audio/SceneSound';
import { CHARACTER_SHEETS } from '../../assets/characterSheets';
import { ELEMENT_CONFIG, PLAYER_VISUAL_HEIGHT } from '../../config/elements';
import { ANIMATION_TIMING } from '../animation/animationRegistry';
import { EFFECT_SHEETS, effectKey } from '../../assets/effectSheets';
import type { EffectId } from '../../assets/effectSheets';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { Element } from '../../types/character';
import { projectileContact } from './projectileCollision';
import type { SolidBounds } from './projectileCollision';
import { breakableStrikeContact } from './breakableStrikeHit';

export interface PowerInteractions {
  targets(): readonly (SolidBounds & { id: string })[];
  hit(id: string, element: 'water' | 'fire'): void;
  strike(id: string): void;
}

const COLORS: Record<Element, number> = {
  water: 0x56caff,
  fire: 0xffa448,
  air: 0xb9f5ed,
  earth: 0xd8bf84,
};
const MAX_PROJECTILES = 8;
const MAX_EFFECTS = 16;
// Measured on earth_smash_04.png: the extended fist, before the recovery poses.
const EARTH_STRIKE = { frame: 3, handX: 456, handY: 275 } as const;
// Exclusive visible baseline shared by all six original landing frames.
const EARTH_DUST_BASELINE = 352 / 512;
type Visual = Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
type PlayerFrame = ReturnType<PlayablePlayer['update']>;
interface Burst {
  visual: Visual;
  remaining: number;
}
interface Projectile {
  visual: Visual;
  element: 'water' | 'fire';
  direction: -1 | 1;
  remaining: number;
}

/** Bounded, scene-owned visuals and projectiles. No wall-clock timers or DOM listeners. */
export class PowerEffects {
  private readonly projectiles: Projectile[] = [];
  private readonly bursts: Burst[] = [];
  private wind: Visual | undefined;
  private strikeDelay: number | undefined;
  private readonly recharge: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly solids: readonly Phaser.GameObjects.Rectangle[],
    private readonly interactions?: PowerInteractions,
    private readonly audio?: SceneSound,
  ) {
    this.recharge = scene.add
      .rectangle(0, 0, 40, 4, 0xffffff)
      .setDepth(12)
      .setVisible(false);
  }

  update(player: PlayablePlayer, frame: PlayerFrame, deltaMs: number): void {
    const elapsed = Math.max(0, deltaMs);
    this.advanceProjectiles(elapsed);
    for (let index = this.bursts.length - 1; index >= 0; index--) {
      const burst = this.bursts[index]!;
      burst.remaining -= elapsed;
      if (burst.remaining <= 0) {
        burst.visual.destroy();
        this.bursts.splice(index, 1);
      } else burst.visual.setAlpha(Math.min(1, burst.remaining / 120));
    }
    const x = player.body.center.x;
    const feet = player.body.bottom;
    if (frame.cast === 'water' || frame.cast === 'fire')
      this.shoot(player, frame.cast);
    if (frame.doubleJumped) this.burst('fireJump', x, feet + 10, 220, 'fire');
    if (this.strikeDelay !== undefined) {
      if (player.element !== 'earth') this.strikeDelay = undefined;
      else {
        this.strikeDelay -= elapsed;
        if (this.strikeDelay <= 0) {
          const scale =
            PLAYER_VISUAL_HEIGHT / ELEMENT_CONFIG.earth.referenceHeight;
          const handX =
            x +
            player.facing *
              (EARTH_STRIKE.handX - ELEMENT_CONFIG.earth.anchorX) *
              scale;
          const handY =
            feet +
            (EARTH_STRIKE.handY -
              CHARACTER_SHEETS.earth.smash.footY[EARTH_STRIKE.frame]) *
              scale;
          const solids = this.solids.filter(
            (solid) => solid.active && solid.body,
          );
          const hit = breakableStrikeContact(
            x,
            handX,
            handY,
            12,
            solids.map((solid) => {
              const body = solid.body as Phaser.Physics.Arcade.StaticBody;
              return {
                left: body.left,
                right: body.right,
                top: body.top,
                bottom: body.bottom,
                enable: body.enable,
                breakable: solid.getData('breakable') === true,
              };
            }),
          );
          if (hit !== undefined) {
            this.audio?.at('earth_smash', hit.x, handY, 0.8);
            this.burst('earthSmash', hit.x, handY, 150, 'earth', player.facing);
            this.interactions?.strike(solids[hit.index]!.name);
          }
          this.strikeDelay = undefined;
        }
      }
    }
    if (frame.slamImpact)
      this.strikeDelay =
        (EARTH_STRIKE.frame / ANIMATION_TIMING.smash.fps) * 1000;
    if (frame.earthLanding)
      this.burst('earthLand', x, feet, frame.slamImpact ? 280 : 250, 'earth');
    const windy = frame.gliding || frame.dashDirection !== 0;
    if (windy && !this.wind)
      this.wind = this.visual('airWind', x, feet - 90, 290, COLORS.air);
    if (this.wind) {
      this.wind.setPosition(x, feet - 90);
      if (!windy) {
        this.wind.destroy();
        this.wind = undefined;
      }
    }
    this.recharge
      .setPosition(x, player.body.top - 24)
      .setFillStyle(COLORS[player.element])
      .setDisplaySize(40 * (1 - player.cooldownFraction), 4)
      .setVisible(player.cooldownFraction > 0);
  }

  private visual(
    id: EffectId,
    x: number,
    y: number,
    width: number,
    color: number,
    direction: -1 | 1 = 1,
  ): Visual {
    const key = effectKey(id);
    if (this.scene.anims.exists(key)) {
      const sprite = this.scene.add
        .sprite(x, y, key)
        .setName(key)
        .setDepth(10)
        .setScale(width / EFFECT_SHEETS[id].width)
        .setFlipX(direction < 0)
        .play(key);
      // The supplied wind strokes are dark; brighten at runtime without changing the PNG.
      if (id === 'airWind') sprite.setTintFill(COLORS.air).setBlendMode('ADD');
      if (id === 'earthLand') sprite.setOrigin(0.5, EARTH_DUST_BASELINE);
      return sprite;
    }
    const fallback = this.scene.add
      .circle(x, y, Math.min(width / 4, 32), color, 0.4)
      .setStrokeStyle(3, color)
      .setName(`${key}:fallback`)
      .setDepth(10);
    if (id === 'earthLand') fallback.setOrigin(0.5, 1);
    return fallback;
  }

  private burst(
    id: EffectId,
    x: number,
    y: number,
    width: number,
    element: Element,
    direction: -1 | 1 = 1,
    duration?: number,
  ): void {
    if (this.bursts.length >= MAX_EFFECTS)
      this.bursts.shift()!.visual.destroy();
    const sheet = EFFECT_SHEETS[id];
    const lifetime = duration ?? (sheet.frames / sheet.fps) * 1000;
    this.bursts.push({
      visual: this.visual(id, x, y, width, COLORS[element], direction),
      remaining: lifetime,
    });
  }

  private shoot(player: PlayablePlayer, element: 'water' | 'fire'): void {
    if (this.projectiles.length >= MAX_PROJECTILES)
      this.projectiles.shift()!.visual.destroy();
    const direction = player.facing;
    const x = player.body.center.x;
    const y = player.body.bottom - 100;
    const muzzle = x + direction * 62;
    // Check the muzzle segment too: casting directly beside a wall must not shoot through it.
    const hit = this.contact(x, muzzle, y, element);
    if (hit !== undefined) {
      this.impact(element, hit, y, direction);
      return;
    }
    this.projectiles.push({
      visual: this.visual(
        element === 'water' ? 'waterProjectile' : 'fireProjectile',
        muzzle,
        y,
        110,
        COLORS[element],
        direction,
      ),
      element,
      direction,
      remaining: 1400,
    });
  }

  private contact(
    fromX: number,
    toX: number,
    y: number,
    element: 'water' | 'fire',
  ): number | undefined {
    const solids = this.solids
      .filter((solid) => solid.active && solid.body)
      .map((solid) => solid.body as Phaser.Physics.Arcade.StaticBody);
    const targets = this.interactions?.targets() ?? [];
    // Solids win ties. Targets behind closed doors cannot be activated by a projectile.
    const hit = projectileContact(fromX, toX, y, 10, [...solids, ...targets]);
    if (hit) {
      const target = targets[hit.index - solids.length];
      if (target) this.interactions?.hit(target.id, element);
    }
    return hit?.x;
  }

  private advanceProjectiles(elapsed: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const shot = this.projectiles[index]!;
      const x = shot.visual.x;
      const y = shot.visual.y;
      const nextX =
        x + (shot.direction * 700 * Math.min(elapsed, shot.remaining)) / 1000;
      const hit = this.contact(x, nextX, y, shot.element);
      shot.remaining -= elapsed;
      if (
        hit !== undefined ||
        nextX < this.scene.physics.world.bounds.left ||
        nextX > this.scene.physics.world.bounds.right ||
        shot.remaining <= 0
      ) {
        if (hit !== undefined)
          this.impact(shot.element, hit, y, shot.direction);
        shot.visual.destroy();
        this.projectiles.splice(index, 1);
      } else shot.visual.setPosition(nextX, y);
    }
  }

  private impact(
    element: 'water' | 'fire',
    x: number,
    y: number,
    direction: -1 | 1,
  ): void {
    this.audio?.at(
      element === 'water' ? 'water_impact' : 'fire_impact',
      x,
      y,
      0.7,
    );
    this.burst(
      element === 'water' ? 'waterImpact' : 'fireImpact',
      x,
      y,
      160,
      element,
      direction,
    );
    if (element === 'fire')
      this.burst('fireBurn', x, y + 10, 70, element, direction, 600);
  }

  destroy(): void {
    for (const shot of this.projectiles) shot.visual.destroy();
    for (const burst of this.bursts) burst.visual.destroy();
    this.projectiles.length = 0;
    this.bursts.length = 0;
    this.wind?.destroy();
    this.wind = undefined;
    this.strikeDelay = undefined;
    this.recharge.destroy();
  }
}
