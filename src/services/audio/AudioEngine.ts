import { AudioScope } from './AudioScope';
import type { AudioHost, Voice } from './AudioScope';
import { SOUNDS } from './catalog';
import type { SoundId } from './catalog';

const MAX_CACHE_BYTES = 12 * 1024 * 1024;
const clamp = (v: number) =>
  Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** One lazy Web Audio context shared by UI and independently pausable worlds. */
export class AudioEngine implements AudioHost {
  private context: AudioContext | undefined;
  private master?: GainNode;
  private enabled = true;
  private foreground = true;
  private volume = 0.65;
  private unlocked = false;
  private readonly scopes = new Set<AudioScope>();
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly pending = new Map<
    SoundId,
    Promise<AudioBuffer | undefined>
  >();
  private readonly failed = new Set<SoundId>();
  private readonly requested = new Set<SoundId>();
  private readonly voices = new Map<Voice, SoundId>();

  constructor(
    private readonly createContext: () => AudioContext | undefined = () => {
      const Constructor =
        globalThis.AudioContext ??
        (
          globalThis as typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      return Constructor ? new Constructor() : undefined;
    },
    private readonly fetchAudio: typeof fetch = (...args) => fetch(...args),
  ) {}

  get available(): boolean {
    return this.unlocked && this.enabled && this.foreground && this.volume > 0;
  }
  get diagnostics() {
    return {
      voices: this.voices.size,
      cached: this.buffers.size,
      pending: this.pending.size,
      failed: [...this.failed],
      contextState: this.context?.state,
      scopes: this.scopes.size,
    };
  }
  createScope(channel: 'world' | 'ui'): AudioScope {
    const scope = new AudioScope(this, channel);
    this.scopes.add(scope);
    return scope;
  }
  release(scope: AudioScope): void {
    this.scopes.delete(scope);
  }
  unlock(): void {
    if (!this.enabled || !this.foreground || this.volume <= 0) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        if (!this.context) return;
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.context.destination);
      }
      if (this.unlocked && this.context.state === 'running') return;
      this.unlocked = true;
      void this.context
        .resume()
        .then(() => {
          if (!this.available) return;
          const requested = [...this.requested];
          this.requested.clear();
          this.preload(requested);
          this.scopes.forEach((s) => s.refresh());
        })
        .catch(() => {
          this.unlocked = false;
        });
    } catch {
      this.unlocked = false;
    }
  }
  configure(enabled: boolean, volume: number): void {
    const wasAvailable = this.available;
    this.enabled = enabled;
    this.volume = clamp(volume);
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        enabled ? this.volume : 0,
        this.context.currentTime,
        0.015,
      );
    if (!this.available) this.scopes.forEach((s) => s.silence());
    else if (!wasAvailable) this.scopes.forEach((s) => s.refresh());
  }
  setForeground(active: boolean): void {
    this.foreground = active;
    if (!active) {
      this.scopes.forEach((s) => s.silence());
      void this.context?.suspend().catch(() => undefined);
    } else if (this.context && this.unlocked) this.unlock();
  }
  preload(ids: readonly SoundId[]): void {
    if (!this.context) ids.forEach((id) => this.requested.add(id));
    else for (const id of ids) void this.load(id);
  }
  load(id: SoundId): Promise<AudioBuffer | undefined> {
    const context = this.context;
    if (!context || this.failed.has(id)) return Promise.resolve(undefined);
    const cached = this.buffers.get(id);
    if (cached) {
      this.buffers.delete(id);
      this.buffers.set(id, cached);
      return Promise.resolve(cached);
    }
    const pending = this.pending.get(id);
    if (pending) return pending;
    const request = this.fetchAudio(
      `${import.meta.env.BASE_URL}${SOUNDS[id].path}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error('Audio unavailable');
        return r.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => {
        this.buffers.set(id, buffer);
        let bytes = [...this.buffers.values()].reduce(
          (sum, b) => sum + b.length * b.numberOfChannels * 4,
          0,
        );
        for (const [key, value] of this.buffers) {
          if (bytes <= MAX_CACHE_BYTES) break;
          this.buffers.delete(key);
          bytes -= value.length * value.numberOfChannels * 4;
        }
        return buffer;
      })
      .catch(() => {
        this.failed.add(id);
        return undefined;
      })
      .finally(() => {
        this.pending.delete(id);
      });
    this.pending.set(id, request);
    return request;
  }
  start(
    id: SoundId,
    buffer: AudioBuffer,
    loop: boolean,
    volume: number,
    rate: number,
    ended: () => void,
  ): Voice | undefined {
    const context = this.context;
    if (
      !context ||
      !this.master ||
      !this.available ||
      this.voices.size >= 28 ||
      [...this.voices.values()].filter((cue) => cue === id).length >= 3
    )
      return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = Math.max(0.8, Math.min(1.3, rate));
    source.connect(gain);
    gain.connect(this.master);
    gain.gain.value = loop ? 0 : clamp(volume) * SOUNDS[id].gain;
    if (loop)
      gain.gain.setTargetAtTime(
        clamp(volume) * SOUNDS[id].gain,
        context.currentTime,
        0.04,
      );
    let stopped = false;
    const voice: Voice = {
      stop: () => {
        if (stopped) return;
        stopped = true;
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setTargetAtTime(0, context.currentTime, 0.012);
        source.stop(context.currentTime + 0.06);
        this.voices.delete(voice);
      },
      volume: (value) => {
        if (!stopped)
          gain.gain.setTargetAtTime(
            clamp(value) * SOUNDS[id].gain,
            context.currentTime,
            0.04,
          );
      },
    };
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      ended();
    };
    this.voices.set(voice, id);
    source.start();
    return voice;
  }
}
