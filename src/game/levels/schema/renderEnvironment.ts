import type Phaser from 'phaser';
import {
  environmentName,
  platformName,
  platformParts,
  platformScale,
  environmentSizing,
  environmentVisualScale,
  environmentCellCount,
  ENVIRONMENT_ASSETS,
  MAX_ENVIRONMENT_TILES,
} from '../../assets/environmentCatalog';
import { environmentTexture } from '../../assets/environmentAssets';
import type { LevelObject } from './types';

export function renderEnvironment(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  object: LevelObject,
): void {
  const name = environmentName(object.asset);
  if (!name) return;
  const platform = object.type === 'platform' && platformName(object.asset);
  // Repeat shared images, clipping only the last cell. Avoid TileSprite's
  // area-sized backing canvas, which can allocate gigabytes for an invalid draft.
  const tile = (
    texture: string,
    x: number,
    width: number,
    height: number,
    scale: number,
    sourceWidth = 128,
    sourceHeight = 128,
  ) => {
    if (width <= 0 || !scene.textures.exists(texture)) return;
    const cellWidth = sourceWidth * scale,
      cellHeight = sourceHeight * scale;
    const columns = environmentCellCount(width, cellWidth),
      rows = environmentCellCount(height, cellHeight);
    const count = Math.min(
      MAX_ENVIRONMENT_TILES - (platform ? 2 : 0),
      columns * rows,
    );
    for (let index = 0; index < count; index++) {
      const column = index % columns,
        row = Math.floor(index / columns);
      const image = scene.add
        .image(x + column * cellWidth, row * cellHeight, texture)
        .setOrigin(0)
        .setScale(scale);
      const cropWidth = Math.min(
        sourceWidth,
        (width - column * cellWidth) / scale,
      );
      const cropHeight = Math.min(
        sourceHeight,
        (height - row * cellHeight) / scale,
      );
      if (cropWidth < sourceWidth || cropHeight < sourceHeight)
        image.setCrop(0, 0, cropWidth, cropHeight);
      view.add(image);
    }
  };
  if (platform) {
    const [left, center, right] = platformParts(platform);
    const scale = platformScale(object.width, object.height),
      size = 128 * scale;
    for (const [part, x] of [
      [left, 0],
      [right, object.width - size],
    ] as const) {
      const texture = environmentTexture(part);
      if (scene.textures.exists(texture))
        view.add(scene.add.image(x, 0, texture).setOrigin(0).setScale(scale));
    }
    tile(
      environmentTexture(center),
      size,
      object.width - 2 * size,
      size,
      scale,
    );
    return;
  }
  const art = ENVIRONMENT_ASSETS[name],
    sizing = environmentSizing(object);
  const texture = environmentTexture(name);
  // The editor redraws on load completion; never display a missing-art placeholder.
  if (!scene.textures.exists(texture)) return;
  const scale = environmentVisualScale(object)!;
  if (sizing === 'proportional') {
    view.add(scene.add.image(0, 0, texture).setOrigin(0).setScale(scale));
    return;
  }
  tile(texture, 0, object.width, object.height, scale, art.width, art.height);
}
