import { isRankedLevel } from './config';
import type { ForestPuzzleId } from '../../game/levels/campaignOrder';
import type { CompletionStorage } from './types';

/** Independent of shared device progress: only wins earned by this GC player. */
export class PlayerCompletions {
  private readonly cache = new Map<string, Set<ForestPuzzleId>>();
  constructor(private readonly storage?: CompletionStorage) {}

  record(playerId: string, level: ForestPuzzleId): number {
    const key = `veylith.gamecenter.v1.${encodeURIComponent(playerId)}`;
    let levels = this.cache.get(playerId);
    if (!levels) {
      levels = new Set();
      try {
        const raw = this.storage?.getItem(key);
        if (raw && raw.length < 1024) {
          const value: unknown = JSON.parse(raw);
          if (Array.isArray(value) && value.length <= 10) {
            for (const id of value) {
              if (typeof id === 'string' && isRankedLevel(id)) levels.add(id);
            }
          }
        }
      } catch {
        /* Storage must never prevent play or submission. */
      }
      this.cache.set(playerId, levels);
    }
    levels.add(level);
    try {
      this.storage?.setItem(key, JSON.stringify([...levels]));
    } catch {
      /* Session-only fallback. */
    }
    return levels.size;
  }
}
