import type { Locale } from '../../stores/preferencesStore';
import { english } from './messages';
import type { Message } from './messages';
import { englishLevelText } from './levelText';
export type Replacements = Readonly<Record<string, string | number>>;
export function translate(
  locale: Locale,
  message: Message,
  values: Replacements = {},
): string {
  const text = locale === 'en' ? english[message] : message;
  return text.replace(/\{(\w+)\}/g, (original, key: string) =>
    String(values[key] ?? original),
  );
}
export function localizeContent(locale: Locale, source: string): string {
  if (locale === 'es') return source;
  const match = /^(.*?)( \(\d+\/\d+\))?$/.exec(source);
  const base = match?.[1] ?? source;
  return (englishLevelText[base] ?? base) + (match?.[2] ?? '');
}
