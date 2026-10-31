import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';
import { queueOptionalSheet, registerOptionalSheet } from './optionalSheet';
import type { OptionalSheet } from './optionalSheet';

/** Audited four-column grids; every cell matches its supplied individual PNG. */
export const FOREST_ANIMATION_SHEETS = {
  torch: {
    path: 'assets/environments/ancient_forest/interactive/animations/torch_flame_loop/torch_flame_loop_spritesheet.png',
    width: 256,
    height: 256,
    columns: 4,
    frames: 12,
    fps: 12,
    loop: true,
  },
  door: {
    path: 'assets/environments/ancient_forest/interactive/animations/mechanical_door_open/mechanical_door_open_spritesheet.png',
    width: 512,
    height: 768,
    columns: 4,
    frames: 8,
    fps: 10,
    loop: false,
  },
  portal: {
    path: 'assets/environments/ancient_forest/interactive/animations/portal_energy_loop/portal_energy_loop_spritesheet.png',
    width: 512,
    height: 768,
    columns: 4,
    frames: 12,
    fps: 12,
    loop: true,
  },
  water: {
    path: 'assets/environments/ancient_forest/interactive/animations/water_fill_loop/water_fill_loop_spritesheet.png',
    width: 512,
    height: 512,
    columns: 4,
    frames: 12,
    fps: 12,
    loop: true,
  },
} as const satisfies Record<string, OptionalSheet>;

export type ForestAnimation = keyof typeof FOREST_ANIMATION_SHEETS;
export const forestAnimationKey = (id: ForestAnimation): string =>
  `forest-anim:${id}`;
export const FOREST_DOOR_CYCLE = 'forest-anim:door-cycle';
export const PORTAL_FRAME = {
  key: 'forest:portal-frame',
  path: 'assets/environments/ancient_forest/interactive/portal_inactive.png',
  width: 512,
  height: 768,
} as const;

export function queueForestAnimations(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(FOREST_ANIMATION_SHEETS))
    queueOptionalSheet(scene, forestAnimationKey(id as ForestAnimation), sheet);
  if (!scene.textures.exists(PORTAL_FRAME.key))
    scene.load.image(PORTAL_FRAME.key, assetUrl(PORTAL_FRAME.path));
}

export function registerForestAnimations(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(FOREST_ANIMATION_SHEETS))
    registerOptionalSheet(
      scene,
      forestAnimationKey(id as ForestAnimation),
      sheet,
    );
  const door = forestAnimationKey('door');
  if (!scene.anims.exists(door)) {
    if (scene.anims.exists(FOREST_DOOR_CYCLE))
      scene.anims.remove(FOREST_DOOR_CYCLE);
    return;
  }
  if (scene.anims.exists(FOREST_DOOR_CYCLE)) return;
  // Pixel audit: the eight close frames are exactly the open frames in reverse.
  // Reuse the same texture instead of uploading a duplicate 12 MiB sheet.
  const frames = [
    ...Array.from({ length: 8 }, (_, i) => i),
    ...Array.from({ length: 8 }, (_, i) => 7 - i),
  ];
  scene.anims.create({
    key: FOREST_DOOR_CYCLE,
    frames: frames.map((frame, index) => ({
      key: door,
      frame,
      duration: index === 7 ? 1600 : index === 15 ? 1000 : 0,
    })),
    frameRate: FOREST_ANIMATION_SHEETS.door.fps,
    repeat: -1,
  });
}

export function hasPortalFrame(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(PORTAL_FRAME.key)) return false;
  const image = scene.textures.get(PORTAL_FRAME.key).getSourceImage() as {
    width: number;
    height: number;
  };
  return (
    image.width === PORTAL_FRAME.width && image.height === PORTAL_FRAME.height
  );
}
