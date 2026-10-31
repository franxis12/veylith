// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createObject, LIBRARY } from '../editor/library';
import type { WorldKind, WorldObject } from '../game/systems/world/types';
import { WorldState } from '../game/systems/world/WorldState';
import { WorldAudio } from '../game/systems/audio/WorldAudio';
import { SceneSound } from '../game/systems/audio/SceneSound';
import { PROP_SOUNDS } from '../game/systems/audio/propSounds';
import { SOUNDS } from '../services/audio/catalog';
import type { AudioScope } from '../services/audio/AudioScope';
import inventory from '../../docs/audio-inventory.json';

const object = (kind: WorldKind) =>
  createObject(
    LIBRARY.find((e) => e.id === `world:${kind}`)!,
    0,
    0,
    [],
  ) as WorldObject;
function fixture(objects: WorldObject[]) {
  const scope = { play: vi.fn(), loop: vi.fn(), preload: vi.fn() };
  const sound = new SceneSound(scope as unknown as AudioScope);
  const state = new WorldState(objects);
  const audio = new WorldAudio(state, sound);
  return { scope, state, audio, sound };
}
it('keeps a wide lake audible at both banks and quiet beyond its surface range', () => {
  const lake = object('deep_water');
  lake.effect = { enabled: true, x: 0, y: 0, width: 3500, height: 100 };
  const { scope, sound, audio } = fixture([lake]);
  for (const x of [0, 3500]) {
    sound.listener(x, 0);
    audio.update(16, () => undefined);
    expect(scope.loop.mock.calls.at(-1)?.[2]).toBe(0.7);
  }
  sound.listener(-1000, 0);
  audio.update(16, () => undefined);
  expect(scope.loop.mock.calls.at(-1)?.[2]).toBe(0);
});
it('keeps real asset paths and bytes, with a mapping for every decorative type', () => {
  expect(Object.keys(SOUNDS)).toHaveLength(74);
  for (const e of inventory.files) {
    expect(SOUNDS[e.id as keyof typeof SOUNDS].path).toBe(e.path.slice(1));
    expect(
      createHash('sha256')
        .update(readFileSync(`public${e.path}`))
        .digest('hex'),
    ).toBe(e.sha256);
  }
  expect(Object.keys(PROP_SOUNDS)).toHaveLength(11);
});
it('does not hum an active but blocked elevator and emits one stop per real movement transition', () => {
  const o = object('mechanical_elevator');
  const { scope, state, audio } = fixture([o]);
  state.get(o.id).active = true;
  audio.update(16, () => undefined);
  expect(scope.play).not.toHaveBeenCalled();
  expect(scope.loop.mock.calls.at(-1)?.[2]).toBe(0);
  state.get(o.id).progress = 0.1;
  audio.update(16, () => undefined);
  expect(scope.play.mock.calls[0]?.[0]).toBe('elevator_start');
  audio.update(16, () => undefined);
  audio.update(16, () => undefined);
  expect(scope.play.mock.calls.map((c) => c[0])).toEqual([
    'elevator_start',
    'elevator_stop',
  ]);
});
it('switches bridge direction, distinguishes boiler heat/steam, and breaks a wall only at its final hit', () => {
  const bridge = object('retractable_bridge'),
    boiler = object('steam_boiler'),
    wall = object('stone_wall');
  if (wall.behavior.kind === 'breakable') wall.behavior.strikes = 2;
  const { state, scope, audio } = fixture([bridge, boiler, wall]);
  state.get(bridge.id).active = true;
  state.get(bridge.id).progress = 0.4;
  audio.update(16, () => undefined);
  expect(
    scope.loop.mock.calls.some((c) => c[1] === 'bridge_extend' && c[2] > 0),
  ).toBe(true);
  state.get(bridge.id).active = false;
  state.get(bridge.id).progress = 0.3;
  state.hit(boiler.id, 'fire');
  state.strike(wall.id);
  audio.update(16, () => undefined);
  expect(scope.play.mock.calls.some((c) => c[0] === 'wall_break')).toBe(false);
  expect(
    scope.loop.mock.calls.some((c) => c[1] === 'boiler_heating' && c[2] > 0),
  ).toBe(true);
  state.hit(boiler.id, 'fire');
  for (let i = 0; i < 3; i++) state.hit(boiler.id, 'water');
  state.strike(wall.id);
  audio.update(16, () => undefined);
  audio.update(16, () => undefined);
  expect(
    scope.play.mock.calls.filter((c) => c[0] === 'wall_break'),
  ).toHaveLength(1);
  expect(
    scope.loop.mock.calls.some((c) => c[1] === 'boiler_steam' && c[2] > 0),
  ).toBe(true);
  expect(
    scope.loop.mock.calls.some((c) => c[1] === 'bridge_retract' && c[2] > 0),
  ).toBe(true);
});
it('follows decorative animation states once and leaves their physics/state untouched', () => {
  const barrier = object('energy_barrier');
  const { state, audio, scope } = fixture([barrier]);
  const before = structuredClone([...state.states]);
  audio.update(16, () => 'barrier_activate:animated');
  audio.update(16, () => 'barrier_activate:animated');
  expect(
    scope.play.mock.calls.filter((c) => c[0] === 'barrier_activate'),
  ).toHaveLength(1);
  audio.update(16, () => 'barrier_active:animated');
  expect(scope.loop.mock.calls.at(-1)?.[1]).toBe('barrier_loop');
  audio.update(16, () => 'barrier_deactivate:animated');
  expect(scope.loop.mock.calls.at(-1)?.[2]).toBe(0);
  expect([...state.states]).toEqual(before);
});
