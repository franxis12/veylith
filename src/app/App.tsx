import { gameCenter } from '../services/gameCenter/gameCenter';
import { bindRankedRun } from '../services/gameCenter/bindRun';
import { observeAppActivity } from '../services/lifecycle/observeAppActivity';
import { uiAudio } from '../services/audio/gameAudio';
import { OptionsMenu } from '../components/ui/OptionsMenu';
import { useTranslation } from '../services/i18n/useTranslation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameCanvas } from '../components/game/GameCanvas';
import { WorldControls } from '../components/game/WorldControls';
import { RunHud } from '../components/game/RunHud';
import { MainMenu, LevelSelect } from '../components/ui/MenuScreens';
import { ArtButton } from '../components/ui/Art';
import { useAppStore } from '../stores/appStore';
import { useProgressStore } from '../stores/progressStore';
import { RunSession } from '../game/session/RunSession';
import { ActionState } from '../game/systems/input/ActionState';
import { LevelProgress } from '../game/levels/LevelProgress';
import type { LevelId } from '../game/levels/levelSelection';
import { isCampaignLevel } from '../game/levels/catalog';
import type { CampaignLevelId } from '../game/levels/catalog';
import { isUnlocked } from '../services/progress/progress';
import '../components/ui/ui.css';

type Session = ReturnType<typeof createSession>;
function createSession(level: LevelId) {
  const session = {
    level,
    actions: new ActionState(),
    progress: new LevelProgress(),
    run: new RunSession(
      isCampaignLevel(level)
        ? (elapsedMs, collectedCoinIds) =>
            useProgressStore
              .getState()
              .complete(level, elapsedMs, collectedCoinIds)
        : undefined,
    ),
  };
  if (isCampaignLevel(level)) bindRankedRun(session.run, level, gameCenter);
  return session;
}
function initialSession(): Session | null {
  const params = new URLSearchParams(window.location.search);
  if (
    import.meta.env.DEV &&
    (params.get('preview') === 'characters' || params.get('level') === 'test')
  )
    return createSession('test');
  const requested = params.get('level');
  return isCampaignLevel(requested) &&
    isUnlocked(useProgressStore.getState().progress, requested)
    ? createSession(requested)
    : null;
}

