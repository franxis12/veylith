import { usePreferencesStore } from '../../stores/preferencesStore';
import { localizeContent } from './translate';
/** Text-only subscription: no scene rebuild, physics changes or per-frame React state. */
export function localizeGameText<
  T extends {
    setText: (text: string) => unknown;
    once: (event: string, callback: () => void) => unknown;
  },
>(view: T, source: string): T {
  view.setText(localizeContent(usePreferencesStore.getState().locale, source));
  const unsubscribe = usePreferencesStore.subscribe((state, previous) => {
    if (state.locale !== previous.locale)
      view.setText(localizeContent(state.locale, source));
  });
  view.once('destroy', unsubscribe);
  return view;
}
