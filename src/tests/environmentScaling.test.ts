import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { LIBRARY, createObject, newLevel } from '../editor/library';
import { environmentSize, scaleEnvironment } from '../editor/environmentResize';
import { resizeObject } from '../editor/geometry';
import { EditorModel } from '../editor/model';
import {
  environmentName,
  environmentTileCount,
  environmentVisualScale,
  platformCollider,
} from '../game/assets/environmentCatalog';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { renderEnvironment } from '../game/levels/schema/renderEnvironment';

const piece = (id: string) =>
  createObject(
    LIBRARY.find((entry) => entry.id === id)!,
    0,
    0,
    [],
  );

describe('environment scale without losing modular sizing', () => {
  it.each([0.1, 0.25, 0.5, 1.5, 2])(
    'scales every supplied resource to %s× without changing module counts or physics',
    (scale) => {
      for (const entry of LIBRARY.filter((entry) =>
        environmentName(entry.asset),
      )) {
        const original = createObject(entry, 200, 300, []);
        const scaled = { ...original, ...scaleEnvironment(original, scale) };
        expect(scaled.width).toBe(original.width * scale);
        expect(scaled.height).toBe(original.height * scale);
        expect(environmentVisualScale(scaled)).toBe(scale);
        expect(environmentTileCount(scaled)).toBe(
          environmentTileCount(original),
        );
        expect(scaled.collider).toEqual(original.collider);
        expect([scaled.x, scaled.y]).toEqual([200, 300]);
        const document = newLevel();
        document.objects.push(scaled);
        expect(parseLevel(JSON.parse(serializeLevel(document)))).toEqual(
          document,
        );
        const restored = { ...scaled, ...scaleEnvironment(scaled, 1) };
        expect(restored.width).toBeCloseTo(original.width);
        expect(restored.height).toBeCloseTo(original.height);
      }
    },
  );
  it('extends scaled platforms, chains and fills at their chosen module size', () => {
    const original = piece('platform:wood_center');
    const small = { ...original, ...scaleEnvironment(original, 0.25) };
    expect(resizeObject(small, { x: 32, y: 500 }, 32)).toMatchObject({
      width: 128,
      height: 32,
    });
    expect(resizeObject(small, { x: -1000, y: 0 }, 32)).toMatchObject({
      width: 64,
      height: 32,
    });
    expect(platformCollider('wood_center', 128, 32)).toEqual({
      enabled: true,
      x: 3,
      y: 8,
      width: 122.25,
      height: 4,
    });
    const chain = piece('environment:chain_segment');
    const large = { ...chain, ...scaleEnvironment(chain, 2) };
    const extended = resizeObject(large, { x: 500, y: 512 }, 32);
    expect(extended).toMatchObject({
      width: 256,
      height: 768,
      collider: chain.collider,
    });
    expect(environmentTileCount(extended)).toBe(3);
    const fill = piece('environment:dirt_interior');
    const scaledFill = { ...fill, ...scaleEnvironment(fill, 0.5) };
    const expandedFill = {
      ...scaledFill,
      ...environmentSize(scaledFill, 200, 100, 'width'),
    };
    expect(expandedFill.tileScale).toBe(0.5);
    expect(environmentTileCount(expandedFill)).toBe(8);
  });
  it('records scaling as one undo action and keeps scale when duplicating a fill', () => {
    const doc = newLevel();
    const original = piece('environment:dirt_interior');
    doc.objects.push(original);
    const model = new EditorModel(doc);
    model.update(original.id, scaleEnvironment(original, 0.5)!);
    const scaled = model.getSnapshot().document.objects.at(-1)!;
    expect(scaled).toMatchObject({
      width: 64,
      height: 64,
      tileScale: 0.5,
      collider: original.collider,
    });
    model.undo();
    expect(model.getSnapshot().document).toEqual(doc);
    model.redo();
    expect(model.getSnapshot().document.objects.at(-1)).toEqual(scaled);
    model.select([scaled.id]);
    model.duplicate();
    expect(model.getSnapshot().document.objects.at(-1)).toMatchObject({
      width: 64,
      height: 64,
      tileScale: 0.5,
      collider: original.collider,
    });
    expect(model.getSnapshot().document.objects.at(-1)?.id).not.toBe(scaled.id);
    // JSON cloning is also the editor/playtest handoff boundary.
    expect(
      parseLevel(
        JSON.parse(serializeLevel(model.getSnapshot().document)),
      ).objects.at(-1),
    ).toEqual(model.getSnapshot().document.objects.at(-1));
  });
  it('renders scaled fill cells and crops a partial last row/column at the same scale', () => {
    const cells: { x: number; y: number; scale: number; crop?: number[] }[] =
      [];
    const scene = {
      textures: { exists: () => true },
      add: {
        image: (x: number, y: number) => {
          const cell: (typeof cells)[number] = { x, y, scale: 1 };
          cells.push(cell);
          const image = {
            setOrigin: () => image,
            setScale: (scale: number) => {
              cell.scale = scale;
              return image;
            },
            setCrop: (
              _x: number,
              _y: number,
              width: number,
              height: number,
            ) => {
              cell.crop = [width, height];
              return image;
            },
          };
          return image;
        },
      },
    } as unknown as Phaser.Scene;
    renderEnvironment(
      scene,
      { add: vi.fn() } as unknown as Phaser.GameObjects.Container,
      {
        ...piece('environment:dirt_interior'),
        width: 200,
        height: 100,
        tileScale: 0.5,
      },
    );
    expect(cells).toHaveLength(8);
    expect(cells.every((cell) => cell.scale === 0.5)).toBe(true);
    expect(cells.at(-1)).toEqual({ x: 192, y: 64, scale: 0.5, crop: [16, 72] });
    cells.length = 0;
    const original = piece('platform:wood_center');
    renderEnvironment(
      scene,
      { add: vi.fn() } as unknown as Phaser.GameObjects.Container,
      {
        ...original,
        ...scaleEnvironment(original, 0.1),
      },
    );
    expect(cells).toHaveLength(3);
    expect(cells.every((cell) => cell.scale === 0.1)).toBe(true);
  });
  it('validates persisted scale and applies the existing tile budget at the chosen scale', () => {
    const fill = piece('environment:dirt_interior');
    for (const tileScale of [0, -1, NaN, Infinity, '0.5', null]) {
      const doc = newLevel();
      doc.objects.push(Object.assign({ ...fill }, { tileScale }));
      expect(validateLevel(doc).join(' ')).toContain('escala');
    }
    for (const original of [
      piece('environment:chain_segment'),
      piece('platform:wood_center'),
      newLevel().objects[0]!,
    ]) {
      const doc = newLevel();
      doc.objects.push({ ...original, id: 'invalid-scale', tileScale: 0.5 });
      expect(validateLevel(doc).join(' ')).toContain('escala');
    }
    const doc = newLevel();
    doc.objects.push({ ...fill, width: 512, height: 512, tileScale: 0.05 });
    expect(validateLevel(doc).join(' ')).toContain('4096');
    for (const scale of [0, -1, NaN, Infinity])
      expect(scaleEnvironment(fill, scale)).toBeUndefined();
    expect(scaleEnvironment(fill, 1e6)).toEqual({
      width: 32768,
      height: 32768,
      tileScale: 256,
    });
  });
});
