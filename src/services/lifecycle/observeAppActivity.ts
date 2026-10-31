import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

/** One subscription covers web visibility and native foreground/background state. */
export function observeAppActivity(
  onChange: (active: boolean) => void,
): () => void {
  let disposed = false;
  let nativeActive = true;
  let nativeListener: PluginListenerHandle | undefined;

  const notify = (): void => {
    if (!disposed) onChange(nativeActive && !document.hidden);
  };

  document.addEventListener('visibilitychange', notify);

  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      nativeActive = isActive;
      notify();
    })
      .then((listener) => {
        if (disposed) return listener.remove();
        nativeListener = listener;
      })
      .catch((error: unknown) =>
        console.error('Native lifecycle subscription failed:', error),
      );
  }

  notify();

  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', notify);
    void nativeListener?.remove();
  };
}
