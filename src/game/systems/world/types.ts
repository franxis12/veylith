import {
  ADVANCED_KINDS,
  advancedBehavior,
  isAdvancedKind,
} from './advancedTypes';
import type { AdvancedBehavior } from './advancedTypes';
import type { BoxCollider, ObjectBase } from '../../levels/schema/types';
export const WORLD_KINDS = [
  ...ADVANCED_KINDS,
  'mechanical_elevator',
  'wind_fan',
  'rotating_gear',
  'interactive_lever',
  'lava',
  'deep_water',
  'wind_tunnel',
  'energy_barrier',
  'waterwheel',
  'steam_boiler',
  'retractable_bridge',
  'stone_wall',
  'disappearing_platform',
  'timed_door',
  'steam_vent',
  'watered_plant',
  'floating_wooden_block',
  'wind_mill',
  'fire_switch',
  'elemental_bounce_pad',
] as const;
export type WorldKind = (typeof WORLD_KINDS)[number];
export interface Activation {
  requires: string[];
  autostart: boolean;
}
export type SwitchAction = 'activate' | 'deactivate' | 'toggle';
/** Former decorative objects keep their explicit prop behavior when loaded. */
export const STAGE_ONE_KINDS: readonly WorldKind[] = [
  'timed_door',
  'disappearing_platform',
  'elemental_bounce_pad',
  'floating_wooden_block',
  'energy_barrier',
  'fire_switch',
];
export type WorldBehavior =
  | AdvancedBehavior
  | ({
      kind: 'timedDoor';
      openMs: number;
      warningMs: number;
      initiallyOpen: boolean;
      retrigger: 'restart' | 'ignore';
    } & Activation)
  | ({
      kind: 'phasePlatform';
      mode: 'cycle' | 'contact';
      solidMs: number;
      hiddenMs: number;
      initiallySolid: boolean;
    } & Activation)
  | ({ kind: 'bounce'; speed: number; cooldownMs: number } & Activation)
  | { kind: 'float'; draft: number; riseSpeed: number; currentSpeed: number }
  | ({ kind: 'barrier' } & Activation)
  | {
      kind: 'switch';
      action: SwitchAction;
      trigger: 'interact' | 'fire' | 'water';
      targets: string[];
      initiallyActive: boolean;
      cooldownMs: number;
    }
  | ({
      kind: 'elevator';
      travelX: number;
      travelY: number;
      speed: number;
      mode: 'once' | 'pingpong' | 'controlled';
    } & Activation)
  | ({ kind: 'fan'; direction: -1 | 1; strength: number } & Activation)
  | { kind: 'heat' | 'lake' }
  | { kind: 'waterwheel'; hits: number }
  | { kind: 'boiler'; waterHits: number; fireHits: number }
  | ({ kind: 'bridge'; duration: number } & Activation)
  | { kind: 'breakable'; strikes: number }
  | {
      kind: 'lever';
      initiallyActive: boolean;
      /** Missing fields preserve legacy signal-only levers. */
      action?: SwitchAction;
      targets?: string[];
    }
  | { kind: 'prop' };
export type WorldObject = ObjectBase & {
  type: 'world';
  kind: WorldKind;
  state: string;
  effect: BoxCollider;
  behavior: WorldBehavior;
  hint: string;
};
export const sourceBehavior = (b: WorldBehavior) =>
  ['waterwheel', 'boiler', 'breakable', 'lever', 'switch', 'receiver'].includes(
    b.kind,
  );
export const isWorldKind = (value: unknown): value is WorldKind =>
  WORLD_KINDS.some((k) => k === value);
const BEHAVIORS: Partial<Record<WorldKind, WorldBehavior['kind']>> = {
  timed_door: 'timedDoor',
  disappearing_platform: 'phasePlatform',
  elemental_bounce_pad: 'bounce',
  floating_wooden_block: 'float',
  energy_barrier: 'barrier',
  fire_switch: 'switch',
  mechanical_elevator: 'elevator',
  wind_fan: 'fan',
  lava: 'heat',
  deep_water: 'lake',
  waterwheel: 'waterwheel',
  steam_boiler: 'boiler',
  retractable_bridge: 'bridge',
  stone_wall: 'breakable',
  interactive_lever: 'lever',
};
export const behaviorKind = (kind: WorldKind): WorldBehavior['kind'] =>
  isAdvancedKind(kind)
    ? advancedBehavior(kind).kind
    : (BEHAVIORS[kind] ?? 'prop');
export function defaultBehavior(kind: WorldKind): WorldBehavior {
  if (isAdvancedKind(kind)) return advancedBehavior(kind);
  switch (behaviorKind(kind)) {
    case 'timedDoor':
      return {
        kind: 'timedDoor',
        requires: [],
        autostart: false,
        openMs: 3000,
        warningMs: 800,
        initiallyOpen: false,
        retrigger: 'restart',
      };
    case 'phasePlatform':
      return {
        kind: 'phasePlatform',
        requires: [],
        autostart: true,
        mode: 'cycle',
        solidMs: 2000,
        hiddenMs: 1500,
        initiallySolid: true,
      };
    case 'bounce':
      return {
        kind: 'bounce',
        requires: [],
        autostart: true,
        speed: 900,
        cooldownMs: 250,
      };
    case 'float':
      return { kind: 'float', draft: 0.25, riseSpeed: 160, currentSpeed: 0 };
    case 'barrier':
      return { kind: 'barrier', requires: [], autostart: true };
    case 'switch':
      return {
        kind: 'switch',
        action: 'toggle',
        trigger: 'interact',
        targets: [],
        initiallyActive: false,
        cooldownMs: 250,
      };
    case 'elevator':
      return {
        kind: 'elevator',
        requires: [],
        autostart: false,
        travelX: 0,
        travelY: -300,
        speed: 100,
        mode: 'controlled',
      };
    case 'fan':
      return {
        kind: 'fan',
        requires: [],
        autostart: true,
        direction: 1,
        strength: 600,
      };
    case 'heat':
      return { kind: 'heat' };
    case 'lake':
      return { kind: 'lake' };
    case 'waterwheel':
      return { kind: 'waterwheel', hits: 3 };
    case 'boiler':
      return { kind: 'boiler', waterHits: 3, fireHits: 2 };
    case 'bridge':
      return { kind: 'bridge', requires: [], autostart: false, duration: 600 };
    case 'breakable':
      return { kind: 'breakable', strikes: 1 };
    case 'lever':
      return {
        kind: 'lever',
        initiallyActive: false,
        action: 'toggle',
        targets: [],
      };
    default:
      return { kind: 'prop' };
  }
}
