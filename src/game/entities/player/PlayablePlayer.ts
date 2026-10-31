import type Phaser from 'phaser';
import type { Element } from '../../types/character';
import { Player } from './Player';
import { PushAnimationState } from './PushAnimationState';
import { PlayerMotor } from './PlayerMotor';
import { PlayerPowers, POWERS } from './PlayerPowers';
import type { InputFrame } from '../../systems/input/ActionState';

import { PLAYER_BODY } from '../../config/elements';
export { PLAYER_BODY } from '../../config/elements';

/** An invariant collision rectangle keeps animation pivots out of the physics system. */
export class PlayablePlayer {
  readonly collider: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly visual: Player;
  private readonly motor = new PlayerMotor();
  private readonly powers = new PlayerPowers();
  private readonly pushAnimation = new PushAnimationState();
  private requestedAnimation = '';
  private previousVelocityY = 0;

  get element() {
    return this.visual.element;
  }
  get animation() {
    return this.visual.animation;
  }
  get facing(): -1 | 1 {
    return this.visual.facing === 'left' ? -1 : 1;
  }
  get cooldownFraction(): number {
    return this.powers.cooldownFraction;
  }

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    feetY: number,
    initialElement: Element = 'water',
  ) {
    this.collider = scene.add
      .rectangle(
        x,
        feetY - PLAYER_BODY.height / 2,
        PLAYER_BODY.width,
        PLAYER_BODY.height,
      )
      .setVisible(false);
    scene.physics.add.existing(this.collider);
    this.body = this.collider.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    // Pass through undersides; playerCollision selects lateral contacts per solid.
    this.body.checkCollision.up = false;
    this.visual = new Player(scene, x, feetY);
    this.transform(initialElement);
  }

  /** Immediate visual/state swap; the physics body and both velocity components are untouched. */
  transform(element: Element): void {
    this.motor.transform(element);
    this.pushAnimation.reset();
    if (this.visual.element !== element) {
      this.visual.setElement(element);
      this.powers.cancelMotion();
      this.requestedAnimation = '';
    }
    this.visual.setPosition(this.body.center.x, this.body.bottom);
  }

  update(input: InputFrame, deltaMs = 0, pushing = false) {
    const contactDown =
      (this.body.blocked.down || this.body.touching.down) &&
      this.body.velocity.y >= 0;
    const motion = this.motor.step(input, contactDown, this.body.velocity.y);
    if (this.visual.element !== motion.element)
      this.visual.setElement(motion.element);
    if (motion.vx !== 0)
      this.visual.setFacing(motion.vx < 0 ? 'left' : 'right');
    const power = this.powers.step(
      deltaMs,
      motion.element,
      input.abilityPressed,
      motion.grounded,
      this.facing,
    );
    const vx = power.dashDirection
      ? power.dashDirection * POWERS.dashSpeed
      : motion.vx * (power.plunging ? 0.5 : 1);
    const vy = power.plunging ? POWERS.plungeSpeed : motion.vy;
    this.body.setGravityY(motion.gravity - this.scene.physics.world.gravity.y);
    this.body.setMaxVelocity(
      POWERS.dashSpeed,
      Math.max(
        motion.maxFall,
        Math.abs(motion.vy),
        power.plunging ? POWERS.plungeSpeed : 0,
      ),
    );
    this.body.setVelocity(vx, vy);
    if (power.dashDirection)
      this.visual.setFacing(power.dashDirection < 0 ? 'left' : 'right');
    const animation = this.pushAnimation.step(
      motion.element,
      power.animation ?? motion.animation,
      pushing && motion.grounded,
      deltaMs,
    );
    const key = `${motion.element}:${animation}`;
    if (this.requestedAnimation !== key || power.cast || power.slamImpact) {
      if (!this.visual.playAnimation(animation))
        this.visual.playAnimation('idle');
      this.requestedAnimation = key;
    }
    this.visual.setPosition(this.body.center.x, this.body.bottom);
    const earthLanding =
      motion.element === 'earth' && contactDown && this.previousVelocityY > 180;
    const landed = contactDown && this.previousVelocityY > 100;
    this.previousVelocityY = vy;
    return {
      ...power,
      jumped: motion.jumped,
      grounded: motion.grounded,
      landed,
      doubleJumped: motion.doubleJumped,
      gliding: motion.gliding,
      earthLanding,
    };
  }

  stopPowers(): void {
    this.powers.cancelMotion();
  }
  bounce(speed: number): void {
    this.stopPowers();
    this.body.setMaxVelocity(
      this.body.maxVelocity.x,
      Math.max(this.body.maxVelocity.y, speed),
    );
    this.body.setVelocityY(-speed);
    this.body.blocked.down = false;
    this.body.touching.down = false;
  }

  destroy(): void {
    this.visual.destroy();
    this.collider.destroy();
  }
}
