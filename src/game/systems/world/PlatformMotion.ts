import { overlaps } from './WorldState';
import type { Rect } from './WorldState';

export interface PlatformRider extends Rect {
  velocityY: number;
  grounded: boolean;
}

/** Contact from above only. A nearby jumper, underside hit or departing rider is not carried. */
export function planPlatformMotion(
  current: Rect,
  next: Rect,
  player: PlatformRider,
  obstacles: readonly Rect[],
) {
  const dx = next.left - current.left,
    dy = next.top - current.top;
  const riding =
    player.grounded &&
    player.velocityY >= 0 &&
    Math.abs(player.bottom - current.top) < 1 &&
    player.right > current.left + 1 &&
    player.left < current.right - 1;
  const carried = {
    left: player.left + dx,
    right: player.right + dx,
    top: next.top - (player.bottom - player.top),
    bottom: next.top,
  };
  // Keep the platform/rider out of solids without treating floating-point contact
  // at a flush dock as penetration. Hazard overlap tests retain their exact bounds.
  const blocked = obstacles.some(
    (o) => overlaps(next, o, 0.01) || (riding && overlaps(carried, o, 0.01)),
  );
  return { riding, blocked, dx: blocked ? 0 : dx, dy: blocked ? 0 : dy };
}
