import type { SoundId } from '../../../services/audio/catalog';
import type { MechanismState, WorldState } from '../world/WorldState';
import type { SceneSound } from './SceneSound';
import { PROP_SOUNDS } from './propSounds';

const CUES = {
  elevator: ['elevator_start', 'elevator_motion', 'elevator_stop'],
  fan: ['fan_start', 'fan_motion', 'fan_stop'],
  bridge: ['bridge_extend', 'bridge_retract', 'bridge_latch'],
  heat: ['lava_ambience', 'lava_entry'],
  lake: ['lake_ambience', 'lake_entry'],
  waterwheel: ['waterwheel_motion'],
  boiler: ['boiler_water', 'boiler_heating', 'boiler_steam'],
  lever: ['mechanism_activate'],
  breakable: ['wall_break'],
  prop: [],
  reflector: [],
  beamEmitter: [],
  receiver: [],
  pulley: [],
  pulleyWeight: [],
  conveyor: [],
  directionalGate: [],
  timedDoor: ['stone_gate_open', 'door_close', 'timed_gate_warning'],
  phasePlatform: ['platform_disappear', 'platform_appear'],
  bounce: ['bounce_pad'],
  float: ['wood_float'],
  barrier: ['barrier_activate', 'barrier_deactivate', 'barrier_loop'],
  switch: ['mechanism_activate'],
} as const satisfies Record<string, readonly SoundId[]>;

/** Observe committed simulation state; never use art frames as physics events. */
export class WorldAudio {
  private readonly previous = new Map<string, MechanismState>();
  private readonly moving = new Map<string, boolean>();
  private readonly props = new Map<string, string>();
  private readonly pulses = new Map<string, number>();
  constructor(
    private readonly state: WorldState,
    private readonly audio: SceneSound,
  ) {
    const preload = new Set<SoundId>();
    for (const o of state.objects) {
      this.previous.set(o.id, { ...state.get(o.id) });
      CUES[o.behavior.kind].forEach((id) => preload.add(id));
      for (const cue of Object.values(PROP_SOUNDS[o.kind] ?? {}))
        for (const id of [cue.cue, cue.loop, cue.pulse])
          if (id) preload.add(id);
    }
    audio.scope.preload([...preload]);
  }
  update(
    deltaMs: number,
    visualState: (id: string) => string | undefined,
  ): void {
    for (const o of this.state.objects) {
      const s = this.state.get(o.id),
        old = this.previous.get(o.id)!,
        kind = o.behavior.kind;
      const x =
          o.x +
          o.width / 2 +
          (kind === 'elevator' ? o.behavior.travelX * s.progress : 0),
        y =
          o.y +
          o.height / 2 +
          (o.behavior.kind === 'elevator'
            ? o.behavior.travelY * s.progress
            : 0);
      const at = (id: SoundId, volume = 0.8) => this.audio.at(id, x, y, volume);
      const loop = (id: SoundId, active: boolean) =>
        this.audio.loop(`object:${o.id}`, id, x, y, active, 0.7);
      if (kind === 'elevator' || kind === 'bridge') {
        const moving = Math.abs(s.progress - old.progress) > 0.00001;
        const wasMoving = this.moving.get(o.id) ?? false;
        if (kind === 'elevator') {
          if (moving && !wasMoving) at('elevator_start');
          if (!moving && wasMoving) at('elevator_stop');
          loop('elevator_motion', moving);
        } else {
          if (!moving && wasMoving && (s.progress === 0 || s.progress === 1))
            at('bridge_latch');
          loop(s.active ? 'bridge_extend' : 'bridge_retract', moving);
        }
        this.moving.set(o.id, moving);
      } else if (kind === 'fan') {
        if (s.active !== old.active) at(s.active ? 'fan_start' : 'fan_stop');
        loop('fan_motion', s.active && o.effect.enabled);
      } else if (kind === 'heat' || kind === 'lake')
        this.audio.surfaceLoop(
          `object:${o.id}`,
          kind === 'heat' ? 'lava_ambience' : 'lake_ambience',
          o.x + o.effect.x,
          o.x + o.effect.x + o.effect.width,
          o.y + o.effect.y,
          o.effect.enabled,
          0.7,
        );
      else if (kind === 'waterwheel') loop('waterwheel_motion', s.active);
      else if (kind === 'boiler') {
        if (s.water > old.water) at('boiler_water', 0.5);
        loop(
          s.active ? 'boiler_steam' : 'boiler_heating',
          s.active || s.fire > 0,
        );
      } else if (kind === 'lever' && s.active !== old.active)
        at('mechanism_activate');
      else if (kind === 'breakable' && s.active && !old.active)
        at('wall_break');
      else if (kind === 'bounce' && s.launches > old.launches) at('bounce_pad');
      else if (kind === 'switch' && s.active !== old.active)
        at('mechanism_activate');
      else if (
        kind === 'prop' ||
        ['timedDoor', 'phasePlatform', 'barrier', 'float'].includes(kind)
      ) {
        const state = visualState(o.id)?.split(':')[0] ?? o.state;
        const cue = PROP_SOUNDS[o.kind]?.[state];
        if (o.visible && state !== this.props.get(o.id) && cue?.cue)
          at(cue.cue);
        loop(cue?.loop ?? 'air_glide', o.visible && !!cue?.loop);
        const elapsed = (this.pulses.get(o.id) ?? 1000) + Math.max(0, deltaMs);
        if (o.visible && cue?.pulse && elapsed >= 1000) {
          at(cue.pulse, 0.55);
          this.pulses.set(o.id, 0);
        } else this.pulses.set(o.id, Math.min(1000, elapsed));
        this.props.set(o.id, state);
      }
      this.previous.set(o.id, { ...s });
    }
  }
}
