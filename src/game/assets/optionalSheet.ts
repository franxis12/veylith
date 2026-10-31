import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';

export interface OptionalSheet {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  /** Omit for a horizontal strip; gridded sheets are read left to right, then down. */
  readonly columns?: number;
  readonly fps: number;
  readonly loop: boolean;
}

export function queueOptionalSheet(
  scene: Phaser.Scene,
  key: string,
  sheet: OptionalSheet,
): void {
  if (!scene.textures.exists(key))
    scene.load.spritesheet(key, assetUrl(sheet.path), {
      frameWidth: sheet.width,
      frameHeight: sheet.height,
      endFrame: sheet.frames - 1,
    });
}

/** Cosmetic resources never block the level. Reject truncated/malformed sheets too. */
export function registerOptionalSheet(
  scene: Phaser.Scene,
  key: string,
  sheet: OptionalSheet,
  textureKey = key,
): void {
  const texture = scene.textures.exists(textureKey)
    ? scene.textures.get(textureKey)
    : undefined;
  const source = texture?.getSourceImage() as
    { width: number; height: number } | undefined;
  const columns = sheet.columns ?? sheet.frames;
  if (
    !source ||
    source.width !== sheet.width * columns ||
    source.height !== sheet.height * Math.ceil(sheet.frames / columns) ||
    texture?.getFrameNames().length !== sheet.frames
  ) {
    if (scene.anims.exists(key)) scene.anims.remove(key);
    console.warn(`Using visual fallback for ${sheet.path}`);
    return;
  }
  if (!scene.anims.exists(key))
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: sheet.frames - 1,
      }),
      frameRate: sheet.fps,
      repeat: sheet.loop ? -1 : 0,
    });
}
