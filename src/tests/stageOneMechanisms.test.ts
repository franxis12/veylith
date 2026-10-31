// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { WorldState } from '../game/systems/world/WorldState';
import { STAGE_ONE_KINDS } from '../game/systems/world/types';
import type { WorldObject, WorldKind } from '../game/systems/world/types';
import {
  canMaterialize,
  floatStep,
  onTop,
  wantsSolid,
} from '../game/systems/world/mechanismPhysics';
import { projectileContact } from '../game/systems/powers/projectileCollision';

function object(kind: WorldKind): WorldObject {
  return createObject(
    LIBRARY.find((i) => i.id === `world:${kind}`)!,
    300,
    300,
    [],
  ) as WorldObject;
}
const yes = () => true,
  no = () => false;
describe('stage one clocks and commands', () => {
  it('opens on rising edges only, warns, expires and resets its timer on a repeated activate command', () => {
    const door = object('timed_door');
    if (door.behavior.kind !== 'timedDoor') throw Error();
    door.behavior.requires = ['signal'];
    door.behavior.openMs = 1000;
    door.behavior.warningMs = 200;
    const state = new WorldState([door]);
    state.advance(0, yes);
    expect(wantsSolid(door, state.get(door.id))).toBe(false);
    state.advance(850, yes);
    expect(state.get(door.id).remainingMs).toBe(150);
    state.command(door.id, 'activate');
    expect(state.get(door.id).remainingMs).toBe(1000);
    state.advance(1000, yes);
    expect(wantsSolid(door, state.get(door.id))).toBe(true);
    state.advance(500, yes);
    expect(state.get(door.id).active).toBe(false);
    state.command(door.id, 'activate');
    state.command(door.id, 'deactivate');
    expect(state.get(door.id).remainingMs).toBe(0);
    const fresh = new WorldState([door]);
    fresh.advance(0, no);
    expect(fresh.get(door.id).active).toBe(false);
    fresh.advance(0, yes);
    fresh.advance(500, no);
    fresh.advance(0, yes);
    expect(fresh.get(door.id).remainingMs).toBe(1000);
  });
  it('can start open and ignore reactivation; zero time and invalid time do not advance clocks', () => {
    const door = object('timed_door');
    if (door.behavior.kind !== 'timedDoor') throw Error();
    door.behavior.initiallyOpen = true;
    door.behavior.retrigger = 'ignore';
    const s = new WorldState([door]);
    s.advance(500, no);
    s.command(door.id, 'activate');
    expect(s.get(door.id).remainingMs).toBe(2500);
    s.advance(0, no);
    s.advance(NaN, no);
    s.advance(-50, no);
    expect(s.get(door.id).remainingMs).toBe(2500);
    expect(new WorldState([door]).get(door.id).remainingMs).toBe(3000);
  });
  it('cycles with exact boundaries and starts a contact delay only after being stood on', () => {
    const p = object('disappearing_platform');
    if (p.behavior.kind !== 'phasePlatform') throw Error();
    p.behavior.solidMs = 500;
    p.behavior.hiddenMs = 300;
    const cycle = new WorldState([p]);
    cycle.advance(499, no);
    expect(wantsSolid(p, cycle.get(p.id))).toBe(true);
    cycle.advance(1, no);
    expect(wantsSolid(p, cycle.get(p.id))).toBe(false);
    cycle.advance(300, no);
    expect(wantsSolid(p, cycle.get(p.id))).toBe(true);
    p.behavior.mode = 'contact';
    const contact = new WorldState([p]);
    contact.advance(3000, no);
    expect(contact.get(p.id).solid).toBe(true);
    contact.standOn(p.id);
    contact.advance(499, no);
    expect(contact.get(p.id).solid).toBe(true);
    contact.advance(1, no);
    expect(contact.get(p.id).solid).toBe(false);
    contact.advance(300, no);
    expect(contact.get(p.id).solid).toBe(true);
    contact.advance(2000, no);
    expect(contact.get(p.id).solid).toBe(true);
    contact.command(p.id, 'deactivate');
    contact.advance(0, no);
    expect(contact.get(p.id).phaseMs).toBe(0);
  });
  it('executes all three switch actions against multiple IDs; cooldown and projectile element are enforced', () => {
    const sw = object('fire_switch'),
      barrier = object('energy_barrier'),
      door = object('timed_door');
    if (sw.behavior.kind !== 'switch') throw Error();
    sw.behavior.targets = [barrier.id, door.id];
    sw.behavior.trigger = 'fire';
    sw.behavior.action = 'deactivate';
    const state = new WorldState([sw, barrier, door]);
    state.advance(0, no);
    state.hit(sw.id, 'water');
    expect(state.get(barrier.id).active).toBe(true);
    state.hit(sw.id, 'fire');
    state.advance(0, no);
    expect(state.get(barrier.id).active).toBe(false);
    sw.behavior.action = 'activate';
    expect(state.trigger(sw.id)).toBe(false);
    state.advance(250, no);
    expect(state.trigger(sw.id)).toBe(true);
    state.advance(0, no);
    expect(state.get(barrier.id).active).toBe(true);
    expect(state.get(door.id).remainingMs).toBe(3000);
    sw.behavior.action = 'toggle';
    state.advance(250, no);
    state.trigger(sw.id);
    state.advance(0, no);
    expect(state.get(barrier.id).active).toBe(false);
    expect(state.get(door.id).active).toBe(false);
    sw.effect.enabled = false;
    state.advance(250, no);
    expect(state.trigger(sw.id)).toBe(false);
    const fresh = new WorldState([sw, barrier, door]);
    fresh.advance(0, no);
    expect(fresh.get(barrier.id).active).toBe(true);
    expect(fresh.get(sw.id).active).toBe(false);
  });
  it('switch signals open and close legacy doors without changing progress or level data', () => {
    const d = newLevel(),
      sw = object('fire_switch');
    const gate = createObject(
      LIBRARY.find((i) => i.id === 'doorClosed')!,
      800,
      0,
      [],
    );
    if (gate.type !== 'door') throw Error();
    gate.requires = [sw.id];
    d.objects.push(sw, gate);
    const before = serializeLevel(d),
      p = new ForestPuzzleState(compileLevel(d));
    p.setWorldSignal(sw.id, true);
    expect(p.gateOpen(gate.id)).toBe(true);
    p.setWorldSignal(sw.id, false);
    expect(p.gateOpen(gate.id)).toBe(false);
    expect(serializeLevel(d)).toBe(before);
  });
});
describe('stage one collision contracts', () => {
  const platform = { left: 100, right: 300, top: 500, bottom: 520 };
  const player = {
    left: 150,
    right: 212,
    top: 326,
    bottom: 500,
    velocity: { y: 0 },
    blocked: { down: true },
    touching: { down: false },
  };
  it('bounces once per eligible top contact, never on a side, underside or rising contact', () => {
    expect(onTop(player, platform)).toBe(true);
    expect(onTop({ ...player, left: 300, right: 362 }, platform)).toBe(false);
    expect(onTop({ ...player, top: 520, bottom: 694 }, platform)).toBe(false);
    expect(onTop({ ...player, velocity: { y: -10 } }, platform)).toBe(false);
    const pad = object('elemental_bounce_pad'),
      state = new WorldState([pad]);
    state.advance(0, no);
    expect(state.bounce(pad.id)).toBe(true);
    expect(state.bounce(pad.id)).toBe(false);
    state.advance(250, no);
    expect(state.bounce(pad.id)).toBe(true);
    state.command(pad.id, 'deactivate');
    state.advance(250, no);
    expect(state.bounce(pad.id)).toBe(false);
    expect(wantsSolid(pad, state.get(pad.id))).toBe(true);
    expect(new WorldState([pad]).get(pad.id).launches).toBe(0);
  });
  it('defers materialization for overlapping bodies but permits flush contact; disabled barriers pass shots', () => {
    expect(canMaterialize(platform, [player])).toBe(true);
    expect(canMaterialize(platform, [{ ...player, bottom: 501 }])).toBe(false);
    const barrier = object('energy_barrier'),
      state = new WorldState([barrier]);
    state.advance(0, no);
    expect(
      projectileContact(0, 500, 510, 2, [
        { ...platform, enable: wantsSolid(barrier, state.get(barrier.id)) },
      ]),
    ).toBeDefined();
    state.command(barrier.id, 'deactivate');
    state.advance(0, no);
    expect(
      projectileContact(0, 500, 510, 2, [
        { ...platform, enable: wantsSolid(barrier, state.get(barrier.id)) },
      ]),
    ).toBeUndefined();
  });
  it('falls onto dry terrain, rises to configured draft in water, drifts and stops at a bank', () => {
    const b = {
      kind: 'float',
      draft: 0.25,
      riseSpeed: 160,
      currentSpeed: 100,
    } as const;
    const ground = { left: 0, right: 1000, top: 600, bottom: 900 };
    let r = { left: 100, right: 250, top: 200, bottom: 348 },
      vy = 0;
    for (let i = 0; i < 150; i++) {
      const s = floatStep(r, vy, b, [], [ground], 16);
      r = s.next;
      vy = s.vy;
    }
    expect(r.bottom).toBe(600);
    expect(r.left).toBe(100);
    const lake = { left: 0, right: 1000, top: 650, bottom: 1000 },
      bank = { left: 600, right: 750, top: 400, bottom: 900 };
    r = { left: 100, right: 250, top: 680, bottom: 828 };
    vy = 0;
    for (let i = 0; i < 350; i++) {
      const s = floatStep(r, vy, b, [lake], [bank], 16);
      r = s.next;
      vy = s.vy;
      expect(s.floating).toBe(true);
    }
    expect(r.top).toBe(539);
    expect(r.right).toBe(600);
    expect(
      floatStep({ ...r, left: 1100, right: 1250 }, 0, b, [lake], [], 16)
        .floating,
    ).toBe(false);
  });
});
describe('stage one persistence and editor links', () => {
  it('loads all six laboratory files without adding them to the campaign', async () => {
    const dir = new URL('../game/levels/data/', import.meta.url);
    const stageOne = [
      'lab-bounce.json',
      'lab-energy-barrier.json',
      'lab-floating-block.json',
      'lab-phase-platform.json',
      'lab-switch.json',
      'lab-timed-door.json',
    ];
    const names = (await readdir(dir)).filter((p) => stageOne.includes(p));
    expect(names).toHaveLength(6);
    for (const name of names) {
      const d = parseLevel(
        JSON.parse(await readFile(new URL(name, dir), 'utf8')),
      );
      expect(parseLevel(JSON.parse(serializeLevel(d)))).toEqual(d);
    }
  });
  it('preserves old visual props and round trips all functional configurations', () => {
    const doc = newLevel();
    doc.objects.push(...STAGE_ONE_KINDS.map(object));
    expect(parseLevel(JSON.parse(serializeLevel(doc)))).toEqual(doc);
    for (const o of doc.objects)
      if (o.type === 'world') o.behavior = { kind: 'prop' };
    expect(parseLevel(JSON.parse(serializeLevel(doc)))).toEqual(doc);
  });
  it('remaps command targets on rename/duplication, preserves undo and rejects dangling or cyclic commands', () => {
    const doc = newLevel(),
      sw = object('fire_switch'),
      door = object('timed_door');
    if (sw.behavior.kind !== 'switch') throw Error();
    sw.behavior.targets = [door.id];
    doc.objects.push(sw, door);
    const m = new EditorModel(doc);
    m.rename(door.id, 'gate');
    m.select([sw.id, 'gate']);
    m.duplicate();
    const copy = m
      .getSnapshot()
      .document.objects.find((o) => o.id === `${sw.id}-2`) as WorldObject;
    expect(copy.behavior.kind === 'switch' && copy.behavior.targets).toEqual([
      'gate-2',
    ]);
    m.select(['gate-2']);
    m.remove();
    expect(validateLevel(m.getSnapshot().document).join()).toContain(
      'referencias',
    );
    m.undo();
    expect(validateLevel(m.getSnapshot().document)).toEqual([]);
    sw.behavior.targets = [sw.id];
    expect(validateLevel(doc).length).toBeGreaterThan(0);
  });
  it.each([
    ['timed_door', { openMs: 0 }],
    ['timed_door', { warningMs: 999999 }],
    ['disappearing_platform', { hiddenMs: -1 }],
    ['elemental_bounce_pad', { speed: Infinity }],
    ['floating_wooden_block', { draft: 1 }],
    ['fire_switch', { action: 'invalid' }],
    ['energy_barrier', { requires: ['missing'] }],
  ] as const)('rejects invalid %s configuration', (kind, patch) => {
    const d = newLevel(),
      o = object(kind);
    Object.assign(o.behavior, patch);
    d.objects.push(o);
    expect(validateLevel(d).length).toBeGreaterThan(0);
  });
});
