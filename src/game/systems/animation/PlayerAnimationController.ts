import Phaser from 'phaser';
import { frameAlignment } from './alignment';
import { getCharacterAnimation } from './animationRegistry';
import type { CharacterAnimation } from './animationRegistry';
import type {
  AnimationAction,
  Element,
  Facing,
  PlaybackMode,
} from '../../types/character';

export class PlayerAnimationController {
  private clip: CharacterAnimation | undefined;
  private facing: Facing = 'right';

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly onComplete: () => void,
  ) {
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.align, this);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
  }

  play(
    element: Element,
    action: AnimationAction,
    mode: PlaybackMode = 'default',
  ): boolean {
    const clip = getCharacterAnimation(element, action);
    if (!clip || !this.sprite.scene.anims.exists(clip.id)) return false;
    this.clip = clip;
    const loop = mode === 'default' ? clip.loop : mode === 'loop';
    this.sprite.anims.resume();
    this.sprite.play({ key: clip.id, repeat: loop ? -1 : 0 });
    this.align();
    return true;
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    this.sprite.setFlipX(facing === 'left');
    this.align();
  }

  setPaused(paused: boolean): void {
    if (paused) this.sprite.anims.pause();
    else this.sprite.anims.resume();
  }

  private align(): void {
    if (!this.clip) return;
    const alignment = frameAlignment(
      this.clip,
      Number(this.sprite.frame.name),
      this.facing,
    );
    this.sprite
      .setOrigin(alignment.originX, alignment.originY)
      .setScale(alignment.scale);
  }

  destroy(): void {
    this.sprite.off(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      this.align,
      this,
    );
    this.sprite.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      this.onComplete,
    );
  }
}
