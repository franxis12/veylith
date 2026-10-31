import type { Element } from '../../types/character';
import type { SoundPort } from '../../../services/audio/AudioScope';

export interface MotionSoundFrame {
  jumped: boolean;
  doubleJumped: boolean;
  landed: boolean;
  grounded: boolean;
  gliding: boolean;
  cast: Element | undefined;
  plunging: boolean;
}
export class MovementAudio {
  private previousX?: number;
  private distance = 0;
  private step = 0;
  constructor(private readonly audio: SoundPort) {}
  update(
    element: Element,
    x: number,
    direction: number,
    frame: MotionSoundFrame,
  ): void {
    const dx = Math.abs(x - (this.previousX ?? x));
    this.previousX = x;
    if (frame.doubleJumped) this.audio.play('fire_double_jump');
    else if (frame.jumped) this.audio.play(`${element}_jump`);
    if (frame.landed) this.audio.play(`${element}_land`, 0.85);
    if (frame.grounded && direction !== 0 && !frame.jumped && !frame.landed) {
      this.distance += Math.min(20, dx);
      if (this.distance >= 70) {
        this.distance %= 70;
        this.audio.play(`${element}_step`, 0.8, ++this.step % 2 ? 0.98 : 1.02);
      }
    } else this.distance = 0;
    if (frame.cast) {
      const id =
        frame.cast === 'earth'
          ? frame.plunging
            ? 'earth_plunge'
            : 'earth_swing'
          : frame.cast === 'air'
            ? 'air_dash'
            : (`${frame.cast}_cast` as const);
      this.audio.play(id, 0.85);
    }
    this.audio.loop(
      'player:glide',
      'air_glide',
      frame.gliding && element === 'air' ? 0.6 : 0,
    );
  }
}
