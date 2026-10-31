import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Stars } from '../components/ui/Art';
import { SpriteAnimation } from '../components/ui/SpriteAnimation';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

it('reveals only earned stars and keeps the rating accessible during playback', async () => {
  await act(() => root.render(<Stars count={2} animated />));
  expect(host.querySelectorAll('[data-clip="starUnlock"]')).toHaveLength(2);
  expect(host.querySelectorAll('.star-slot')).toHaveLength(3);
  expect(host.querySelector('[aria-label="2 of 3 stars"]')).not.toBeNull();
  expect(
    host.querySelector('.star-slot:last-child img')?.getAttribute('src'),
  ).toContain('star_empty.png');
  expect(host.querySelectorAll('.sprite-ready')).toHaveLength(0);
  await act(() => {
    for (const strip of host.querySelectorAll('.sprite-strip'))
      strip.dispatchEvent(new Event('load'));
  });
  expect(host.querySelectorAll('.sprite-ready')).toHaveLength(2);
  await act(() => {
    for (const strip of host.querySelectorAll('.sprite-strip'))
      strip.dispatchEvent(new Event('animationend', { bubbles: true }));
  });
  expect(host.querySelectorAll('.sprite-strip')).toHaveLength(0);
  expect(host.querySelectorAll('img[src$="star_filled.png"]')).toHaveLength(2);
});

it('retains the earned star and removes optional effects when a strip is unavailable', async () => {
  await act(() =>
    root.render(
      <>
        <Stars count={1} animated />
        <SpriteAnimation clip="record" />
      </>,
    ),
  );
  await act(() => {
    for (const strip of host.querySelectorAll('.sprite-strip'))
      strip.dispatchEvent(new Event('error'));
  });
  expect(host.querySelector('img[src$="star_filled.png"]')).not.toBeNull();
  expect(host.querySelectorAll('.sprite-strip')).toHaveLength(0);
  expect(host.querySelector('[data-clip="record"]')?.textContent).toBe('');
});

it('does not request unlock animations for unearned stars and starts fresh after leaving', async () => {
  await act(() => root.render(<Stars count={0} animated />));
  expect(host.querySelectorAll('.sprite-strip')).toHaveLength(0);
  await act(() => root.render(<Stars count={3} animated />));
  const strip = host.querySelector('.sprite-strip')!;
  await act(() => strip.dispatchEvent(new Event('load')));
  await act(() =>
    strip.dispatchEvent(new Event('animationend', { bubbles: true })),
  );
  expect(host.querySelectorAll('.sprite-settled')).toHaveLength(1);
  await act(() => root.render(null));
  await act(() => root.render(<Stars count={3} animated />));
  expect(host.querySelectorAll('.sprite-loading')).toHaveLength(3);
});
