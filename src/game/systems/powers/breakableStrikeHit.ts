import { projectileHit } from './projectileCollision';
import type { SolidBounds } from './projectileCollision';

export interface StrikeSurface extends SolidBounds {
  breakable: boolean;
}

/** Only a real, reachable breakable contact produces the fist's impact burst. */
export function breakableStrikeContact(
  fromX: number,
  handX: number,
  handY: number,
  radius: number,
  surfaces: readonly StrikeSurface[],
): { x: number; index: number } | undefined {
  let nearest:
    | { x: number; distance: number; breakable: boolean; index: number }
    | undefined;
  for (const [index, surface] of surfaces.entries()) {
    const x = projectileHit(fromX, handX, handY, radius, [surface]);
    if (x === undefined) continue;
    const distance = Math.abs(x - fromX);
    if (
      !nearest ||
      distance < nearest.distance ||
      (distance === nearest.distance && !surface.breakable)
    ) {
      nearest = { x, distance, breakable: surface.breakable, index };
    }
  }
  return nearest?.breakable
    ? { x: nearest.x, index: nearest.index }
    : undefined;
}

export function breakableStrikeHit(
  fromX: number,
  handX: number,
  handY: number,
  radius: number,
  surfaces: readonly StrikeSurface[],
): number | undefined {
  return breakableStrikeContact(fromX, handX, handY, radius, surfaces)?.x;
}
