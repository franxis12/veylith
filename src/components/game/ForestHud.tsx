import { useTranslation } from '../../services/i18n/useTranslation';
import type { MouseEvent } from 'react';
import type { ForestSnapshot } from '../../game/levels/ancientForest/ForestState';
import type { ActionState } from '../../game/systems/input/ActionState';

const HINTS = {
  arrival:
    'Explora las cornisas y salta el pequeño precipicio hacia la derecha.',
  fire: 'Recoge la gema de Fuego: salta y vuelve a pulsar cerca del punto más alto para subir a la cornisa.',
  glide:
    'Desde la cornisa alta: recoge la gema de Aire, salta a la derecha y mantén Jump hasta las ruinas.',
  ruins:
    'El bloque, depósito y puerta están inactivos. Avanza hasta el portal de salida.',
} as const;

export function ForestHud({
  snapshot,
  actions,
}: {
  snapshot: ForestSnapshot;
  actions: ActionState;
}) {
  const { t } = useTranslation();
  const restart = (event: MouseEvent<HTMLButtonElement>): void => {
    event.currentTarget.blur();
    actions.dispatch(
      { type: 'restart_level', phase: 'pressed' },
      'restart-button',
    );
  };
  return (
    <>
      <div className="puzzle-hud forest-hud">
        <strong>{t('Ancient Forest · Bosque de los Orígenes')}</strong>
        <p role="status">
          {snapshot.phase === 'complete'
            ? t('Has llegado al portal de salida.')
            : t(HINTS[snapshot.section])}
        </p>
        <small>
          {t('← → / A D · Espacio: saltar / planear · Gemas: cambiar elemento')}
        </small>
      </div>
      <button
        className="puzzle-restart"
        type="button"
        onClick={restart}
        aria-label={t('Reiniciar nivel')}
      >
        {t('Reiniciar')} <span>R</span>
      </button>
      {snapshot.phase === 'complete' && (
        <div className="puzzle-complete" role="status">
          <strong>{t('¡Bosque completado!')}</strong>
          <p>{t('Has llegado al final de Ancient Forest.')}</p>
          <button type="button" onClick={restart}>
            {t('Volver a jugar')}
          </button>
        </div>
      )}
    </>
  );
}
