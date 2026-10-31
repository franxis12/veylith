import { afterEach, expect, it, vi } from 'vitest';
import {
  LEVEL_DOCUMENTS,
  FOREST_PUZZLE_IDS,
} from '../game/levels/forestPuzzles/layouts';
import {
  readPreferences,
  usePreferencesStore,
  PREFERENCES_KEY,
} from '../stores/preferencesStore';
import { translate, localizeContent } from '../services/i18n/translate';
import { englishLevelText } from '../services/i18n/levelText';
import { localizeGameText } from '../services/i18n/localizeGameText';

afterEach(() => {
  usePreferencesStore.setState({ locale: 'en', touchMode: 'gestures' });
  localStorage.removeItem(PREFERENCES_KEY);
});
it('starts in English with gestures, persists valid choices and tolerates invalid/unavailable storage', () => {
  localStorage.removeItem(PREFERENCES_KEY);
  expect(readPreferences()).toEqual({ locale: 'en', touchMode: 'gestures' });
  usePreferencesStore.getState().setLocale('es');
  usePreferencesStore.getState().setTouchMode('buttons');
  expect(readPreferences()).toEqual({ locale: 'es', touchMode: 'buttons' });
  localStorage.setItem(PREFERENCES_KEY, '{broken');
  expect(readPreferences().locale).toBe('en');
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ version: 1, locale: 'xx', touchMode: 'xx' }),
  );
  expect(readPreferences()).toEqual({ locale: 'en', touchMode: 'gestures' });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('denied');
  });
  expect(readPreferences().locale).toBe('en');
  expect(() => usePreferencesStore.getState().setLocale('es')).not.toThrow();
  expect(usePreferencesStore.getState().locale).toBe('es');
});
it('translates every canonical campaign title, hint and sign without changing editable source data', () => {
  for (const id of FOREST_PUZZLE_IDS) {
    const doc = LEVEL_DOCUMENTS[id];
    const before = JSON.stringify(doc);
    const sources = [
      doc.name,
      ...(doc.puzzle ? [doc.puzzle.brief, ...doc.puzzle.hints] : []),
      ...doc.objects.flatMap((o) =>
        o.type === 'label' ? [o.text] : 'hint' in o ? [o.hint] : [],
      ),
    ];
    for (const source of sources.filter(Boolean)) {
      expect(englishLevelText[source], `${id}: ${source}`).toBeTruthy();
      expect(localizeContent('en', source)).not.toBe(source);
      expect(localizeContent('es', source)).toBe(source);
    }
    expect(JSON.stringify(doc)).toBe(before);
  }
  expect(localizeContent('en', 'My custom edited sign')).toBe(
    'My custom edited sign',
  );
  expect(
    localizeContent(
      'en',
      'Camina contra el bloque hasta encajarlo en la placa. (1/3)',
    ),
  ).toBe('Push the block until it fits onto the plate. (1/3)');
  expect(translate('en', 'Mejor: {time}', { time: '0:25.0' })).toBe(
    'Best: 0:25.0',
  );
});
it('updates existing world text immediately and unsubscribes when the text is destroyed', () => {
  let destroy = () => {};
  const view = {
    setText: vi.fn(),
    once: (_event: string, fn: () => void) => {
      destroy = fn;
    },
  };
  localizeGameText(view, 'SALIDA');
  expect(view.setText).toHaveBeenLastCalledWith('EXIT');
  usePreferencesStore.getState().setLocale('es');
  expect(view.setText).toHaveBeenLastCalledWith('SALIDA');
  destroy();
  view.setText.mockClear();
  usePreferencesStore.getState().setLocale('en');
  expect(view.setText).not.toHaveBeenCalled();
});
