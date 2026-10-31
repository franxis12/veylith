import type Phaser from 'phaser';
import { forestTexture } from '../../assets/forestAssets';
import { GAME_SETTINGS } from '../../config/settings';

/** Viewport-sized repeaters keep texture allocation independent of level length. */
export class ForestBackdrop {
  private readonly layers: {
    image: Phaser.GameObjects.TileSprite;
    speed: number;
  }[];

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    scene: Phaser.Scene,
    enabled: { sky: boolean; forest: boolean; foreground: boolean } = {
      sky: true,
      forest: true,
      foreground: true,
    },
  ) {
    const { width, height } = GAME_SETTINGS;
    // Scale a fixed-size surface to the visible world; keep backing allocations bounded.
    // Scroll-factor zero still needs compensation for Phaser's zoom origin.
    const scale = camera.displayWidth / width;
    const x = (camera.width - camera.displayWidth) / 2;
    const y = (camera.height - camera.displayHeight) / 2;
    this.layers = [
      { id: 'sky', speed: 0.08, depth: -40, alpha: 1, y: 0 },
      { id: 'forest', speed: 0.32, depth: -30, alpha: 1, y: 0 },
      // Place the supplied foreground foliage below the traversable rim, leaving gap edges visible.
      { id: 'foreground', speed: 0.55, depth: -20, alpha: 0.75, y: 150 },
    ]
      .filter(({ id }) => enabled[id as keyof typeof enabled])
      .map(({ id, speed, depth, alpha, y: offset }) => ({
        speed,
        image: scene.add
          .tileSprite(
            x,
            y + offset * scale,
            width,
            height,
            forestTexture(id as 'sky' | 'forest' | 'foreground'),
          )
          .setOrigin(0)
          .setScale(scale)
          .setScrollFactor(0)
          .setTileScale(height / 1024)
          .setDepth(depth)
          .setAlpha(alpha),
      }));
    this.update();
  }

  update(): void {
    const visibleLeft =
      this.camera.scrollX + (this.camera.width - this.camera.displayWidth) / 2;
    for (const { image, speed } of this.layers)
      image.tilePositionX =
        (visibleLeft * speed) / (image.tileScaleX * image.scaleX);
  }

  destroy(): void {
    for (const { image } of this.layers) image.destroy();
  }
}
