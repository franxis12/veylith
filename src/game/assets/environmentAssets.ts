import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';
import { ENVIRONMENT_ASSETS } from './environmentCatalog';
import type { EnvironmentName } from './environmentCatalog';

export const environmentTexture = (name: EnvironmentName): string =>
  `environment:${name}`;
/** Only requested images enter Phaser; palette thumbnails remain browser images. */
export function queueEnvironmentAssets(
  scene: Phaser.Scene,
  names: readonly EnvironmentName[],
): void {
  for (const name of new Set(names)) {
    const key = environmentTexture(name);
    if (!scene.textures.exists(key))
      scene.load.image(key, assetUrl(ENVIRONMENT_ASSETS[name].path));
  }
}
export function missingEnvironmentAssets(
  textures: Phaser.Textures.TextureManager,
  names: readonly EnvironmentName[],
): string[] {
  return [...new Set(names)]
    .filter((name) => !textures.exists(environmentTexture(name)))
    .map((name) => ENVIRONMENT_ASSETS[name].path);
}
