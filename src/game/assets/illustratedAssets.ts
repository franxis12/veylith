import type Phaser from 'phaser';
import type { LevelObject } from '../levels/schema/types';
import { illustratedResources } from './illustratedCatalog';
import { assetUrl } from './loadCharacterAssets';

export function queueIllustratedAssets(
  scene: Phaser.Scene,
  objects: readonly LevelObject[],
): void {
  for (const resource of illustratedResources(objects)) {
    if (scene.textures.exists(resource.key)) continue;
    if (resource.animation) {
      const a = resource.animation;
      scene.load.spritesheet(resource.key, assetUrl(resource.path), {
        frameWidth: a.frameWidth,
        frameHeight: a.frameHeight,
        endFrame: a.frameCount - 1,
      });
    } else scene.load.image(resource.key, assetUrl(resource.path));
  }
}
export function missingIllustratedAssets(
  scene: Phaser.Scene,
  objects: readonly LevelObject[],
): string[] {
  return illustratedResources(objects)
    .filter((r) => !scene.textures.exists(r.key))
    .map((r) => r.path);
}
/** Release only this feature's unused textures, after their old views have been destroyed. */
export function releaseIllustratedAssets(
  scene: Phaser.Scene,
  objects: readonly LevelObject[],
): void {
  const used = new Set(illustratedResources(objects).map((r) => r.key));
  for (const key of scene.textures.getTextureKeys())
    if (key.startsWith('illustrated:') && !used.has(key))
      scene.textures.remove(key);
}
