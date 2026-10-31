export interface SolidBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  enable: boolean;
}

/** Sweep the whole travel segment so a fast projectile cannot skip a thin door. */
export function projectileContact(
  fromX: number,
  toX: number,
  y: number,
  radius: number,
  solids: readonly SolidBounds[],
): { x: number; index: number } | undefined {
  const rightward = toX >= fromX;
  let nearest: { x: number; index: number } | undefined;
  for (const [index, solid] of solids.entries()) {
    if (!solid.enable || y + radius < solid.top || y - radius > solid.bottom)
      continue;
    const left = solid.left - radius;
    const right = solid.right + radius;
    if (Math.max(fromX, toX) < left || Math.min(fromX, toX) > right) continue;
    const x =
      fromX >= left && fromX <= right ? fromX : rightward ? left : right;
    if (
      nearest === undefined ||
      Math.abs(x - fromX) < Math.abs(nearest.x - fromX)
    )
      nearest = { x, index };
  }
  return nearest;
}

export function projectileHit(
  fromX: number,
  toX: number,
  y: number,
  radius: number,
  solids: readonly SolidBounds[],
): number | undefined {
  return projectileContact(fromX, toX, y, radius, solids)?.x;
}
