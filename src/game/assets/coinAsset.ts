import { queueOptionalSheet, registerOptionalSheet } from './optionalSheet';
import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';

/** Existing RGBA artwork: 256², exclusive alpha bounds [32, 32, 224, 224]. */
export const COIN_ASSET = {
  key: 'collectible:coin',
  path: 'assets/ui/rewards/golden_elemental_coin.png',
  width: 256,
  height: 256,
  bounds: [32, 32, 224, 224],
} as const;

export function queueCoinAsset(scene: Phaser.Scene): void {
  if (!scene.textures.exists(COIN_ASSET.key))
    scene.load.image(COIN_ASSET.key, assetUrl(COIN_ASSET.path));
}

/** Original UI strips are also the world pickup's art; collision remains independent. */
export const COIN_SHEETS = {
  spin: {
    path: 'assets/ui/rewards/coin_spin/coin_spin_spritesheet.png',
    width: 256,
    height: 256,
    frames: 8,
    fps: 10,
    loop: true,
  },
  collect: {
    path: 'assets/ui/effects/coin_collect_sparkle/coin_collect_sparkle_spritesheet.png',
    width: 256,
    height: 256,
    frames: 6,
    fps: 12,
    loop: false,
  },
} as const;
export const coinAnimation = (action: keyof typeof COIN_SHEETS) =>
  `coin:${action}`;
export function queueCoinAnimations(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(COIN_SHEETS))
    queueOptionalSheet(
      scene,
      coinAnimation(id as keyof typeof COIN_SHEETS),
      sheet,
    );
}
export function registerCoinAnimations(scene: Phaser.Scene): void {
  for (const [id, sheet] of Object.entries(COIN_SHEETS))
    registerOptionalSheet(
      scene,
      coinAnimation(id as keyof typeof COIN_SHEETS),
      sheet,
    );
}
