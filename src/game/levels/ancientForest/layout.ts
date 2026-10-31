import type { GemPlacement } from '../gems';

export interface ForestSurface {
  readonly id: string;
  readonly x: number;
  readonly top: number;
  readonly columns: number;
  readonly kind: 'ground' | 'platform';
}

export const FOREST_TILE = 128;
// Transparent side margins are 16 px. Grass starts at y=8; the walkable rim is y=24.
export const FOREST_RIM = 24;
export const FOREST_EDGE = 16;
export const ANCIENT_FOREST = {
  width: 5888,
  height: 1100,
  floorY: 650,
  fallLimit: 1000,
  spawn: { x: 180, feetY: 650 },
  initialElement: 'water',
  gems: [
    { id: 'forest-water', element: 'water', x: 600, y: 514 },
    { id: 'forest-fire', element: 'fire', x: 1920, y: 560 },
    { id: 'forest-air', element: 'air', x: 2470, y: 290 },
    { id: 'forest-earth', element: 'earth', x: 4410, y: 560 },
    { id: 'forest-water-return', element: 'water', x: 4950, y: 560 },
  ] satisfies readonly GemPlacement[],
  exit: { x: 5570, halfWidth: 85, feetY: 650 },
  surfaces: [
    { id: 'arrival', x: 0, top: 650, columns: 9, kind: 'ground' },
    { id: 'first-step', x: 512, top: 594, columns: 2, kind: 'platform' },
    { id: 'water-step', x: 832, top: 494, columns: 2, kind: 'platform' },
    { id: 'fire-clearing', x: 1408, top: 650, columns: 12, kind: 'ground' },
    { id: 'fire-ledge', x: 2176, top: 370, columns: 3, kind: 'platform' },
    { id: 'glide-launch', x: 2688, top: 370, columns: 2, kind: 'platform' },
    { id: 'ruins', x: 4096, top: 650, columns: 14, kind: 'ground' },
  ] satisfies readonly ForestSurface[],
} as const;

/** A single solid per strip avoids Arcade seam catches and matches the visible side margins. */
export function surfaceBounds(surface: ForestSurface) {
  return {
    x: surface.x + FOREST_EDGE,
    y: surface.top,
    width: surface.columns * FOREST_TILE - 2 * FOREST_EDGE,
    height:
      surface.kind === 'platform' ? 56 : ANCIENT_FOREST.height - surface.top,
  };
}
