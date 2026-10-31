// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { WorldState } from '../game/systems/world/WorldState';
import type { WorldKind, WorldObject } from '../game/systems/world/types';

function object(kind: WorldKind, id: string): WorldObject {
  const o = createObject(
    LIBRARY.find((i) => i.id === `world:${kind}`)!,
    300,
    300,
    [],
  ) as WorldObject;
  o.id = id;
  return o;
}
function fixture() {
  const lift = object('mechanical_elevator', 'lift');
  lift.behavior = {
    kind: 'elevator',
    requires: ['lever'],
    autostart: false,
    travelX: 0,
    travelY: -100,
    speed: 100,
    mode: 'controlled',
  };
  const lever = object('interactive_lever', 'lever');
  // Legacy signal-only lever: no automatic migration required.
  lever.behavior = { kind: 'lever', initiallyActive: false };
  const back = object('interactive_lever', 'back');
  back.behavior = {
    kind: 'lever',
    initiallyActive: false,
    action: 'deactivate',
    targets: ['lift'],
  };
  const state = new WorldState([lever, back, lift]);
  const step = (count = 1) => {
    for (let i = 0; i < count; i++)
      state.advance(50, (id) => state.get(id).active);
  };
  return { lift, lever, back, state, step };
}

describe('reversible elevator controls', () => {
  it('a second press returns to the original dock and waits there without cycling', () => {
    const { state, step } = fixture();
    step(30);
    expect(state.get('lift').progress).toBe(0);
    state.toggle('lever');
    step(30);
    expect(state.get('lift').progress).toBe(1);
    step(30);
    expect(state.get('lift').progress).toBe(1);
    state.toggle('lever');
    step(10);
    expect(state.get('lift').progress).toBeCloseTo(0.5);
    expect(state.get('lift').direction).toBe(-1);
    step(30);
    expect(state.get('lift').progress).toBe(0);
    state.toggle('lever');
    step(30);
    expect(state.get('lift').progress).toBe(1);
  });
  it('reverses in flight without teleporting and uses vector travel distance', () => {
    const { state, lift, step } = fixture();
    if (lift.behavior.kind !== 'elevator') throw Error();
    lift.behavior.travelX = 60;
    lift.behavior.travelY = -80;
    state.toggle('lever');
    step(8);
    expect(state.get('lift').progress).toBeCloseTo(0.4);
    state.toggle('lever');
    step();
    expect(state.get('lift').progress).toBeCloseTo(0.35);
    state.toggle('lever');
    step();
    expect(state.get('lift').progress).toBeCloseTo(0.4);
  });
  it.each(['activate', 'toggle'] as const)(
    'a %s lever and a return lever can operate repeatedly',
    (action) => {
      const { lever, state, step } = fixture();
      lever.behavior = {
        kind: 'lever',
        initiallyActive: false,
        action,
        targets: ['lift'],
      };
      for (let i = 0; i < 3; i++) {
        state.toggle('lever');
        step(30);
        expect(state.get('lift').progress).toBe(1);
        state.toggle('back');
        step(5);
        state.toggle('back');
        step(30); // Repeated return never sends it outward.
        expect(state.get('lift').progress).toBe(0);
      }
    },
  );
  it('two toggle levers invert the receiver independently of their own signal history', () => {
    const { lever, back, state, step } = fixture();
    lever.behavior = {
      kind: 'lever',
      initiallyActive: false,
      action: 'toggle',
      targets: ['lift'],
    };
    back.behavior = {
      kind: 'lever',
      initiallyActive: false,
      action: 'toggle',
      targets: ['lift'],
    };
    for (const [id, endpoint] of [
      ['lever', 1],
      ['back', 0],
      ['back', 1],
      ['lever', 0],
    ] as const) {
      state.toggle(id);
      step(30);
      expect(state.get('lift').progress).toBe(endpoint);
    }
  });
  it('disabled controls cannot command and restart forgets all commands', () => {
    const { lever, back, lift, state, step } = fixture();
    lever.effect.enabled = false;
    state.toggle('lever');
    step(30);
    expect(state.get('lift').progress).toBe(0);
    lever.effect.enabled = true;
    state.toggle('lever');
    step(30);
    state.toggle('back');
    step(5);
    const fresh = new WorldState([lever, back, lift]);
    fresh.advance(0, () => false);
    expect(fresh.get('lift').progress).toBe(0);
    expect(fresh.get('lever').active).toBe(false);
    expect(fresh.get('back').active).toBe(false);
    fresh.toggle('lever');
    fresh.advance(50, (id) => fresh.get(id).active);
    expect(fresh.get('lift').progress).toBeGreaterThan(0);
  });
  it.each(['once', 'pingpong'] as const)(
    'preserves the saved %s pause-without-power behavior',
    (mode) => {
      const { lift, state, step } = fixture();
      if (lift.behavior.kind !== 'elevator') throw Error();
      lift.behavior.mode = mode;
      state.toggle('lever');
      step(10);
      state.toggle('lever');
      step(20);
      expect(state.get('lift').progress).toBeCloseTo(0.5);
      state.toggle('lever');
      step(15);
      expect(state.get('lift').progress).toBeCloseTo(
        mode === 'once' ? 1 : 0.75,
      );
    },
  );
  it('initial lever signals can start a ride, but initial command settings do not issue orders', () => {
    const { lever, back, lift } = fixture();
    if (lever.behavior.kind !== 'lever') throw Error();
    lever.behavior.initiallyActive = true;
    const fresh = new WorldState([lever, back, lift]);
    fresh.advance(50, (id) => fresh.get(id).active);
    expect(fresh.get('lift').progress).toBeGreaterThan(0);
  });
});

describe('lever command persistence and editing', () => {
  it('round trips optional legacy fields and remaps targets on rename, duplicate, undo and redo', () => {
    const { lever, back, lift } = fixture(),
      doc = newLevel();
    doc.objects.push(lever, back, lift);
    expect(parseLevel(JSON.parse(serializeLevel(doc)))).toEqual(doc);
    const model = new EditorModel(doc);
    model.rename('lift', 'platform');
    model.select(['lever', 'back', 'platform']);
    model.duplicate();
    const copy = model
      .getSnapshot()
      .document.objects.find((o) => o.id === 'back-2') as WorldObject;
    expect(copy.behavior).toMatchObject({ targets: ['platform-2'] });
    expect(validateLevel(model.getSnapshot().document)).toEqual([]);
    model.select(['platform-2']);
    model.remove();
    expect(validateLevel(model.getSnapshot().document).join()).toContain(
      'referencias',
    );
    model.undo();
    expect(validateLevel(model.getSnapshot().document)).toEqual([]);
    model.redo();
    expect(validateLevel(model.getSnapshot().document).join()).toContain(
      'referencias',
    );
  });
  it.each([
    { action: 'invalid' },
    { targets: ['missing'] },
    { targets: ['lever'] },
    { targets: ['lift', 'lift'] },
    { targets: 'lift' },
    { targets: [null] },
  ])('rejects invalid lever settings before saving: %j', (patch) => {
    const { lever, back, lift } = fixture(),
      doc = newLevel();
    Object.assign(back.behavior, patch);
    doc.objects.push(lever, back, lift);
    expect(validateLevel(doc).length).toBeGreaterThan(0);
  });
});
