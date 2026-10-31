import type Phaser from 'phaser';
import { forestTexture } from '../../assets/forestAssets';
import type { ForestAsset } from '../../assets/forestAssets';
import {
  ANCIENT_FOREST,
  FOREST_TILE,
  FOREST_RIM,
  surfaceBounds,
} from './layout';
import type { ForestSurface } from './layout';

export function createForestSurface(
  scene: Phaser.Scene,
  surface: ForestSurface,
  height = ANCIENT_FOREST.height as number,
): Phaser.GameObjects.Rectangle {
  const ground = surface.kind === 'ground';
  const rows = ground
    ? Math.ceil((height - surface.top + FOREST_RIM) / FOREST_TILE)
    : 1;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < surface.columns; column++) {
      const first = column === 0;
      const last = column === surface.columns - 1;
      const asset: ForestAsset = !ground
        ? first
          ? 'platformLeft'
          : last
            ? 'platformRight'
            : 'platform'
        : row === 0
          ? first
            ? 'groundLeft'
            : last
              ? 'groundRight'
              : 'ground'
          : first
            ? 'wallLeft'
            : last
              ? 'wallRight'
              : 'underground';
      scene.add
        .image(
          surface.x + column * FOREST_TILE,
          surface.top - FOREST_RIM + row * FOREST_TILE,
          forestTexture(asset),
        )
        .setOrigin(0)
        .setDepth(-5);
    }
  }
  const bounds = surfaceBounds(surface);
  const collider = scene.add
    .rectangle(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width,
      bounds.height,
    )
    .setName(surface.id)
    .setVisible(false);
  scene.physics.add.existing(collider, true);
  return collider;
}
