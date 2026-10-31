import type { Element } from '../../types/character';
import { FIRST_PUZZLE } from './layout';

export interface PuzzlePlayerState {
  x: number;
  feetY: number;
  grounded: boolean;
  element: Element;
}

export interface PuzzleSnapshot {
  readonly phase: 'locked' | 'open' | 'complete';
  readonly secondsLeft: number;
  readonly activated: boolean;
}

/** The plate holds the door open; its six-second grace period starts on leaving. */
export class FirstPuzzleState {
  private remainingMs = 0;
  private activated = false;
  private complete = false;

  update(player: PuzzlePlayerState, deltaMs: number): PuzzleSnapshot {
    if (!this.complete) {
      const { plate } = FIRST_PUZZLE;
      const pressingPlate =
        player.element === 'earth' &&
        player.grounded &&
        Math.abs(player.feetY - plate.top) <= 2 &&
        Math.abs(player.x - plate.x) <= plate.width / 2;
      if (pressingPlate) {
        this.remainingMs = FIRST_PUZZLE.openingMs;
        this.activated = true;
      } else {
        this.remainingMs = Math.max(0, this.remainingMs - Math.max(0, deltaMs));
      }
      // After crossing the gate, a closing timer must not strand the player at the exit.
      this.complete =
        this.activated &&
        player.grounded &&
        player.x >= FIRST_PUZZLE.exitX &&
        Math.abs(player.feetY - FIRST_PUZZLE.floorY) <= 2;
    }
    return this.snapshot;
  }

  get snapshot(): PuzzleSnapshot {
    return {
      phase: this.complete
        ? 'complete'
        : this.remainingMs > 0
          ? 'open'
          : 'locked',
      secondsLeft: this.complete ? 0 : Math.ceil(this.remainingMs / 1000),
      activated: this.activated,
    };
  }
}
