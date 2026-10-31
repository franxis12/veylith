import {
  LEGACY_DOCUMENTS,
  LEGACY_PUZZLES,
} from './fixtures/legacyElementPuzzles';
import { describe, expect, it } from 'vitest';
import {
  validateLevel,
  parseLevel,
  serializeLevel,
} from '../game/levels/schema/validate';
import type { LevelDocument } from '../game/levels/schema/types';
import { colliderBounds } from '../game/levels/schema/types';
import { compileLevel } from '../game/levels/schema/compile';
import { LEVEL_DOCUMENTS } from '../game/levels/forestPuzzles/layouts';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { GemState } from '../game/systems/gems/GemState';
import { EditorModel } from '../editor/model';
import { LIBRARY, createObject, newLevel } from '../editor/library';
import {
  screenToWorld,
  worldToScreen,
  zoomAt,
  moveObjects,
  editCollider,
  resizeObject,
  fitEditorCamera,
  gridDisplayStep,
} from '../editor/geometry';
import before from './fixtures/forest-layouts-before-editor.json';

describe('versioned shared level schema', () => {
  it.each(Object.values(LEVEL_DOCUMENTS))(
    'round trips $id without losing any object, collider, hint or connection',
    (doc) => {
      const saved = serializeLevel(doc);
      expect(parseLevel(JSON.parse(saved))).toEqual(doc);
      expect(validateLevel(doc)).toEqual([]);
      const copy = parseLevel(doc);
      copy.objects[0]!.x += 25;
      expect(copy).not.toEqual(doc);
    },
  );
  it.each([
    (d: LevelDocument) => {
      d.objects = d.objects.filter((o) => o.type !== 'spawn');
    },
    (d: LevelDocument) => {
      d.objects.push(structuredClone(d.objects[0]!));
    },
    (d: LevelDocument) => {
      d.objects = d.objects.filter((o) => o.type !== 'exit');
    },
    (d: LevelDocument) => {
      d.width = NaN;
    },
    (d: LevelDocument) => {
      d.objects[0]!.collider.width = -1;
    },
    (d: LevelDocument) => {
      Object.assign(d.objects[0]!, { asset: 'not-an-asset' });
    },
    (d: LevelDocument) => {
      Object.assign(d.objects[0]!, { type: 'enemy' });
    },
    (d: LevelDocument) => {
      d.timer.twoStarsMs = 0;
    },
    (d: LevelDocument) => {
      Object.assign(
        d.objects.find((o) => o.type === 'spawn')!,
        { element: 'ice' },
      );
    },
    (d: LevelDocument) => {
      Object.assign(
        d.objects.find((o) => o.type === 'exit')!,
        { requires: ['missing'] },
      );
    },
    (d: LevelDocument) => {
      d.id = '../outside';
    },
    (d: LevelDocument) => {
      d.objects.find((o) => o.type === 'terrain')!.asset = 'gem:water';
    },
    (d: LevelDocument) => {
      d.objects.find((o) => o.type === 'spawn')!.width = 200;
    },
    (d: LevelDocument) => {
      const terrain = d.objects.find((o) => o.type === 'terrain')!;
      terrain.width = 32768;
      terrain.height = 32768;
    },
    (d: LevelDocument) => {
      Object.assign(d, { version: 7 });
    },
  ])('rejects invalid data with readable messages', (change) => {
    const d = newLevel();
    change(d);
    expect(validateLevel(d).length).toBeGreaterThan(0);
    expect(() => parseLevel(d)).toThrow();
  });
  it('uses changed artwork and collider positions independently in the actual runtime adapter', () => {
    const doc = structuredClone(LEGACY_DOCUMENTS['forest-1']),
      tank = doc.objects.find((o) => o.type === 'tank')!;
    tank.x += 200;
    tank.width *= 2;
    tank.collider.x += 15;
    const result = compileLevel(doc),
      target = result.targets[0]!;
    expect(target.bounds).toEqual(colliderBounds(tank));
    expect(target.bounds.right - target.bounds.left).toBe(190);
    expect(result.document.objects.find((o) => o.id === tank.id)?.width).toBe(
      tank.width,
    );
  });
  it('uses edited gem hitboxes and disabled pickups without changing source art', () => {
    const doc = structuredClone(LEGACY_DOCUMENTS['forest-2']),
      gem = doc.objects.find((o) => o.type === 'gem')!;
    gem.collider.x += 100;
    const placements = compileLevel(doc).gems,
      b = colliderBounds(gem);
    expect(
      new GemState(placements).collect({
        left: b.left + 1,
        right: b.right - 1,
        top: b.top + 1,
        bottom: b.bottom - 1,
      }),
    ).toHaveLength(1);
    gem.collider.enabled = false;
    expect(
      new GemState(compileLevel(doc).gems).collect({
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
      }),
    ).toHaveLength(0);
  });
  it('supports multiple exits using each exit’s requirements, without claiming solvability', () => {
    const doc = newLevel();
    const another = structuredClone(
      doc.objects.find((o) => o.type === 'exit')!,
    );
    another.id = 'alternate-exit';
    another.x = 900;
    doc.objects.push(another);
    const layout = compileLevel(doc),
      exit = layout.exits[1]!,
      state = new ForestPuzzleState(layout);
    state.update({
      x: exit.x,
      feetY: exit.feetY,
      grounded: true,
      element: 'water',
      gliding: false,
    });
    expect(state.snapshot.phase).toBe('complete');
    doc.objects.find((o) => o.type === 'terrain')!.collider.enabled = false;
    expect(validateLevel(doc)).toEqual([]);
  });
});

