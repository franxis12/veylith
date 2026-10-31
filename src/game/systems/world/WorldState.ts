import { normalizeAngle, reflectorAngle } from './reflectorAngles';
import type { Element } from '../../types/character';
import type { SwitchAction, WorldObject } from './types';
export interface MechanismState {
  active: boolean;
  water: number;
  fire: number;
  strikes: number;
  progress: number;
  direction: 1 | -1;
  remainingMs: number;
  phaseMs: number;
  solid: boolean;
  input: boolean;
  contact: boolean;
  cooldownMs: number;
  launches: number;
  mirrorAngle?: number;
}
/** Attempt state only. The saved document is never mutated by simulation. */
export class WorldState {
  readonly states = new Map<string, MechanismState>();
  private readonly commands = new Map<string, boolean>();
  constructor(readonly objects: readonly WorldObject[]) {
    for (const o of objects)
      this.states.set(o.id, {
        active:
          o.behavior.kind === 'lever' || o.behavior.kind === 'switch'
            ? o.behavior.initiallyActive
            : o.behavior.kind === 'timedDoor' && o.behavior.initiallyOpen,
        water: 0,
        fire: 0,
        strikes: 0,
        progress: 0,
        direction: 1,
        remainingMs:
          o.behavior.kind === 'timedDoor' && o.behavior.initiallyOpen
            ? o.behavior.openMs
            : 0,
        phaseMs: 0,
        solid: o.behavior.kind !== 'phasePlatform' || o.behavior.initiallySolid,
        input: false,
        contact: false,
        cooldownMs: 0,
        launches: 0,
        ...(o.behavior.kind === 'reflector'
          ? { mirrorAngle: reflectorAngle(o.behavior) }
          : {}),
      });
  }
  get(id: string): MechanismState {
    return this.states.get(id)!;
  }
  rotateReflector(id: string, angle: number): boolean {
    const o = this.objects.find((o) => o.id === id);
    if (
      o?.behavior.kind !== 'reflector' ||
      o.behavior.rotatable === false ||
      !o.collider.enabled ||
      !Number.isFinite(angle)
    )
      return false;
    this.get(id).mirrorAngle = normalizeAngle(angle);
    return true;
  }
  hit(id: string, element: 'water' | 'fire'): void {
    const o = this.objects.find((o) => o.id === id);
    if (!o || !o.effect.enabled) return;
    const s = this.get(id),
      b = o.behavior;
    if (b.kind === 'switch' && b.trigger === element) this.trigger(id);
    if (b.kind === 'waterwheel' && element === 'water') {
      s.water = Math.min(b.hits, s.water + 1);
      s.active = s.water >= b.hits;
    }
    if (b.kind === 'boiler') {
      if (element === 'water') s.water = Math.min(b.waterHits, s.water + 1);
      else s.fire = Math.min(b.fireHits, s.fire + 1);
      s.active = s.water >= b.waterHits && s.fire >= b.fireHits;
    }
  }
  strike(id: string): void {
    const o = this.objects.find((o) => o.id === id);
    if (o?.behavior.kind !== 'breakable' || !o.collider.enabled) return;
    const s = this.get(id);
    s.strikes = Math.min(o.behavior.strikes, s.strikes + 1);
    s.active = s.strikes >= o.behavior.strikes;
  }
  toggle(id: string): void {
    const o = this.objects.find((o) => o.id === id);
    if (o?.behavior.kind !== 'lever' || !o.effect.enabled) return;
    const action = o.behavior.action ?? 'toggle';
    this.get(id).active = applyAction(this.get(id).active, action);
    for (const target of o.behavior.targets ?? []) this.command(target, action);
  }
  trigger(id: string): boolean {
    const o = this.objects.find((o) => o.id === id);
    if (!o || o.behavior.kind !== 'switch' || !o.effect.enabled) return false;
    const s = this.get(id),
      b = o.behavior;
    if (s.cooldownMs > 0) return false;
    s.active = applyAction(s.active, b.action);
    s.cooldownMs = b.cooldownMs;
    for (const target of b.targets) this.command(target, b.action);
    return true;
  }
  command(id: string, action: SwitchAction): void {
    const o = this.objects.find((o) => o.id === id);
    if (!o || !('requires' in o.behavior)) return;
    const s = this.get(id);
    const active = applyAction(
      o.behavior.kind === 'timedDoor'
        ? s.active
        : (this.commands.get(id) ?? s.active),
      action,
    );
    this.commands.set(id, active);
    if (o.behavior.kind === 'timedDoor') {
      if (active) this.open(o);
      else {
        s.active = false;
        s.remainingMs = 0;
      }
      // Explicit activation already supplied the opening event.
      s.input = active;
    }
  }
  private open(o: WorldObject): void {
    if (o.behavior.kind !== 'timedDoor') return;
    const s = this.get(o.id);
    if (s.active && o.behavior.retrigger === 'ignore') return;
    s.active = true;
    s.remainingMs = o.behavior.openMs;
  }
  standOn(id: string): void {
    const o = this.objects.find((o) => o.id === id);
    if (o?.behavior.kind === 'phasePlatform' && this.get(id).solid)
      this.get(id).contact = true;
  }
  bounce(id: string): boolean {
    const s = this.get(id);
    if (!s.active || s.cooldownMs > 0) return false;
    const o = this.objects.find((o) => o.id === id);
    if (o?.behavior.kind !== 'bounce') return false;
    s.cooldownMs = o.behavior.cooldownMs;
    s.launches++;
    return true;
  }
  powered(o: WorldObject, signal: (id: string) => boolean): boolean {
    const command = this.commands.get(o.id);
    if (command !== undefined) return command;
    const b = o.behavior;
    return 'requires' in b
      ? b.requires.length > 0
        ? b.requires.every(signal)
        : b.autostart
      : this.get(o.id).active;
  }
  advance(deltaMs: number, signal: (id: string) => boolean): void {
    const ms = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    const seconds = Math.min(0.05, ms / 1000);
    for (const o of this.objects) {
      const b = o.behavior,
        s = this.get(o.id);
      s.cooldownMs = Math.max(0, s.cooldownMs - ms);
      if (b.kind === 'timedDoor') {
        s.remainingMs = Math.max(0, s.remainingMs - ms);
        if (s.remainingMs === 0) s.active = false;
        const input = this.powered(o, signal);
        if (input && !s.input) this.open(o);
        s.input = input;
      } else if (b.kind === 'phasePlatform') {
        s.active = this.powered(o, signal);
        if (!s.active) {
          s.solid = b.initiallySolid;
          s.phaseMs = 0;
          s.contact = false;
        } else if (b.mode === 'cycle') {
          const cycle = b.solidMs + b.hiddenMs;
          s.phaseMs = (s.phaseMs + ms) % cycle;
          s.solid = b.initiallySolid
            ? s.phaseMs < b.solidMs
            : s.phaseMs >= b.hiddenMs;
        } else if (!s.solid || s.contact) {
          s.phaseMs += ms;
          const duration = s.solid ? b.solidMs : b.hiddenMs;
          if (s.phaseMs >= duration) {
            s.phaseMs = 0;
            s.solid = !s.solid;
            s.contact = false;
          }
        }
      } else if (
        [
          'barrier',
          'bounce',
          'beamEmitter',
          'conveyor',
          'pulley',
          'directionalGate',
        ].includes(b.kind)
      ) {
        s.active = this.powered(o, signal);
      }
      if (b.kind === 'elevator') {
        s.active = this.powered(o, signal);
        // Controlled lifts target an endpoint; releasing the signal returns them.
        // Explicit legacy modes still pause without power.
        if (b.mode === 'controlled') s.direction = s.active ? 1 : -1;
        if (s.active || b.mode === 'controlled') {
          s.progress = Math.max(
            0,
            Math.min(
              1,
              s.progress +
                (s.direction * b.speed * seconds) /
                  Math.hypot(b.travelX, b.travelY),
            ),
          );
          if (b.mode === 'pingpong' && (s.progress === 0 || s.progress === 1))
            s.direction = s.progress === 1 ? -1 : 1;
        }
      } else if (b.kind === 'bridge') {
        s.active = this.powered(o, signal);
        s.progress = Math.max(
          0,
          Math.min(
            1,
            s.progress + ((s.active ? 1 : -1) * seconds * 1000) / b.duration,
          ),
        );
      } else if (b.kind === 'fan') s.active = this.powered(o, signal);
    }
  }
}
export function applyAction(active: boolean, action: SwitchAction): boolean {
  return action === 'toggle' ? !active : action === 'activate';
}
export function safeElement(kind: 'heat' | 'lake', element: Element): boolean {
  return element === (kind === 'heat' ? 'fire' : 'water');
}
export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export function overlaps(a: Rect, b: Rect, tolerance = 0): boolean {
  return (
    a.left < b.right - tolerance &&
    a.right > b.left + tolerance &&
    a.top < b.bottom - tolerance &&
    a.bottom > b.top + tolerance
  );
}
export function effectBounds(o: WorldObject): Rect {
  return {
    left: o.x + o.effect.x,
    right: o.x + o.effect.x + o.effect.width,
    top: o.y + o.effect.y,
    bottom: o.y + o.effect.y + o.effect.height,
  };
}
