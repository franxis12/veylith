import { PuzzleHints } from './PuzzleHints';
import { OptionsButton } from '../ui/OptionsMenu';
import { useTranslation } from '../../services/i18n/useTranslation';
import { uiAudio } from '../../services/audio/gameAudio';
import { formatTime } from '../ui/formatTime';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { nextCampaignLevel, campaignLevel } from '../../game/levels/catalog';
import type { LevelId } from '../../game/levels/levelSelection';
import type { LevelProgress } from '../../game/levels/LevelProgress';
import type { RunSession } from '../../game/session/RunSession';
import { Art, ArtButton, Coins, Stars } from '../ui/Art';
import { UI } from '../ui/assets';
import { SpriteAnimation } from '../ui/SpriteAnimation';
import { useProgressStore } from '../../stores/progressStore';
import type { CampaignLevelId } from '../../game/levels/catalog';

const ELEMENT_NAMES = {
  water: 'Agua',
  fire: 'Fuego',
  air: 'Aire',
  earth: 'Tierra',
} as const;

export function RunHud({
  run,
  level,
  progress,
  onRestart,
  onMenu,
  onLevels,
  onNext,
  onOptions,
  optionsOpen = false,
}: {
  run: RunSession;
  level: LevelId;
  progress: LevelProgress;
  onRestart: () => void;
  onMenu: () => void;
  onLevels: () => void;
  onNext: (id: CampaignLevelId) => void;
  onOptions?: () => void;
  optionsOpen?: boolean;
}) {
  const { t, content } = useTranslation();
  const snapshot = useSyncExternalStore(run.subscribe, run.getSnapshot);
  const world = useSyncExternalStore(progress.subscribe, progress.getSnapshot);
  const saved = useProgressStore((state) => state.progress);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { phase, result } = snapshot;
  const overlay = !optionsOpen && (phase === 'paused' || phase === 'complete');
  useEffect(() => {
    if (overlay) dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (optionsOpen) return;
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        if (phase === 'playing') {
          uiAudio.play('ui_pause');
          run.pause();
        } else if (phase === 'paused') {
          uiAudio.play('ui_resume');
          run.resume();
        }
      }
      if (event.key === 'Tab' && overlay && dialogRef.current) {
        const controls = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), summary, input:not(:disabled)',
          ),
        ].filter((control) => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialogRef.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [overlay, phase, run, optionsOpen]);
  const title =
    level === 'test'
      ? t('Prueba de movimiento')
      : content(campaignLevel(level).title);
  const best = level === 'test' ? undefined : saved.levels[level]?.bestTimeMs;
  const next = level === 'test' ? undefined : nextCampaignLevel(level);
  return (
    <>
      {phase === 'playing' && (
        <div className="run-hud">
          <div className="run-topbar">
            <div className="run-level">
              <strong>{title}</strong>
              <small>
                {best === undefined
                  ? t('Primer recorrido')
                  : t('Mejor: {time}', { time: formatTime(best) })}
              </small>
            </div>
            <div className="timer-chip" aria-label={t('Tiempo de juego')}>
              <Art src={UI.timer} />
              <time>
                <Art src={UI.stopwatch} className="ui-icon" />
                {formatTime(snapshot.elapsedMs)}
              </time>
            </div>
            <Coins amount={saved.coins} />
            {onOptions && <OptionsButton onClick={onOptions} />}
            <ArtButton
              className="round-button"
              kind="restart"
              aria-label={t('Reiniciar nivel')}
              onClick={onRestart}
            >
              <span className="icon-fallback">↻</span>
            </ArtButton>
            <ArtButton
              className="round-button"
              kind="pause"
              aria-label={t('Pausar')}
              onClick={() => {
                uiAudio.play('ui_pause');
                run.pause();
              }}
            >
              <span className="icon-fallback">Ⅱ</span>
            </ArtButton>
          </div>
          <div className={`element-indicator element-${snapshot.element}`}>
            <Art src={UI.element} />
            <span>{t(ELEMENT_NAMES[snapshot.element])}</span>
          </div>
          {world && 'kind' in world && world.kind === 'forest-puzzle' && (
            <div className="gate-status forest-objective">
              {world.hints ? (
                <PuzzleHints
                  key={level}
                  brief={world.hint}
                  hints={world.hints}
                />
              ) : (
                <span role="status">
                  {world.solved}/{world.total} · {content(world.hint)}
                </span>
              )}
              {world.coinTotal > 0 && (
                <span aria-label={t('Monedas recogidas')}>
                  {' '}
                  ·{' '}
                  {t('Monedas del recorrido: {value} / {total}', {
                    value: world.coinValue,
                    total: world.coinTotal,
                  })}
                </span>
              )}
            </div>
          )}
          {world && !('kind' in world) && (
            <p className="gate-status" role="status">
              {world.phase === 'open'
                ? t('Puerta abierta · {seconds} s', {
                    seconds: world.secondsLeft,
                  })
                : world.activated
                  ? t('Puerta cerrada')
                  : t('Placa de Tierra')}
            </p>
          )}
        </div>
      )}
      {overlay && (
        <div className="modal-backdrop">
          <div
            className={`run-dialog${phase === 'paused' ? ' run-dialog--paused' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="run-title"
            tabIndex={-1}
            ref={dialogRef}
          >
            <Art
              src={phase === 'complete' ? UI.victoryPanel : UI.pausePanel}
              className="panel-art"
            />
            <div className="dialog-content">
              <h2 id="run-title">
                {phase === 'complete' ? t('¡Nivel completado!') : t('En pausa')}
              </h2>
              <p className="dialog-level">{title}</p>
              {phase === 'complete' && result ? (
                <>
                  <div className="victory-celebration">
                    <Art src={UI.victoryGlow} className="victory-glow" />
                    <Stars count={result.stars} animated />
                  </div>
                  <div className="result-times">
                    <span>
                      {t('Tiempo')}{' '}
                      <strong>{formatTime(result.elapsedMs)}</strong>
                    </span>
                    <span>
                      <Art src={UI.bestTime} className="ui-icon" />
                      {t('Mejor')}{' '}
                      <strong>{formatTime(result.bestTimeMs)}</strong>
                    </span>
                  </div>
                  <p className="record-status">
                    {result.newRecord && (
                      <Art src={UI.record} className="record-ribbon" />
                    )}
                    {result.newRecord && (
                      <SpriteAnimation
                        clip="record"
                        className="record-sparkle"
                        delayMs={850}
                      />
                    )}
                    {result.newRecord
                      ? t('¡Nuevo récord!')
                      : t('Recorrido completado')}
                  </p>
                  <div className="reward-chip">
                    <Art src={UI.reward} />
                    <span className="reward-content">
                      {result.earnedCoins > 0 && (
                        <SpriteAnimation
                          clip="coinSpin"
                          className="reward-coin"
                          delayMs={1100}
                          fallback={<Art src={UI.goldenCoin} />}
                        />
                      )}
                      <span>
                        {t('+{amount} monedas', { amount: result.earnedCoins })}
                      </span>
                    </span>
                    {result.earnedCoins > 0 && (
                      <SpriteAnimation
                        clip="rewardSparkle"
                        className="reward-sparkle"
                        delayMs={1200}
                      />
                    )}
                  </div>
                  <p className="reward-note">
                    {result.earnedCoins === 0
                      ? t(
                          'Recompensa ya obtenida. Mejora tus estrellas o encuentra monedas pendientes para ganar más.',
                        )
                      : t('Total: {amount} monedas', { amount: saved.coins })}
                  </p>
                </>
              ) : (
                <p className="pause-time">
                  {t('Tiempo: {time}', {
                    time: formatTime(snapshot.elapsedMs),
                  })}
                </p>
              )}
              {onOptions && <OptionsButton onClick={onOptions} />}
              <div className="dialog-actions">
                {phase === 'paused' && (
                  <ArtButton
                    onClick={() => {
                      uiAudio.play('ui_resume');
                      run.resume();
                    }}
                  >
                    <Art src={UI.resume} className="ui-icon" />
                    {t('Continuar')}
                  </ArtButton>
                )}
                {phase === 'complete' && next && (
                  <ArtButton kind="next_level" onClick={() => onNext(next.id)}>
                    {t('Siguiente nivel')}
                  </ArtButton>
                )}
                <ArtButton kind="retry" onClick={onRestart}>
                  {t('Reiniciar')}
                </ArtButton>
                <ArtButton kind="level_selection" onClick={onLevels}>
                  {t('Niveles')}
                </ArtButton>
                <ArtButton kind="main_menu" onClick={onMenu}>
                  {t('Menú principal')}
                </ArtButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
