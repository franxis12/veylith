import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameCanvas } from '../components/game/GameCanvas';
import { createGame } from '../game/core/Game';
import { useAppStore } from '../stores/appStore';

const mocks = vi.hoisted(() => ({ createGame: vi.fn(), destroy: vi.fn() }));
vi.mock('../game/core/Game', () => ({ createGame: mocks.createGame }));

let host: HTMLDivElement;
let root: Root;
let mounted: boolean;

beforeEach(() => {
  vi.stubEnv('DEV', false);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.createGame.mockReturnValue({ destroy: mocks.destroy });
  useAppStore.setState(useAppStore.getInitialState());
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  mounted = true;
});

afterEach(async () => {
  if (mounted) await act(() => root.unmount());
  host.remove();
  vi.unstubAllEnvs();
});

it('creates only one engine under StrictMode and keeps it across state updates', async () => {
  await act(async () => {
    root.render(
      <StrictMode>
        <GameCanvas />
      </StrictMode>,
    );
  });
  await act(() => vi.dynamicImportSettled());
  expect(createGame).toHaveBeenCalledTimes(1);
  expect(mocks.createGame.mock.calls[0]?.[0]).toBe(host.firstElementChild);

  await act(() => {
    useAppStore.getState().setAudioEnabled(false);
    root.render(
      <StrictMode>
        <GameCanvas />
      </StrictMode>,
    );
  });
  expect(mocks.createGame).toHaveBeenCalledTimes(1);
  expect(mocks.destroy).not.toHaveBeenCalled();
});

it('reports readiness through the boundary and destroys the engine on unmount', async () => {
  mocks.createGame.mockImplementation(
    (_container: HTMLElement, ready: () => void) => {
      ready();
      return { destroy: mocks.destroy };
    },
  );
  await act(() => root.render(<GameCanvas />));
  await act(() => vi.dynamicImportSettled());
  expect(useAppStore.getState().initialization).toBe('ready');
  await act(() => root.unmount());
  mounted = false;
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
  expect(useAppStore.getState().initialization).toBe('idle');
});

it('does not initialize after unmount while the engine import is pending', async () => {
  act(() => root.render(<GameCanvas />));
  act(() => root.unmount());
  mounted = false;
  await act(() => vi.dynamicImportSettled());
  expect(mocks.createGame).not.toHaveBeenCalled();
});

it('exposes an engine startup failure to the application', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.createGame.mockImplementation(() => {
    throw new Error('Renderer unavailable');
  });
  await act(() => root.render(<GameCanvas />));
  await act(() => vi.dynamicImportSettled());
  expect(useAppStore.getState().initialization).toBe('error');
});
