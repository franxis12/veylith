import { FOREST_PUZZLE_IDS } from '../../game/levels/campaignOrder';
import type { ForestPuzzleId } from '../../game/levels/campaignOrder';

/** App Store Connect must contain these exact IDs before native validation. */
export const GAME_CENTER_PREFIX = 'com.francismartinez.veylith';
export const GAME_CENTER_LEVELS = FOREST_PUZZLE_IDS;
export const MAX_SCORE_MS = 86_400_000;
export const GAME_CENTER_ACHIEVEMENTS = {
  firstWin: `${GAME_CENTER_PREFIX}.first_win`,
  earthComplete: `${GAME_CENTER_PREFIX}.earth_complete`,
} as const;
export function leaderboardId(level: ForestPuzzleId): string {
  return `${GAME_CENTER_PREFIX}.${level.replace('-', '')}.time`;
}
export function isRankedLevel(level: string): level is ForestPuzzleId {
  return GAME_CENTER_LEVELS.some((id) => id === level);
}
