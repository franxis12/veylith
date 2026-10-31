import type { InputSource } from './actions';
import type { Element } from '../../types/character';

type Hold = 'move_left' | 'move_right' | 'jump' | 'use_ability';
const HOLDS: Readonly<Record<string, Hold>> = {
  ArrowLeft: 'move_left',
  KeyA: 'move_left',
  ArrowRight: 'move_right',
  KeyD: 'move_right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyE: 'use_ability',
  ShiftLeft: 'use_ability',
  ShiftRight: 'use_ability',
};
const ELEMENT_KEYS: Readonly<Record<string, Element>> = {
  Digit1: 'water',
  Digit2: 'fire',
  Digit3: 'air',
  Digit4: 'earth',
  Numpad1: 'water',
  Numpad2: 'fire',
  Numpad3: 'air',
  Numpad4: 'earth',
};

export function gameplayKeyboard(
  target: Window,
  developmentElements = false,
): InputSource {
  return {
    connect(sink) {
      const down = new Map<string, Hold>();
      const release = (): void => {
        for (const type of new Set(down.values()))
          sink({ type, phase: 'released' });
        down.clear();
      };
      const keydown = (event: KeyboardEvent): void => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target instanceof HTMLElement) {
          if (
            event.target.closest(
              'input, select, textarea, [contenteditable="true"]',
            )
          )
            return;
          if (event.code === 'Space' && event.target.closest('button, summary'))
            return;
        }
        const type = HOLDS[event.code];
        const element =
          import.meta.env.DEV && developmentElements
            ? ELEMENT_KEYS[event.code]
            : undefined;
        const restart = event.code === 'KeyR';
        if (!type && !element && !restart) return;
        event.preventDefault();
        if (event.repeat || down.has(event.code)) return;
        if (restart) sink({ type: 'restart_level', phase: 'pressed' });
        if (element)
          sink({ type: 'switch_element', phase: 'pressed', element });
        if (type) {
          const alreadyHeld = [...down.values()].includes(type);
          down.set(event.code, type);
          if (!alreadyHeld) sink({ type, phase: 'pressed' });
        }
      };
      const keyup = (event: KeyboardEvent): void => {
        const type = down.get(event.code);
        if (!type) return;
        down.delete(event.code);
        if (![...down.values()].includes(type))
          sink({ type, phase: 'released' });
      };
      const visibility = (): void => {
        if (target.document.hidden) release();
      };
      target.addEventListener('keydown', keydown);
      target.addEventListener('keyup', keyup);
      target.addEventListener('blur', release);
      target.document.addEventListener('visibilitychange', visibility);
      return () => {
        release();
        target.removeEventListener('keydown', keydown);
        target.removeEventListener('keyup', keyup);
        target.removeEventListener('blur', release);
        target.document.removeEventListener('visibilitychange', visibility);
      };
    },
  };
}
