import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import audit from '../../docs/asset-environment-expansion-audit.json';
import {
  ENVIRONMENT_ASSETS,
  ENVIRONMENT_PLATFORMS,
  environmentName,
  environmentNames,
  platformCollider,
  platformName,
} from '../game/assets/environmentCatalog';
import {
  queueEnvironmentAssets,
  missingEnvironmentAssets,
} from '../game/assets/environmentAssets';
import { LIBRARY, createObject, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import { resizeObject } from '../editor/geometry';
import { environmentSize } from '../editor/environmentResize';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { renderEnvironment } from '../game/levels/schema/renderEnvironment';
import { compileLevel } from '../game/levels/schema/compile';
import { LEVEL_DOCUMENTS } from '../game/levels/forestPuzzles/layouts';

const palette = LIBRARY.filter((item) => environmentName(item.asset));
const platform = () =>
  createObject(
    LIBRARY.find((item) => item.id === 'platform:wood_center')!,
    200,
    300,
    [],
  );

describe('inspected environment exports', () => {
  it('keeps all 155 PNGs and 19 manifests byte-for-byte, with measured dimensions and supplied collider hints', () => {
    expect(audit.pngCount).toBe(155);
    expect(Object.keys(ENVIRONMENT_ASSETS)).toHaveLength(155);
    expect(Object.keys(ENVIRONMENT_PLATFORMS)).toHaveLength(12);
    expect(new Set(audit.assets.map((a) => a.manifest)).size).toBe(19);
    for (const entry of audit.assets) {
      const png = readFileSync(`public/${entry.path}`);
      const source = readFileSync(entry.manifest);
      const asset =
        ENVIRONMENT_ASSETS[environmentName(`environment:${entry.id}`)!];
      expect(createHash('sha256').update(png).digest('hex')).toBe(entry.sha256);
      expect(createHash('sha256').update(source).digest('hex')).toBe(
        entry.manifestSha256,
      );
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
        asset.width,
        asset.height,
      ]);
      const original = JSON.parse(source.toString()).assets.find(
        (a: { id: string }) => a.id === entry.id,
      );
      expect(asset.path).toBe(original.file);
      expect(asset.anchor).toEqual(original.anchor_px);
      // The inspected repeat steps match complete source cells; no inferred trim.
      for (const axis of asset.repeat) {
        const index = axis === 'x' ? 0 : 1;
        expect(asset.step[index]).toBe(
          index === 0 ? asset.width : asset.height,
        );
      }
      expect(asset.collision).toEqual(
        original.collision
          ? {
              x: original.collision.x,
              y: original.collision.y,
              width: original.collision.width,
              height: original.collision.height,
            }
          : null,
      );
    }
  });
  it('round trips every palette resource through canonical JSON and the runtime without changing the original campaign', () => {
    expect(palette).toHaveLength(167);
    expect(new Set(LIBRARY.map((item) => item.id)).size).toBe(LIBRARY.length);
    const campaignBefore = JSON.stringify(LEVEL_DOCUMENTS);
    const doc = newLevel();
    for (const item of palette)
      doc.objects.push(createObject(item, 512, 96, doc.objects));
    expect(validateLevel(doc)).toEqual([]);
    const saved = parseLevel(JSON.parse(serializeLevel(doc)));
    expect(saved).toEqual(doc);
    expect(compileLevel(saved).document).toEqual(doc);
    expect(environmentNames(doc.objects)).toHaveLength(155);
    expect(JSON.stringify(LEVEL_DOCUMENTS)).toBe(campaignBefore);
  });
  it('rejects unknown paths and incompatible object types without broadening the schema to arbitrary files', () => {
    for (const asset of [
      'environment:../../secrets',
      'environment:__proto__',
      'environment:missing',
      'environment:wood_left',
    ]) {
      const doc = newLevel();
      const object = platform();
      Object.assign(object, { asset });
      doc.objects.push(object);
      expect(validateLevel(doc).length).toBeGreaterThan(0);
    }
    const doc = newLevel();
    Object.assign(
      doc.objects.find((o) => o.type === 'exit')!,
      { asset: 'environment:wood_center' },
    );
    expect(() => parseLevel(doc)).toThrow();
  });
});

