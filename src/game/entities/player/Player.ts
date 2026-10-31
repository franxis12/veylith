import type Phaser from 'phaser';
import { PlayerAnimationController } from '../../systems/animation/PlayerAnimationController';
import { getCharacterAnimation } from '../../systems/animation/animationRegistry';
import type {
  AnimationAction,
  Element,
  Facing,
  PlaybackMode,
} from '../../types/character';

/** Visual entity only: no body, velocity, controls, abilities, or world-state store. */
export class Player {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly animations: PlayerAnimationController;
  private currentElement: Element = 'water';
  private currentAnimation: AnimationAction = 'idle';
  private currentFacing: Facing = 'right';
  private disposed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onComplete: () => void = () => undefined,
  ) {
    const idle = getCharacterAnimation('water', 'idle');
    if (!idle || !scene.anims.exists(idle.id))
      throw new Error('Water idle must load before creating a Player.');
    this.sprite = scene.add.sprite(x, y, idle.texture, 0);
    this.animations = new PlayerAnimationController(this.sprite, onComplete);
    this.playAnimation('idle');
  }

  get element(): Element {
    return this.currentElement;
  }
  get animation(): AnimationAction {
    return this.currentAnimation;
  }
  get facing(): Facing {
    return this.currentFacing;
  }
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, feetY: number): void {
    this.sprite.setPosition(x, feetY);
  }

  setElement(element: Element): boolean {
    if (!this.animations.play(element, 'idle')) return false;
    this.currentElement = element;
    this.currentAnimation = 'idle';
    return true;
  }

  playAnimation(
    action: AnimationAction,
    mode: PlaybackMode = 'default',
  ): boolean {
    if (!this.animations.play(this.currentElement, action, mode)) return false;
    this.currentAnimation = action;
    return true;
  }

  setFacing(facing: Facing): void {
    this.currentFacing = facing;
    this.animations.setFacing(facing);
  }

  setAnimationPaused(paused: boolean): void {
    this.animations.setPaused(paused);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.animations.destroy();
    this.sprite.destroy();
  }
}
