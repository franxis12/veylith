import type Phaser from 'phaser';
import { ELEMENTS } from '../types/character';
import type { Element } from '../types/character';
import { queueOptionalSheet, registerOptionalSheet } from './optionalSheet';
import type { OptionalSheet } from './optionalSheet';
import { assetUrl } from './loadCharacterAssets';

/** Original audited exports. The duplicate Earth landing sheet is intentionally not loaded. */
export const EFFECT_SHEETS = {
  airWind: {
    path: 'assets/characters/air/glide_vfx/air_glide_wind_vfx_spritesheet.png',
    width: 512,
    height: 512,
    frames: 8,
    fps: 10,
    loop: true,
  },
  earthLand: {
    path: 'assets/vfx/earth/land_impact/earth_land_impact_spritesheet.png',
    width: 512,
    height: 512,
    frames: 6,
    fps: 12,
    loop: false,
  },
  earthSmash: {
    path: 'assets/vfx/earth/smash_impact/earth_smash_impact_spritesheet.png',
    width: 256,
    height: 256,
    frames: 8,
    fps: 14,
    loop: false,
  },
  fireBurn: {
    path: 'assets/vfx/fire/burning_loop/fire_burning_loop_spritesheet.png',
    width: 128,
    height: 128,
    frames: 6,
    fps: 10,
    loop: true,
  },
  fireJump: {
    path: 'assets/vfx/fire/double_jump/fire_double_jump_vfx_spritesheet.png',
    width: 512,
    height: 512,
    frames: 6,
    fps: 12,
    loop: false,
  },
  fireImpact: {
    path: 'assets/vfx/fire/impact/fire_impact_spritesheet.png',
    width: 256,
    height: 256,
    frames: 8,
    fps: 16,
    loop: false,
  },
  fireProjectile: {
    path: 'assets/vfx/fire/projectile/fire_projectile_spritesheet.png',
    width: 256,
    height: 128,
    frames: 6,
    fps: 12,
    loop: true,
  },
  waterImpact: {
    path: 'assets/vfx/water/impact/water_impact_spritesheet.png',
    width: 256,
    height: 256,
    frames: 6,
    fps: 16,
    loop: false,
  },
  waterProjectile: {
    path: 'assets/vfx/water/projectile/water_projectile_spritesheet.png',
    width: 256,
    height: 128,
    frames: 6,
    fps: 12,
    loop: true,
  },
} as const;
export type EffectId = keyof typeof EFFECT_SHEETS;
export const effectKey = (id: EffectId): string => `effect:${id}`;

export function queueEffectAssets(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(EFFECT_SHEETS)) {
    const key = effectKey(id as EffectId);
    if (!scene.textures.exists(key))
      scene.load.spritesheet(key, assetUrl(sheet.path), {
        frameWidth: sheet.width,
        frameHeight: sheet.height,
        endFrame: sheet.frames - 1,
      });
  }
}

export function registerEffectAnimations(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(EFFECT_SHEETS)) {
    const key = effectKey(id as EffectId);
    if (
      !scene.textures.exists(key) ||
      scene.textures.get(key).getFrameNames().length !== sheet.frames
    ) {
      console.warn(`Using simple effect fallback for ${sheet.path}`);
      continue;
    }
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, {
          start: 0,
          end: sheet.frames - 1,
        }),
        frameRate: sheet.fps,
        repeat: sheet.loop ? -1 : 0,
      });
  }
}

/** Audited separately: four 4096 × 512 strips, eight 512 px frames each. */
export const TRANSFORMATION_SHEETS = {
  water: {
    path: 'assets/effects/transformations/water/water_transform_spritesheet.png',
    width: 512,
    height: 512,
    frames: 8,
    fps: 16,
    loop: false,
  },
  fire: {
    path: 'assets/effects/transformations/fire/fire_transform_spritesheet.png',
    width: 512,
    height: 512,
    frames: 8,
    fps: 16,
    loop: false,
  },
  air: {
    path: 'assets/effects/transformations/air/air_transform_spritesheet.png',
    width: 512,
    height: 512,
    frames: 8,
    fps: 16,
    loop: false,
  },
  earth: {
    path: 'assets/effects/transformations/earth/earth_transform_spritesheet.png',
    width: 512,
    height: 512,
    frames: 8,
    fps: 16,
    loop: false,
  },
} as const satisfies Record<Element, OptionalSheet>;
export const transformationKey = (element: Element): string =>
  `transform:${element}`;

export function queueTransformationAssets(scene: Phaser.Scene): void {
  for (const element of ELEMENTS)
    queueOptionalSheet(
      scene,
      transformationKey(element),
      TRANSFORMATION_SHEETS[element],
    );
}

export function registerTransformationAnimations(scene: Phaser.Scene): void {
  for (const element of ELEMENTS)
    registerOptionalSheet(
      scene,
      transformationKey(element),
      TRANSFORMATION_SHEETS[element],
    );
}
