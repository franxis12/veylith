import { create } from 'zustand';
import {
  readAudioPreferences,
  saveAudioPreferences,
} from '../services/audio/preferences';
import { APP_CONFIG } from '../app/config';

export type InitializationState = 'idle' | 'loading' | 'ready' | 'error';
export type AppScreen = 'menu' | 'levels' | 'game';

interface AppState {
  initialization: InitializationState;
  initializationError: string | null;
  currentScreen: AppScreen;
  audioEnabled: boolean;
  audioVolume: number;
  setInitialization: (state: InitializationState, error?: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setAudioVolume: (volume: number) => void;
  setScreen: (screen: AppScreen) => void;
}

const audio = readAudioPreferences();
export const useAppStore = create<AppState>((set, get) => ({
  initialization: 'idle',
  initializationError: null,
  currentScreen: APP_CONFIG.initialScreen,
  audioEnabled: audio.enabled,
  audioVolume: audio.volume,
  setInitialization: (initialization, error) =>
    set({ initialization, initializationError: error ?? null }),
  setAudioEnabled: (audioEnabled) => {
    set({ audioEnabled });
    saveAudioPreferences(audioEnabled, get().audioVolume);
  },
  setAudioVolume: (volume) => {
    const audioVolume = Math.max(
      0,
      Math.min(1, Number.isFinite(volume) ? volume : 0),
    );
    set({ audioVolume });
    saveAudioPreferences(get().audioEnabled, audioVolume);
  },
  setScreen: (currentScreen) => set({ currentScreen }),
}));
