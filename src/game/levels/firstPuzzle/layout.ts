import type { GemPlacement } from '../gems';

export const FIRST_PUZZLE = {
  spawn: { x: 100, feetY: 650 },
  initialElement: 'water',
  // Preserve the existing puzzle route after removing unrestricted element controls.
  gems: [
    { id: 'puzzle-air-start', element: 'air', x: 190, y: 560 },
    { id: 'puzzle-earth-plate', element: 'earth', x: 350, y: 330 },
    { id: 'puzzle-air-exit', element: 'air', x: 500, y: 340 },
  ] satisfies readonly GemPlacement[],
  floorY: 650,
  plate: { x: 400, top: 420, width: 112 },
  gate: { x: 1010, width: 28, height: 720 },
  exitX: 1140,
  openingMs: 6000,
  fallLimit: 710,
  platforms: [
    { x: 280, y: 685, width: 560, height: 70 },
    { x: 1160, y: 685, width: 240, height: 70 },
    { x: 400, y: 432, width: 160, height: 24 },
  ],
} as const;
