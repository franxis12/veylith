import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useTranslation } from '../../services/i18n/useTranslation';
import { GestureControls } from './GestureControls';
import { ButtonSkin } from '../ui/Art';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ActionState } from '../../game/systems/input/ActionState';
import './gameplay-controls.css';

type Hold = 'move_left' | 'move_right' | 'jump' | 'use_ability';

function HoldButton({
  actions,
  action,
  label,
  children,
}: {
  actions: ActionState;
  action: Hold;
  label: string;
  children: React.ReactNode;
}) {
  const sources = useRef(new Set<string>());
  const [held, setHeld] = useState(false);
  const send = (phase: 'pressed' | 'released', source: string) => {
    if (phase === 'pressed') sources.current.add(source);
    else sources.current.delete(source);
    actions.dispatch({ type: action, phase }, source);
    setHeld(sources.current.size > 0);
  };
  useEffect(() => {
    const held = sources.current;
    const clear = () => {
      for (const source of held)
        actions.dispatch({ type: action, phase: 'released' }, source);
      held.clear();
      setHeld(false);
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [actions, action]);
  const pointer = (
    event: PointerEvent<HTMLButtonElement>,
    phase: 'pressed' | 'released',
  ): void => {
    if (phase === 'pressed') {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    send(phase, `pointer:${event.pointerId}`);
  };
  const key = (
    event: KeyboardEvent<HTMLButtonElement>,
    phase: 'pressed' | 'released',
  ): void => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) send(phase, `button:${action}`);
  };
  return (
    <button
      type="button"
      className="art-button touch-button"
      data-held={held}
      data-action={action}
      aria-label={label}
      onPointerDown={(event) => pointer(event, 'pressed')}
      onPointerUp={(event) => pointer(event, 'released')}
      onPointerCancel={(event) => pointer(event, 'released')}
      onLostPointerCapture={(event) => pointer(event, 'released')}
      onKeyDown={(event) => key(event, 'pressed')}
      onKeyUp={(event) => key(event, 'released')}
      onBlur={() => send('released', `button:${action}`)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="touch-fallback">{children}</span>
      <ButtonSkin kind={action === 'use_ability' ? 'ability' : action} />
    </button>
  );
}

function subscribeTouch(callback: () => void) {
  const media = window.matchMedia('(any-pointer: coarse)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const isTouch = () =>
  window.matchMedia('(any-pointer: coarse)').matches ||
  navigator.maxTouchPoints > 0;
export function GameplayControls({
  actions,
  forceButtons = false,
  reflectorActive = false,
}: {
  actions: ActionState;
  forceButtons?: boolean;
  reflectorActive?: boolean;
}) {
  const mode = usePreferencesStore((state) => state.touchMode);
  const touch = useSyncExternalStore(subscribeTouch, isTouch, () => false);
  return touch && mode === 'gestures' && !forceButtons ? (
    <GestureControls actions={actions} />
  ) : (
    <ButtonControls actions={actions} reflectorActive={reflectorActive} />
  );
}
function ButtonControls({
  actions,
  reflectorActive,
}: {
  actions: ActionState;
  reflectorActive: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="gameplay-controls"
      data-reflector-active={reflectorActive}
      aria-label={t('Controles del juego')}
    >
      <div
        className="movement-controls"
        role="group"
        aria-label={t('Movimiento')}
      >
        <HoldButton
          actions={actions}
          action="move_left"
          label={t('Mover a la izquierda')}
        >
          ←
        </HoldButton>
        <HoldButton
          actions={actions}
          action="move_right"
          label={t('Mover a la derecha')}
        >
          →
        </HoldButton>
      </div>
      <div
        className="ability-controls"
        role="group"
        aria-label={t('Salto y poderes')}
      >
        <HoldButton
          actions={actions}
          action="use_ability"
          label={t('Usar poder (E)')}
        >
          {t('Poder')}
        </HoldButton>
        <HoldButton actions={actions} action="jump" label={t('Saltar')}>
          {t('Saltar')}
        </HoldButton>
      </div>
    </div>
  );
}
