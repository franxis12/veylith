import { useTranslation } from '../../services/i18n/useTranslation';
import type { LevelDocument } from '../../game/levels/schema/types';
import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react';
import type { GameHandle } from '../../game/core/Game';
import type { PreviewBridge } from '../../game/dev/previewBridge';
import { useAppStore } from '../../stores/appStore';
import { ActionState } from '../../game/systems/input/ActionState';
import type { RunSession } from '../../game/session/RunSession';
import { LevelProgress } from '../../game/levels/LevelProgress';
import { selectLevel } from '../../game/levels/levelSelection';
import type { LevelId } from '../../game/levels/levelSelection';

const PreviewPanel = import.meta.env.DEV
  ? lazy(() => import('../dev/CharacterPreviewPanel'))
  : null;

export const GameCanvas = memo(function GameCanvas({
  level: selectedLevel,
  document,
  actions: providedActions,
  progress: providedProgress,
  run,
}: {
  level?: LevelId;
  document?: LevelDocument;
  actions?: ActionState;
  progress?: LevelProgress;
  run?: RunSession;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actions] = useState(() => providedActions ?? new ActionState());
  const [progress] = useState(() => providedProgress ?? new LevelProgress());
  const [level] = useState(
    () =>
      selectedLevel ?? selectLevel(window.location.search, import.meta.env.DEV),
  );
  const [isPreview] = useState(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('preview') ===
        'characters',
  );
  const [previewBridge, setPreviewBridge] = useState<PreviewBridge | null>(
    null,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let game: GameHandle | undefined;
    let preview:
      | ReturnType<
          typeof import('../../game/dev/createPreviewSession').createPreviewSession
        >
      | undefined;
    const { setInitialization } = useAppStore.getState();
    setInitialization('loading');

    // Cancellation also handles React StrictMode's setup/cleanup/setup cycle.
    void (async () => {
      // Let StrictMode finish its effect replay before requesting the module.
      await Promise.resolve();
      if (cancelled) return;
      const { createGame } = await import('../../game/core/Game');
      if (cancelled) return;
      if (import.meta.env.DEV && isPreview) {
        const { createPreviewSession } =
          await import('../../game/dev/createPreviewSession');
        if (cancelled) return;
        preview = createPreviewSession();
        setPreviewBridge(preview.bridge);
      }
      game = createGame(
        container,
        () => {
          if (!cancelled) setInitialization('ready');
        },
        {
          input: actions,
          progress,
          level,
          ...(run ? { run } : {}),
          ...(document ? { document } : {}),
          ...(preview ? { scene: preview.scene } : {}),
          onError: (error) => {
            if (cancelled) return;
            setPreviewBridge(null);
            setInitialization('error', error.message);
          },
        },
      );
    })().catch((error: unknown) => {
      if (cancelled) return;
      console.error('Unable to initialize Veylith:', error);
      preview?.dispose();
      setPreviewBridge(null);
      setInitialization(
        'error',
        error instanceof Error ? error.message : 'Unknown engine error',
      );
    });

    return () => {
      cancelled = true;
      preview?.dispose();
      game?.destroy();
      actions.reset();
      setInitialization('idle');
    };
  }, [actions, isPreview, progress, level, run, document]);

  return (
    <>
      <div
        ref={containerRef}
        className="game-container"
        role="img"
        aria-label={t('Mundo de Veylith')}
      />
      {PreviewPanel && previewBridge && (
        <Suspense fallback={null}>
          <PreviewPanel bridge={previewBridge} />
        </Suspense>
      )}
    </>
  );
});
