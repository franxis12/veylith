import type { InputSource } from '../systems/input/actions';
import type { Element } from '../types/character';

const KEYS: Readonly<Record<string, Element>> = {
  Digit1: 'water',
  Digit2: 'fire',
  Digit3: 'air',
  Digit4: 'earth',
  Numpad1: 'water',
  Numpad2: 'fire',
  Numpad3: 'air',
  Numpad4: 'earth',
};

/** Development adapter only. No gameplay keyboard bindings are installed. */
export function elementPreviewKeyboard(target: Window): InputSource {
  return {
    connect(sink) {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.shiftKey
        )
          return;
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            'input, select, textarea, button, [contenteditable="true"]',
          )
        )
          return;
        const element = KEYS[event.code];
        if (!element) return;
        event.preventDefault();
        sink({ type: 'switch_element', phase: 'pressed', element });
      };
      target.addEventListener('keydown', onKeyDown);
      return () => target.removeEventListener('keydown', onKeyDown);
    },
  };
}
