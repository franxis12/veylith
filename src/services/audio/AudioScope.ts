import type { SoundId } from './catalog';

export interface Voice {
  stop(): void;
  volume(value: number): void;
}
export interface AudioHost {
  readonly available: boolean;
  load(id: SoundId): Promise<AudioBuffer | undefined>;
  start(
    id: SoundId,
    buffer: AudioBuffer,
    loop: boolean,
    volume: number,
    rate: number,
    ended: () => void,
  ): Voice | undefined;
  preload(ids: readonly SoundId[]): void;
  release(scope: AudioScope): void;
}
export interface SoundPort {
  play(id: SoundId, volume?: number, rate?: number): void;
  loop(key: string, id: SoundId, volume: number): void;
}
interface Loop {
  id: SoundId;
  volume: number;
  voice?: Voice | undefined;
  pending?: boolean;
}

/** Cancellable owner for one scene or result panel; no stale async audio after teardown. */
export class AudioScope implements SoundPort {
  private readonly loops = new Map<string, Loop>();
  private readonly voices = new Set<Voice>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly last = new Map<SoundId, number>();
  private epoch = 0;
  private pending = 0;
  private paused = false;
  private disposed = false;

  constructor(
    private readonly host: AudioHost,
    readonly channel: 'world' | 'ui',
  ) {}

  get active(): boolean {
    return !this.disposed && !this.paused && this.host.available;
  }
  preload(ids: readonly SoundId[]): void {
    if (!this.disposed) this.host.preload(ids);
  }
  play(id: SoundId, volume = 1, rate = 1): void {
    if (!this.active || volume <= 0 || this.pending >= 8) return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < 65) return;
    this.last.set(id, now);
    const epoch = this.epoch;
    this.pending++;
    void this.host
      .load(id)
      .then((buffer) => {
        if (
          !buffer ||
          epoch !== this.epoch ||
          !this.active ||
          performance.now() - now > (this.channel === 'world' ? 300 : 1200)
        )
          return;
        const voice = this.host.start(id, buffer, false, volume, rate, () => {
          if (voice) this.voices.delete(voice);
        });
        if (voice) this.voices.add(voice);
      })
      .catch(() => undefined)
      .finally(() => {
        this.pending--;
      });
  }
  schedule(id: SoundId, delayMs: number, volume = 1, rate = 1): void {
    if (!this.active) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.play(id, volume, rate);
    }, delayMs);
    this.timers.add(timer);
  }
  loop(key: string, id: SoundId, volume: number): void {
    if (this.disposed) return;
    const old = this.loops.get(key);
    if (volume <= 0) {
      old?.voice?.stop();
      this.loops.delete(key);
      return;
    }
    if (old?.id !== id) {
      old?.voice?.stop();
      this.loops.set(key, { id, volume });
    }
    const loop = this.loops.get(key)!;
    loop.volume = volume;
    loop.voice?.volume(volume);
    this.startLoop(key, loop);
  }
  private startLoop(key: string, loop: Loop): void {
    if (!this.active || loop.voice || loop.pending) return;
    // Nearby sources only; distant callers pass zero. Keep simultaneous loops bounded.
    if (
      [...this.loops.values()].filter((l) => l.voice || l.pending).length >= 8
    )
      return;
    loop.pending = true;
    const epoch = this.epoch;
    void this.host
      .load(loop.id)
      .then((buffer) => {
        if (
          !buffer ||
          epoch !== this.epoch ||
          !this.active ||
          this.loops.get(key) !== loop
        )
          return;
        const voice = this.host.start(
          loop.id,
          buffer,
          true,
          loop.volume,
          1,
          () => {
            if (loop.voice === voice) loop.voice = undefined;
          },
        );
        loop.voice = voice;
      })
      .catch(() => undefined)
      .finally(() => {
        loop.pending = false;
        // A pause/resume can finish before decoding does. Restore the desired
        // loop after that cancelled request, even if its owner only set it once.
        if (this.active && epoch !== this.epoch && this.loops.get(key) === loop)
          this.startLoop(key, loop);
      });
  }
  refresh(): void {
    for (const [key, loop] of this.loops) this.startLoop(key, loop);
  }
  silence(): void {
    this.epoch++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
    for (const loop of this.loops.values()) {
      loop.voice?.stop();
      loop.voice = undefined;
    }
  }
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) this.silence();
    else this.refresh();
  }
  reset(): void {
    this.silence();
    this.loops.clear();
    this.last.clear();
  }
  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
    this.host.release(this);
  }
}
