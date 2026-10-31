import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createGame } from '../game/core/Game';
import { ActionState } from '../game/systems/input/ActionState';
import { RunSession } from '../game/session/RunSession';

const mocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  wake: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  refresh: vi.fn(),
  unsubscribe: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  onActivity: undefined as ((active: boolean) => void) | undefined,
}));

vi.mock('phaser', () => ({
  default: {
    Game: class {
      isBooted = true;
      isRunning = true;
      canvas = document.createElement('canvas');
      destroy = mocks.destroy;
      pause = mocks.pause;
      resume = mocks.resume;
      loop = { wake: mocks.wake };
      scale = { refresh: mocks.refresh };
      constructor(config: { parent: HTMLElement }) {
        config.parent.append(this.canvas);
      }
    },
  },
}));
vi.mock('../game/core/GameConfig', () => ({
  createGameConfig: (parent: HTMLElement) => ({ parent }),
}));
vi.mock('../services/lifecycle/observeAppActivity', () => ({
  observeAppActivity: (onActivity: (active: boolean) => void) => {
    mocks.onActivity = onActivity;
    return mocks.unsubscribe;
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = mocks.observe;
      disconnect = mocks.disconnect;
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it('rejects a second game in the same container and releases it after cleanup', () => {
  const parent = document.createElement('div');
  const game = createGame(parent, vi.fn());
  expect(() => createGame(parent, vi.fn())).toThrow('already attached');
  game.destroy();
  const replacement = createGame(parent, vi.fn());
  replacement.destroy();
});

it('detaches the canvas, schedules Phaser destruction, and cleans listeners exactly once', () => {
  const parent = document.createElement('div');
  const game = createGame(parent, vi.fn());
  expect(parent.querySelectorAll('canvas')).toHaveLength(1);
  game.destroy();
  game.destroy();
  expect(parent.querySelectorAll('canvas')).toHaveLength(0);
  expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith(true, false);
  expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  expect(mocks.wake).toHaveBeenCalledTimes(1);
});

it('pauses and resumes the game without involving React state', () => {
  const game = createGame(document.createElement('div'), vi.fn());
  mocks.onActivity?.(false);
  expect(mocks.pause).toHaveBeenCalledTimes(1);
  mocks.onActivity?.(true);
  expect(mocks.resume).toHaveBeenCalledTimes(1);
  game.destroy();
});

it('releases holds and pending jumps on inactivity, blur and destruction', () => {
  const input = new ActionState();
  const game = createGame(document.createElement('div'), vi.fn(), { input });
  for (const reset of [
    () => mocks.onActivity?.(false),
    () => window.dispatchEvent(new Event('blur')),
    () => game.destroy(),
  ]) {
    input.dispatch({ type: 'move_right', phase: 'pressed' }, 'touch');
    input.dispatch({ type: 'jump', phase: 'pressed' }, 'touch');
    reset();
    expect(input.read()).toMatchObject({
      direction: 0,
      jumpPressed: false,
      glideHeld: false,
    });
  }
});

it('keeps manual pause across native foreground changes and resumes only on request', () => {
  const run = new RunSession();
  const game = createGame(document.createElement('div'), vi.fn(), { run });
  run.start('water');
  run.pause();
  expect(mocks.pause).toHaveBeenCalledTimes(1);
  mocks.onActivity?.(false);
  mocks.onActivity?.(true);
  expect(mocks.resume).not.toHaveBeenCalled();
  run.resume();
  expect(mocks.resume).toHaveBeenCalledTimes(1);
  run.complete();
  expect(mocks.pause).toHaveBeenCalledTimes(2);
  mocks.onActivity?.(true);
  expect(mocks.resume).toHaveBeenCalledTimes(1);
  run.retry();
  expect(mocks.resume).toHaveBeenCalledTimes(2);
  game.destroy();
  run.pause();
  expect(mocks.pause).toHaveBeenCalledTimes(2);
});
