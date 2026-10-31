import { beforeEach, expect, it, vi } from 'vitest';
import { observeAppActivity } from '../services/lifecycle/observeAppActivity';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  addListener: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.addListener } }));

beforeEach(() => {
  mocks.isNativePlatform.mockReturnValue(false);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});

it('observes web visibility and stops publishing after disposal', () => {
  const onChange = vi.fn();
  const dispose = observeAppActivity(onChange);
  expect(onChange).toHaveBeenLastCalledWith(true);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(onChange).toHaveBeenLastCalledWith(false);
  dispose();
  onChange.mockClear();
  document.dispatchEvent(new Event('visibilitychange'));
  expect(onChange).not.toHaveBeenCalled();
  expect(mocks.addListener).not.toHaveBeenCalled();
});

it('removes a native listener even if registration finishes after disposal', async () => {
  mocks.isNativePlatform.mockReturnValue(true);
  const remove = vi.fn().mockResolvedValue(undefined);
  let resolveListener: ((value: { remove: typeof remove }) => void) | undefined;
  mocks.addListener.mockReturnValue(
    new Promise((resolve) => {
      resolveListener = resolve;
    }),
  );
  const onChange = vi.fn();
  const dispose = observeAppActivity(onChange);
  dispose();
  resolveListener?.({ remove });
  await Promise.resolve();
  expect(remove).toHaveBeenCalledTimes(1);
});
