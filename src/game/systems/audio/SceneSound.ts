import type { AudioScope } from '../../../services/audio/AudioScope';
import type { SoundId } from '../../../services/audio/catalog';

/** All coordinates remain in the world. Distant objects do not start audio voices. */
export class SceneSound {
  private x = 0;
  private y = 0;
  private readonly states = new Map<string, boolean>();
  constructor(readonly scope: AudioScope) {}
  listener(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
  gain(x: number, y: number): number {
    return (
      Math.max(0, 1 - Math.hypot(x - this.x, (y - this.y) * 0.65) / 850) ** 2
    );
  }
  at(id: SoundId, x: number, y: number, volume = 1): void {
    this.scope.play(id, this.gain(x, y) * volume);
  }
  loop(
    key: string,
    id: SoundId,
    x: number,
    y: number,
    active: boolean,
    volume = 1,
  ): void {
    this.scope.loop(key, id, active ? this.gain(x, y) * volume : 0);
  }
  surfaceLoop(
    key: string,
    id: SoundId,
    left: number,
    right: number,
    y: number,
    active: boolean,
    volume = 1,
  ): void {
    // A wide lake is audible from either bank, not only near its artwork center.
    this.loop(
      key,
      id,
      Math.max(left, Math.min(this.x, right)),
      y,
      active,
      volume,
    );
  }
  changed(
    key: string,
    value: boolean,
    on: SoundId,
    off: SoundId | undefined,
    x: number,
    y: number,
  ): void {
    const old = this.states.get(key);
    this.states.set(key, value);
    if (old === undefined || old === value) return;
    const id = value ? on : off;
    if (id) this.at(id, x, y);
  }
}
