import type { Element } from '../../types/character';
import type { SolidBounds } from '../../systems/powers/projectileCollision';
export const BLOCK = {
  width: 64,
  height: 56,
  speed: 150,
  maxFall: 900,
} as const;

/** Only grounded Earth can deliberately move a supported block by side contact. */
export function blockPushVelocity(
  element: Element,
  player: SolidBounds,
  playerGrounded: boolean,
  requestedVx: number,
  block: SolidBounds,
  blockGrounded: boolean,
): number {
  if (element !== 'earth' || !playerGrounded || !blockGrounded || !block.enable)
    return 0;
  const overlap =
    Math.min(player.bottom, block.bottom) - Math.max(player.top, block.top);
  if (overlap <= 4) return 0; // Standing on top never pushes the block.
  if (requestedVx > 0 && Math.abs(player.right - block.left) < 10)
    return BLOCK.speed;
  if (requestedVx < 0 && Math.abs(player.left - block.right) < 10)
    return -BLOCK.speed;
  return 0;
}

/** The block must actually rest on the plate, not just pass above its X coordinate. */
export function blockPressesPlate(
  block: SolidBounds,
  plate: SolidBounds,
  supported: boolean,
): boolean {
  const overlap =
    Math.min(block.right, plate.right) - Math.max(block.left, plate.left);
  const requiredOverlap =
    Math.min(block.right - block.left, plate.right - plate.left) / 2;
  return (
    block.enable &&
    plate.enable &&
    supported &&
    overlap >= requiredOverlap &&
    block.bottom >= plate.top - 2 &&
    block.bottom <= plate.bottom + 2
  );
}

/** Arcade can leave a subpixel gap after separating two dynamic bodies.
 * Accept only top contact on a resting block, never side contact or an ascent.
 */
export function blockSupportsPlayer(
  player: SolidBounds,
  velocityY: number,
  block: SolidBounds,
  blockSupported: boolean,
): boolean {
  return (
    player.enable &&
    block.enable &&
    blockSupported &&
    velocityY >= 0 &&
    Math.abs(player.bottom - block.top) <= 1 &&
    Math.min(player.right, block.right) - Math.max(player.left, block.left) > 2
  );
}
