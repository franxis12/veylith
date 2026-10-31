import { afterEach, expect, it, vi } from 'vitest';
import { AudioScope } from '../services/audio/AudioScope';
import type { AudioHost } from '../services/audio/AudioScope';
import { AudioEngine } from '../services/audio/AudioEngine';
import { bindRunAudio } from '../services/audio/runAudio';
import { RunSession } from '../game/session/RunSession';
import { MovementAudio } from '../game/systems/audio/MovementAudio';
import type { MotionSoundFrame } from '../game/systems/audio/MovementAudio';

function host() {
  const voices: {
    stop: ReturnType<typeof vi.fn>;
    volume: ReturnType<typeof vi.fn>;
    end: () => void;
  }[] = [];
  const h: AudioHost = {
    available: true,
    load: vi.fn(async () => ({}) as AudioBuffer),
    start: vi.fn((_id, _buffer, _loop, _volume, _rate, end) => {
      const voice = { stop: vi.fn(), volume: vi.fn(), end };
      voices.push(voice);
      return voice;
    }),
    preload: vi.fn(),
    release: vi.fn(),
  };
  return { h, voices };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => vi.useRealTimers());

it('drops late one-shots after restart/disposal and deduplicates repeated pending requests', async () => {
  const { h } = host();
  let resolve!: (b: AudioBuffer) => void;
  h.load = vi.fn(
    () =>
      new Promise<AudioBuffer>((r) => {
        resolve = r;
      }),
  );
  const scope = new AudioScope(h, 'world');
  scope.play('coin_collect');
  scope.play('coin_collect');
  expect(h.load).toHaveBeenCalledTimes(1);
  scope.reset();
  resolve({} as AudioBuffer);
  await flush();
  expect(h.start).not.toHaveBeenCalled();
  scope.play('earth_jump');
  scope.dispose();
  resolve({} as AudioBuffer);
  await flush();
  expect(h.start).not.toHaveBeenCalled();
  expect(h.release).toHaveBeenCalledTimes(1);
});

it('keeps UI independent of a paused world and does not lose the replacement loop when an old voice ends', async () => {
  const { h, voices } = host();
  const world = new AudioScope(h, 'world');
  const ui = new AudioScope(h, 'ui');
  world.loop('fan', 'fan_motion', 1);
  await flush();
  world.setPaused(true);
  ui.play('ui_pause');
  await flush();
  expect(voices[0]!.stop).toHaveBeenCalledOnce();
  expect(h.start).toHaveBeenCalledTimes(2);
  world.setPaused(false);
  await flush();
  const replacement = voices[2]!;
  voices[0]!.end();
  world.loop('fan', 'fan_motion', 0.4);
  await flush();
  expect(h.start).toHaveBeenCalledTimes(3);
  world.dispose();
  expect(replacement.stop).toHaveBeenCalledOnce();
  ui.dispose();
});

it('restores an ambience loop when pause and resume happen before its first decode finishes', async () => {
  const { h } = host();
  let resolve!: (b: AudioBuffer) => void;
  const decoding = new Promise<AudioBuffer>((r) => {
    resolve = r;
  });
  h.load = vi.fn(() => decoding);
  const scope = new AudioScope(h, 'world');
  scope.loop('forest', 'forest_ambience', 0.5);
  scope.setPaused(true);
  scope.setPaused(false);
  resolve({} as AudioBuffer);
  await flush();
  await flush();
  expect(h.start).toHaveBeenCalledTimes(1);
  expect(vi.mocked(h.start).mock.calls[0]?.[0]).toBe('forest_ambience');
  scope.dispose();
});

it('bounds loop voices, removes sources at distance and cancels queued results on silence', async () => {
  vi.useFakeTimers();
  const { h, voices } = host();
  const scope = new AudioScope(h, 'world');
  for (let i = 0; i < 30; i++) scope.loop(String(i), 'fan_motion', 0.5);
  await flush();
  expect(h.start).toHaveBeenCalledTimes(8);
  scope.loop('0', 'fan_motion', 0);
  expect(voices[0]!.stop).toHaveBeenCalledOnce();
  scope.schedule('reward_bank', 1000);
  scope.silence();
  await vi.advanceTimersByTimeAsync(1200);
  expect(h.start).toHaveBeenCalledTimes(8);
  scope.dispose();
});

