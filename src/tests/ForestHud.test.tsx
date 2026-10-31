import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PuzzleHud } from '../components/game/PuzzleHud';
import { LevelProgress } from '../game/levels/LevelProgress';
import { ActionState } from '../game/systems/input/ActionState';

it('shows forest hints, completion and touch restart without the old puzzle objective', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div');
  const root = createRoot(host);
  const progress = new LevelProgress();
  const actions = new ActionState();
  try {
    progress.publish({ kind: 'forest', phase: 'exploring', section: 'glide' });
    await act(() =>
      root.render(<PuzzleHud progress={progress} actions={actions} />),
    );
    expect(host.textContent).toContain('From the high ledge');
    expect(host.textContent).not.toContain('The Wind Gate');
    host.querySelector<HTMLButtonElement>('.puzzle-restart')!.click();
    expect(actions.read().restartPressed).toBe(true);
    expect(actions.read().restartPressed).toBe(false);
    await act(() =>
      progress.publish({ kind: 'forest', phase: 'complete', section: 'ruins' }),
    );
    expect(host.textContent).toContain('Forest complete!');
    host.querySelector<HTMLButtonElement>('.puzzle-complete button')!.click();
    expect(actions.read().restartPressed).toBe(true);
  } finally {
    await act(() => root.unmount());
  }
});