describe('legacy five-level compatibility', () => {
  for (const id of Object.keys(before) as (keyof typeof before)[])
    it(`${id}: preserves all puzzle geometry, starting form and mechanism prerequisites`, () => {
      const current = LEGACY_PUZZLES[id],
        old = before[id];
      expect({
        width: current.width,
        height: current.height,
        fallLimit: current.fallLimit,
        spawn: current.spawn,
        initialElement: current.initialElement,
        surfaces: current.surfaces,
      }).toEqual({
        width: old.width,
        height: old.height,
        fallLimit: old.fallLimit,
        spawn: old.spawn,
        initialElement: old.initialElement,
        surfaces: old.surfaces,
      });
      expect(
        current.gems.map(({ id, element, x, y }) => ({ id, element, x, y })),
      ).toEqual(old.gems);
      expect(
        current.targets.map(({ id, kind, x, hits }) => ({
          id,
          kind,
          x: Math.round(x * 1e6) / 1e6,
          hits,
        })),
      ).toEqual(old.targets);
      expect(
        current.gates.map(({ id, x, requires }) => ({
          id,
          x: Math.round(x * 1e6) / 1e6,
          requires,
        })),
      ).toEqual(old.gates);
      expect(current.exit).toMatchObject(old.exit);
      for (const surface of current.surfaces) {
        const o = current.document.objects.find((o) => o.id === surface.id)!;
        expect(colliderBounds(o)).toEqual({
          left: surface.x + 16,
          right: surface.x + surface.columns * 128 - 16,
          top: surface.top,
          bottom: 1100,
          enable: true,
        });
      }
    });
});

