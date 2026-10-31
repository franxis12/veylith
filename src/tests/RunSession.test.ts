import { beforeEach, expect, it, vi } from 'vitest';
import { RunSession } from '../game/session/RunSession';
import { completeLevel, emptyProgress } from '../services/progress/progress';

let now: number;
beforeEach(() => {
  now = 0;
});
const advance = (ms: number) => {
  now += ms;
};

it('counts active wall time only, excluding loading, pause, background and completion', () => {
  const complete = vi.fn(
    (ms: number) => completeLevel(emptyProgress(), 'forest', ms).result,
  );
  const run = new RunSession(complete, () => now);
  advance(10_000);
  run.tick('water');
  expect(run.getSnapshot().elapsedMs).toBe(0);
  run.start('water');
  advance(1_250);
  run.pause();
  advance(99_000);
  run.setForeground(false);
  advance(20_000);
  run.setForeground(true);
  expect(run.getSnapshot()).toMatchObject({
    elapsedMs: 1_250,
    phase: 'paused',
  });
  run.resume();
  advance(750);
  run.complete();
  advance(50_000);
  run.tick('fire');
  run.complete();
  expect(run.getSnapshot()).toMatchObject({
    elapsedMs: 2_000,
    phase: 'complete',
  });
  expect(complete).toHaveBeenCalledExactlyOnceWith(2_000, []);
});

it('requires resume on foreground and cannot resume while the app is inactive', () => {
  const run = new RunSession(undefined, () => now);
  run.start('water');
  advance(500);
  run.setForeground(false);
  run.resume();
  advance(40_000);
  run.tick('water');
  expect(run.getSnapshot()).toMatchObject({ elapsedMs: 500, phase: 'paused' });
  run.setForeground(true);
  advance(500);
  run.tick('water');
  expect(run.getSnapshot().elapsedMs).toBe(1_000);
});

it('never awards for loading, paused, or disposed sessions', () => {
  const complete = vi.fn();
  const run = new RunSession(complete, () => now);
  run.complete();
  run.start('water');
  run.pause();
  run.complete();
  run.dispose();
  run.complete();
  expect(complete).not.toHaveBeenCalled();
});

it('resets each attempt, including fall retry; emits element changes without per-frame rendering', () => {
  const run = new RunSession(undefined, () => now);
  const listener = vi.fn();
  const stop = run.subscribe(listener);
  run.start('water');
  for (let i = 0; i < 10; i++) {
    advance(5);
    run.tick('water');
  }
  expect(listener).toHaveBeenCalledTimes(1);
  run.tick('fire');
  expect(run.getSnapshot().element).toBe('fire');
  expect(listener).toHaveBeenCalledTimes(2);
  run.start('water');
  expect(run.getSnapshot()).toMatchObject({ elapsedMs: 0, element: 'water' });
  advance(500);
  run.pause();
  run.retry();
  advance(30_000);
  expect(run.getSnapshot()).toMatchObject({ phase: 'loading', elapsedMs: 0 });
  run.start('water');
  advance(200);
  run.tick('water');
  expect(run.getSnapshot().elapsedMs).toBe(200);
  stop();
  listener.mockClear();
  run.pause();
  expect(listener).not.toHaveBeenCalled();
});
