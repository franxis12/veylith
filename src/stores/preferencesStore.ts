import { create } from 'zustand';

export type Locale = 'en' | 'es';
export type TouchMode = 'gestures' | 'buttons';
export const PREFERENCES_KEY = 'veylith.preferences.v1';
export interface Preferences {
  locale: Locale;
  touchMode: TouchMode;
}
const defaults: Preferences = { locale: 'en', touchMode: 'gestures' };
export function readPreferences(): Preferences {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? 'null',
    );
    if (
      data &&
      typeof data === 'object' &&
      'version' in data &&
      data.version === 1
    ) {
      return {
        locale: 'locale' in data && data.locale === 'es' ? 'es' : 'en',
        touchMode:
          'touchMode' in data && data.touchMode === 'buttons'
            ? 'buttons'
            : 'gestures',
      };
    }
  } catch {
    /* Use session preferences when storage is unavailable. */
  }
  return { ...defaults };
}
function save(preferences: Preferences): void {
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ version: 1, ...preferences }),
    );
  } catch {
    /* Changes still work for this session. */
  }
}
interface PreferencesState extends Preferences {
  setLocale: (locale: Locale) => void;
  setTouchMode: (touchMode: TouchMode) => void;
}
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...readPreferences(),
  setLocale: (locale) => {
    set({ locale });
    save({ locale, touchMode: get().touchMode });
  },
  setTouchMode: (touchMode) => {
    set({ touchMode });
    save({ locale: get().locale, touchMode });
  },
}));
