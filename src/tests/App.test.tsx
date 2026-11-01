import { usePreferencesStore } from '../stores/preferencesStore';
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { gameCenter } from '../services/gameCenter/gameCenter';
import type { GameCenterSnapshot } from '../services/gameCenter/types';
import { useAppStore } from '../stores/appStore';
import { useProgressStore } from '../stores/progressStore';
import { emptyProgress } from '../services/progress/progress';
import type { GameOptions } from '../game/core/GameOptions';

const mocks = vi.hoisted(() => ({ create: vi.fn(), destroy: vi.fn() }));
vi.mock('../game/core/Game', () => ({ createGame: mocks.create }));
let host: HTMLDivElement;
let root: Root;
let options: GameOptions;
let now: number;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.history.replaceState({}, '', '/');
  usePreferencesStore.setState({ locale: 'en', touchMode: 'gestures' });
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  useAppStore.setState(useAppStore.getInitialState());
  useProgressStore.setState({ progress: emptyProgress(), storageStatus: 'ok' });
  mocks.create.mockImplementation(
    (_parent: HTMLElement, ready: () => void, opts: GameOptions) => {
      options = opts;
      options.run?.start('water');
      ready();
      return { destroy: mocks.destroy };
    },
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  window.history.replaceState({}, '', '/');
});
async function mount() {
  await act(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
  await act(() => vi.dynamicImportSettled());
}
async function click(text: string) {
  const button = [...host.querySelectorAll('button')].find(
    (item) =>
      item.textContent === text || item.getAttribute('aria-label') === text,
  );
  expect(button).toBeDefined();
  await act(() => button!.click());
  await act(() => vi.dynamicImportSettled());
}

it('shows the real artwork and only ten Earth map entries, without element buttons', async () => {
  await mount();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(
    host.querySelector('img[alt="Veylith"]')?.getAttribute('src'),
  ).toContain('veylith_logo.png');
  await click('Level select');
  expect(host.querySelectorAll('.level-card')).toHaveLength(10);
  expect(host.querySelector('[data-level-id="puzzle"]')).toBeNull();
  expect(host.querySelector('[data-level-id="forest"]')).toBeNull();
  await click('1. The Sealed Door');
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[aria-label="Choose element"]')).toBeNull();
  expect(host.querySelector('[aria-label="Jump"]')).not.toBeNull();
});

it('pauses/resumes the same run, completes once, unlocks next and restarts through typed input', async () => {
  await mount();
  await click('Play');
  now = 5_000;
  await click('Pause');
  expect(host.querySelector('[role="dialog"]')?.textContent).toContain(
    'Paused',
  );
  expect(host.querySelector('[aria-label="Jump"]')).toBeNull();
  now = 65_000;
  await click('Continue');
  now = 70_000;
  await act(() => options.run?.complete());
  expect(host.textContent).toContain('Level complete!');
  expect(host.textContent).toContain('0:10.0');
  expect(useProgressStore.getState().progress.coins).toBe(100);
  await act(() => options.run?.complete());
  expect(useProgressStore.getState().progress.coins).toBe(100);
  await click('Restart');
  expect(options.input?.read().restartPressed).toBe(true);
  expect(options.run?.getSnapshot().phase).toBe('loading');
  await act(() => options.run?.start('water'));
  expect(options.run?.getSnapshot().elapsedMs).toBe(0);
  now += 1000;
  await act(() => options.run?.complete());
  expect(host.textContent).toContain('+0 coins');
  await click('Next level');
  expect(options.level).toBe('forest-2');
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
});

it('returns to the menu, continues the saved level, and falls back when menu artwork fails', async () => {
  await mount();
  const logo = host.querySelector('img[alt="Veylith"]')!;
  await act(() => logo.dispatchEvent(new Event('error')));
  expect(host.querySelector('h1')?.textContent).toBe('Veylith');
  await click('Play');
  now = 200_000;
  await act(() => options.run?.complete());
  await click('Main menu');
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
  await click('Continue');
  expect(options.level).toBe('forest-2');
});

it('does not let a direct level URL bypass progression', async () => {
  window.history.replaceState({}, '', '/?level=puzzle');
  await mount();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(host.querySelector('[aria-label="Main menu"]')).not.toBeNull();
});

it('changes options instantly, preserves progress and pauses only the playing run while settings are open', async () => {
  await mount();
  await click('Play');
  now = 2000;
  options.input?.dispatch({ type: 'move_right', phase: 'pressed' }, 'test');
  const saved = useProgressStore.getState().progress;
  await click('Options');
  expect(options.run?.getSnapshot().phase).toBe('paused');
  expect(options.input?.read().direction).toBe(0);
  expect(host.querySelector('[inert]')).not.toBeNull();
  const select = host.querySelector<HTMLSelectElement>(
    '[aria-label="Language"]',
  )!;
  await act(() => {
    select.value = 'es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(document.documentElement.lang).toBe('es');
  expect(host.querySelector('[role="dialog"]')?.textContent).toContain(
    'Opciones',
  );
  await click('Silenciar');
  expect(useAppStore.getState().audioEnabled).toBe(false);
  const slider = host.querySelector<HTMLInputElement>(
    '[aria-label="Volumen del juego"]',
  )!;
  await act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(slider, '0.35');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(useAppStore.getState().audioVolume).toBe(0.35);
  now = 62000;
  await click('Cerrar opciones');
  expect(options.run?.getSnapshot().phase).toBe('playing');
  expect(options.run?.getSnapshot().elapsedMs).toBe(2000);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(useProgressStore.getState().progress).toBe(saved);
  await click('Pausar');
  await click('Opciones');
  await click('Cerrar opciones');
  expect(options.run?.getSnapshot().phase).toBe('paused');
  expect(host.querySelector('[role="dialog"]')?.textContent).toContain(
    'En pausa',
  );
});

it('returns keyboard focus from menu options and traps Tab inside them', async () => {
  await mount();
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Options"]',
  )!;
  trigger.focus();
  await click('Options');
  const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
  const controls = [
    ...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
    ),
  ];
  controls.at(-1)!.focus();
  await act(() =>
    controls.at(-1)!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(document.activeElement).toBe(controls[0]);
  await act(() =>
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ),
  );
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(mocks.create).not.toHaveBeenCalled();
});

it('does not swallow a HUD restart when active button controls unmount', async () => {
  await mount();
  await click('Play');
  await click('Restart level');
  expect(options.run?.getSnapshot().phase).toBe('loading');
  expect(options.input?.read().restartPressed).toBe(true);
  expect(options.input?.read().restartPressed).toBe(false);
});

it('provides accessible external privacy/support links without replacing the game', async () => {
  await mount();
  await click('Options');
  const links = [
    ...host.querySelectorAll<HTMLAnchorElement>('.release-links a'),
  ];
  expect(links.map((link) => link.href)).toEqual([
    'https://veylith.francismartinez.com/privacy',
    'https://veylith.francismartinez.com/support',
  ]);
  expect(
    links.every(
      (link) => link.target === '_blank' && link.rel.includes('noopener'),
    ),
  ).toBe(true);
  expect(host.textContent).toContain(
    'Game Center is available in the iPhone app.',
  );
});

it('pauses native overlay gameplay and never resumes automatically after dashboard dismissal', async () => {
  let snapshot: GameCenterSnapshot = {
    available: true,
    authenticated: true,
    playerId: 'A',
    busy: false,
    uiActive: false,
    notice: 'none',
  };
  const listeners = new Set<() => void>();
  vi.spyOn(gameCenter, 'getSnapshot').mockImplementation(() => snapshot);
  vi.spyOn(gameCenter, 'subscribe').mockImplementation((listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  });
  await mount();
  await click('Play');
  now = 1000;
  await click('Options');
  expect(options.run?.getSnapshot().phase).toBe('paused');
  await act(() => {
    snapshot = { ...snapshot, uiActive: true };
    listeners.forEach((listener) => listener());
  });
  now = 12000;
  await act(() => {
    snapshot = { ...snapshot, uiActive: false };
    listeners.forEach((listener) => listener());
  });
  await click('Close options');
  expect(options.run?.getSnapshot().phase).toBe('paused');
  await click('Continue');
  expect(options.run?.getSnapshot().elapsedMs).toBe(1000);
});

it('shows bundled licenses as inert text inside options and keeps the focus trap usable', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('MIT License\n<script>not executed</script>'),
  );
  await mount();
  await click('Options');
  await click('Third-party licenses');
  await act(() => Promise.resolve());
  expect(host.querySelector('.license-notices pre')?.textContent).toContain(
    '<script>not executed</script>',
  );
  expect(host.querySelector('.license-notices script')).toBeNull();
  expect(globalThis.fetch).toHaveBeenCalledWith(
    `${import.meta.env.BASE_URL}third-party-notices.txt`,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  await click('Third-party licenses');
  expect(host.querySelector('.license-notices pre')).toBeNull();
});
