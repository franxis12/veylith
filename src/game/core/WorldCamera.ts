import type Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/settings';

export function configureWorldCamera(
  scene: Phaser.Scene,
  renderScale: number,
  levelZoom = 1,
): void {
  const { width, height } = GAME_SETTINGS;
  scene.cameras.main
    .setZoom(renderScale * levelZoom)
    .centerOn(width / (2 * levelZoom), height / (2 * levelZoom));
  scene.physics.world.setBounds(0, 0, width, height);
}
