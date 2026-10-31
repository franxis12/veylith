import type { WorldBehavior, WorldObject } from './types';
import type { MechanismState, Rect } from './WorldState';
import { overlaps } from './WorldState';

export function wantsSolid(o: WorldObject, s: MechanismState): boolean {
  if (!o.collider.enabled) return false;
  switch (o.behavior.kind) {
    case 'timedDoor':
      return !s.active;
    case 'phasePlatform':
      return s.solid;
    case 'barrier':
      return s.active;
    case 'bridge':
      return s.progress === 1;
    case 'breakable':
      return !s.active;
    default:
      return true;
  }
}
export function canMaterialize(
  rect: Rect,
  occupants: readonly Rect[],
): boolean {
  return !occupants.some((actor) => overlaps(rect, actor, 0.01));
}
export function onTop(
  actor: Rect & {
    velocity: { y: number };
    blocked: { down: boolean };
    touching: { down: boolean };
  },
  platform: Rect,
): boolean {
  return (
    actor.velocity.y >= 0 &&
    (actor.blocked.down || actor.touching.down) &&
    Math.abs(actor.bottom - platform.top) < 1 &&
    actor.right > platform.left + 1 &&
    actor.left < platform.right - 1
  );
}
/** Include a player standing on cargo so a rising platform cannot push cargo through them. */
export function supportedPassengers<
  T extends Parameters<typeof onTop>[0] & { immovable: boolean },
>(platform: Rect, actors: readonly T[]): T[] {
  const passengers: T[] = [];
  for (let pass = 0; pass < actors.length; pass++) {
    const before = passengers.length;
    for (const actor of actors) {
      if (
        !actor.immovable &&
        !passengers.includes(actor) &&
        (onTop(actor, platform) ||
          passengers.some(
            (support) =>
              onTop(actor, support) ||
              // Arcade may leave the upper block one gravity step inside its support
              // until BlockStackTransport settles it later in the same worldstep.
              (actor.velocity.y >= 0 &&
                actor.velocity.y <= 30 &&
                Math.abs(actor.bottom - support.top) <= 1 &&
                Math.min(actor.right, support.right) -
                  Math.max(actor.left, support.left) >
                  2),
          ))
      )
        passengers.push(actor);
    }
    if (passengers.length === before) break;
  }
  return passengers;
}
const translate = (r: Rect, dx: number, dy: number): Rect => ({
  left: r.left + dx,
  right: r.right + dx,
  top: r.top + dy,
  bottom: r.bottom + dy,
});

/** Swept axis contacts prevent a falling/drifting raft tunnelling through a thin bank. */
export function floatStep(
  current: Rect,
  velocityY: number,
  b: Extract<WorldBehavior, { kind: 'float' }>,
  lakes: readonly Rect[],
  solids: readonly Rect[],
  deltaMs: number,
) {
  const dt = Math.min(0.05, Math.max(0, deltaMs / 1000));
  let vy = Math.min(700, velocityY + 900 * dt);
  const lake = lakes.find(
    (l) =>
      current.right > l.left &&
      current.left < l.right &&
      current.bottom + Math.max(0, vy * dt) >= l.top &&
      current.top < l.bottom,
  );
  let dy = vy * dt;
  if (lake) {
    const target = lake.top - (current.bottom - current.top) * (1 - b.draft);
    dy = Math.max(
      -b.riseSpeed * dt,
      Math.min(b.riseSpeed * dt, target - current.top),
    );
    vy = dt ? dy / dt : 0;
  }
  let dx = lake ? b.currentSpeed * dt : 0;
  for (const solid of solids) {
    if (
      current.bottom <= solid.top + 0.01 ||
      current.top >= solid.bottom - 0.01
    )
      continue;
    if (dx > 0 && current.right <= solid.left + 0.01)
      dx = Math.min(dx, solid.left - current.right);
    if (dx < 0 && current.left >= solid.right - 0.01)
      dx = Math.max(dx, solid.right - current.left);
  }
  const moved = translate(current, dx, 0);
  for (const solid of solids) {
    if (moved.right <= solid.left + 0.01 || moved.left >= solid.right - 0.01)
      continue;
    if (dy > 0 && current.bottom <= solid.top + 0.01)
      dy = Math.min(dy, solid.top - current.bottom);
    if (dy < 0 && current.top >= solid.bottom - 0.01)
      dy = Math.max(dy, solid.bottom - current.top);
  }
  if (dt && Math.abs(dy / dt - vy) > 0.01) vy = 0;
  return { next: translate(current, dx, dy), vy, floating: !!lake };
}
