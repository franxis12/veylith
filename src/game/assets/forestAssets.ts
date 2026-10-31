import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';

/** Measured source dimensions and exclusive alpha bounds; original PNGs are untouched. */
export const FOREST_ASSETS = {
  sky: {
    path: 'assets/environments/ancient_forest/backgrounds/layer_01_sky_mountains.png',
    width: 2048,
    height: 1024,
    bounds: [0, 0, 2048, 1024],
  },
  forest: {
    path: 'assets/environments/ancient_forest/backgrounds/layer_02_forest_ruins.png',
    width: 2048,
    height: 1024,
    bounds: [0, 87, 2048, 938],
  },
  foreground: {
    path: 'assets/environments/ancient_forest/backgrounds/layer_03_foreground.png',
    width: 2048,
    height: 1024,
    bounds: [0, 698, 2048, 1024],
  },
  groundLeft: {
    path: 'assets/environments/ancient_forest/terrain/ground_top_left.png',
    width: 128,
    height: 128,
    bounds: [16, 8, 128, 128],
  },
  ground: {
    path: 'assets/environments/ancient_forest/terrain/ground_center.png',
    width: 128,
    height: 128,
    bounds: [0, 8, 128, 128],
  },
  groundRight: {
    path: 'assets/environments/ancient_forest/terrain/ground_top_right.png',
    width: 128,
    height: 128,
    bounds: [0, 8, 112, 128],
  },
  wallLeft: {
    path: 'assets/environments/ancient_forest/terrain/ground_left_edge.png',
    width: 128,
    height: 128,
    bounds: [16, 0, 128, 128],
  },
  underground: {
    path: 'assets/environments/ancient_forest/terrain/solid_underground.png',
    width: 128,
    height: 128,
    bounds: [0, 0, 128, 128],
  },
  wallRight: {
    path: 'assets/environments/ancient_forest/terrain/ground_right_edge.png',
    width: 128,
    height: 128,
    bounds: [0, 0, 112, 128],
  },
  platformLeft: {
    path: 'assets/environments/ancient_forest/platforms/floating_platform_left.png',
    width: 128,
    height: 128,
    bounds: [16, 8, 128, 88],
  },
  platform: {
    path: 'assets/environments/ancient_forest/platforms/floating_platform_center.png',
    width: 128,
    height: 128,
    bounds: [0, 8, 128, 88],
  },
  platformRight: {
    path: 'assets/environments/ancient_forest/platforms/floating_platform_right.png',
    width: 128,
    height: 128,
    bounds: [0, 8, 112, 88],
  },
  fern: {
    path: 'assets/environments/ancient_forest/decorations/bush_fern.png',
    width: 256,
    height: 256,
    bounds: [10, 88, 246, 240],
  },
  flowers: {
    path: 'assets/environments/ancient_forest/decorations/flowers_blue.png',
    width: 128,
    height: 192,
    bounds: [6, 61, 122, 176],
  },
  grass: {
    path: 'assets/environments/ancient_forest/decorations/grass_cluster_short.png',
    width: 128,
    height: 128,
    bounds: [6, 53, 122, 112],
  },
  pillar: {
    path: 'assets/environments/ancient_forest/decorations/broken_pillar.png',
    width: 256,
    height: 512,
    bounds: [16, 67, 240, 496],
  },
  column: {
    path: 'assets/environments/ancient_forest/decorations/ancient_column.png',
    width: 256,
    height: 768,
    bounds: [29, 32, 227, 752],
  },
  roots: {
    path: 'assets/environments/ancient_forest/decorations/tree_roots.png',
    width: 512,
    height: 256,
    bounds: [16, 84, 496, 240],
  },
  mushrooms: {
    path: 'assets/environments/ancient_forest/decorations/mushrooms_amber.png',
    width: 128,
    height: 160,
    bounds: [6, 17, 122, 144],
  },
  block: {
    path: 'assets/environments/ancient_forest/interactive/heavy_block.png',
    width: 256,
    height: 256,
    bounds: [16, 22, 240, 240],
  },
  tank: {
    path: 'assets/environments/ancient_forest/interactive/water_tank_empty.png',
    width: 512,
    height: 512,
    bounds: [24, 42, 488, 496],
  },
  door: {
    path: 'assets/environments/ancient_forest/interactive/mechanical_door_open.png',
    width: 512,
    height: 768,
    bounds: [32, 56, 480, 744],
  },
  portal: {
    path: 'assets/environments/ancient_forest/interactive/portal_active.png',
    width: 512,
    height: 768,
    bounds: [24, 242, 488, 744],
  },
  tankFull: {
    path: 'assets/environments/ancient_forest/interactive/water_tank_full.png',
    width: 512,
    height: 512,
    bounds: [24, 42, 488, 496],
  },
  doorClosed: {
    path: 'assets/environments/ancient_forest/interactive/mechanical_door_closed.png',
    width: 512,
    height: 768,
    bounds: [32, 56, 480, 744],
  },
  plateActive: {
    path: 'assets/environments/ancient_forest/interactive/pressure_plate_activated.png',
    width: 512,
    height: 192,
    bounds: [17, 82, 495, 176],
  },
  wallIntact: {
    path: 'assets/environments/ancient_forest/interactive/cracked_wall_intact.png',
    width: 512,
    height: 512,
    bounds: [68, 32, 444, 496],
  },
  wallBroken: {
    path: 'assets/environments/ancient_forest/interactive/cracked_wall_broken.png',
    width: 512,
    height: 512,
    bounds: [36, 241, 476, 496],
  },
  torch: {
    path: 'assets/environments/ancient_forest/interactive/torch_unlit.png',
    width: 256,
    height: 512,
    bounds: [58, 32, 197, 496],
  },
  torchLit: {
    path: 'assets/environments/ancient_forest/interactive/torch_lit_base.png',
    width: 256,
    height: 512,
    bounds: [58, 32, 197, 496],
  },
  torchFlame: {
    path: 'assets/environments/ancient_forest/interactive/torch_flame.png',
    width: 256,
    height: 256,
    bounds: [69, 16, 187, 240],
  },
  plate: {
    path: 'assets/environments/ancient_forest/interactive/pressure_plate_inactive.png',
    width: 512,
    height: 192,
    bounds: [16, 73, 496, 176],
  },
} as const;
export type ForestAsset = keyof typeof FOREST_ASSETS;
export const forestTexture = (id: ForestAsset): string => `forest:${id}`;

export function queueForestAssets(scene: Phaser.Scene): void {
  for (const [id, asset] of Object.entries(FOREST_ASSETS)) {
    const key = forestTexture(id as ForestAsset);
    if (!scene.textures.exists(key))
      scene.load.image(key, assetUrl(asset.path));
  }
}

export function failedForestAssets(
  textures: Phaser.Textures.TextureManager,
): string[] {
  return (Object.keys(FOREST_ASSETS) as ForestAsset[])
    .filter((id) => !textures.exists(forestTexture(id)))
    .map((id) => FOREST_ASSETS[id].path);
}
