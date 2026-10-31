import { expect, it, vi } from 'vitest';
import { ActionState } from '../game/systems/input/ActionState';
import { gameplayKeyboard } from '../game/systems/input/gameplayKeyboard';

it('aggregates independent fingers and keyboard holds without releasing another source', () => {
  const actions = new ActionState();
  actions.dispatch({ type: 'move_right', phase: 'pressed' }, 'keyboard');
  actions.dispatch({ type: 'move_right', phase: 'pressed' }, 'finger1');
  actions.dispatch({ type: 'jump', phase: 'pressed' }, 'finger2');
  expect(actions.read()).toMatchObject({
    direction: 1,
    jumpPressed: true,
    glideHeld: true,
  });
  expect(actions.read().jumpPressed).toBe(false);
  actions.dispatch({ type: 'move_right', phase: 'released' }, 'finger1');
  expect(actions.read().direction).toBe(1);
  actions.dispatch({ type: 'move_left', phase: 'pressed' }, 'finger3');
  expect(actions.read().direction).toBe(0);
  actions.dispatch({ type: 'move_right', phase: 'released' }, 'keyboard');
  expect(actions.read().direction).toBe(-1);
});

it('retains quick jump taps until consumed, ignores held repeats and clears pending input on reset', () => {
  const actions = new ActionState();
  actions.dispatch({ type: 'jump', phase: 'pressed' }, 'key');
  actions.dispatch({ type: 'jump', phase: 'released' }, 'key');
  expect(actions.read()).toMatchObject({ jumpPressed: true, glideHeld: false });
  actions.dispatch({ type: 'jump', phase: 'pressed' }, 'key');
  actions.read();
  actions.dispatch({ type: 'jump', phase: 'pressed' }, 'key');
  expect(actions.read().jumpPressed).toBe(false);
  actions.dispatch(
    { type: 'switch_element', phase: 'pressed', element: 'air' },
    'key',
  );
  actions.reset();
  expect(actions.read()).toEqual({
    direction: 0,
    jumpPressed: false,
    abilityPressed: false,
    restartPressed: false,
    glideHeld: false,
    element: undefined,
  });
});

it('keyboard aliases hold one action until the final key releases and clean up on blur', () => {
  const sink = vi.fn();
  const disconnect = gameplayKeyboard(window).connect(sink);
  const key = (type: string, code: string) =>
    window.dispatchEvent(new KeyboardEvent(type, { code }));
  key('keydown', 'KeyD');
  key('keydown', 'ArrowRight');
  key('keyup', 'KeyD');
  expect(sink).toHaveBeenCalledExactlyOnceWith({
    type: 'move_right',
    phase: 'pressed',
  });
  window.dispatchEvent(new Event('blur'));
  expect(sink).toHaveBeenLastCalledWith({
    type: 'move_right',
    phase: 'released',
  });
  disconnect();
  sink.mockClear();
  key('keydown', 'Space');
  expect(sink).not.toHaveBeenCalled();
});

it('ignores typing/modifier/repeat events and supports element changes while moving', () => {
  const sink = vi.fn();
  const disconnect = gameplayKeyboard(window, true).connect(sink);
  const field = document.createElement('input');
  document.body.append(field);
  field.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, code: 'KeyW' }),
  );
  const summary = document.createElement('summary');
  document.body.append(summary);
  const toggle = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    code: 'Space',
  });
  summary.dispatchEvent(toggle);
  expect(toggle.defaultPrevented).toBe(false);
  summary.remove();
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Digit1', ctrlKey: true }),
  );
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Space', repeat: true }),
  );
  expect(sink).not.toHaveBeenCalled();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
  expect(sink.mock.calls).toEqual([
    [{ type: 'move_left', phase: 'pressed' }],
    [{ type: 'switch_element', phase: 'pressed', element: 'fire' }],
  ]);
  field.remove();
  disconnect();
});

it('emits a single restart action from R and clears pending restarts on reset', () => {
  const actions = new ActionState();
  const disconnect = gameplayKeyboard(window).connect((action) =>
    actions.dispatch(action, 'keyboard'),
  );
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
  expect(actions.read().restartPressed).toBe(true);
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'KeyR', repeat: true }),
  );
  expect(actions.read().restartPressed).toBe(false);
  actions.dispatch({ type: 'restart_level', phase: 'pressed' }, 'touch');
  actions.reset();
  expect(actions.read().restartPressed).toBe(false);
  disconnect();
});

it('consumes quick power taps once, ignores holds and clears them on reset', () => {
  const actions = new ActionState();
  actions.dispatch({ type: 'use_ability', phase: 'pressed' }, 'finger');
  actions.dispatch({ type: 'use_ability', phase: 'released' }, 'finger');
  expect(actions.read()).toMatchObject({
    abilityPressed: true,
    glideHeld: false,
  });
  expect(actions.read().abilityPressed).toBe(false);
  actions.dispatch({ type: 'use_ability', phase: 'pressed' }, 'key');
  actions.read();
  actions.dispatch({ type: 'use_ability', phase: 'pressed' }, 'key');
  expect(actions.read()).toMatchObject({
    abilityPressed: false,
    glideHeld: true,
  });
  actions.reset();
  expect(actions.read()).toMatchObject({
    abilityPressed: false,
    glideHeld: false,
  });
});

it('ignores digit and numpad transformations by default without swallowing the keys', () => {
  const sink = vi.fn();
  const disconnect = gameplayKeyboard(window).connect(sink);
  for (const code of [
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Numpad1',
    'Numpad4',
  ]) {
    const event = new KeyboardEvent('keydown', { code, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(sink).not.toHaveBeenCalled();
  disconnect();
});
