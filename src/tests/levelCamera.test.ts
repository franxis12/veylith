import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import { configureWorldCamera } from '../game/core/WorldCamera';
import { ForestBackdrop } from '../game/levels/ancientForest/ForestBackdrop';

describe('level-authored gameplay camera', () => {
  it('keeps old v1 documents unchanged and preserves zoom through save, compile and undo/redo', () => {
    const original = newLevel();
    expect(parseLevel(JSON.parse(serializeLevel(original)))).toEqual(original);
    expect(original.cameraZoom).toBeUndefined();
    const model = new EditorModel(original);
    model.commit((d) => {
      d.cameraZoom = 0.5;
    });
    const saved = parseLevel(
      JSON.parse(serializeLevel(model.getSnapshot().document)),
    );
    expect(compileLevel(saved).document.cameraZoom).toBe(0.5);
    expect(saved.objects).toEqual(original.objects);
    expect([saved.width, saved.height, saved.fallLimit]).toEqual([
      original.width,
      original.height,
      original.fallLimit,
    ]);
    model.undo();
    expect(model.getSnapshot().document).toEqual(original);
    model.redo();
    expect(model.getSnapshot().document.cameraZoom).toBe(0.5);
  });
  it('rejects nonnumeric, nonfinite and out-of-range zoom before saving or playtest', () => {
    for (const cameraZoom of [
      null,
      '0.5',
      NaN,
      Infinity,
      0,
      -1,
      0.249,
      1.501,
    ]) {
      expect(validateLevel({ ...newLevel(), cameraZoom }).join(' ')).toContain(
        'zoom',
      );
    }
    for (const cameraZoom of [0.25, 0.5, 0.75, 1, 1.5]) {
      expect(validateLevel({ ...newLevel(), cameraZoom })).toEqual([]);
    }
  });
  it.each([0.25, 0.5, 0.75, 1, 1.5])(
    'shows the same world area at zoom %s on standard and Retina displays without enlarging physics or background surfaces',
    (zoom) => {
      for (const renderScale of [1, 2]) {
        const camera = {
          width: 1280 * renderScale,
          height: 720 * renderScale,
          zoom: 1,
          scrollX: 500,
          scrollY: 100,
          setZoom(value: number) {
            this.zoom = value;
            return this;
          },
          centerOn: vi.fn(),
          get displayWidth() {
            return this.width / this.zoom;
          },
          get displayHeight() {
            return this.height / this.zoom;
          },
        };
        const bounds = vi.fn();
        configureWorldCamera(
          {
            cameras: { main: camera },
            physics: { world: { setBounds: bounds } },
          } as unknown as Phaser.Scene,
          renderScale,
          zoom,
        );
        expect(camera.displayWidth).toBeCloseTo(1280 / zoom);
        expect(camera.displayHeight).toBeCloseTo(720 / zoom);
        expect(bounds).toHaveBeenCalledWith(0, 0, 1280, 720);
        const images: {
          x: number;
          y: number;
          width: number;
          height: number;
          scaleX: number;
          tileScaleX: number;
          tilePositionX: number;
          destroy: ReturnType<typeof vi.fn>;
        }[] = [];
        const scene = {
          add: {
            tileSprite: (
              x: number,
              y: number,
              width: number,
              height: number,
            ) => {
              const image = {
                x,
                y,
                width,
                height,
                scaleX: 1,
                tileScaleX: 1,
                tilePositionX: 0,
                setOrigin: () => image,
                setScrollFactor: () => image,
                setScale: (scale: number) => {
                  image.scaleX = scale;
                  return image;
                },
                setTileScale: (scale: number) => {
                  image.tileScaleX = scale;
                  return image;
                },
                setDepth: () => image,
                setAlpha: () => image,
                destroy: vi.fn(),
              };
              images.push(image);
              return image;
            },
          },
        } as unknown as Phaser.Scene;
        const backdrop = new ForestBackdrop(
          camera as unknown as Phaser.Cameras.Scene2D.Camera,
          scene,
        );
        for (const image of images) {
          expect([image.width, image.height]).toEqual([1280, 720]);
          expect(image.width * image.scaleX).toBeCloseTo(camera.displayWidth);
          expect(image.height * image.scaleX).toBeCloseTo(camera.displayHeight);
          const screenLeft =
            (image.x - camera.width / 2) * camera.zoom + camera.width / 2;
          expect(screenLeft).toBeCloseTo(0);
        }
        const sky = images[0]!;
        expect(
          (sky.y - camera.height / 2) * camera.zoom + camera.height / 2,
        ).toBeCloseTo(0);
        const offset = sky.tilePositionX;
        camera.scrollX += 100;
        backdrop.update();
        expect(sky.tilePositionX - offset).toBeCloseTo(
          (100 * 0.08) / (sky.tileScaleX * sky.scaleX),
        );
        backdrop.destroy();
        expect(
          images.every((image) => image.destroy.mock.calls.length === 1),
        ).toBe(true);
      }
    },
  );
});
