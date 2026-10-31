import type { InputFrame } from '../input/ActionState';
import type { WorldState, Rect } from './WorldState';
import { rayBox } from './advancedRules';

export interface ReflectorSnapshot {
  id: string;
  active: boolean;
  angle: number;
}

/** Proximity, line of sight and attempt-local control. No UI or device events. */
export class ReflectorInteraction {
  private activeId: string | undefined;
  private elapsed = 0;
  private cancelledUntilRelease = false;
  snapshot: ReflectorSnapshot | null = null;
  constructor(
    private readonly state: WorldState,
    private readonly bodyFor: (id: string) => Rect | undefined,
    private readonly solids: () => readonly Rect[],
  ) {}

  private reachable(id: string, player: Rect): number {
    const o = this.state.objects.find((o) => o.id === id);
    const body = this.bodyFor(id);
    if (
      o?.behavior.kind !== 'reflector' ||
      o.behavior.rotatable === false ||
      !o.collider.enabled ||
      !o.visible ||
      !body
    )
      return Infinity;
    const gap = Math.hypot(
      Math.max(0, body.left - player.right, player.left - body.right),
      Math.max(0, body.top - player.bottom, player.top - body.bottom),
    );
    if (gap > 96) return Infinity;
    const from = {
      x: (player.left + player.right) / 2,
      y: (player.top + player.bottom) / 2,
    };
    const dx = (body.left + body.right) / 2 - from.x,
      dy = (body.top + body.bottom) / 2 - from.y;
    const distance = Math.hypot(dx, dy);
    if (
      distance > 0.01 &&
      this.solids().some(
        (s) =>
          s !== body &&
          rayBox(from, { x: dx / distance, y: dy / distance }, s) <
            distance - 1,
      )
    )
      return Infinity;
    return distance;
  }
  update(player: Rect, grounded: boolean, input: InputFrame, deltaMs: number) {
    const before = this.activeId;
    const candidates = grounded
      ? this.state.objects
          .filter((o) => o.behavior.kind === 'reflector')
          .map((o) => ({ id: o.id, distance: this.reachable(o.id, player) }))
          .filter((o) => Number.isFinite(o.distance))
          .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
      : [];
    if (this.activeId && !candidates.some((o) => o.id === this.activeId))
      this.activeId = undefined;
    if (!input.abilityHeld) {
      this.activeId = undefined;
      this.cancelledUntilRelease = false;
    }
    if (input.closeReflector) {
      this.activeId = undefined;
      this.cancelledUntilRelease = true;
    }
    if (input.abilityHeld && !this.cancelledUntilRelease && !this.activeId)
      this.activeId = candidates[0]?.id;
    if (this.activeId && this.activeId === before) {
      const angle = this.state.get(this.activeId).mirrorAngle!;
      this.state.rotateReflector(
        this.activeId,
        input.reflectorAngle ??
          angle +
            (input.reflectorTurn ?? 0) +
            input.direction * Math.min(50, Math.max(0, deltaMs)) * 0.06,
      );
    }
    const id = this.activeId ?? candidates[0]?.id;
    const next = id
      ? {
          id,
          active: !!this.activeId,
          angle: Math.round(this.state.get(id).mirrorAngle! * 10) / 10,
        }
      : null;
    this.elapsed += Math.max(0, deltaMs);
    // Geometry stays at physics cadence; only the dial's displayed value is published at 12.5 Hz.
    if (
      this.snapshot?.id !== next?.id ||
      this.snapshot?.active !== next?.active ||
      this.elapsed >= 80
    ) {
      this.snapshot = next;
      this.elapsed = 0;
    }
    return {
      blocked: !!before || !!this.activeId,
      changed: before !== this.activeId,
    };
  }
}
