import { useEffect, useState } from 'react';
import { TouchGestures } from '../../game/systems/input/TouchGestures';
import type { ActionState } from '../../game/systems/input/ActionState';
import { useTranslation } from '../../services/i18n/useTranslation';

export function GestureControls({ actions }: { actions: ActionState }) {
  const [gestures] = useState(() => new TouchGestures(actions));
  const { t } = useTranslation();
  useEffect(() => {
    const clear = () => gestures.cancelAll();
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      window.removeEventListener('resize', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [gestures]);
  return (
    <div className="gesture-controls" aria-label={t('Controles del juego')}>
      {(['left', 'right'] as const).map((side) => (
        <div
          key={side}
          className={`gesture-zone gesture-${side}`}
          data-gesture-zone={side}
          role="group"
          aria-label={
            side === 'left'
              ? t('Zona izquierda: desliza para moverte')
              : t('Zona derecha: desliza para saltar o toca para usar poder')
          }
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            if (
              gestures.down(
                event.pointerId,
                side,
                event.clientX,
                event.clientY,
                event.timeStamp,
              )
            )
              event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            event.preventDefault();
            gestures.move(event.pointerId, event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            gestures.up(
              event.pointerId,
              event.clientX,
              event.clientY,
              event.timeStamp,
            );
          }}
          onPointerCancel={(event) => gestures.cancel(event.pointerId)}
          onLostPointerCapture={(event) => gestures.cancel(event.pointerId)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="gesture-caption">
            {side === 'left'
              ? t('← Desliza para moverte →')
              : t('↑ Desliza: saltar · Toque: poder')}
          </span>
        </div>
      ))}
    </div>
  );
}
