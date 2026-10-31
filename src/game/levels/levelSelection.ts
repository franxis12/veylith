import { isCampaignLevel } from './catalog';
import type { CampaignLevelId } from './catalog';
export type LevelId = CampaignLevelId | 'test';

/** Keep the prior puzzle reachable; the movement sandbox remains development-only. */
export function selectLevel(search: string, development: boolean): LevelId {
  const level = new URLSearchParams(search).get('level');
  if (isCampaignLevel(level)) return level;
  if (development && level === 'test') return 'test';
  return 'forest';
}

/** Explicit opt-in; a production URL cannot enable manual transformations. */
export function allowElementTesting(
  search: string,
  development: boolean,
): boolean {
  return development && new URLSearchParams(search).get('devElements') === '1';
}
