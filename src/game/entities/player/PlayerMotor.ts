import type { InputFrame } from '../../systems/input/ActionState';
import type { AnimationAction, Element } from '../../types/character';

const STANDARD_JUMP = 560;

export const MOVEMENT = {
  speed: 300,
  earthSpeed: 245,
  jump: STANDARD_JUMP,
  airJump: 680,
  // Clear the editor’s standard 180 px heavy block with one normal jump.
  earthJump: 620,
  doubleJump: 520,
  gravity: 900,
  earthFallGravity: 2000,
  maxFall: 900,
  earthMaxFall: 1150,
  glideGravity: 150,
  glideMaxFall: 100,
} as const;

/** Decisions only. Arcade Physics owns integration, collision resolution and position. */
export class PlayerMotor {
  element: Element = 'water';
  private extraJumpUsed = false;
  private doubleJumpRising = false;

  transform(element: Element): void {
    this.element = element;
    // Air budgets belong to the flight, never to the current form.
    this.doubleJumpRising = false;
  }

  step(input: InputFrame, contactDown: boolean, velocityY: number) {
    if (input.element) this.transform(input.element);
    // A body may retain its last contact flags until the next fixed physics step.
    const grounded = contactDown && velocityY >= 0;
    if (grounded) {
      this.extraJumpUsed = false;
      this.doubleJumpRising = false;
    }
    let vy = velocityY;
    let jumped = false;
    let doubleJumped = false;
    if (input.jumpPressed) {
      if (grounded) {
        const jumpSpeed =
          this.element === 'earth'
            ? MOVEMENT.earthJump
            : this.element === 'air'
              ? MOVEMENT.airJump
              : MOVEMENT.jump;
        vy = -jumpSpeed;
        jumped = true;
      } else if (this.element === 'fire' && !this.extraJumpUsed) {
        vy = -MOVEMENT.doubleJump;
        doubleJumped = true;
        this.extraJumpUsed = true;
        this.doubleJumpRising = true;
        jumped = true;
      }
    }
    const onGround = grounded && !jumped;
    const gliding =
      !onGround && vy >= 0 && this.element === 'air' && input.glideHeld;
    const heavyFall = this.element === 'earth' && vy >= 0 && !onGround;
    const maxFall = gliding
      ? MOVEMENT.glideMaxFall
      : heavyFall
        ? MOVEMENT.earthMaxFall
        : MOVEMENT.maxFall;
    vy = Math.min(vy, maxFall);
    const gravity = gliding
      ? MOVEMENT.glideGravity
      : heavyFall
        ? MOVEMENT.earthFallGravity
        : MOVEMENT.gravity;
    const speed =
      this.element === 'earth' ? MOVEMENT.earthSpeed : MOVEMENT.speed;
    const animation: AnimationAction = onGround
      ? input.direction === 0
        ? 'idle'
        : 'run'
      : gliding
        ? 'glide_loop'
        : vy < 0
          ? this.doubleJumpRising && this.element === 'fire'
            ? 'double_jump'
            : 'jump'
          : 'fall';
    return {
      grounded: onGround,
      jumped,
      doubleJumped,
      gliding,
      element: this.element,
      vx: input.direction * speed,
      vy,
      gravity,
      maxFall,
      animation,
    };
  }
}
