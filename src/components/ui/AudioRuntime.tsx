import { useEffect } from 'react';
import { gameAudio, uiAudio } from '../../services/audio/gameAudio';
import { UI_SOUNDS } from '../../services/audio/catalog';
import { useAppStore } from '../../stores/appStore';
import { observeAppActivity } from '../../services/lifecycle/observeAppActivity';

/** One app-level owner, including editor playtest. StrictMode cleanup removes every listener. */
export function AudioRuntime() {
  useEffect(() => {
    const configure = () => {
      const s = useAppStore.getState();
      gameAudio.configure(s.audioEnabled, s.audioVolume);
    };
    configure();
    const unsubscribe = useAppStore.subscribe(configure);
    const unlock = () => {
      gameAudio.unlock();
      uiAudio.preload(UI_SOUNDS);
    };
    const blur = () => gameAudio.setForeground(false);
    const focus = () => gameAudio.setForeground(!document.hidden);
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    const activity = observeAppActivity((active) =>
      gameAudio.setForeground(active),
    );
    return () => {
      unsubscribe();
      activity();
      gameAudio.setForeground(false);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
    };
  }, []);
  return null;
}
