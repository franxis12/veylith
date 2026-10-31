import type { SoundId } from '../../../services/audio/catalog';
import type { WorldKind } from '../world/types';

export interface PropCue {
  cue?: SoundId;
  loop?: SoundId;
  pulse?: SoundId;
}
/** Real artwork state names, including the next-state aliases used by its animations. */
export const PROP_SOUNDS: Partial<
  Record<WorldKind, Readonly<Record<string, PropCue>>>
> = {
  rotating_gear: { gear_rotating: { loop: 'elevator_motion' } },
  wind_tunnel: {
    flow: { loop: 'air_glide' },
    wind_tunnel_flow: { loop: 'air_glide' },
  },
  energy_barrier: {
    barrier_activate: { cue: 'barrier_activate' },
    barrier_active: { loop: 'barrier_loop' },
    barrier_deactivate: { cue: 'barrier_deactivate' },
  },
  disappearing_platform: {
    platform_disappearing: { cue: 'platform_disappear' },
    platform_appearing: { cue: 'platform_appear' },
  },
  timed_door: {
    door_opening: { cue: 'stone_gate_open' },
    door_closing: { cue: 'door_close' },
    door_warning: { pulse: 'timed_gate_warning' },
  },
  steam_vent: {
    active: { loop: 'boiler_steam' },
    steam_vent_active: { loop: 'boiler_steam' },
    warning: { cue: 'steam_vent_warning' },
    steam_vent_warning: { cue: 'steam_vent_warning' },
    stopping: { cue: 'steam_vent_stop' },
    steam_vent_stopping: { cue: 'steam_vent_stop' },
  },
  watered_plant: { plant_growing: { cue: 'plant_grow' } },
  floating_wooden_block: {
    wooden_block_floating: { loop: 'wood_float' },
    wooden_block_wake: { loop: 'wood_float' },
  },
  wind_mill: { mill_spinning: { loop: 'wind_mill' } },
  fire_switch: {
    igniting: { cue: 'fire_switch' },
    fire_switch_igniting: { cue: 'fire_switch' },
    extinguishing: { cue: 'mechanism_activate' },
    fire_switch_extinguishing: { cue: 'mechanism_activate' },
  },
  elemental_bounce_pad: { bounce_launch: { cue: 'bounce_pad' } },
};
