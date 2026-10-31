import {
  CAMPAIGN,
  campaignLevel,
  isCampaignLevel,
  rateTime,
  nextCampaignLevel,
} from '../../game/levels/catalog';
import type { CampaignLevelId, Stars } from '../../game/levels/catalog';
import {
  isForestPuzzle,
  FOREST_PUZZLE_IDS,
  LEVEL_DOCUMENTS,
} from '../../game/levels/forestPuzzles/layouts';
import { OBJECT_ID } from '../../game/levels/schema/types';

export const SAVE_KEY = 'veylith.progress';
export const SAVE_VERSION = 1;
export interface LevelRecord {
  readonly bestTimeMs: number;
  readonly stars: Stars;
  readonly awardedCoins: number;
  /** Value banked once per placed coin. Optional so existing v1 saves remain valid. */
  readonly collectedCoins?: Readonly<Record<string, number>>;
}
export interface SavedProgress {
  readonly version: typeof SAVE_VERSION;
  readonly coins: number;
  readonly lastLevel: CampaignLevelId;
  readonly levels: Partial<Record<CampaignLevelId, LevelRecord>>;
}
export interface CompletionResult {
  readonly level: CampaignLevelId;
  readonly elapsedMs: number;
  readonly bestTimeMs: number;
  readonly stars: Stars;
  readonly earnedCoins: number;
  readonly newRecord: boolean;
}
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageStatus = 'ok' | 'unavailable' | 'recovered' | 'future';

export function emptyProgress(): SavedProgress {
  return { version: SAVE_VERSION, coins: 0, lastLevel: 'forest-1', levels: {} };
}

export function isUnlocked(
  progress: SavedProgress,
  id: CampaignLevelId,
): boolean {
  if (id === 'puzzle') return !!progress.levels.forest;
  if (!isForestPuzzle(id)) return true;
  // Existing v1 saves could select any chapter entry. Preserve remembered access
  // and completed records while new saves unlock one entry per victory.
  let through = isForestPuzzle(progress.lastLevel)
    ? FOREST_PUZZLE_IDS.indexOf(progress.lastLevel)
    : 0;
  FOREST_PUZZLE_IDS.forEach((level, index) => {
    if (progress.levels[level]) through = Math.max(through, index + 1);
  });
  return FOREST_PUZZLE_IDS.indexOf(id) <= through;
}

export function completeLevel(
  progress: SavedProgress,
  id: CampaignLevelId,
  elapsedMs: number,
  collectedCoinIds: readonly string[] = [],
): { progress: SavedProgress; result: CompletionResult } {
  if (!isUnlocked(progress, id)) throw new Error('Level is locked');
  const config = campaignLevel(id);
  const stars = rateTime(config, elapsedMs);
  const previous = progress.levels[id];
  const bestTimeMs = Math.min(previous?.bestTimeMs ?? Infinity, elapsedMs);
  const bestStars = Math.max(previous?.stars ?? 1, stars) as Stars;
  const awardedCoins =
    !previous || stars > previous.stars
      ? Math.max(previous?.awardedCoins ?? 0, config.coins[bestStars])
      : previous.awardedCoins;
  const collectedCoins = { ...previous?.collectedCoins };
  const requested = new Set(collectedCoinIds);
  let pickupReward = 0;
  // Values come from the saved campaign document, never from the caller or playtest.
  if (isForestPuzzle(id)) {
    for (const coin of LEVEL_DOCUMENTS[id].objects) {
      if (
        coin.type !== 'coin' ||
        !coin.collider.enabled ||
        !requested.has(coin.id) ||
        Object.hasOwn(collectedCoins, coin.id)
      )
        continue;
      collectedCoins[coin.id] = coin.value;
      pickupReward += coin.value;
    }
  }
  const earnedCoins =
    awardedCoins - (previous?.awardedCoins ?? 0) + pickupReward;
  const next = nextCampaignLevel(id);
  return {
    progress: {
      ...progress,
      coins: progress.coins + earnedCoins,
      lastLevel: next?.id ?? id,
      levels: {
        ...progress.levels,
        [id]: {
          bestTimeMs,
          stars: bestStars,
          awardedCoins,
          ...(Object.keys(collectedCoins).length ? { collectedCoins } : {}),
        },
      },
    },
    result: {
      level: id,
      elapsedMs,
      bestTimeMs,
      stars,
      earnedCoins,
      newRecord: !previous || elapsedMs < previous.bestTimeMs,
    },
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Validate the whole save: a partial/corrupt reward ledger must never mint coins. */
export function decodeProgress(raw: string): SavedProgress {
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== SAVE_VERSION || !object(value.levels))
    throw new Error('Invalid save schema');
  const levels: SavedProgress['levels'] = {};
  let total = 0;
  for (const config of CAMPAIGN) {
    const record = value.levels[config.id];
    if (record === undefined) continue;
    if (
      !object(record) ||
      !nonnegative(record.bestTimeMs) ||
      (record.stars !== 1 && record.stars !== 2 && record.stars !== 3) ||
      !nonnegative(record.awardedCoins) ||
      !Number.isSafeInteger(record.awardedCoins) ||
      record.awardedCoins > 1_000_000
    )
      throw new Error('Invalid level record');
    const collectedCoins: Record<string, number> = {};
    if (record.collectedCoins !== undefined) {
      if (
        !object(record.collectedCoins) ||
        Object.keys(record.collectedCoins).length > 10000
      )
        throw new Error('Invalid coin ledger');
      for (const [id, amount] of Object.entries(record.collectedCoins)) {
        if (
          !OBJECT_ID.test(id) ||
          !nonnegative(amount) ||
          !Number.isSafeInteger(amount) ||
          amount < 1 ||
          amount > 1000
        )
          throw new Error('Invalid collected coin');
        collectedCoins[id] = amount;
        total += amount;
      }
    }
    levels[config.id] = {
      bestTimeMs: record.bestTimeMs,
      stars: record.stars,
      awardedCoins: record.awardedCoins,
      ...(Object.keys(collectedCoins).length ? { collectedCoins } : {}),
    };
    total += record.awardedCoins;
  }
  if (value.coins !== total || !isCampaignLevel(value.lastLevel))
    throw new Error('Invalid reward ledger');
  const progress: SavedProgress = {
    version: SAVE_VERSION,
    coins: total,
    lastLevel: value.lastLevel,
    levels,
  };
  if (
    !isUnlocked(progress, progress.lastLevel) ||
    CAMPAIGN.some(
      (level) => levels[level.id] && !isUnlocked(progress, level.id),
    )
  )
    throw new Error('Invalid progression');
  return progress;
}

export function loadProgress(storage: StoragePort | undefined): {
  progress: SavedProgress;
  status: StorageStatus;
} {
  if (!storage) return { progress: emptyProgress(), status: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { progress: emptyProgress(), status: 'unavailable' };
  }
  if (!raw) return { progress: emptyProgress(), status: 'ok' };
  try {
    const version: unknown = JSON.parse(raw);
    if (
      object(version) &&
      typeof version.version === 'number' &&
      version.version > SAVE_VERSION
    )
      return { progress: emptyProgress(), status: 'future' };
    return { progress: decodeProgress(raw), status: 'ok' };
  } catch {
    // Keep the original payload for recovery before replacing it on the next save.
    try {
      storage.setItem(`${SAVE_KEY}.recovery`, raw);
    } catch {
      return { progress: emptyProgress(), status: 'unavailable' };
    }
    return { progress: emptyProgress(), status: 'recovered' };
  }
}

export function saveProgress(
  storage: StoragePort | undefined,
  progress: SavedProgress,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
