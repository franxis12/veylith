import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { GameplayControls } from '../components/game/GameplayControls';
import { ActionState } from '../game/systems/input/ActionState';

let host: HTMLDivElement;
let root: Root;
let actions: ActionState;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  actions = new ActionState();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() => root.render(<GameplayControls actions={actions} />));
  for (const button of host.querySelectorAll('button'))
    button.setPointerCapture = () => undefined;
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});
const button = (label: string) =>
  host.querySelector(`[aria-label="${label}"]`)!;
const pointer = (label: string, type: string, pointerId: number) => {
  button(label).dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerId, button: 0 }),
  );
};

it('supports simultaneous movement and jump with independent pointer release', () => {
  pointer('Move right', 'pointerdown', 1);
  pointer('Jump', 'pointerdown', 2);
  expect(actions.read()).toMatchObject({
    direction: 1,
    jumpPressed: true,
    element: undefined,
  });
  pointer('Jump', 'pointerup', 2);
  expect(actions.read()).toMatchObject({ direction: 1, glideHeld: false });
  pointer('Move right', 'pointerup', 1);
  expect(actions.read().direction).toBe(0);
});

it('clears cancelled and lost captures, including multiple fingers holding one button', () => {
  pointer('Move left', 'pointerdown', 1);
  pointer('Move left', 'pointerdown', 2);
  pointer('Move left', 'pointercancel', 1);
  expect(actions.read().direction).toBe(-1);
  pointer('Move left', 'lostpointercapture', 2);
  expect(actions.read().direction).toBe(0);
});

it('supports keyboard activation of touch controls without repeated jump edges', () => {
  const jump = button('Jump');
  jump.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, code: 'Space' }),
  );
  expect(actions.read().jumpPressed).toBe(true);
  jump.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      code: 'Space',
      repeat: true,
    }),
  );
  expect(actions.read().jumpPressed).toBe(false);
  jump.dispatchEvent(
    new KeyboardEvent('keyup', { bubbles: true, code: 'Space' }),
  );
  expect(actions.read().glideHeld).toBe(false);
});

it('casts a power while moving, keeps Air glide held, and releases cancelled touches', () => {
  pointer('Move right', 'pointerdown', 1);
  pointer('Use power (E)', 'pointerdown', 2);
  expect(actions.read()).toMatchObject({
    direction: 1,
    abilityPressed: true,
    glideHeld: true,
  });
  expect(actions.read().abilityPressed).toBe(false);
  pointer('Use power (E)', 'pointercancel', 2);
  expect(actions.read()).toMatchObject({
    direction: 1,
    abilityPressed: false,
    glideHeld: false,
  });
});

it('hides manual element selection in normal gameplay', async () => {
  await act(() => root.render(<GameplayControls actions={actions} />));
  expect(host.querySelector('[aria-label="Choose element"]')).toBeNull();
  expect(host.textContent).not.toContain('1–4');
});