describe('placement, camera and collider editing', () => {
  it('keeps world coordinates invariant while zooming and panning', () => {
    for (const zoom of [0.01, 0.05, 0.1, 0.5, 1, 2, 3]) {
      const c = { scrollX: 704, scrollY: -50, zoom },
        point = { x: 405, y: 212 },
        world = screenToWorld(point, c),
        next = zoomAt(c, point, zoom * 1.25);
      expect(worldToScreen(world, c).x).toBeCloseTo(point.x);
      expect(screenToWorld(point, next).x).toBeCloseTo(world.x);
      expect(screenToWorld(point, next).y).toBeCloseTo(world.y);
    }
  });
  it('fits the largest supported level below the old 10% limit and centers it after resize', () => {
    const level = { width: 32768, height: 32768 };
    for (const viewport of [
      { width: 1200, height: 700 },
      { width: 524, height: 500 },
    ]) {
      const camera = fitEditorCamera(level, viewport);
      expect(camera.zoom).toBeLessThan(0.1);
      const topLeft = worldToScreen({ x: 0, y: 0 }, camera);
      const bottomRight = worldToScreen(
        { x: level.width, y: level.height },
        camera,
      );
      expect(topLeft.x).toBeGreaterThan(0);
      expect(topLeft.y).toBeGreaterThan(0);
      expect(bottomRight.x).toBeLessThan(viewport.width);
      expect(bottomRight.y).toBeLessThan(viewport.height);
      expect(topLeft.x).toBeCloseTo(viewport.width - bottomRight.x);
      expect(topLeft.y).toBeCloseTo(viewport.height - bottomRight.y);
    }
  });
  it('keeps a readable, bounded display grid at 1% without changing snap coordinates', () => {
    const step = gridDisplayStep(32, 0.01);
    expect(step * 0.01).toBeGreaterThanOrEqual(12);
    expect(step % 32).toBe(0);
    expect((1200 + 700) / (step * 0.01)).toBeLessThan(160);
    expect(gridDisplayStep(32, 0.65)).toBe(32);
    const doc = newLevel();
    const before = structuredClone(doc);
    fitEditorCamera(doc, { width: 1200, height: 700 });
    expect(doc).toEqual(before);
    const camera = { scrollX: 50, scrollY: 70, zoom: 0.01 };
    expect(zoomAt(camera, { x: 300, y: 200 }, 0.0001).zoom).toBe(0.01);
    expect(zoomAt(camera, { x: 300, y: 200 }, 100).zoom).toBe(3);
  });
  it('places registry-backed objects with unique IDs and moves a group without changing spacing', () => {
    const item = LIBRARY.find((i) => i.id === 'fern')!,
      a = createObject(item, 64, 96, []),
      b = createObject(item, 164, 196, [a]);
    expect(a.id).not.toBe(b.id);
    const moved = moveObjects([a, b], { x: 40, y: -17 }, 32);
    expect(moved[0]).toMatchObject({ x: 96, y: 64 });
    expect(moved[1]!.x - moved[0]!.x).toBe(100);
    expect(moved[1]!.collider).toEqual(b.collider);
  });
  it('resizes and offsets the box separately, clamps handles, and uses grid coordinates', () => {
    const c = { enabled: true, x: 10, y: 20, width: 100, height: 80 };
    expect(editCollider(c, 'se', { x: 21, y: 18 }, 16)).toMatchObject({
      x: 10,
      y: 20,
      width: 118,
      height: 92,
    });
    expect(editCollider(c, 'move', { x: 22, y: 15 }, 16)).toMatchObject({
      x: 32,
      y: 32,
      width: 100,
      height: 80,
    });
    const collapsed = editCollider(c, 'nw', { x: 1000, y: 1000 }, 32);
    expect(collapsed.width).toBe(1);
    expect(collapsed.height).toBe(1);
    const object = newLevel().objects[0]!,
      resized = resizeObject(object, { x: 160, y: 20 }, 32);
    expect(resized.width % 128).toBe(0);
    expect(resized.collider).toEqual(object.collider);
  });
});

