export interface CameraPose {
  x: number;
  y: number;
  zoom: number;
}
export const EXIT_REVEAL = {
  approachMs: 600,
  animationMs: 1200,
  returnMs: 600,
  zoom: 1.14,
} as const;
const ease = (v: number) => v * v * (3 - 2 * v);
const mix = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  zoom: a.zoom + (b.zoom - a.zoom) * t,
});
/** Attempt-local, delta-driven camera timeline. No timers/tweens survive restart. */
export class ExitReveal {
  private elapsed = 0;
  private showed = false;
  constructor(
    readonly id: string,
    readonly origin: CameraPose,
    readonly target: CameraPose,
  ) {}
  get done(): boolean {
    return (
      this.elapsed >=
      EXIT_REVEAL.approachMs + EXIT_REVEAL.animationMs + EXIT_REVEAL.returnMs
    );
  }
  update(deltaMs: number): {
    pose: CameraPose;
    breakSeal: boolean;
    done: boolean;
  } {
    this.elapsed += Math.max(0, Math.min(deltaMs, 100));
    const { approachMs, animationMs, returnMs } = EXIT_REVEAL;
    const breakSeal = !this.showed && this.elapsed >= approachMs;
    if (breakSeal) this.showed = true;
    const pose =
      this.elapsed < approachMs
        ? mix(this.origin, this.target, ease(this.elapsed / approachMs))
        : this.elapsed < approachMs + animationMs
          ? this.target
          : mix(
              this.target,
              this.origin,
              ease(
                Math.min(
                  1,
                  (this.elapsed - approachMs - animationMs) / returnMs,
                ),
              ),
            );
    return { pose, breakSeal, done: this.done };
  }
}
