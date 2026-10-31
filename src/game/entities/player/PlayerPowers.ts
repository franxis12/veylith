import { ELEMENTS } from '../../types/character';
import type { AnimationAction, Element } from '../../types/character';

export const POWERS = {
  cooldown: { water: 500, fire: 650, air: 900, earth: 850 },
  dashMs: 180,
  dashSpeed: 820,
  plungeSpeed: 1100,
} as const;

export interface PowerFrame {
  cast: Element | undefined;
  slamImpact: boolean;
  dashDirection: -1 | 0 | 1;
  plunging: boolean;
  animation: AnimationAction | undefined;
}

/** Cooldowns and air budgets survive transformation, but belong to one attempt. */
export class PlayerPowers {
  private element: Element = 'water';
  private readonly cooldowns: Record<Element, number> = {
    water: 0,
    fire: 0,
    air: 0,
    earth: 0,
  };
  private dashMs = 0;
  private dashDirection: -1 | 1 = 1;
  private airDashUsed = false;
  private plunging = false;
  private poseMs = 0;

  get cooldownFraction(): number {
    return this.cooldowns[this.element] / POWERS.cooldown[this.element];
  }

  cancelMotion(): void {
    this.dashMs = 0;
    this.plunging = false;
    this.poseMs = 0;
  }

  step(
    deltaMs: number,
    element: Element,
    pressed: boolean,
    grounded: boolean,
    facing: -1 | 1,
  ): PowerFrame {
    const elapsed = Math.max(0, deltaMs);
    for (const key of ELEMENTS)
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - elapsed);
    this.dashMs = Math.max(0, this.dashMs - elapsed);
    this.poseMs = Math.max(0, this.poseMs - elapsed);
    if (element !== this.element) {
      this.dashMs = 0;
      this.plunging = false;
      this.poseMs = 0;
      this.element = element;
    }
    if (grounded && this.dashMs === 0) this.airDashUsed = false;
    let slamImpact = this.plunging && grounded;
    if (slamImpact) {
      this.plunging = false;
      this.poseMs = 650;
    }
    let cast: Element | undefined;
    if (
      pressed &&
      this.cooldowns[element] === 0 &&
      !this.plunging &&
      !(element === 'air' && !grounded && this.airDashUsed)
    ) {
      cast = element;
      this.cooldowns[element] = POWERS.cooldown[element];
      if (element === 'air') {
        this.dashMs = POWERS.dashMs;
        this.dashDirection = facing;
        // A ground dash also consumes the air budget if it carries us off a ledge.
        this.airDashUsed = true;
      } else if (element === 'earth') {
        this.plunging = !grounded;
        slamImpact = grounded;
        this.poseMs = grounded ? 650 : 0;
      } else {
        this.poseMs = 500;
      }
    }
    return {
      cast,
      slamImpact,
      dashDirection: this.dashMs > 0 ? this.dashDirection : 0,
      plunging: this.plunging,
      animation:
        this.poseMs > 0
          ? element === 'earth'
            ? 'smash'
            : 'attack'
          : undefined,
    };
  }
}
