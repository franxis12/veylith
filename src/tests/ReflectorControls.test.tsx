import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { ReflectorControls } from '../components/game/ReflectorControls';
import { ActionState } from '../game/systems/input/ActionState';
it('stays open during StrictMode replay, sends fine rotation and consumes Escape before pause', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host),
    actions = new ActionState();
  try {
    await act(() =>
      root.render(
        <StrictMode>
          <ReflectorControls
            actions={actions}
            reflector={{ id: 'mirror', active: true, angle: 225 }}
          />
        </StrictMode>,
      ),
    );
    expect(actions.read().closeReflector).toBeUndefined();
    const dial = host.querySelector<HTMLElement>('[role="slider"]')!;
    expect(document.activeElement).not.toBe(dial);
    await act(() =>
      dial.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(actions.read().reflectorTurn).toBe(1);
    const escape = new KeyboardEvent('keydown', {
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    await act(() => dial.dispatchEvent(escape));
    expect(escape.defaultPrevented).toBe(true);
    expect(actions.read().closeReflector).toBe(true);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
  expect(actions.read().closeReflector).toBeUndefined();
});
