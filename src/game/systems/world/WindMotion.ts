import type { Element } from '../../types/character';

export interface WindContact {
  id: string;
  direction: -1 | 1;
  strength: number;
}

interface Gust {
  offset: number;
  target: number;
  coastMs: number;
}

/** Attempt-local wind momentum, applied after the player's movement intent. */
export class WindMotion {
  private readonly gusts = new Map<string, Gust>();

  step(
    requestedVx: number,
    element: Element,
    contacts: readonly WindContact[],
    deltaMs: number,
  ): number {
    if (element === 'earth') {
      this.gusts.clear();
      return requestedVx;
    }
    const dt = Math.min(50, Math.max(0, deltaMs));
    const touching = new Set<string>();
    for (const { id, direction, strength } of contacts) {
      touching.add(id);
      const gust = this.gusts.get(id) ?? {
        offset: 0,
        target: 0,
        coastMs: 0,
      };
      gust.target =
        direction * Math.max(direction * requestedVx, strength) - requestedVx;
      // A short gust survives crossing the rectangle edge. Without this hold,
      // repeatedly entering/exiting converges to tiny, camera-shaking reversals.
      gust.coastMs = 200;
      this.gusts.set(id, gust);
    }
    let left = 0,
      right = 0;
    for (const [id, gust] of this.gusts) {
      const pushingMs = touching.has(id) ? dt : Math.min(dt, gust.coastMs);
      gust.coastMs = Math.max(0, gust.coastMs - (touching.has(id) ? 0 : dt));
      gust.offset +=
        (gust.target - gust.offset) * -Math.expm1(-pushingMs / 450);
      gust.offset *= Math.exp(-(dt - pushingMs) / 220);
      if (
        !touching.has(id) &&
        gust.coastMs === 0 &&
        Math.abs(gust.offset) < 0.1
      ) {
        this.gusts.delete(id);
        continue;
      }
      // Overlapping copies do not multiply the configured speed; opposing
      // currents combine symmetrically, independent of document object order.
      left = Math.min(left, gust.offset);
      right = Math.max(right, gust.offset);
    }
    return requestedVx + left + right;
  }
}
