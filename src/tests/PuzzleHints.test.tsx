import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { PuzzleHints } from '../components/game/PuzzleHints';
import { usePreferencesStore } from '../stores/preferencesStore';

it('keeps clues hidden until requested, reveals them one by one and allows hiding them', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  usePreferencesStore.setState({ locale: 'es' });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(() =>
      root.render(
        <PuzzleHints
          brief="Objetivo"
          hints={['Observa', 'Compara', 'Ordena']}
        />,
      ),
    );
    expect(host.textContent).toContain('Objetivo');
    expect(host.textContent).not.toContain('Observa');
    await act(() => host.querySelector('button')!.click());
    expect(host.querySelectorAll('li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Compara');
    await act(() => host.querySelectorAll('button')[1]!.click());
    expect(host.querySelectorAll('li')).toHaveLength(2);
    await act(() => host.querySelectorAll('button')[1]!.click());
    expect(host.querySelectorAll('li')).toHaveLength(3);
    expect(host.querySelectorAll('button')).toHaveLength(1);
    await act(() => host.querySelector('button')!.click());
    expect(host.querySelector('ol')).toBeNull();
    await act(() => host.querySelector('button')!.click());
    expect(host.querySelectorAll('li')).toHaveLength(3);
  } finally {
    await act(() => root.unmount());
    host.remove();
    usePreferencesStore.setState({ locale: 'en' });
  }
});
