import { PuzzleHints } from '../components/game/PuzzleHints';
import { AudioSettings } from '../components/ui/AudioSettings';
import { uiAudio } from '../services/audio/gameAudio';
import { useState, useSyncExternalStore } from 'react';
import { GameCanvas } from '../components/game/GameCanvas';
import { WorldControls } from '../components/game/WorldControls';
import { ActionState } from '../game/systems/input/ActionState';
import { LevelProgress } from '../game/levels/LevelProgress';
import { RunSession } from '../game/session/RunSession';
import type { LevelDocument } from '../game/levels/schema/types';
import { useAppStore } from '../stores/appStore';
export function Playtest({
  document,
  onStop,
}: {
  document: LevelDocument;
  onStop: () => void;
}) {
  const [session] = useState(() => ({
    actions: new ActionState(),
    progress: new LevelProgress(),
    run: new RunSession(),
  }));
  const snapshot = useSyncExternalStore(
      session.run.subscribe,
      session.run.getSnapshot,
    ),
    world = useSyncExternalStore(
      session.progress.subscribe,
      session.progress.getSnapshot,
    );
  const initialization = useAppStore((s) => s.initialization),
    error = useAppStore((s) => s.initializationError);
  const retry = () => {
    session.run.retry();
    session.actions.reset();
    session.actions.dispatch(
      { type: 'restart_level', phase: 'pressed' },
      'editor-retry',
    );
  };
  const stars =
    snapshot.elapsedMs <= document.timer.threeStarsMs
      ? 3
      : snapshot.elapsedMs <= document.timer.twoStarsMs
        ? 2
        : 1;
  return (
    <div className="editor-playtest">
      <GameCanvas
        document={document}
        level="forest-1"
        actions={session.actions}
        progress={session.progress}
        run={session.run}
      />
      {snapshot.phase === 'playing' && (
        <WorldControls actions={session.actions} progress={session.progress} />
      )}
      <div className="playtest-bar">
        <AudioSettings />
        <button
          onClick={() => {
            uiAudio.play('ui_back');
            onStop();
          }}
        >
          ■ Detener y volver al editor
        </button>
        <button onClick={retry}>Reiniciar prueba</button>
        <button
          onClick={() =>
            snapshot.phase === 'paused'
              ? (uiAudio.play('ui_resume'), session.run.resume())
              : (uiAudio.play('ui_pause'), session.run.pause())
          }
        >
          {snapshot.phase === 'paused' ? 'Continuar' : 'Pausar'}
        </button>
        <span>
          {document.name} · {(snapshot.elapsedMs / 1000).toFixed(1)} s ·{' '}
          {snapshot.element}
        </span>
        {world && 'coinTotal' in world && world.coinTotal > 0 && (
          <span aria-label="Monedas recogidas">
            Monedas: {world.coinValue} / {world.coinTotal}
          </span>
        )}
        <span>
          {snapshot.phase === 'complete'
            ? `Completado · ${'★'.repeat(stars)}`
            : snapshot.phase === 'paused'
              ? 'En pausa'
              : initialization === 'error'
                ? error
                : initialization === 'loading'
                  ? 'Cargando…'
                  : ''}
        </span>
        <small className="playtest-note">
          Prueba sin guardar · No modifica progreso ni monedas
        </small>
      </div>
      {world && 'hint' in world && (
        <div className="playtest-hint">
          {'hints' in world && world.hints ? (
            <PuzzleHints brief={world.hint} hints={world.hints} />
          ) : (
            world.hint
          )}
        </div>
      )}
    </div>
  );
}
