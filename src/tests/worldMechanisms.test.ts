// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import { resizeObject, editCollider } from '../editor/geometry';
import {
  serializeLevel,
  parseLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { WorldState, safeElement } from '../game/systems/world/WorldState';
import { WORLD_KINDS } from '../game/systems/world/types';
import type { WorldKind, WorldObject } from '../game/systems/world/types';
import { compileLevel } from '../game/levels/schema/compile';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { LevelRepository } from '../../server/levelRepository';
const object = (kind: WorldKind) =>
  createObject(
    LIBRARY.find((i) => i.id === `world:${kind}`)!,
    300,
    300,
    [],
  ) as WorldObject;
describe('interactive world persistence and editing', () => {
  it('round trips all twenty real objects and every independent rectangle', () => {
    const d = newLevel('world-roundtrip');
    d.objects.push(...WORLD_KINDS.map(object));
    expect(validateLevel(d)).toEqual([]);
    expect(parseLevel(JSON.parse(serializeLevel(d)))).toEqual(d);
    const fan = object('wind_fan'),
      resized = resizeObject(fan, { x: 99, y: 99 }, 0) as WorldObject;
    expect(resized.collider).toEqual(fan.collider);
    expect(resized.effect).toEqual(fan.effect);
    const effect = editCollider(fan.effect, 'se', { x: 128, y: 32 }, 0);
    expect(effect.width).toBe(fan.effect.width + 128);
    expect(fan.width).toBe(256);
  });
  it('renames and duplicates connected groups without linking the copies to the originals', () => {
    const d = newLevel(),
      lever = object('interactive_lever'),
      elevator = object('mechanical_elevator');
    if (elevator.behavior.kind !== 'elevator') throw Error();
    elevator.behavior.requires = [lever.id];
    d.objects.push(lever, elevator);
    const m = new EditorModel(d);
    m.rename(lever.id, 'switch');
    m.select(['switch', elevator.id]);
    m.duplicate();
    const copy = m
      .getSnapshot()
      .document.objects.find((o) => o.id === `${elevator.id}-2`) as WorldObject;
    expect('requires' in copy.behavior && copy.behavior.requires).toEqual([
      'switch-2',
    ]);
    m.undo();
    expect(m.getSnapshot().document.objects.length).toBe(5);
    m.redo();
    expect(m.getSnapshot().document.objects.length).toBe(7);
    m.select(['switch-2']);
    m.remove();
    expect(validateLevel(m.getSnapshot().document).join()).toContain(
      'referencias',
    );
  });
  it.each([
    (o: WorldObject) => {
      o.effect.width = 0;
    },
    (o: WorldObject) => {
      o.effect.x = Infinity;
    },
    (o: WorldObject) => {
      o.state = 'invented';
    },
    (o: WorldObject) => {
      o.asset = 'coin';
    },
    (o: WorldObject) => {
      o.behavior = { kind: 'prop' };
    },
    (o: WorldObject) => {
      if (o.behavior.kind === 'elevator') o.behavior.requires = ['missing'];
    },
    (o: WorldObject) => {
      if (o.behavior.kind === 'elevator') o.behavior.speed = NaN;
    },
    (o: WorldObject) => {
      if (o.behavior.kind === 'elevator') o.behavior.travelY = 0;
    },
  ])('rejects malformed world data before saving or playing', (change) => {
    const d = newLevel(),
      o = object('mechanical_elevator');
    change(o);
    d.objects.push(o);
    expect(validateLevel(d).length).toBeGreaterThan(0);
  });
  it('saves and reopens actual JSON while invalid data and stale writes preserve the file', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'veylith-world-')));
    try {
      const repo = new LevelRepository(dir),
        d = newLevel('world-save');
      d.objects.push(...WORLD_KINDS.map(object));
      const save = await repo.save(d.id, d, '*');
      expect((await repo.read(d.id)).document).toEqual(d);
      const broken = structuredClone(d);
      (broken.objects.at(-1) as WorldObject).state = 'missing';
      await expect(repo.save(d.id, broken, save.etag)).rejects.toThrow();
      await expect(repo.save(d.id, d, '*')).rejects.toMatchObject({
        status: 409,
      });
      expect((await repo.read(d.id)).document).toEqual(d);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
describe('world mechanisms', () => {
  it('requires Water for the wheel and both elements for the boiler in either order', () => {
    const wheel = object('waterwheel'),
      boiler = object('steam_boiler'),
      s = new WorldState([wheel, boiler]);
    s.hit(wheel.id, 'fire');
    expect(s.get(wheel.id).active).toBe(false);
    for (let i = 0; i < 3; i++) s.hit(wheel.id, 'water');
    expect(s.get(wheel.id).active).toBe(true);
    for (let i = 0; i < 2; i++) s.hit(boiler.id, 'fire');
    expect(s.get(boiler.id).active).toBe(false);
    for (let i = 0; i < 3; i++) s.hit(boiler.id, 'water');
    expect(s.get(boiler.id).active).toBe(true);
    expect(new WorldState([wheel, boiler]).get(boiler.id).active).toBe(false);
    const reverse = new WorldState([boiler]);
    for (let i = 0; i < 3; i++) reverse.hit(boiler.id, 'water');
    expect(reverse.get(boiler.id).active).toBe(false);
    for (let i = 0; i < 2; i++) reverse.hit(boiler.id, 'fire');
    expect(reverse.get(boiler.id).active).toBe(true);
  });
  it('ignores disabled receptors and requires the configured Earth strike count', () => {
    const wheel = object('waterwheel');
    wheel.effect.enabled = false;
    const wall = object('stone_wall');
    wall.behavior = { kind: 'breakable', strikes: 2 };
    const s = new WorldState([wheel, wall]);
    for (let i = 0; i < 9; i++) s.hit(wheel.id, 'water');
    expect(s.get(wheel.id).active).toBe(false);
    s.hit(wall.id, 'fire');
    expect(s.get(wall.id).active).toBe(false);
    s.strike(wall.id);
    expect(s.get(wall.id).active).toBe(false);
    s.strike(wall.id);
    expect(s.get(wall.id).active).toBe(true);
  });
  it('toggles signals, moves at configured speed, stops without power and reverses at endpoints', () => {
    const lever = object('interactive_lever'),
      elevator = object('mechanical_elevator');
    if (elevator.behavior.kind !== 'elevator') throw Error();
    elevator.behavior.requires = [lever.id];
    elevator.behavior.mode = 'pingpong';
    elevator.behavior.travelY = -100;
    elevator.behavior.speed = 100;
    const s = new WorldState([lever, elevator]),
      signal = (id: string) => s.get(id).active;
    s.advance(50, signal);
    expect(s.get(elevator.id).progress).toBe(0);
    s.toggle(lever.id);
    for (let i = 0; i < 10; i++) s.advance(50, signal);
    expect(s.get(elevator.id).progress).toBeCloseTo(0.5);
    s.toggle(lever.id);
    s.advance(50, signal);
    expect(s.get(elevator.id).progress).toBeCloseTo(0.5);
    s.toggle(lever.id);
    for (let i = 0; i < 12; i++) s.advance(50, signal);
    expect(s.get(elevator.id).direction).toBe(-1);
    expect(s.get(elevator.id).progress).toBeLessThan(1);
  });
  it('bridge retracts when any required source goes off and honors its duration', () => {
    const o = object('retractable_bridge');
    o.behavior = {
      kind: 'bridge',
      requires: ['a', 'b'],
      autostart: true,
      duration: 500,
    };
    const s = new WorldState([o]);
    for (let i = 0; i < 12; i++) s.advance(50, () => true);
    expect(s.get(o.id).progress).toBe(1);
    s.advance(50, (id) => id === 'a');
    expect(s.get(o.id).progress).toBeCloseTo(0.9);
    for (let i = 0; i < 12; i++) s.advance(50, () => false);
    expect(s.get(o.id).progress).toBe(0);
  });
  it('new source IDs work with existing door and exit requirements, including switch off', () => {
    const d = newLevel(),
      lever = object('interactive_lever');
    d.objects.push(lever);
    const door = createObject(
      LIBRARY.find((i) => i.id === 'doorClosed')!,
      800,
      200,
      d.objects,
    );
    if (door.type !== 'door') throw Error();
    door.requires = [lever.id];
    d.objects.push(door);
    const p = new ForestPuzzleState(compileLevel(d));
    expect(p.gateOpen(door.id)).toBe(false);
    p.setWorldSignal(lever.id, true);
    expect(p.gateOpen(door.id)).toBe(true);
    p.setWorldSignal(lever.id, false);
    expect(p.gateOpen(door.id)).toBe(false);
  });
  it.each(['water', 'fire', 'air', 'earth'] as const)(
    'applies liquid rules to %s',
    (element) => {
      expect(safeElement('heat', element)).toBe(element === 'fire');
      expect(safeElement('lake', element)).toBe(element === 'water');
    },
  );
});
