import type { AnimationAction, Element } from '../../types/character';
import { getCharacterAnimation } from '../../systems/animation/animationRegistry';

const duration = (action: AnimationAction) => {
  const clip = getCharacterAnimation('earth', action)!;
  return (clip.frameCount / clip.fps) * 1000;
};
/** Contact-driven presentation. Never changes the player's body or movement. */
export class PushAnimationState {
  private phase: 'none' | 'push_start' | 'push_loop' | 'push_end' = 'none';
  private elapsed = 0;
  reset(): void {
    this.phase = 'none';
    this.elapsed = 0;
  }
  step(
    element: Element,
    base: AnimationAction,
    pushing: boolean,
    deltaMs: number,
  ): AnimationAction {
    if (element !== 'earth' || (base !== 'idle' && base !== 'run')) {
      this.reset();
      return base;
    }
    if (pushing) {
      if (this.phase === 'none' || this.phase === 'push_end') {
        this.phase = 'push_start';
        this.elapsed = 0;
      } else {
        this.elapsed += Math.max(0, deltaMs);
        if (
          this.phase === 'push_start' &&
          this.elapsed >= duration('push_start')
        )
          this.phase = 'push_loop';
      }
    } else if (this.phase === 'push_start' || this.phase === 'push_loop') {
      this.phase = 'push_end';
      this.elapsed = 0;
    } else if (this.phase === 'push_end') {
      this.elapsed += Math.max(0, deltaMs);
      if (this.elapsed >= duration('push_end')) this.reset();
    }
    return this.phase === 'none' ? base : this.phase;
  }
}
