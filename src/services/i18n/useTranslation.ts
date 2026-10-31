import { usePreferencesStore } from '../../stores/preferencesStore';
import { translate, localizeContent } from './translate';
import type { Replacements } from './translate';
import type { Message } from './messages';
export function useTranslation() {
  const locale = usePreferencesStore((state) => state.locale);
  return {
    locale,
    t: (message: Message, values?: Replacements) =>
      translate(locale, message, values),
    content: (source: string) => localizeContent(locale, source),
  };
}
