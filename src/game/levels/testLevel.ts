import type Phaser from 'phaser';

export const TEST_SPAWN = { x: 100, feetY: 650 } as const;
export const TEST_PLATFORMS = [
  { x: 640, y: 685, width: 1280, height: 70 },
  { x: 275, y: 606, width: 150, height: 22 },
  { x: 500, y: 501, width: 160, height: 22 },
  { x: 755, y: 366, width: 180, height: 22 },
  { x: 1055, y: 246, width: 210, height: 22 },
] as const;

export function createTestLevel(
  scene: Phaser.Scene,
): Phaser.GameObjects.Rectangle[] {
  return TEST_PLATFORMS.map(({ x, y, width, height }, index) => {
    const platform = scene.add.rectangle(
      x,
      y,
      width,
      height,
      index === 0 ? 0x263c49 : 0x426474,
    );
    scene.physics.add.existing(platform, true);
    return platform;
  });
}

export const TEST_GEMS = { initialElement: 'water', gems: [] } as const;
