import type Phaser from 'phaser';
import {
  TRANSFORMATION_SHEETS,
  transformationKey,
} from '../../assets/effectSheets';
import { ELEMENT_CONFIG } from '../../config/elements';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { Element } from '../../types/character';

/** One following visual, with game-time cleanup even if animation events never fire. */
export class TransformationEffect {
  private visual:
    Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc | undefined;
  private remaining = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  play(element: Element, player: PlayablePlayer): void {
    this.destroy();
    const key = transformationKey(element);
    this.visual = this.scene.anims.exists(key)
      ? this.scene.add.sprite(0, 0, key).setDisplaySize(280, 280).play(key)
      : this.scene.add
          .circle(
            0,
            0,
            82,
            Number.parseInt(ELEMENT_CONFIG[element].color.slice(1), 16),
            0.18,
          )
          .setStrokeStyle(
            5,
            Number.parseInt(ELEMENT_CONFIG[element].color.slice(1), 16),
          );
    this.visual.setName(key).setDepth(11);
    const sheet = TRANSFORMATION_SHEETS[element];
    this.remaining = (1000 * sheet.frames) / sheet.fps;
    this.update(player, 0);
  }

  update(player: PlayablePlayer, deltaMs: number): void {
    if (!this.visual) return;
    this.remaining -= Math.max(0, deltaMs);
    if (this.remaining <= 0) this.destroy();
    else
      this.visual
        .setPosition(player.body.center.x, player.body.bottom - 100)
        .setAlpha(Math.min(1, this.remaining / 120));
  }

  destroy(): void {
    this.visual?.destroy();
    this.visual = undefined;
    this.remaining = 0;
  }
}