describe('modular platforms and independent decoration', () => {
  it('preserves source padding, disables decorative physics and initializes actual platform rectangles', () => {
    const p = platform();
    expect(p).toMatchObject({
      width: 384,
      height: 128,
      x: 200,
      y: 300,
      collider: { enabled: true, x: 12, y: 32, width: 361, height: 16 },
    });
    for (const id of [
      'slope_rising_left',
      'stone_stairs',
      'suspension_ring_earth',
      'wood_support',
    ]) {
      const o = createObject(
        LIBRARY.find((i) => i.id === `environment:${id}`)!,
        0,
        0,
        [],
      );
      const art = ENVIRONMENT_ASSETS[environmentName(o.asset)!];
      expect(o).toMatchObject({
        type: 'decoration',
        width: art.width,
        height: art.height,
        collider: { enabled: false },
      });
    }
  });
  it('keeps the collider unchanged on visual resize, and makes explicit fitting undoable', () => {
    const doc = newLevel();
    const p = platform();
    doc.objects.push(p);
    const model = new EditorModel(doc);
    const resized = resizeObject(p, { x: 256, y: 128 }, 32);
    expect(resized).toMatchObject({
      width: 640,
      height: 128,
      collider: p.collider,
    });
    model.update(p.id, resized);
    model.update(p.id, environmentSize(resized, 640, 256, 'height')!);
    model.update(p.id, {
      collider: platformCollider(platformName(p.asset)!, 640, 256),
    });
    expect(model.getSnapshot().document.objects.at(-1)?.collider).toEqual({
      enabled: true,
      x: 24,
      y: 64,
      width: 594,
      height: 32,
    });
    model.undo();
    model.undo();
    expect(model.getSnapshot().document.objects.at(-1)).toEqual(resized);
    expect(resizeObject(p, { x: -1000, y: 0 }, 32).width).toBe(256);
  });
  it.each([256, 300, 384, 768])(
    'renders the correct end caps and complete 128px canvases for width %s',
    (width) => {
      const calls: {
        x: number;
        key: string;
        origin: number;
        size: number[];
        scale: number;
        crop: number[] | undefined;
      }[] = [];
      const record = (x: number, key: string, width = 128, height = 128) => {
        const call = {
          x,
          key,
          origin: -1,
          size: [width, height],
          scale: 0,
          crop: undefined as number[] | undefined,
        };
        calls.push(call);
        const image = {
          setOrigin: (origin: number) => {
            call.origin = origin;
            return image;
          },
          setScale: (scale: number) => {
            call.scale = scale;
            return image;
          },
          setCrop: (_x: number, _y: number, width: number, height: number) => {
            call.crop = [width, height];
            return image;
          },
        };
        return image;
      };
      const scene = {
        textures: { exists: () => true },
        add: {
          image: (x: number, _y: number, key: string) => record(x, key),
        },
      } as unknown as Phaser.Scene;
      renderEnvironment(
        scene,
        { add: vi.fn() } as unknown as Phaser.GameObjects.Container,
        { ...platform(), width },
      );
      expect(calls).toHaveLength(Math.ceil(width / 128));
      expect(calls[0]?.key).toBe('environment:wood_left');
      expect(calls[1]).toMatchObject({
        key: 'environment:wood_right',
        x: width - 128,
        size: [128, 128],
      });
      expect(calls.every((call) => call.origin === 0 && call.scale === 1)).toBe(
        true,
      );
      if (width > 256)
        expect(calls[2]).toMatchObject({
          key: 'environment:wood_center',
          x: 128,
          size: [128, 128],
        });
      if (width === 300) expect(calls[2]?.crop).toEqual([44, 128]);
      if (width === 768)
        expect(
          calls
            .filter((call) => call.key.endsWith('center'))
            .map((call) => call.x),
        ).toEqual([128, 256, 384, 512]);
    },
  );
});

