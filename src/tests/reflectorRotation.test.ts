// @vitest-environment node
import { expect, it } from 'vitest';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import type { WorldObject } from '../game/systems/world/types';
import { WorldState } from '../game/systems/world/WorldState';
import { ReflectorInteraction } from '../game/systems/world/ReflectorInteraction';
import { traceBeam } from '../game/systems/world/advancedRules';
import { ActionState } from '../game/systems/input/ActionState';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
const box = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});
const mirror = () =>
  createObject(
    LIBRARY.find((o) => o.id === 'world:reflector')!,
    300,
    300,
    [],
  ) as WorldObject;
const idle = () => new ActionState().read();

it('rotates a diagonal ray to a receiver without rounding its direction or exceeding its range', () => {
  const run = (solids: ReturnType<typeof box>[] = []) =>
    traceBeam(
      { x: 0, y: 200 },
      'right',
      800,
      8,
      [
        {
          id: 'm',
          center: { x: 200, y: 200 },
          halfLength: 50,
          orientation: 'nw',
          angle: 112.5,
        },
      ],
      [{ id: 'r', ...box(290, 290, 310, 310) }],
      solids,
    );
  const result = run();
  expect([...result.hits]).toEqual(['r']);
  expect(result.segments).toHaveLength(2);
  const last = result.segments[1]!;
  expect(last.to.x - last.from.x).toBeCloseTo(last.to.y - last.from.y);
  expect(run([box(245, 240, 246, 260)]).hits.size).toBe(0);
  const short = traceBeam(
    { x: 0, y: 200 },
    'right',
    230,
    8,
    [
      {
        id: 'm',
        center: { x: 200, y: 200 },
        halfLength: 50,
        orientation: 'nw',
        angle: 112.5,
      },
    ],
    [],
    [],
  );
  expect(
    short.segments.reduce(
      (sum, s) => sum + Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y),
      0,
    ),
  ).toBeLessThanOrEqual(230);
});
it('preserves back-face absorption and finite surfaces at arbitrary angles', () => {
  const m = {
    id: 'm',
    center: { x: 200, y: 200 },
    halfLength: 50,
    orientation: 'nw' as const,
    angle: 22.5,
  };
  expect(
    traceBeam({ x: 0, y: 200 }, 'right', 800, 8, [m], [], []).segments,
  ).toHaveLength(1);
  expect(
    traceBeam(
      { x: 0, y: 500 },
      'right',
      800,
      8,
      [{ ...m, angle: 112.5 }],
      [],
      [],
    ).segments[0]?.mirror,
  ).toBeUndefined();
});
it('loads old orientations, normalizes changes, never mutates the document and restores on restart', () => {
  const m = mirror(),
    doc = newLevel();
  doc.objects.push(m);
  const saved = serializeLevel(doc),
    state = new WorldState([m]);
  expect(state.get(m.id).mirrorAngle).toBe(225);
  state.rotateReflector(m.id, -22.5);
  expect(state.get(m.id).mirrorAngle).toBe(337.5);
  expect(serializeLevel(doc)).toBe(saved);
  expect(new WorldState([m]).get(m.id).mirrorAngle).toBe(225);
  if (m.behavior.kind !== 'reflector') throw Error();
  m.behavior.angle = 123.5;
  m.behavior.rotatable = false;
  const restored = parseLevel(JSON.parse(serializeLevel(doc)));
  expect(restored).toEqual(doc);
  const locked = new WorldState([m]);
  expect(locked.rotateReflector(m.id, 0)).toBe(false);
  expect(locked.get(m.id).mirrorAngle).toBe(123.5);
});
it.each([-1, 360, NaN, Infinity, '20'])(
  'rejects invalid initial angles %s',
  (angle) => {
    const doc = newLevel(),
      m = mirror();
    Object.assign(m.behavior, { angle });
    doc.objects.push(m);
    expect(validateLevel(doc).length).toBeGreaterThan(0);
  },
);
it('opens only nearby in sight, changes angle while controlling, and closes on release or when leaving reach', () => {
  const m = mirror(),
    state = new WorldState([m]),
    body = box(200, 200, 300, 256),
    p = box(110, 82, 172, 256);
  const control = new ReflectorInteraction(
    state,
    () => body,
    () => [body],
  );
  expect(control.update(p, true, idle(), 100).blocked).toBe(false);
  expect(control.snapshot?.active).toBe(false);
  expect(
    control.update(
      p,
      true,
      { ...idle(), abilityPressed: true, abilityHeld: true },
      16,
    ),
  ).toEqual({ blocked: true, changed: true });
  expect(control.snapshot?.active).toBe(true);
  control.update(
    p,
    true,
    { ...idle(), reflectorAngle: 202.5, abilityHeld: true },
    100,
  );
  expect(state.get(m.id).mirrorAngle).toBe(202.5);
  control.update(p, true, { ...idle(), direction: 1, abilityHeld: true }, 50);
  expect(state.get(m.id).mirrorAngle).toBe(205.5);
  expect(control.update(p, true, idle(), 16).blocked).toBe(true);
  expect(control.snapshot?.active).toBe(false);
  control.update(
    p,
    true,
    { ...idle(), abilityPressed: true, abilityHeld: true },
    16,
  );
  control.update(box(-500, 82, -438, 256), true, idle(), 100);
  expect(control.snapshot).toBeNull();
});
it('cannot interact through a wall, while airborne, with disabled or fixed reflectors; chooses one nearest target', () => {
  const m = mirror(),
    state = new WorldState([m]),
    body = box(200, 200, 300, 256),
    p = box(110, 82, 172, 256);
  const wall = box(180, 0, 190, 300);
  const blocked = new ReflectorInteraction(
    state,
    () => body,
    () => [body, wall],
  );
  expect(
    blocked.update(
      p,
      true,
      { ...idle(), abilityPressed: true, abilityHeld: true },
      100,
    ).blocked,
  ).toBe(false);
  expect(blocked.snapshot).toBeNull();
  const c = new ReflectorInteraction(
    state,
    () => body,
    () => [body],
  );
  expect(
    c.update(
      p,
      false,
      { ...idle(), abilityPressed: true, abilityHeld: true },
      100,
    ).blocked,
  ).toBe(false);
  m.collider.enabled = false;
  expect(
    c.update(
      p,
      true,
      { ...idle(), abilityPressed: true, abilityHeld: true },
      100,
    ).blocked,
  ).toBe(false);
  m.collider.enabled = true;
  if (m.behavior.kind !== 'reflector') throw Error();
  m.behavior.rotatable = false;
  expect(
    c.update(
      p,
      true,
      { ...idle(), abilityPressed: true, abilityHeld: true },
      100,
    ).blocked,
  ).toBe(false);
  m.behavior.rotatable = true;
  const far = { ...structuredClone(m), id: 'far' };
  const both = new WorldState([far, m]);
  const nearest = new ReflectorInteraction(
    both,
    (id) => (id === m.id ? body : box(240, 200, 340, 256)),
    () => [],
  );
  nearest.update(
    p,
    true,
    { ...idle(), abilityPressed: true, abilityHeld: true },
    100,
  );
  expect(nearest.snapshot?.id).toBe(m.id);
});
it('coalesces pointer aim, accumulates fine steps and clears every pending command on reset', () => {
  const a = new ActionState();
  a.dispatch({ type: 'aim_reflector', phase: 'pressed', angle: 20 }, 'dial');
  a.dispatch({ type: 'aim_reflector', phase: 'pressed', angle: 40 }, 'dial');
  a.dispatch({ type: 'turn_reflector', phase: 'pressed', degrees: 1 }, 'dial');
  a.dispatch({ type: 'turn_reflector', phase: 'pressed', degrees: 1 }, 'dial');
  expect(a.read()).toMatchObject({ reflectorAngle: 40, reflectorTurn: 2 });
  expect(a.read()).toEqual(idle());
  a.dispatch({ type: 'close_reflector', phase: 'pressed' }, 'dial');
  a.dispatch({ type: 'aim_reflector', phase: 'pressed', angle: NaN }, 'dial');
  a.reset();
  expect(a.read()).toEqual(idle());
});

it('ignores aim without a hold and requires release after cancelling a held adjustment', () => {
  const m = mirror(),
    state = new WorldState([m]);
  const body = box(200, 200, 300, 256),
    p = box(110, 82, 172, 256);
  const c = new ReflectorInteraction(
    state,
    () => body,
    () => [body],
  );
  c.update(p, true, { ...idle(), reflectorAngle: 90 }, 100);
  expect(state.get(m.id).mirrorAngle).toBe(225);
  c.update(p, true, { ...idle(), abilityHeld: true }, 16);
  c.update(p, true, { ...idle(), abilityHeld: true, closeReflector: true }, 16);
  c.update(p, true, { ...idle(), abilityHeld: true, reflectorAngle: 90 }, 100);
  expect(c.snapshot?.active).toBe(false);
  expect(state.get(m.id).mirrorAngle).toBe(225);
  c.update(p, true, idle(), 16);
  c.update(p, true, { ...idle(), abilityHeld: true }, 16);
  expect(c.snapshot?.active).toBe(true);
  c.update(p, true, { ...idle(), reflectorAngle: 180 }, 16);
  expect(c.snapshot?.active).toBe(false);
  expect(state.get(m.id).mirrorAngle).toBe(225);
});
