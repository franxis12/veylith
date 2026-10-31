import type { Activation } from './types';

export const ADVANCED_KINDS = [
  'reflector',
  'beam_emitter',
  'light_receiver',
  'pulley_platform',
  'pulley_counterweight',
  'conveyor',
  'directional_gate',
] as const;
export type AdvancedKind = (typeof ADVANCED_KINDS)[number];
export type MirrorOrientation = 'nw' | 'ne' | 'se' | 'sw';
export type BeamDirection = 'right' | 'down' | 'left' | 'up';
export type AdvancedBehavior =
  | {
      kind: 'reflector';
      orientation: MirrorOrientation;
      pushable: boolean;
      angle?: number;
      rotatable?: boolean;
    }
  | ({
      kind: 'beamEmitter';
      direction: BeamDirection;
      range: number;
      maxBounces: number;
    } & Activation)
  | { kind: 'receiver'; latch: boolean }
  | ({
      kind: 'pulley';
      counterweightId: string;
      travelY: number;
      speed: number;
      mode: 'weight' | 'signal';
      threshold: number;
    } & Activation)
  | { kind: 'pulleyWeight'; mass: number }
  | ({
      kind: 'conveyor';
      direction: -1 | 1;
      speed: number;
      segments: number;
    } & Activation)
  | ({ kind: 'directionalGate'; direction: -1 | 1 } & Activation);

export const isAdvancedKind = (kind: string): kind is AdvancedKind =>
  (ADVANCED_KINDS as readonly string[]).includes(kind);
export function advancedBehavior(kind: AdvancedKind): AdvancedBehavior {
  switch (kind) {
    case 'reflector':
      return { kind: 'reflector', orientation: 'nw', pushable: true };
    case 'beam_emitter':
      return {
        kind: 'beamEmitter',
        direction: 'right',
        range: 2400,
        maxBounces: 12,
        requires: [],
        autostart: true,
      };
    case 'light_receiver':
      return { kind: 'receiver', latch: false };
    case 'pulley_platform':
      return {
        kind: 'pulley',
        counterweightId: '',
        travelY: 260,
        speed: 100,
        mode: 'weight',
        threshold: 1,
        requires: [],
        autostart: true,
      };
    case 'pulley_counterweight':
      return { kind: 'pulleyWeight', mass: 1 };
    case 'conveyor':
      return {
        kind: 'conveyor',
        direction: 1,
        speed: 120,
        segments: 3,
        requires: [],
        autostart: true,
      };
    case 'directional_gate':
      return {
        kind: 'directionalGate',
        direction: 1,
        requires: [],
        autostart: false,
      };
  }
}