it('plays only actually earned results once, cancels on navigation, and keeps playtest rewards silent', async () => {
  vi.useFakeTimers();
  const { h } = host();
  const engine = {
    createScope: () => new AudioScope(h, 'ui'),
  } as unknown as AudioEngine;
  const run = new RunSession(() => ({
    level: 'forest-1',
    elapsedMs: 1000,
    bestTimeMs: 1000,
    stars: 2,
    earnedCoins: 0,
    newRecord: false,
  }));
  const stop = bindRunAudio(run, engine);
  run.start('earth');
  run.complete();
  run.complete();
  await vi.advanceTimersByTimeAsync(1500);
  expect(vi.mocked(h.start).mock.calls.map((c) => c[0])).toEqual([
    'level_victory',
    'star_award',
    'star_award',
  ]);
  run.retry();
  run.start('earth');
  run.complete();
  await flush();
  stop();
  await vi.advanceTimersByTimeAsync(1500);
  expect(
    vi.mocked(h.start).mock.calls.filter((c) => c[0] === 'star_award'),
  ).toHaveLength(2);
  const test = new RunSession();
  const stopTest = bindRunAudio(test, engine);
  test.start('water');
  test.complete();
  await vi.advanceTimersByTimeAsync(1500);
  expect(vi.mocked(h.start).mock.calls.at(-1)?.[0]).toBe('portal_complete');
  stopTest();
});

it('loads audio only after a gesture, isolates file failure, caps voices and stops on mute/background', async () => {
  const sources: {
    onended: (() => void) | null;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const gain = () => ({
    gain: {
      value: 1,
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const buffer = { length: 44100, numberOfChannels: 1 } as AudioBuffer;
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    createGain: vi.fn(gain),
    decodeAudioData: vi.fn(async () => buffer),
    createBufferSource: vi.fn(() => {
      const s = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(s);
      return s;
    }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  const fetcher = vi.fn(
    async (url: RequestInfo | URL) =>
      ({
        ok: !String(url).includes('fire_impact'),
        arrayBuffer: async () => new ArrayBuffer(8),
      }) as Response,
  );
  const engine = new AudioEngine(factory, fetcher);
  const scope = engine.createScope('world');
  engine.setForeground(true);
  scope.preload(['earth_jump']);
  scope.play('earth_jump');
  expect(factory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  engine.unlock();
  await flush();
  await engine.load('earth_jump');
  await engine.load('fire_impact');
  await engine.load('fire_impact');
  expect(engine.diagnostics.failed).toEqual(['fire_impact']);
  expect(
    fetcher.mock.calls.filter((c) => String(c[0]).includes('fire_impact')),
  ).toHaveLength(1);
  for (let i = 0; i < 10; i++)
    engine.start('earth_jump', buffer, false, 1, 1, () => undefined);
  expect(engine.diagnostics.voices).toBe(3);
  scope.loop('fan', 'fan_motion', 1);
  await engine.load('fan_motion');
  await flush();
  engine.configure(false, 0.6);
  expect(sources.at(-1)!.stop).toHaveBeenCalled();
  engine.setForeground(false);
  expect(context.suspend).toHaveBeenCalled();
  scope.dispose();
});

it('footsteps require displacement and grounding; jumps, casts and glide follow accepted motor decisions', () => {
  const port = { play: vi.fn(), loop: vi.fn() };
  const audio = new MovementAudio(port);
  const frame: MotionSoundFrame = {
    jumped: false,
    doubleJumped: false,
    landed: false,
    grounded: true,
    gliding: false,
    cast: undefined,
    plunging: false,
  };
  for (let i = 0; i < 100; i++) audio.update('earth', 100, 1, frame);
  expect(port.play).not.toHaveBeenCalled();
  for (let x = 110; x <= 180; x += 10) audio.update('earth', x, 1, frame);
  expect(port.play).toHaveBeenCalledWith('earth_step', 0.8, 0.98);
  audio.update('fire', 200, 1, {
    ...frame,
    jumped: true,
    doubleJumped: true,
    grounded: false,
  });
  expect(port.play).toHaveBeenCalledWith('fire_double_jump');
  audio.update('air', 240, 1, {
    ...frame,
    grounded: false,
    gliding: true,
    cast: 'air',
  });
  expect(port.loop).toHaveBeenLastCalledWith('player:glide', 'air_glide', 0.6);
  audio.update('water', 240, 0, frame);
  expect(port.loop).toHaveBeenLastCalledWith('player:glide', 'air_glide', 0);
});
