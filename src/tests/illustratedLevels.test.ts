// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Phaser from 'phaser';
import { newLevel, createObject, LIBRARY } from '../editor/library';
import { EditorModel } from '../editor/model';
import { resizeObject, editCollider } from '../editor/geometry';
import {
  illustratedResources,
  illustrationObjects,
  illustrationSize,
  illustratedDepth,
} from '../game/assets/illustratedCatalog';
import {
  queueIllustratedAssets,
  releaseIllustratedAssets,
  missingIllustratedAssets,
} from '../game/assets/illustratedAssets';
import { parseLevel, validateLevel } from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import { LevelRepository } from '../../server/levelRepository';
import lab from '../game/levels/data/lab-illustrated.json';

const level = () => parseLevel(lab);
describe('illustrated level contract and editor', () => {
  it('preserves independent boxes and mechanisms across history, transforms, duplicate and JSON', () => {
    const model = new EditorModel(level()),
      original = model.getSnapshot().document;
    const art = illustrationObjects(original.objects)[0]!;
    model.select([art.id]);
    model.update(art.id, {
      x: 120,
      y: 40,
      ...illustrationSize(art, 1536, 'width'),
    });
    expect(
      model
        .getSnapshot()
        .document.objects.filter((o) => o.type !== 'illustration'),
    ).toEqual(original.objects.filter((o) => o.type !== 'illustration'));
    model.undo();
    expect(model.getSnapshot().document).toEqual(original);
    model.redo();
    model.duplicate();
    const copy = model.getSnapshot().document;
    expect(illustrationObjects(copy.objects)).toHaveLength(2);
    expect(illustratedResources(copy.objects)).toHaveLength(9);
  });
  it('resizes illustration uniformly and makes boxes independently editable without a 128 px restriction', () => {
    const doc = level(),
      art = illustrationObjects(doc.objects)[0]!;
    const resized = resizeObject(art, { x: -1536, y: 300 }, 0);
    expect([resized.width, resized.height]).toEqual([1536, 576]);
    const box = createObject(
      LIBRARY.find((i) => i.id === 'boxCollider')!,
      123,
      400,
      doc.objects,
    );
    box.collider = editCollider(box.collider, 'nw', { x: 7, y: -14 }, 0);
    doc.objects.push(box);
    expect(validateLevel(doc)).toEqual([]);
    expect(box.collider).toMatchObject({
      x: 7,
      y: -14,
      width: 249,
      height: 46,
    });
    expect(compileLevel(doc).document.objects).toEqual(doc.objects);
  });
  it('rejects invented scenes, textures, overlays, nonuniform scaling and malformed animation data', () => {
    for (const patch of [
      { sceneId: '../elsewhere' },
      { sceneId: '__proto__' },
      { asset: 'background' },
      { layers: ['preview/composite.png'] },
      { height: 100 },
      {
        overlays: [
          {
            ...illustrationObjects(level().objects)[0]!.overlays[0],
            animation: '__proto__',
          },
        ],
      },
      {
        overlays: [
          { ...illustrationObjects(level().objects)[0]!.overlays[0], phase: 8 },
        ],
      },
      {
        overlays: [
          { ...illustrationObjects(level().objects)[0]!.overlays[0], fps: 0 },
        ],
      },
      {
        overlays: [
          {
            ...illustrationObjects(level().objects)[0]!.overlays[0],
            width: -1,
          },
        ],
      },
    ]) {
      const doc = level();
      Object.assign(illustrationObjects(doc.objects)[0]!, patch);
      expect(validateLevel(doc).length, JSON.stringify(patch)).toBeGreaterThan(
        0,
      );
    }
  });
  it('round trips explicit saves and rejects an invalid overwrite without losing the previous file', async () => {
    const dir = await realpath(
      await mkdtemp(join(tmpdir(), 'illustrated-level-')),
    );
    try {
      const repo = new LevelRepository(dir),
        doc = level();
      const art = illustrationObjects(doc.objects)[0]!;
      art.overlays[0] = {
        ...art.overlays[0]!,
        x: 222,
        width: 92,
        fps: 7,
        visible: false,
      };
      const saved = await repo.save(doc.id, doc, '*');
      expect((await repo.read(doc.id)).document).toEqual(doc);
      const prior = await readFile(join(dir, `${doc.id}.json`), 'utf8');
      art.overlays[0].animation = 'nonexistent';
      await expect(repo.save(doc.id, doc, saved.etag)).rejects.toThrow(
        'overlay',
      );
      expect(await readFile(join(dir, `${doc.id}.json`), 'utf8')).toBe(prior);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
describe('illustrated loading budget', () => {
  it('loads only enabled, deduplicated resources and no illustrated textures for old levels', () => {
    const doc = level();
    expect(illustratedResources(newLevel().objects)).toEqual([]);
    expect(illustratedResources([...doc.objects, ...doc.objects])).toHaveLength(
      9,
    );
    expect(
      illustratedResources(doc.objects).every(
        (r) => !/preview|alignment|sections|frames\//.test(r.path),
      ),
    ).toBe(true);
    const art = illustrationObjects(doc.objects)[0]!;
    art.layers = ['static_world'];
    art.overlays = [];
    expect(illustratedResources(doc.objects)).toHaveLength(1);
    art.visible = false;
    expect(illustratedResources(doc.objects)).toEqual([]);
  });
  it('releases unused illustrated textures without touching shared gameplay assets', () => {
    const objects = level().objects,
      resources = illustratedResources(objects);
    const keys = new Set([
      'character:water:idle',
      'illustrated:unused',
      resources[0]!.key,
    ]);
    const remove = vi.fn((key: string) => keys.delete(key));
    const scene = {
      textures: {
        exists: (k: string) => keys.has(k),
        getTextureKeys: () => [...keys],
        remove,
      },
      load: { image: vi.fn(), spritesheet: vi.fn() },
    };
    queueIllustratedAssets(scene as unknown as Phaser.Scene, objects);
    expect(scene.load.image).toHaveBeenCalledTimes(2);
    expect(scene.load.spritesheet).toHaveBeenCalledTimes(6);
    expect(
      missingIllustratedAssets(scene as unknown as Phaser.Scene, objects),
    ).toHaveLength(8);
    releaseIllustratedAssets(scene as unknown as Phaser.Scene, objects);
    expect(remove).toHaveBeenCalledExactlyOnceWith('illustrated:unused');
    expect(keys.has('character:water:idle')).toBe(true);
    expect(illustratedDepth(20)).toBeLessThan(0);
    expect(illustratedDepth(30)).toBeGreaterThan(0);
  });
});