export function App() {
  const { locale, t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const resumeAfterOptions = useRef(false);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const initialization = useAppStore((state) => state.initialization);
  const error = useAppStore((state) => state.initializationError);
  const saved = useProgressStore((state) => state.progress);
  const storageStatus = useProgressStore((state) => state.storageStatus);
  const [session, setSession] = useState(initialSession);
  const gameCenterState = useSyncExternalStore(
    gameCenter.subscribe,
    gameCenter.getSnapshot,
  );
  useEffect(() => {
    void gameCenter.initialize();
    return observeAppActivity((active) => {
      if (active) void gameCenter.refresh();
    });
  }, []);
  useEffect(() => {
    if (!gameCenterState.uiActive || !session) return;
    session.actions.reset();
    session.run.pause();
    // Native overlays never resume a run automatically.
    resumeAfterOptions.current = false;
  }, [gameCenterState.uiActive, session]);
  const [screen, setScreen] = useState<'menu' | 'levels'>('menu');
  const [generation, setGeneration] = useState(0);
  const [preview] = useState(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('preview') ===
        'characters',
  );
  useEffect(() => {
    useAppStore.getState().setScreen(session ? 'game' : screen);
  }, [session, screen]);
  const openOptions = () => {
    resumeAfterOptions.current = session?.run.getSnapshot().phase === 'playing';
    session?.actions.reset();
    if (resumeAfterOptions.current) session?.run.pause();
    uiAudio.play('ui_confirm');
    setOptionsOpen(true);
  };
  const closeOptions = () => {
    setOptionsOpen(false);
    session?.actions.reset();
    if (resumeAfterOptions.current) session?.run.resume();
    resumeAfterOptions.current = false;
    uiAudio.play('ui_back');
  };
  const start = (level: CampaignLevelId) => {
    if (!useProgressStore.getState().selectLevel(level)) return;
    uiAudio.play('ui_confirm');
    session?.run.dispose();
    setSession(createSession(level));
    setGeneration((value) => value + 1);
  };
  const leave = (destination: 'menu' | 'levels') => {
    uiAudio.play('ui_back');
    session?.run.dispose();
    setSession(null);
    setScreen(destination);
  };
  const retry = () => {
    if (!session) return;
    if (initialization === 'error') {
      setSession(createSession(session.level));
      setGeneration((value) => value + 1);
      return;
    }
    session.actions.reset();
    session.run.retry();
    session.actions.dispatch(
      { type: 'restart_level', phase: 'pressed' },
      'retry',
    );
  };
  return (
    <main className="app-shell" aria-label="Veylith">
      <div
        className="app-content"
        style={{ display: 'contents' }}
        inert={optionsOpen}
      >
        {session ? (
          <>
            <GameCanvas
              key={generation}
              level={session.level}
              actions={session.actions}
              progress={session.progress}
              run={session.run}
            />
            {!preview && (
              <SessionInterface
                session={session}
                onRestart={retry}
                onMenu={() => leave('menu')}
                onLevels={() => leave('levels')}
                onNext={start}
                onOptions={openOptions}
                optionsOpen={optionsOpen}
              />
            )}
            {initialization !== 'ready' && (
              <div className="loading-screen" role="status">
                <p>
                  {initialization === 'error'
                    ? t('No se pudo iniciar: {error}', {
                        error: error ?? t('Vuelve a intentarlo.'),
                      })
                    : t('Preparando Veylith…')}
                </p>
                {initialization === 'error' && (
                  <ArtButton onClick={retry}>{t('Reintentar')}</ArtButton>
                )}
                <ArtButton kind="main_menu" onClick={() => leave('menu')}>
                  {t('Menú principal')}
                </ArtButton>
              </div>
            )}
          </>
        ) : screen === 'menu' ? (
          <MainMenu
            progress={saved}
            onOptions={openOptions}
            onPlay={start}
            onLevels={() => {
              uiAudio.play('ui_confirm');
              setScreen('levels');
            }}
          />
        ) : (
          <LevelSelect
            progress={saved}
            onOptions={openOptions}
            onPlay={start}
            onBack={() => {
              uiAudio.play('ui_back');
              setScreen('menu');
            }}
          />
        )}
        {storageStatus !== 'ok' && (
          <p className="storage-notice" role="status">
            {storageStatus === 'future'
              ? t(
                  'Guardado de una versión más reciente: se conserva sin cambios. Esta sesión no se guardará.',
                )
              : storageStatus === 'recovered'
                ? t(
                    'No se pudo leer el progreso. Se conservó una copia y se inició un registro nuevo.',
                  )
                : t(
                    'El progreso se conserva en esta sesión, pero este dispositivo no permite guardarlo.',
                  )}
          </p>
        )}
        <p className="orientation-notice">
          {t('Gira el dispositivo para jugar en horizontal.')}
        </p>
      </div>
      {optionsOpen && <OptionsMenu onClose={closeOptions} />}
    </main>
  );
}

function SessionInterface({
  session,
  ...callbacks
}: {
  session: Session;
  onRestart: () => void;
  onMenu: () => void;
  onLevels: () => void;
  onNext: (id: CampaignLevelId) => void;
  onOptions: () => void;
  optionsOpen: boolean;
}) {
  const snapshot = useSyncExternalStore(
    session.run.subscribe,
    session.run.getSnapshot,
  );
  return (
    <>
      {snapshot.phase === 'playing' && (
        <WorldControls actions={session.actions} progress={session.progress} />
      )}
      <RunHud
        run={session.run}
        level={session.level}
        progress={session.progress}
        {...callbacks}
      />
    </>
  );
}
