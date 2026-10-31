import { useTranslation } from '../../services/i18n/useTranslation';
import { useSyncExternalStore } from 'react';
import { ForestHud } from './ForestHud';
import type { MouseEvent } from 'react';
import type { LevelProgress } from '../../game/levels/LevelProgress';
import type { ActionState } from '../../game/systems/input/ActionState';

export function PuzzleHud({
  progress,
  actions,
}: {
  progress: LevelProgress;
  actions: ActionState;
}) {
  const { t, content } = useTranslation();
  const snapshot = useSyncExternalStore(
    progress.subscribe,
    progress.getSnapshot,
  );
  if (!snapshot)
    return (
      <p className="gameplay-help">
        {t(
          'A/D o ←/→ · Espacio: saltar · Gemas: cambiar elemento · Aire: mantener salto para planear · E: poder',
        )}
      </p>
    );
  if ('kind' in snapshot)
    return snapshot.kind === 'forest' ? (
      <ForestHud snapshot={snapshot} actions={actions} />
    ) : (
      <p className="gameplay-help" role="status">
        {content(snapshot.hint)}
      </p>
    );
  const restart = (event: MouseEvent<HTMLButtonElement>): void => {
    event.currentTarget.blur();
    actions.dispatch(
      { type: 'restart_level', phase: 'pressed' },
      'restart-button',
    );
  };
  const hint =
    snapshot.phase === 'complete'
      ? t('Llegaste a la salida.')
      : snapshot.phase === 'open'
        ? t('Puerta abierta · {seconds} s · ¡Cruza el hueco con Aire!', {
            seconds: snapshot.secondsLeft,
          })
        : snapshot.activated
          ? t('La puerta se cerró. Vuelve a la placa como Tierra.')
          : t(
              'Recoge Aire para subir y la gema de Tierra en la cornisa. Pisa la placa como Tierra.',
            );
  return (
    <>
      <div className="puzzle-hud">
        <strong>{t('01 · La puerta del viento')}</strong>
        <p role="status">{hint}</p>
        <small>
          {t(
            '← → / A D · Espacio: saltar / planear · Gemas: cambiar elemento · E: poder',
          )}
        </small>
      </div>
      <button
        className="puzzle-restart"
        type="button"
        onClick={restart}
        aria-label={t('Reiniciar puzle')}
      >
        {t('Reiniciar')} <span>R</span>
      </button>
      {snapshot.phase === 'complete' && (
        <div className="puzzle-complete" role="status">
          <strong>{t('¡Puzle resuelto!')}</strong>
          <p>{t('Has abierto la puerta del viento.')}</p>
          <button type="button" onClick={restart}>
            {t('Volver a jugar')}
          </button>
        </div>
      )}
    </>
  );
}
