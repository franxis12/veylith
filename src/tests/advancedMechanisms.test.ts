// @vitest-environment node
import { supportedPassengers } from '../game/systems/world/mechanismPhysics';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createObject, LIBRARY, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { WorldState } from '../game/systems/world/WorldState';
import { ADVANCED_KINDS } from '../game/systems/world/advancedTypes';
import type {
  AdvancedKind,
  BeamDirection,
  MirrorOrientation,
} from '../game/systems/world/advancedTypes';
import type { WorldObject } from '../game/systems/world/types';
import {
  gateCanEnter,
  pulleyStep,
  rayBox,
  safeDisplacement,
  traceBeam,
  movementBlocked,
} from '../game/systems/world/advancedRules';
import manifest from '../game/assets/advancedManifest.json';
import { WORLD_ART } from '../game/assets/worldAssets';
const object = (kind: AdvancedKind) =>
  createObject(
    LIBRARY.find((i) => i.id === `world:${kind}`)!,
    300,
    300,
    [],
  ) as WorldObject;
const box = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});
describe('bounded geometric light transport', () => {
  it.each<
    [
      MirrorOrientation,
      BeamDirection,
      { x: number; y: number },
      { x: number; y: number },
    ]
  >([
    ['nw', 'right', { x: 0, y: 100 }, { x: 100, y: 0 }],
    ['ne', 'left', { x: 200, y: 100 }, { x: 100, y: 0 }],
    ['se', 'left', { x: 200, y: 100 }, { x: 100, y: 200 }],
    ['sw', 'right', { x: 0, y: 100 }, { x: 100, y: 200 }],
  ])(
    'reflects from the %s face to a receiver',
    (orientation, direction, origin, target) => {
      const r = traceBeam(
        origin,
        direction,
        1000,
        8,
        [
          {
            id: 'mirror',
            center: { x: 100, y: 100 },
            halfLength: 50,
            orientation,
          },
        ],
        [
          {
            ...box(target.x - 4, target.y - 4, target.x + 4, target.y + 4),
            id: 'receiver',
          },
        ],
        [],
      );
      expect([...r.hits]).toEqual(['receiver']);
      expect(r.segments).toHaveLength(2);
    },
  );
  it('absorbs on the back and respects opaque occlusion before a receiver', () => {
    const mirrors = [
      {
        id: 'm',
        center: { x: 100, y: 100 },
        halfLength: 50,
        orientation: 'nw' as const,
      },
    ];
    expect(
      traceBeam({ x: 200, y: 100 }, 'left', 500, 8, mirrors, [], []).segments,
    ).toHaveLength(1);
    expect(
      traceBeam(
        { x: 0, y: 100 },
        'right',
        500,
        8,
        [],
        [{ ...box(200, 80, 220, 120), id: 'r' }],
        [box(150, 0, 152, 200)],
      ).hits.size,
    ).toBe(0);
  });
  it('uses a finite mirror segment, nearest receiver and total optical length', () => {
    const r = traceBeam(
      { x: 0, y: 100 },
      'right',
      160,
      12,
      [
        {
          id: 'm',
          center: { x: 100, y: 100 },
          halfLength: 40,
          orientation: 'nw',
        },
      ],
      [],
      [],
    );
    expect(r.segments.at(-1)!.to.y).toBeCloseTo(40, 1);
    expect(
      traceBeam(
        { x: 0, y: 10 },
        'right',
        200,
        12,
        [
          {
            id: 'm',
            center: { x: 100, y: 100 },
            halfLength: 20,
            orientation: 'nw',
          },
        ],
        [],
        [],
      ).segments,
    ).toHaveLength(1);
    expect([
      ...traceBeam(
        { x: 0, y: 0 },
        'right',
        100,
        12,
        [],
        [
          { ...box(60, -3, 70, 3), id: 'far' },
          { ...box(20, -3, 30, 3), id: 'near' },
        ],
        [],
      ).hits,
    ]).toEqual(['near']);
  });
  it('terminates a closed optical loop and obeys the bounce budget', () => {
    const mirrors = [
      {
        id: 'a',
        center: { x: 100, y: 100 },
        halfLength: 40,
        orientation: 'nw' as const,
      },
      {
        id: 'b',
        center: { x: 100, y: 0 },
        halfLength: 40,
        orientation: 'sw' as const,
      },
      {
        id: 'c',
        center: { x: 0, y: 0 },
        halfLength: 40,
        orientation: 'se' as const,
      },
      {
        id: 'd',
        center: { x: 0, y: 100 },
        halfLength: 40,
        orientation: 'ne' as const,
      },
    ];
    expect(
      traceBeam({ x: 20, y: 100 }, 'right', 32768, 32, mirrors, [], []).segments
        .length,
    ).toBeLessThanOrEqual(5);
    expect(
      traceBeam({ x: 20, y: 100 }, 'right', 32768, 1, mirrors, [], []).segments,
    ).toHaveLength(2);
    expect(
      traceBeam({ x: 20, y: 100 }, 'right', 32768, 0, mirrors, [], []).segments,
    ).toHaveLength(1);
  });
  it('handles axis-parallel and inside origins without NaN', () => {
    expect(rayBox({ x: 5, y: 5 }, { x: 1, y: 0 }, box(0, 0, 10, 10))).toBe(0);
    expect(rayBox({ x: 5, y: 15 }, { x: 1, y: 0 }, box(0, 0, 10, 10))).toBe(
      Infinity,
    );
  });
});
describe('mechanical collision invariants', () => {
  it('carries a supported player above cargo, but excludes a departing jump', () => {
    const resting = {
      velocity: { y: 0 },
      blocked: { down: true },
      touching: { down: false },
      immovable: false,
    };
    const cargo = { ...box(0, 40, 100, 100), ...resting };
    const rider = { ...box(20, 0, 60, 40), ...resting };
    const jumper = { ...box(65, 0, 95, 40), ...resting, velocity: { y: -100 } };
    expect(
      supportedPassengers(box(0, 100, 100, 120), [rider, jumper, cargo]),
    ).toEqual([cargo, rider]);
  });

  it.each([1, -1] as const)(
    'admits only an approach from the permitted side (%s)',
    (direction) => {
      const gate = box(100, 0, 140, 300),
        left = box(60, 100, 100, 250),
        right = box(140, 100, 180, 250);
      expect(
        gateCanEnter(
          direction === 1 ? left : right,
          gate,
          direction,
          direction * 150,
        ),
      ).toBe(true);
      expect(
        gateCanEnter(
          direction === 1 ? right : left,
          gate,
          direction,
          -direction * 150,
        ),
      ).toBe(false);
      expect(
        gateCanEnter(box(110, 100, 150, 250), gate, direction, direction * 150),
      ).toBe(false);
    },
  );
  it('sweeps surface carry against thin walls in both directions', () => {
    expect(
      safeDisplacement(box(0, 0, 40, 40), 200, 'x', [box(45, -10, 46, 50)]),
    ).toBe(5);
    expect(
      safeDisplacement(box(60, 0, 100, 40), -200, 'x', [box(45, -10, 46, 50)]),
    ).toBe(-14);
    expect(
      safeDisplacement(box(0, 0, 40, 40), 50, 'x', [box(20, 40, 100, 50)]),
    ).toBe(50);
  });
  it('clamps both pulley endpoints and caps a stalled-frame advance', () => {
    expect(pulleyStep(0.99, true, 200, 300, 1)).toBe(1);
    expect(pulleyStep(0.01, false, 200, 300, 1)).toBe(0);
    expect(pulleyStep(0, true, -200, 100, 1)).toBe(0.025);
    expect(pulleyStep(0.5, true, 200, 100, -1)).toBe(0.5);
  });
  it('blocks a swept rider or counterweight before thin ceilings', () => {
    expect(
      movementBlocked(box(0, 100, 100, 120), box(0, 0, 100, 20), [
        box(0, 50, 100, 51),
      ]),
    ).toBe(true);
    expect(
      movementBlocked(box(0, 100, 100, 120), box(0, 90, 100, 110), [
        box(0, 120, 100, 140),
      ]),
    ).toBe(false);
  });
});
describe('editor, signals and original asset contracts', () => {
  it('round trips all new families without changing version 1', () => {
    const d = newLevel('advanced-roundtrip');
    d.objects.push(...ADVANCED_KINDS.map(object));
    expect(parseLevel(JSON.parse(serializeLevel(d)))).toEqual(d);
  });
  it('renames and duplicates the platform/counterweight link and reports dangling IDs', () => {
    const d = newLevel(),
      p = object('pulley_platform'),
      w = object('pulley_counterweight');
    if (p.behavior.kind !== 'pulley') throw Error();
    p.behavior.counterweightId = w.id;
    d.objects.push(p, w);
    const m = new EditorModel(d);
    m.rename(w.id, 'weight');
    m.select([p.id, 'weight']);
    m.duplicate();
    const copy = m
      .getSnapshot()
      .document.objects.find((o) => o.id === p.id + '-2') as WorldObject;
    expect(
      copy.behavior.kind === 'pulley' && copy.behavior.counterweightId,
    ).toBe('weight-2');
    expect(validateLevel(m.getSnapshot().document)).toEqual([]);
    m.select(['weight-2']);
    m.remove();
    expect(validateLevel(m.getSnapshot().document).join()).toContain(
      'contrapeso',
    );
    m.undo();
    expect(validateLevel(m.getSnapshot().document)).toEqual([]);
  });
  it('prevents two platforms owning the same counterweight', () => {
    const d = newLevel(),
      p = object('pulley_platform'),
      w = object('pulley_counterweight');
    if (p.behavior.kind !== 'pulley') throw Error();
    p.behavior.counterweightId = w.id;
    d.objects.push(p, w, { ...structuredClone(p), id: 'second' });
    expect(validateLevel(d).join()).toContain('una polea');
  });
  it.each<[AdvancedKind, string, unknown]>([
    ['reflector', 'orientation', 'south'],
    ['reflector', 'pushable', 'yes'],
    ['beam_emitter', 'maxBounces', 33],
    ['beam_emitter', 'maxBounces', 1.5],
    ['beam_emitter', 'range', Infinity],
    ['conveyor', 'segments', 0],
    ['conveyor', 'segments', 33],
    ['conveyor', 'speed', 0],
    ['conveyor', 'direction', '1'],
    ['directional_gate', 'direction', 0],
    ['pulley_platform', 'travelY', 0],
    ['pulley_platform', 'speed', 301],
    ['pulley_counterweight', 'mass', -1],
    ['light_receiver', 'latch', 1],
  ])('rejects invalid %s.%s before playtest', (kind, field, value) => {
    const o = object(kind),
      d = newLevel();
    Object.assign(o.behavior, { [field]: value });
    d.objects.push(o);
    expect(validateLevel(d).length).toBeGreaterThan(0);
  });
  it('limits emitters and resolves receiver requirements through existing signals', () => {
    const d = newLevel();
    for (let i = 0; i < 17; i++)
      d.objects.push({ ...object('beam_emitter'), id: 'emitter-' + i });
    expect(validateLevel(d).join()).toContain('16');
    const belt = object('conveyor');
    if (belt.behavior.kind !== 'conveyor') throw Error();
    belt.behavior.requires = ['receiver'];
    const s = new WorldState([belt]);
    s.advance(16, () => false);
    expect(s.get(belt.id).active).toBe(false);
    s.advance(16, () => true);
    expect(s.get(belt.id).active).toBe(true);
    s.command(belt.id, 'deactivate');
    s.advance(16, () => true);
    expect(s.get(belt.id).active).toBe(false);
    const reset = new WorldState([belt]);
    reset.advance(0, () => false);
    expect(reset.get(belt.id).active).toBe(false);
  });
  it.each([
    'lab-reflectors',
    'lab-pulleys',
    'lab-conveyors',
    'lab-directional-gates',
  ])('validates %s outside the campaign', (id) => {
    expect(
      validateLevel(
        JSON.parse(
          readFileSync(
            new URL(`../game/levels/data/${id}.json`, import.meta.url),
            'utf8',
          ),
        ),
      ),
    ).toEqual([]);
  });
  it('checks measured PNG headers and exact frame dimensions of every registered sheet', () => {
    for (const a of manifest.animations) {
      const data = readFileSync(
        new URL('../../public/' + a.spritesheet, import.meta.url),
      );
      expect(data.readUInt32BE(16)).toBe(a.frameWidth * a.frames.length);
      expect(data.readUInt32BE(20)).toBe(a.frameHeight);
    }
    for (const kind of ADVANCED_KINDS)
      expect(WORLD_ART[kind].thumbnail).toContain('assets/objects/advanced/');
  });
});
