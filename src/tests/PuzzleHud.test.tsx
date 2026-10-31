import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PuzzleHud } from '../components/game/PuzzleHud';
import { LevelProgress } from '../game/levels/LevelProgress';
import { ActionState } from '../game/systems/input/ActionState';

it('shows objective, countdown and completion and sends restart through the shared action interface', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const progress = new LevelProgress();
  const actions = new ActionState();
  try {
    progress.publish({ phase: 'locked', secondsLeft: 0, activated: false });
    await act(() =>
      root.render(<PuzzleHud progress={progress} actions={actions} />),
    );
    expect(host.textContent).toContain('Step on the plate as Earth');
    const restartButton =
      host.querySelector<HTMLButtonElement>('.puzzle-restart')!;
    restartButton.focus();
    restartButton.click();
    expect(document.activeElement).not.toBe(restartButton);
    expect(actions.read().restartPressed).toBe(true);
    await act(() =>
      progress.publish({ phase: 'open', secondsLeft: 4, activated: true }),
    );
    expect(host.textContent).toContain('4 s');
    await act(() =>
      progress.publish({ phase: 'complete', secondsLeft: 0, activated: true }),
    );
    expect(host.textContent).toContain('Puzzle solved!');
    host.querySelector<HTMLButtonElement>('.puzzle-complete button')!.click();
    expect(actions.read().restartPressed).toBe(true);
    expect(actions.read().restartPressed).toBe(false);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
