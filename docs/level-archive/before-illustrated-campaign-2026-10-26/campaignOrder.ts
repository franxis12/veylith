/** Save IDs stay stable; array order is the teaching sequence shown in the menu. */
export const FOREST_PUZZLE_IDS = [
  'forest-1',
  'forest-2',
  'forest-6',
  'forest-7',
  'forest-8',
  'forest-9',
  'forest-10',
  'forest-3',
  'forest-4',
  'forest-5',
] as const;
export type ForestPuzzleId = (typeof FOREST_PUZZLE_IDS)[number];