describe('usable level height', () => {
  it('extends the playable area without moving objects, with one undo/redo action', () => {
    const original = newLevel(),
      model = new EditorModel(original);
    model.resizeHeight(2100);
    expect(model.getSnapshot().document).toMatchObject({
      height: 2100,
      fallLimit: 2000,
    });
    expect(model.getSnapshot().document.objects).toEqual(original.objects);
    model.undo();
    expect(model.getSnapshot().document).toEqual(original);
    expect(model.getSnapshot().dirty).toBe(false);
    model.redo();
    expect(model.getSnapshot().document).toMatchObject({
      height: 2100,
      fallLimit: 2000,
    });
    expect(model.getSnapshot().dirty).toBe(true);
  });
  it('preserves a custom bottom margin when growing and shrinking, including a limit at the bottom', () => {
    const doc = newLevel();
    doc.height = 1800;
    doc.fallLimit = 1650;
    const model = new EditorModel(doc);
    model.resizeHeight(1000);
    expect(model.getSnapshot().document.fallLimit).toBe(850);
    expect(validateLevel(model.getSnapshot().document)).toEqual([]);
    model.resizeHeight(1800);
    expect(model.getSnapshot().document).toEqual(doc);
    model.commit((d) => {
      d.fallLimit = d.height;
    });
    model.resizeHeight(2400);
    expect(model.getSnapshot().document.fallLimit).toBe(2400);
  });
  it('keeps an oversized margin within bounds on shrink, while still rejecting an unsafe spawn', () => {
    const doc = newLevel();
    doc.height = 3000;
    const model = new EditorModel(doc);
    model.resizeHeight(720);
    expect(model.getSnapshot().document.fallLimit).toBe(1);
    expect(validateLevel(model.getSnapshot().document).length).toBeGreaterThan(
      0,
    );
    model.undo();
    expect(model.getSnapshot().document).toEqual(doc);
    model.resizeHeight(NaN);
    expect(model.getSnapshot().document).toEqual(doc);
  });
  it('uses the expanded boundary in saved data and runtime, allowing a lower floor and exit', () => {
    const model = new EditorModel(newLevel());
    model.resizeHeight(2100);
    model.commit((d) => {
      d.objects.forEach((o) => {
        o.y += 1000;
      });
    });
    const saved = parseLevel(
        JSON.parse(serializeLevel(model.getSnapshot().document)),
      ),
      layout = compileLevel(saved),
      state = new ForestPuzzleState(layout),
      player = {
        x: 180,
        feetY: 1650,
        grounded: true,
        element: 'water' as const,
        gliding: false,
      };
    expect(state.update(player)).toBe(false);
    expect(state.update({ ...player, grounded: false, feetY: 1999 })).toBe(
      false,
    );
    expect(state.update({ ...player, grounded: false, feetY: 2000 })).toBe(
      true,
    );
    const exit = layout.exits[0]!;
    expect(state.update({ ...player, x: exit.x, feetY: exit.feetY })).toBe(
      false,
    );
    expect(state.snapshot.phase).toBe('complete');
  });
});

describe('undo, redo and explicit saves', () => {
  it('groups a complete move into one commit and undoes add/delete/property/collider changes', () => {
    const model = new EditorModel(newLevel()),
      original = structuredClone(model.getSnapshot().document),
      id = original.objects[0]!.id;
    model.commit((d) => {
      d.objects[0]!.x += 64;
      d.objects[0]!.y += 32;
    });
    model.undo();
    expect(model.getSnapshot().document).toEqual(original);
    model.redo();
    expect(model.getSnapshot().document.objects[0]!.x).toBe(64);
    model.update(id, {
      collider: { ...original.objects[0]!.collider, width: 100 },
    });
    model.select([id]);
    model.duplicate();
    const copied = model.getSnapshot().selection[0]!;
    model.remove();
    expect(
      model.getSnapshot().document.objects.some((o) => o.id === copied),
    ).toBe(false);
    model.undo();
    expect(
      model.getSnapshot().document.objects.some((o) => o.id === copied),
    ).toBe(true);
    model.undo();
    model.undo();
    model.undo();
    expect(model.getSnapshot().document).toEqual(original);
    expect(model.getSnapshot().dirty).toBe(false);
  });
  it('preserves references when renaming and duplicates internal connections in a group', () => {
    const model = new EditorModel(LEGACY_DOCUMENTS['forest-1']);
    model.rename('tank', 'reservoir');
    expect(
      model.getSnapshot().document.objects.find((o) => o.type === 'door'),
    ).toMatchObject({ requires: ['reservoir'] });
    model.select(['reservoir', 'water-door']);
    model.duplicate();
    const selected = model
      .getSnapshot()
      .document.objects.filter((o) =>
        model.getSnapshot().selection.includes(o.id),
      );
    const tank = selected.find((o) => o.type === 'tank')!,
      door = selected.find((o) => o.type === 'door')!;
    expect(door).toMatchObject({ requires: [tank.id] });
  });
  it('keeps edits dirty if they happen while an explicit save is in flight; playtest clones cannot mutate the editor', () => {
    const model = new EditorModel(newLevel()),
      saved = structuredClone(model.getSnapshot().document);
    model.commit((d) => {
      d.name = 'Latest edit';
    });
    model.markSaved(saved);
    expect(model.getSnapshot().dirty).toBe(true);
    const runtime = compileLevel(model.getSnapshot().document);
    runtime.document.objects[0]!.x = 999;
    expect(model.getSnapshot().document.objects[0]!.x).toBe(0);
    model.markSaved(model.getSnapshot().document);
    expect(model.getSnapshot().dirty).toBe(false);
  });
});
