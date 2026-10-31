import type { LevelDocument } from '../schema/types';
import { compileLevel } from '../schema/compile';
import { parseLevel } from '../schema/validate';
import type { SolidBounds } from '../../systems/powers/projectileCollision';
import forest1 from '../data/forest-1.json';
import forest2 from '../data/forest-2.json';
import forest3 from '../data/forest-3.json';
import forest4 from '../data/forest-4.json';
import forest5 from '../data/forest-5.json';
import forest6 from '../data/forest-6.json';
import forest7 from '../data/forest-7.json';
import forest8 from '../data/forest-8.json';
import forest9 from '../data/forest-9.json';
import forest10 from '../data/forest-10.json';
import type { GemLevel } from '../gems';
import type { ForestSurface } from '../ancientForest/layout';

import { FOREST_PUZZLE_IDS } from '../campaignOrder';
import type { ForestPuzzleId } from '../campaignOrder';
export { FOREST_PUZZLE_IDS };
export type { ForestPuzzleId };
export function isForestPuzzle(id: unknown): id is ForestPuzzleId {
  return FOREST_PUZZLE_IDS.some((entry) => entry === id);
}
export interface Target {
  readonly id: string;
  readonly kind: 'tank' | 'torch';
  readonly x: number;
  readonly hits: number;
  readonly bounds: SolidBounds;
}
export interface Gate {
  readonly id: string;
  readonly x: number;
  readonly requires: readonly string[];
  readonly initiallyOpen: boolean;
}
export interface ForestPuzzleLayout extends GemLevel {
  readonly id: string;
  readonly document: LevelDocument;
  readonly width: number;
  readonly height: number;
  readonly fallLimit: number;
  readonly spawn: { readonly x: number; readonly feetY: number };
  readonly exit: {
    readonly x: number;
    readonly feetY: number;
    readonly halfWidth: number;
  };
  readonly exits: readonly {
    readonly x: number;
    readonly feetY: number;
    readonly halfWidth: number;
    readonly tolerance: number;
    readonly requires: readonly string[];
  }[];
  readonly surfaces: readonly ForestSurface[];
  readonly targets: readonly Target[];
  readonly gates: readonly Gate[];
  readonly objectives: readonly {
    readonly id: string;
    readonly hint: string;
  }[];
  readonly blocks: readonly {
    readonly id: string;
    readonly plateId: string;
    readonly x: number;
    readonly plateBounds?: SolidBounds;
    readonly floorY: number;
  }[];
  readonly wall?: { readonly id: string; readonly x: number };
  readonly crossing?: {
    readonly id: string;
    readonly from: number;
    readonly to: number;
    readonly landingY: number;
  };
}
export const LEVEL_DOCUMENTS: Readonly<Record<ForestPuzzleId, LevelDocument>> =
  {
    'forest-1': parseLevel(forest1),
    'forest-2': parseLevel(forest2),
    'forest-3': parseLevel(forest3),
    'forest-4': parseLevel(forest4),
    'forest-5': parseLevel(forest5),
    'forest-6': parseLevel(forest6),
    'forest-7': parseLevel(forest7),
    'forest-8': parseLevel(forest8),
    'forest-9': parseLevel(forest9),
    'forest-10': parseLevel(forest10),
  };
export const FOREST_PUZZLES = Object.fromEntries(
  Object.entries(LEVEL_DOCUMENTS).map(([id, doc]) => [id, compileLevel(doc)]),
) as Record<ForestPuzzleId, ForestPuzzleLayout>;