describe('per-asset resizing rules', () => {
  const piece = (id: string) =>
    createObject(
      LIBRARY.find((item) => item.id === `environment:${id}`)!,
      0,
      0,
      [],
    );
  it('extends only the supplied repeat axes on drag and never touches colliders', () => {
    for (const id of [
      'chain_segment',
      'suspended_chain',
      'rope_segment',
      'wood_post_segment',
    ]) {
      const original = piece(id);
      const resized = resizeObject(original, { x: 160, y: 256 }, 32);
      expect(resized).toMatchObject({
        width: 128,
        height: 384,
        collider: original.collider,
      });
      expect(environmentSize(original, 128, 333, 'height')).toEqual({
        width: 128,
        height: 333,
      });
    }
    expect(
      resizeObject(piece('wood_beam_segment'), { x: 256, y: 160 }, 32),
    ).toMatchObject({ width: 384, height: 128 });
    expect(
      resizeObject(piece('dirt_interior'), { x: 256, y: 128 }, 32),
    ).toMatchObject({ width: 384, height: 256 });
  });
  it('keeps unique art proportional in both numeric fields and drag handles', () => {
    const arch = piece('ruined_archway');
    expect(environmentSize(arch, 600, arch.height, 'width')).toEqual({
      width: 600,
      height: 300,
    });
    expect(environmentSize(arch, arch.width, 333, 'height')).toEqual({
      width: 666,
      height: 333,
    });
    const resized = resizeObject(arch, { x: 160, y: 256 }, 32);
    expect(resized.width / resized.height).toBe(2);
    expect(resized.collider).toEqual(arch.collider);
  });
  it('bounds render objects independently of tiled area and fits old stretched art without rewriting the document', () => {
    const tiles: number[][] = [],
      scales: number[] = [];
    const image = {
      setOrigin: () => image,
      setScale: (scale: number) => {
        scales.push(scale);
        return image;
      },
      setCrop: (_x: number, _y: number, width: number, height: number) => {
        tiles.push([width, height]);
        return image;
      },
    };
    const scene = {
      textures: { exists: () => true },
      add: {
        image: () => image,
      },
    } as unknown as Phaser.Scene;
    const view = { add: vi.fn() } as unknown as Phaser.GameObjects.Container;
    const chain = { ...piece('chain_segment'), height: 333 };
    renderEnvironment(scene, view, chain);
    expect(tiles).toEqual([[128, 77]]);
    expect(scales).toEqual([1, 1, 1]);
    renderEnvironment(scene, view, {
      ...piece('dirt_interior'),
      width: 32768,
      height: 32768,
    });
    expect(view.add).toHaveBeenCalledTimes(4099);
    const invalid = newLevel();
    invalid.objects.push({
      ...piece('dirt_interior'),
      width: 32768,
      height: 32768,
    });
    expect(validateLevel(invalid).join(' ')).toContain('4096');
    expect(validateLevel(invalid).join(' ')).toContain('8192');
    const old = { ...piece('ruined_archway'), width: 1024, height: 100 };
    const copy = structuredClone(old);
    renderEnvironment(scene, view, old);
    expect(scales.at(-1)).toBe(100 / 512);
    expect(old).toEqual(copy);
  });
});

it('loads only placed resources, deduplicates platform dependencies, reuses textures and reports exact missing files', () => {
  const image = vi.fn();
  const textures = {
    exists: (key: string) => key === 'environment:wood_left',
  } as unknown as Phaser.Textures.TextureManager;
  const scene = { textures, load: { image } } as unknown as Phaser.Scene;
  queueEnvironmentAssets(scene, environmentNames(newLevel().objects));
  expect(image).not.toHaveBeenCalled();
  const names = environmentNames([platform(), platform()]);
  expect(names).toEqual(['wood_left', 'wood_center', 'wood_right']);
  queueEnvironmentAssets(scene, names);
  expect(image).toHaveBeenCalledTimes(2);
  expect(missingEnvironmentAssets(textures, names)).toEqual([
    ENVIRONMENT_ASSETS.wood_center.path,
    ENVIRONMENT_ASSETS.wood_right.path,
  ]);
});
