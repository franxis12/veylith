import {
  FOREST_PUZZLE_IDS,
  LEVEL_DOCUMENTS,
  isForestPuzzle,
} from './forestPuzzles/layouts';
import type { ForestPuzzleId } from './forestPuzzles/layouts';
export type CampaignLevelId = ForestPuzzleId | 'forest' | 'puzzle';
export type Stars = 1 | 2 | 3;

export interface CampaignLevel {
  readonly id: CampaignLevelId;
  readonly title: string;
  readonly threeStarsMs: number;
  readonly twoStarsMs: number;
  /** Total entitlement at each rating, not a repeatable reward. */
  readonly coins: Readonly<Record<Stars, number>>;
}

export const CAMPAIGN: readonly CampaignLevel[] = [
  ...FOREST_PUZZLE_IDS.map((id) => LEVEL_DOCUMENTS[id]).map((doc) => ({
    id: doc.id as CampaignLevelId,
    title: doc.name,
    ...doc.timer,
    coins:
      doc.id === 'forest-5'
        ? { 1: 50, 2: 100, 3: 150 }
        : { 1: 30, 2: 60, 3: 100 },
  })),
  {
    id: 'forest',
    title: 'Bosque de los Orígenes',
    threeStarsMs: 60_000,
    twoStarsMs: 100_000,
    coins: { 1: 30, 2: 60, 3: 100 },
  },
  {
    id: 'puzzle',
    title: 'La puerta del viento',
    threeStarsMs: 20_000,
    twoStarsMs: 40_000,
    coins: { 1: 30, 2: 60, 3: 100 },
  },
];

export function isCampaignLevel(id: unknown): id is CampaignLevelId {
  return CAMPAIGN.some((level) => level.id === id);
}

export function campaignLevel(id: CampaignLevelId): CampaignLevel {
  return CAMPAIGN.find((level) => level.id === id)!;
}

export function rateTime(level: CampaignLevel, elapsedMs: number): Stars {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
    throw new Error('Invalid completion time');
  return elapsedMs <= level.threeStarsMs
    ? 3
    : elapsedMs <= level.twoStarsMs
      ? 2
      : 1;
}

/** Keep the original two prototypes as a separate, save-compatible route. */
export function nextCampaignLevel(
  id: CampaignLevelId,
): CampaignLevel | undefined {
  const next = CAMPAIGN[CAMPAIGN.findIndex((level) => level.id === id) + 1];
  return next && isForestPuzzle(next.id) === isForestPuzzle(id)
    ? next
    : undefined;
}
