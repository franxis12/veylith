import {
  queueExitAssets,
  registerExitAnimations,
} from '../game/assets/exitAssets';
import { illustratedResources } from '../game/assets/illustratedCatalog';
import {
  queueIllustratedAssets,
  releaseIllustratedAssets,
} from '../game/assets/illustratedAssets';
import { colliderBounds } from '../game/levels/schema/types';
import {
  queueWorldAssets,
  registerWorldAnimations,
} from '../game/assets/worldAssets';
import { WORLD_KINDS } from '../game/systems/world/types';
import type { WorldKind } from '../game/systems/world/types';
import { environmentNames } from '../game/assets/environmentCatalog';
import type { EnvironmentName } from '../game/assets/environmentCatalog';
import { queueEnvironmentAssets } from '../game/assets/environmentAssets';
import Phaser from 'phaser';
import { queueCoinAsset } from '../game/assets/coinAsset';
import { queueForestAssets, forestTexture } from '../game/assets/forestAssets';
import { GEM_SHEETS } from '../game/assets/gemSheets';
import {
  queueOptionalSheet,
  registerOptionalSheet,
} from '../game/assets/optionalSheet';
import { renderObject } from '../game/levels/schema/renderObject';
import type { LevelDocument, LevelObject } from '../game/levels/schema/types';
import type { EditorModel } from './model';
import { LIBRARY, createObject } from './library';
import {
  editCollider,
  moveObjects,
  resizeObject,
  screenToWorld,
  snapped,
  zoomAt,
  EDITOR_ZOOM,
  fitEditorCamera,
  gridDisplayStep,
} from './geometry';
import type { Point } from './geometry';
interface Drag {
  kind: 'move' | 'resize' | 'collider' | 'pan' | 'draw';
  start: Point;
  objects: LevelObject[];
  handle: string;
  scroll: Point;
}
export class EditorScene extends Phaser.Scene {
  private disposed = false;
  private readonly attemptedIllustrated = new Set<string>();
  private assetError: Phaser.GameObjects.Text | undefined;
  private readonly loadedWorld = new Set<WorldKind>();
  private readonly loadedEnvironment = new Set<EnvironmentName>();
  private views = new Map<string, Phaser.GameObjects.Container>();
  private outlines!: Phaser.GameObjects.Graphics;
  private gridView!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private fallLabel!: Phaser.GameObjects.Text;
  private lastDoc: LevelDocument | undefined;
  private unsubscribe: (() => void) | undefined;
  private drag: Drag | undefined;
  private draft: LevelObject[] = [];
  private background: Phaser.GameObjects.TileSprite[] = [];
  grid = 32;
  snap = true;
  showGrid = true;
  colliderMode = false;
  effectMode = false;
  drawCollider = false;
  space = false;
  constructor(
    private readonly model: EditorModel,
    private readonly onZoom: (zoom: number) => void,
  ) {
    super('LevelEditor');
  }
  preload(): void {
    queueWorldAssets(this, WORLD_KINDS, true);
    queueCoinAsset(this);
    queueForestAssets(this);
    queueExitAssets(this, true);
    for (const sheet of GEM_SHEETS.filter((s) => s.action === 'idle'))
      queueOptionalSheet(this, sheet.key, sheet);
  }
  create(): void {
    // React can unmount while the loader is finishing. Never initialize a cancelled editor.
    if (this.disposed) return;
    registerExitAnimations(this, true);
    for (const sheet of GEM_SHEETS.filter((s) => s.action === 'idle'))
      registerOptionalSheet(this, sheet.key, sheet);
    this.load.on('complete', () => {
      registerWorldAnimations(this);
      this.lastDoc = undefined;
      this.sync();
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (!file.key.startsWith('illustrated:')) return;
      this.assetError?.destroy();
      this.assetError = this.add
        .text(
          12,
          12,
          `No se pudo cargar ${file.key}. Revisa el archivo y recarga.`,
          {
            fontSize: '14px',
            backgroundColor: '#652323',
            color: '#ffffff',
            wordWrap: { width: 500 },
          },
        )
        .setScrollFactor(0)
        .setDepth(10001);
    });
    this.cameras.main.setOrigin(0, 0).setZoom(EDITOR_ZOOM.initial);
    this.background = ['sky', 'forest', 'foreground'].map((id, i) =>
      this.add
        .tileSprite(
          0,
          0,
          1280,
          720,
          forestTexture(id as 'sky' | 'forest' | 'foreground'),
        )
        .setOrigin(0)
        .setDepth(-100 + i)
        .setAlpha(i === 2 ? 0.6 : 1),
    );
    this.gridView = this.add.graphics().setDepth(9998);
    this.outlines = this.add.graphics().setDepth(9999);
    this.fallLabel = this.add
      .text(0, 0, '', {
        fontSize: '14px',
        backgroundColor: '#421a24',
        color: '#ffb3b3',
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0, 1)
      .setDepth(9999);
    this.label = this.add
      .text(0, 0, '', {
        fontSize: '14px',
        backgroundColor: '#051b2d',
        color: '#b7ffb4',
        padding: { x: 4, y: 3 },
      })
      .setDepth(10000);
    this.unsubscribe = this.model.subscribe(() => this.sync());
    this.sync();
    this.onZoom(this.cameras.main.zoom);
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.down, this);
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.up, this);
    this.input.on('pointerupoutside', this.up, this);
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _objects: unknown,
        _dx: number,
        dy: number,
      ) => this.zoom(dy > 0 ? 0.9 : 1.1, { x: _pointer.x, y: _pointer.y }),
    );
    this.scale.on('resize', this.redraw, this);
    this.events.once('shutdown', this.dispose, this);
    this.events.once('destroy', this.dispose, this);
  }
  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.scale?.off('resize', this.redraw, this);
    this.input?.removeAllListeners();
    this.load?.removeAllListeners();
  }
  private world(pointer: Phaser.Input.Pointer): Point {
    return screenToWorld(pointer, this.cameras.main);
  }
  private sync(): void {
    const doc = this.model.getSnapshot().document;
    const needed = doc.objects
      .filter((o) => o.type === 'world')
      .map((o) => o.kind)
      .filter((k) => !this.loadedWorld.has(k));
    const environment = environmentNames(doc.objects).filter(
      (name) => !this.loadedEnvironment.has(name),
    );
    const illustrated = illustratedResources(doc.objects).filter(
      (r) =>
        !this.textures.exists(r.key) && !this.attemptedIllustrated.has(r.key),
    );
    if (
      (needed.length || environment.length || illustrated.length) &&
      !this.load.isLoading()
    ) {
      for (const resource of illustrated)
        this.attemptedIllustrated.add(resource.key);
      queueIllustratedAssets(this, doc.objects);
      for (const kind of needed) this.loadedWorld.add(kind);
      for (const name of environment) this.loadedEnvironment.add(name);
      queueWorldAssets(this, needed);
      queueEnvironmentAssets(this, environment);
      this.load.start();
    }
    if (doc !== this.lastDoc) {
      this.lastDoc = doc;
      for (const view of this.views.values()) view.destroy();
      this.views.clear();
      if (!this.load.isLoading()) {
        releaseIllustratedAssets(this, doc.objects);
        const used = new Set(
          illustratedResources(doc.objects).map((r) => r.key),
        );
        for (const key of this.attemptedIllustrated)
          if (!used.has(key)) this.attemptedIllustrated.delete(key);
      }
      for (const object of doc.objects)
        this.views.set(object.id, renderObject(this, object, true));
    }
    this.redraw();
  }
  private selected(): LevelObject[] {
    return this.model
      .getSnapshot()
      .document.objects.filter((o) =>
        this.model.getSnapshot().selection.includes(o.id),
      );
  }
  private down(pointer: Phaser.Input.Pointer): void {
    const world = this.world(pointer),
      camera = this.cameras.main;
    if (pointer.middleButtonDown() || pointer.rightButtonDown() || this.space) {
      this.drag = {
        kind: 'pan',
        start: { x: pointer.x, y: pointer.y },
        scroll: { x: camera.scrollX, y: camera.scrollY },
        objects: [],
        handle: '',
      };
      return;
    }
    if (this.drawCollider) {
      const grid = this.snap ? this.grid : 0;
      this.drag = {
        kind: 'draw',
        start: { x: snapped(world.x, grid), y: snapped(world.y, grid) },
        objects: [],
        handle: '',
        scroll: { x: 0, y: 0 },
      };
      return;
    }
    const selected = this.selected(),
      one = selected.length === 1 ? selected[0] : undefined,
      epsilon = 9 / camera.zoom;
    if (one && this.colliderMode && this.editableCollider(one)) {
      const c =
          this.effectMode && one.type === 'world' ? one.effect : one.collider,
        left = one.x + c.x,
        top = one.y + c.y;
      const handle = this.handles(left, top, c.width, c.height).find(
        (h) =>
          Math.abs(h.x - world.x) < epsilon &&
          Math.abs(h.y - world.y) < epsilon,
      );
      if (
        handle ||
        (world.x >= left &&
          world.x <= left + c.width &&
          world.y >= top &&
          world.y <= top + c.height)
      ) {
        this.drag = {
          kind: 'collider',
          handle: handle?.id ?? 'move',
          start: world,
          objects: structuredClone(selected),
          scroll: { x: 0, y: 0 },
        };
        return;
      }
    }
    if (
      one &&
      !this.colliderMode &&
      !['spawn', 'crossing'].includes(one.type) &&
      Math.abs(world.x - one.x - one.width) < epsilon &&
      Math.abs(world.y - one.y - one.height) < epsilon
    ) {
      this.drag = {
        kind: 'resize',
        start: world,
        objects: structuredClone(selected),
        handle: 'se',
        scroll: { x: 0, y: 0 },
      };
      return;
    }
    const hit = [...this.model.getSnapshot().document.objects]
      .sort(
        (a, b) =>
          Number(a.type === 'illustration') -
            Number(b.type === 'illustration') || b.layer - a.layer,
      )
      .find((o) => {
        const b =
          o.type === 'boxCollider'
            ? colliderBounds(o)
            : {
                left: o.x,
                right: o.x + o.width,
                top: o.y,
                bottom: o.y + o.height,
              };
        return (
          o.type !== 'crossing' &&
          world.x >= b.left &&
          world.x <= b.right &&
          world.y >= b.top &&
          world.y <= b.bottom
        );
      });
    if (!hit) {
      this.model.select([]);
      return;
    }
    if (pointer.event.shiftKey) {
      this.model.select(
        this.model.getSnapshot().selection.includes(hit.id)
          ? this.model.getSnapshot().selection.filter((id) => id !== hit.id)
          : [...this.model.getSnapshot().selection, hit.id],
      );
    } else if (!this.model.getSnapshot().selection.includes(hit.id))
      this.model.select([hit.id]);
    this.drag = {
      kind: 'move',
      start: world,
      objects: structuredClone(this.selected()),
      handle: '',
      scroll: { x: 0, y: 0 },
    };
  }
  private move(pointer: Phaser.Input.Pointer): void {
    if (!this.drag) return;
    const drag = this.drag,
      camera = this.cameras.main;
    if (drag.kind === 'pan') {
      camera.setScroll(
        drag.scroll.x - (pointer.x - drag.start.x) / camera.zoom,
        drag.scroll.y - (pointer.y - drag.start.y) / camera.zoom,
      );
      this.redraw();
      return;
    }
    const world = this.world(pointer),
      delta = { x: world.x - drag.start.x, y: world.y - drag.start.y },
      grid = this.snap ? this.grid : 0;
    if (drag.kind === 'draw') {
      const end = { x: snapped(world.x, grid), y: snapped(world.y, grid) };
      const object = createObject(
        LIBRARY.find((i) => i.id === 'boxCollider')!,
        Math.min(end.x, drag.start.x),
        Math.min(end.y, drag.start.y),
        this.model.getSnapshot().document.objects,
      );
      object.width = object.collider.width = Math.max(
        1,
        Math.abs(end.x - drag.start.x),
      );
      object.height = object.collider.height = Math.max(
        1,
        Math.abs(end.y - drag.start.y),
      );
      this.draft = [object];
      this.redraw();
      return;
    }
    this.draft =
      drag.kind === 'move'
        ? moveObjects(drag.objects, delta, grid)
        : drag.objects.map((o) =>
            drag.kind === 'resize'
              ? resizeObject(o, delta, grid)
              : {
                  ...o,
                  ...(this.effectMode && o.type === 'world'
                    ? {
                        effect: editCollider(
                          o.effect,
                          drag.handle,
                          delta,
                          grid,
                        ),
                      }
                    : {
                        collider: editCollider(
                          o.collider,
                          drag.handle,
                          delta,
                          grid,
                        ),
                      }),
                },
          );
    for (const object of this.draft) {
      if (drag.kind === 'move' && object.type !== 'illustration')
        this.views.get(object.id)?.setPosition(object.x, object.y);
      else if (drag.kind === 'resize' || object.type === 'illustration') {
        this.views.get(object.id)?.destroy();
        this.views.set(object.id, renderObject(this, object, true));
      }
    }
    this.redraw();
  }
  private up(): void {
    if (!this.drag) return;
    const draft = this.draft,
      drawing = this.drag.kind === 'draw';
    this.drag = undefined;
    this.draft = [];
    if (draft.length)
      this.model.commit((doc) => {
        doc.objects = drawing
          ? [...doc.objects, ...draft]
          : doc.objects.map((o) => draft.find((d) => d.id === o.id) ?? o);
      });
    if (drawing && draft[0]) this.model.select([draft[0].id]);
    this.redraw();
  }
  cancel(clearSelection = true): void {
    if (this.drag) {
      this.drag = undefined;
      this.draft = [];
      this.lastDoc = undefined;
      this.sync();
    } else if (clearSelection) this.model.select([]);
  }
  setOptions(options: {
    grid: number;
    snap: boolean;
    showGrid: boolean;
    colliderMode: boolean;
    effectMode: boolean;
    drawCollider: boolean;
  }): void {
    Object.assign(this, options);
    if (this.outlines) this.redraw();
  }
  zoom(
    factor: number,
    point: Point = { x: this.scale.width / 2, y: this.scale.height / 2 },
  ): void {
    this.setZoom(this.cameras.main.zoom * factor, point);
  }
  setZoom(
    zoom: number,
    point: Point = { x: this.scale.width / 2, y: this.scale.height / 2 },
  ): void {
    const c = this.cameras.main,
      n = zoomAt(c, point, zoom);
    c.setZoom(n.zoom).setScroll(n.scrollX, n.scrollY);
    this.redraw();
    this.onZoom(n.zoom);
  }
  fit(): void {
    const doc = this.model.getSnapshot().document,
      c = this.cameras.main,
      fitted = fitEditorCamera(doc, this.scale);
    c.setZoom(fitted.zoom).setScroll(fitted.scrollX, fitted.scrollY);
    this.redraw();
    this.onZoom(c.zoom);
  }
  place(
    id: string,
    screen: Point = { x: this.scale.width / 2, y: this.scale.height / 2 },
  ): void {
    const item = LIBRARY.find((i) => i.id === id);
    if (!item) return;
    if (item.type === 'background') {
      this.model.commit((doc) => {
        doc.background[item.id as keyof typeof doc.background] = true;
      });
      return;
    }
    const point = screenToWorld(screen, this.cameras.main),
      object = createObject(
        item,
        snapped(point.x, this.snap ? this.grid : 0),
        snapped(point.y, this.snap ? this.grid : 0),
        this.model.getSnapshot().document.objects,
      );
    this.model.commit((doc) => {
      doc.objects.push(object);
    });
    this.model.select([object.id]);
  }
  private editableCollider(o: LevelObject): boolean {
    return this.effectMode
      ? o.type === 'world' &&
          [
            'fan',
            'heat',
            'lake',
            'lever',
            'waterwheel',
            'boiler',
            'switch',
            'receiver',
            'beamEmitter',
          ].includes(o.behavior.kind)
      : !['spawn', 'label', 'crossing', 'illustration'].includes(o.type) &&
          !(o.type === 'world' && ['heat', 'lake'].includes(o.behavior.kind));
  }
  private handles(x: number, y: number, w: number, h: number) {
    return [
      { id: 'nw', x, y },
      { id: 'n', x: x + w / 2, y },
      { id: 'ne', x: x + w, y },
      { id: 'e', x: x + w, y: y + h / 2 },
      { id: 'se', x: x + w, y: y + h },
      { id: 's', x: x + w / 2, y: y + h },
      { id: 'sw', x, y: y + h },
      { id: 'w', x, y: y + h / 2 },
    ];
  }
  private redraw(): void {
    if (!this.outlines) return;
    const camera = this.cameras.main,
      doc = this.model.getSnapshot().document,
      w = this.scale.width / camera.zoom,
      h = this.scale.height / camera.zoom;
    this.background.forEach((image, i) => {
      image
        .setPosition(camera.scrollX, camera.scrollY)
        .setDisplaySize(w, h)
        .setTileScale(720 / 1024 / camera.zoom)
        .setVisible(
          doc.background[(['sky', 'forest', 'foreground'] as const)[i]!],
        );
      image.tilePositionX = camera.scrollX * [0.08, 0.32, 0.55][i]!;
    });
    this.gridView.clear();
    if (this.showGrid) {
      const step = gridDisplayStep(this.grid, camera.zoom);
      this.gridView.lineStyle(1 / camera.zoom, 0xc5e4ff, 0.15);
      for (
        let x = Math.floor(camera.scrollX / step) * step;
        x < camera.scrollX + w;
        x += step
      )
        this.gridView.lineBetween(x, camera.scrollY, x, camera.scrollY + h);
      for (
        let y = Math.floor(camera.scrollY / step) * step;
        y < camera.scrollY + h;
        y += step
      )
        this.gridView.lineBetween(camera.scrollX, y, camera.scrollX + w, y);
    }
    this.gridView
      .lineStyle(2 / camera.zoom, 0xffffff, 0.7)
      .strokeRect(0, 0, doc.width, doc.height);
    this.gridView
      .fillStyle(0xe54b4b, 0.16)
      .fillRect(
        0,
        doc.fallLimit,
        doc.width,
        Math.max(0, doc.height - doc.fallLimit),
      )
      .lineStyle(2 / camera.zoom, 0xff7777, 1)
      .lineBetween(0, doc.fallLimit, doc.width, doc.fallLimit);
    this.fallLabel
      .setText(`Límite de caída · Y ${Math.round(doc.fallLimit)}`)
      .setScale(1 / camera.zoom)
      .setPosition(
        Math.max(0, camera.scrollX) + 8 / camera.zoom,
        doc.fallLimit - 4 / camera.zoom,
      )
      .setVisible(camera.scrollX < doc.width && camera.scrollX + w > 0);
    this.outlines.clear();
    this.label.setVisible(false);
    const guides =
      this.drag?.kind === 'draw'
        ? [...doc.objects, ...this.draft]
        : doc.objects.map((o) => this.draft.find((d) => d.id === o.id) ?? o);
    for (const o of guides) {
      if (
        o.type !== 'boxCollider' &&
        !(this.colliderMode && this.editableCollider(o))
      )
        continue;
      const b = colliderBounds(o),
        color = b.enable ? 0x9bff90 : 0xffbf66;
      this.outlines
        .lineStyle(1 / camera.zoom, color, 0.8)
        .strokeRect(b.left, b.top, o.collider.width, o.collider.height);
      if (o.type === 'boxCollider')
        this.outlines
          .fillStyle(color, 0.12)
          .fillRect(b.left, b.top, o.collider.width, o.collider.height);
    }
    for (const original of this.selected()) {
      const o = this.draft.find((d) => d.id === original.id) ?? original;
      this.outlines
        .lineStyle(2 / camera.zoom, 0x57beff, 1)
        .strokeRect(o.x, o.y, o.width, o.height);
      if (o.type === 'world') {
        const e = o.effect;
        if (e.enabled)
          this.outlines
            .lineStyle(2 / camera.zoom, 0xe5a6ff, 1)
            .strokeRect(o.x + e.x, o.y + e.y, e.width, e.height);
        if (o.behavior.kind === 'elevator')
          this.outlines
            .lineStyle(2 / camera.zoom, 0xffd66f, 1)
            .lineBetween(
              o.x + o.width / 2,
              o.y + o.height / 2,
              o.x + o.width / 2 + o.behavior.travelX,
              o.y + o.height / 2 + o.behavior.travelY,
            )
            .strokeRect(
              o.x + o.behavior.travelX,
              o.y + o.behavior.travelY,
              o.width,
              o.height,
            );
      }
      if (this.editableCollider(o)) {
        const b = this.effectMode && o.type === 'world' ? o.effect : o.collider,
          x = o.x + b.x,
          y = o.y + b.y;
        this.outlines
          .lineStyle(
            2 / camera.zoom,
            this.effectMode ? 0xe5a6ff : b.enabled ? 0x9bff90 : 0xffbf66,
            1,
          )
          .strokeRect(x, y, b.width, b.height);
        if (this.colliderMode) {
          const size = 8 / camera.zoom;
          for (const handle of this.handles(x, y, b.width, b.height))
            this.outlines
              .fillStyle(this.effectMode ? 0xe5a6ff : 0x9bff90)
              .fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
          this.label
            .setPosition(x, y + b.height + 5 / camera.zoom)
            .setScale(1 / camera.zoom)
            .setText(
              `${this.effectMode ? 'Efecto' : 'Collider'} ${Math.round(b.width)} × ${Math.round(b.height)} · offset ${Math.round(b.x)}, ${Math.round(b.y)}`,
            )
            .setVisible(true);
        }
      }
      if (!this.colliderMode && !['spawn', 'crossing'].includes(o.type)) {
        const size = 9 / camera.zoom;
        this.outlines
          .fillStyle(0x57beff)
          .fillRect(
            o.x + o.width - size / 2,
            o.y + o.height - size / 2,
            size,
            size,
          );
      }
    }
  }
}
