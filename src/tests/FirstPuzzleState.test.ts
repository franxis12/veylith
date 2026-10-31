import { expect, it, vi } from 'vitest';
import { FirstPuzzleState } from '../game/levels/firstPuzzle/FirstPuzzleState';
import type { PuzzlePlayerState } from '../game/levels/firstPuzzle/FirstPuzzleState';
import { LevelProgress } from '../game/levels/LevelProgress';

const onPlate = (
  values: Partial<PuzzlePlayerState> = {},
): PuzzlePlayerState => ({
  x: 400,
  feetY: 420,
  grounded: true,
  element: 'earth',
  ...values,
});

it.each(['water', 'fire', 'air'] as const)(
  'does not let %s activate the Earth plate',
  (element) => {
    expect(new FirstPuzzleState().update(onPlate({ element }), 16).phase).toBe(
      'locked',
    );
  },
);

it.each([{ grounded: false }, { feetY: 650 }, { x: 500 }])(
  'requires actual standing contact on the plate: %j',
  (values) => {
    expect(new FirstPuzzleState().update(onPlate(values), 16).activated).toBe(
      false,
    );
  },
);

it('keeps the door open while pressing, starts the countdown on leaving, and allows retry after expiry', () => {
  const state = new FirstPuzzleState();
  expect(state.update(onPlate(), 16)).toMatchObject({
    phase: 'open',
    secondsLeft: 6,
  });
  expect(state.update(onPlate(), 10000).secondsLeft).toBe(6);
  const away = onPlate({ x: 600, grounded: false });
  expect(state.update(away, 3000)).toMatchObject({
    phase: 'open',
    secondsLeft: 3,
  });
  expect(state.update(away, 3000)).toMatchObject({
    phase: 'locked',
    activated: true,
  });
  expect(state.update(onPlate(), 16)).toMatchObject({
    phase: 'open',
    secondsLeft: 6,
  });
});

it('changing form on the plate starts the timer without losing progress', () => {
  const state = new FirstPuzzleState();
  state.update(onPlate(), 0);
  expect(state.update(onPlate({ element: 'air' }), 1001)).toMatchObject({
    phase: 'open',
    secondsLeft: 5,
    activated: true,
  });
});

it('requires activation and landing at the exit, then preserves victory until a new attempt', () => {
  const exit = onPlate({ x: 1190, feetY: 650, element: 'air' });
  const state = new FirstPuzzleState();
  expect(state.update(exit, 0).phase).toBe('locked');
  state.update(onPlate(), 0);
  expect(state.update({ ...exit, grounded: false }, 100).phase).toBe('open');
  expect(state.update(exit, 100).phase).toBe('complete');
  expect(state.update(onPlate(), 10000)).toMatchObject({
    phase: 'complete',
    secondsLeft: 0,
  });
  expect(new FirstPuzzleState().snapshot).toEqual({
    phase: 'locked',
    secondsLeft: 0,
    activated: false,
  });
});

it('does not strand a player who has passed the door when the timer expires', () => {
  const state = new FirstPuzzleState();
  state.update(onPlate(), 0);
  state.update(onPlate({ x: 1100, grounded: false }), 6000);
  expect(state.update(onPlate({ x: 1190, feetY: 650 }), 100).phase).toBe(
    'complete',
  );
});

it('publishes only discrete status changes and releases subscribers', () => {
  const progress = new LevelProgress();
  const listener = vi.fn();
  const unsubscribe = progress.subscribe(listener);
  const state = new FirstPuzzleState();
  progress.publish(state.update(onPlate(), 0));
  const first = progress.getSnapshot();
  for (let i = 0; i < 30; i++)
    progress.publish(state.update(onPlate({ x: 600 }), 16));
  expect(progress.getSnapshot()).toBe(first);
  expect(listener).toHaveBeenCalledTimes(1);
  progress.publish(state.update(onPlate({ x: 600 }), 1000));
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  progress.publish(null);
  expect(listener).toHaveBeenCalledTimes(2);
});
