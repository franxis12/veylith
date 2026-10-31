import { expect, it } from 'vitest';
import { ActionState } from '../game/systems/input/ActionState';
import { TouchGestures } from '../game/systems/input/TouchGestures';

it('moves and jumps with independent fingers; releasing jump keeps movement', () => {
  const actions = new ActionState(),
    touch = new TouchGestures(actions);
  touch.down(1, 'left', 100, 200, 0);
  touch.move(1, 150, 200);
  touch.down(2, 'right', 600, 200, 0);
  touch.move(2, 600, 150);
  expect(actions.read()).toMatchObject({
    direction: 1,
    jumpPressed: true,
    glideHeld: true,
    abilityPressed: false,
  });
  touch.move(2, 600, 100);
  expect(actions.read().jumpPressed).toBe(false);
  touch.up(2, 600, 100, 100);
  expect(actions.read()).toMatchObject({
    direction: 1,
    glideHeld: false,
    abilityPressed: false,
  });
  touch.move(1, 50, 200);
  expect(actions.read().direction).toBe(-1);
  touch.up(1, 50, 200, 150);
  expect(actions.read().direction).toBe(0);
});
it('retains quick taps until a game frame but never casts after a swipe or long hold', () => {
  const actions = new ActionState(),
    touch = new TouchGestures(actions);
  touch.down(1, 'right', 600, 200, 0);
  touch.up(1, 603, 201, 90);
  expect(actions.read()).toMatchObject({
    abilityPressed: true,
    jumpPressed: false,
    glideHeld: false,
  });
  expect(actions.read().abilityPressed).toBe(false);
  touch.down(2, 'right', 600, 200, 100);
  touch.move(2, 650, 200);
  touch.up(2, 600, 200, 200);
  expect(actions.read().abilityPressed).toBe(false);
  touch.down(3, 'right', 600, 200, 300);
  touch.up(3, 600, 200, 700);
  expect(actions.read().abilityPressed).toBe(false);
});
it('ignores left taps and vertical swipes, requires an upward right swipe, and supports a fresh jump', () => {
  const actions = new ActionState(),
    touch = new TouchGestures(actions);
  touch.down(1, 'left', 100, 200, 0);
  touch.move(1, 105, 100);
  touch.up(1, 105, 100, 100);
  touch.down(2, 'right', 600, 200, 0);
  touch.move(2, 600, 250);
  touch.up(2, 600, 250, 100);
  expect(actions.read()).toMatchObject({
    direction: 0,
    jumpPressed: false,
    abilityPressed: false,
  });
  for (let i = 0; i < 2; i++) {
    touch.down(3, 'right', 600, 200, 0);
    touch.up(3, 600, 150, 100);
    expect(actions.read().jumpPressed).toBe(true);
  }
});
it('cancellation releases only gesture holds and never turns a cancelled tap into a power', () => {
  const actions = new ActionState(),
    touch = new TouchGestures(actions);
  actions.dispatch({ type: 'move_left', phase: 'pressed' }, 'keyboard');
  touch.down(1, 'left', 100, 200, 0);
  touch.move(1, 150, 200);
  touch.down(2, 'right', 600, 200, 0);
  touch.cancelAll();
  touch.up(2, 600, 200, 90);
  expect(actions.read()).toMatchObject({
    direction: -1,
    abilityPressed: false,
    glideHeld: false,
  });
});
it('locks each finger to its starting side and ignores additional fingers on that side', () => {
  const actions = new ActionState(),
    touch = new TouchGestures(actions);
  expect(touch.down(1, 'left', 100, 200, 0)).toBe(true);
  expect(touch.down(2, 'left', 100, 200, 0)).toBe(false);
  touch.move(2, 0, 200);
  touch.move(1, 800, 100);
  expect(actions.read()).toMatchObject({ direction: 1, jumpPressed: false });
  touch.cancel(2);
  expect(actions.read().direction).toBe(1);
  touch.cancel(1);
  expect(actions.read().direction).toBe(0);
});
