import type { RunSession } from '../../game/session/RunSession';
import type { GameCenterController, RankedAttempt } from './controller';

/** Called only by the canonical App session factory, never editor/lab previews. */
export function bindRankedRun(
  run: RunSession,
  level: string,
  service: GameCenterController,
): void {
  let started = false;
  let attempt: RankedAttempt | null = null;
  run.subscribe(() => {
    const snapshot = run.getSnapshot();
    if (snapshot.phase === 'loading') {
      started = false;
      attempt = null;
    }
    if (snapshot.phase === 'playing' && !started) {
      started = true;
      attempt = service.captureAttempt();
    }
    if (snapshot.phase === 'complete' && snapshot.result && started) {
      started = false;
      void service.completeAttempt(attempt, level, snapshot.elapsedMs);
      attempt = null;
    }
  });
}
