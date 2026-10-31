import type { RunSession } from '../../game/session/RunSession';
import type { AudioEngine } from './AudioEngine';
import { UI_SOUNDS } from './catalog';

/** Listen to confirmed results, never to React renders or saved level-card stars. */
export function bindRunAudio(run: RunSession, engine: AudioEngine): () => void {
  const scope = engine.createScope('ui');
  scope.preload(UI_SOUNDS);
  let phase = run.getSnapshot().phase;
  const unsubscribe = run.subscribe(() => {
    const snapshot = run.getSnapshot();
    if (snapshot.phase === phase) return;
    phase = snapshot.phase;
    scope.reset();
    if (phase !== 'complete') return;
    const result = snapshot.result;
    scope.play(result ? 'level_victory' : 'portal_complete', 0.7);
    if (!result) return; // Playtest never announces banked rewards or persistent records.
    for (let i = 0; i < result.stars; i++)
      scope.schedule('star_award', 180 + i * 320, 0.65, 2 ** ((i * 2) / 12));
    if (result.newRecord) scope.schedule('new_record', 850, 0.55);
    if (result.earnedCoins > 0) scope.schedule('reward_bank', 1100, 0.6);
  });
  return () => {
    unsubscribe();
    scope.dispose();
  };
}
