import { mirrorNormal, reflectorAngle } from './reflectorAngles';
import type { BeamDirection, MirrorOrientation } from './advancedTypes';
import type { Rect } from './WorldState';
import { overlaps } from './WorldState';

export interface Point {
  x: number;
  y: number;
}
export interface OpticalMirror {
  id: string;
  center: Point;
  halfLength: number;
  orientation: MirrorOrientation;
  angle?: number;
}
export interface BeamSegment {
  from: Point;
  to: Point;
  mirror?: string;
}
export const DIRECTIONS: Record<BeamDirection, Point> = {
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
};
export function rayBox(origin: Point, d: Point, box: Rect): number {
  let near = -Infinity,
    far = Infinity;
  for (const [p, v, min, max] of [
    [origin.x, d.x, box.left, box.right],
    [origin.y, d.y, box.top, box.bottom],
  ]) {
    if (Math.abs(v!) < 1e-8) {
      if (p! < min! || p! > max!) return Infinity;
    } else {
      const a = (min! - p!) / v!,
        b = (max! - p!) / v!;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
  }
  return far < Math.max(0, near) ? Infinity : Math.max(0, near);
}
/** Nearest-hit rays, one-sided mirrors, finite range, hard reflection budget and cycle detection. */
export function traceBeam(
  origin: Point,
  direction: BeamDirection,
  range: number,
  maxBounces: number,
  mirrors: readonly OpticalMirror[],
  receivers: readonly (Rect & { id: string })[],
  solids: readonly Rect[],
) {
  let from = { ...origin },
    d = { ...DIRECTIONS[direction] },
    remaining = Math.max(0, Math.min(32768, range));
  const segments: BeamSegment[] = [],
    hits = new Set<string>(),
    visited = new Set<string>();
  for (
    let bounce = 0;
    bounce <= Math.min(32, Math.max(0, Math.floor(maxBounces))) &&
    remaining > 0.01;
    bounce++
  ) {
    let distance = remaining,
      mirror: OpticalMirror | undefined,
      receiver: string | undefined;
    for (const m of mirrors) {
      const n = mirrorNormal(reflectorAngle(m)),
        dot = d.x * n.x + d.y * n.y;
      if (Math.abs(dot) < 1e-8) continue;
      const t =
        ((m.center.x - from.x) * n.x + (m.center.y - from.y) * n.y) / dot;
      const x = from.x + t * d.x - m.center.x,
        y = from.y + t * d.y - m.center.y;
      if (
        t > 0.001 &&
        t < distance &&
        Math.abs(-n.y * x + n.x * y) <= m.halfLength
      ) {
        distance = t;
        mirror = m;
        receiver = undefined;
      }
    }
    for (const r of receivers) {
      const t = rayBox(from, d, r);
      if (t < distance) {
        distance = t;
        receiver = r.id;
        mirror = undefined;
      }
    }
    // On ties an opaque collider wins: a receiver behind a closed door cannot fire.
    for (const solid of solids) {
      const t = rayBox(from, d, solid);
      if (t <= distance) {
        distance = t;
        mirror = undefined;
        receiver = undefined;
      }
    }
    const to = { x: from.x + d.x * distance, y: from.y + d.y * distance };
    segments.push(mirror ? { from, to, mirror: mirror.id } : { from, to });
    if (receiver) hits.add(receiver);
    if (!mirror) break;
    const n = mirrorNormal(reflectorAngle(mirror)),
      dot = d.x * n.x + d.y * n.y;
    if (dot >= 0) break; // Back of the plate absorbs the beam.
    const key = `${mirror.id}:${d.x.toFixed(6)}:${d.y.toFixed(6)}`;
    if (visited.has(key)) break;
    visited.add(key);
    d = {
      x: d.x - 2 * dot * n.x,
      y: d.y - 2 * dot * n.y,
    };
    const magnitude = Math.hypot(d.x, d.y);
    d.x /= magnitude;
    d.y /= magnitude;
    remaining -= distance + 0.01;
    from = { x: to.x + d.x * 0.01, y: to.y + d.y * 0.01 };
  }
  return { segments, hits };
}
export function gateCanEnter(
  previous: Rect,
  gate: Rect,
  direction: -1 | 1,
  velocityX: number,
): boolean {
  return direction === 1
    ? previous.right <= gate.left + 0.5 && velocityX >= 0
    : previous.left >= gate.right - 0.5 && velocityX <= 0;
}
export function shifted(r: Rect, dx: number, dy: number): Rect {
  return {
    left: r.left + dx,
    right: r.right + dx,
    top: r.top + dy,
    bottom: r.bottom + dy,
  };
}
/** Sweep before applying surface carry; no post-step teleport through thin walls. */
export function safeDisplacement(
  r: Rect,
  amount: number,
  axis: 'x' | 'y',
  solids: readonly Rect[],
): number {
  let result = amount;
  for (const s of solids) {
    if (axis === 'x') {
      if (r.bottom <= s.top + 0.01 || r.top >= s.bottom - 0.01) continue;
      if (amount > 0 && r.right <= s.left + 0.01)
        result = Math.min(result, Math.max(0, s.left - r.right));
      if (amount < 0 && r.left >= s.right - 0.01)
        result = Math.max(result, Math.min(0, s.right - r.left));
    } else {
      if (r.right <= s.left + 0.01 || r.left >= s.right - 0.01) continue;
      if (amount > 0 && r.bottom <= s.top + 0.01)
        result = Math.min(result, Math.max(0, s.top - r.bottom));
      if (amount < 0 && r.top >= s.bottom - 0.01)
        result = Math.max(result, Math.min(0, s.bottom - r.top));
    }
  }
  return result;
}
export function pulleyStep(
  progress: number,
  desired: boolean,
  travel: number,
  speed: number,
  seconds: number,
): number {
  return Math.max(
    0,
    Math.min(
      1,
      progress +
        ((desired ? 1 : -1) * speed * Math.min(0.05, Math.max(0, seconds))) /
          Math.abs(travel),
    ),
  );
}
export function sweptRect(a: Rect, b: Rect): Rect {
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
  };
}
export function movementBlocked(
  current: Rect,
  next: Rect,
  obstacles: readonly Rect[],
): boolean {
  return obstacles.some((o) => overlaps(sweptRect(current, next), o, 0.01));
}
