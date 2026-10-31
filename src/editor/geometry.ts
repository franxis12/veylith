import { illustrationSize } from '../game/assets/illustratedCatalog';
import type { BoxCollider, LevelObject } from '../game/levels/schema/types';
import { environmentSize } from './environmentResize';
import {
  environmentSizing,
  environmentVisualScale,
} from '../game/assets/environmentCatalog';
export interface Point {
  x: number;
  y: number;
}
export interface CameraView {
  scrollX: number;
  scrollY: number;
  zoom: number;
}
export const EDITOR_ZOOM = { min: 0.01, max: 3, initial: 0.65 } as const;
export function clampEditorZoom(zoom: number): number {
  return Math.max(EDITOR_ZOOM.min, Math.min(EDITOR_ZOOM.max, zoom));
}
/** Center the full level with a margin measured in screen space. */
export function fitEditorCamera(
  level: { width: number; height: number },
  viewport: { width: number; height: number },
): CameraView {
  const zoom = clampEditorZoom(
    Math.min(viewport.width / level.width, viewport.height / level.height) *
      0.9,
  );
  return {
    zoom,
    scrollX: (level.width - viewport.width / zoom) / 2,
    scrollY: (level.height - viewport.height / zoom) / 2,
  };
}
/** Hide minor grid lines at distant zooms; snap still uses the selected grid. */
export function gridDisplayStep(grid: number, zoom: number): number {
  const base = Math.max(grid, 16);
  return base * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (base * zoom))));
}
export const screenToWorld = (p: Point, c: CameraView): Point => ({
  x: c.scrollX + p.x / c.zoom,
  y: c.scrollY + p.y / c.zoom,
});
export const worldToScreen = (p: Point, c: CameraView): Point => ({
  x: (p.x - c.scrollX) * c.zoom,
  y: (p.y - c.scrollY) * c.zoom,
});
export const snapped = (v: number, grid: number): number =>
  grid > 0 ? Math.round(v / grid) * grid : v;
export function moveObjects(
  objects: readonly LevelObject[],
  delta: Point,
  grid: number,
): LevelObject[] {
  if (!objects.length) return [];
  const anchor = objects[0]!,
    dx = snapped(anchor.x + delta.x, grid) - anchor.x,
    dy = snapped(anchor.y + delta.y, grid) - anchor.y;
  return objects.map((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
}
export function resizeObject(
  object: LevelObject,
  delta: Point,
  grid: number,
): LevelObject {
  const step =
    environmentSizing(object) === 'platform'
      ? 128 * environmentVisualScale(object)!
      : object.type === 'terrain' || object.type === 'platform'
        ? 128
        : grid;
  const width = Math.max(step || 1, snapped(object.width + delta.x, step));
  const height = Math.max(1, snapped(object.height + delta.y, grid));
  return {
    ...object,
    ...(illustrationSize(object, width, 'width') ??
      environmentSize(object, width, height, 'drag') ?? { width, height }),
    ...(object.type === 'boxCollider'
      ? { collider: { ...object.collider, width, height } }
      : {}),
  };
}
export function editCollider(
  original: BoxCollider,
  handle: string,
  delta: Point,
  grid: number,
): BoxCollider {
  const result = { ...original };
  if (handle === 'move')
    return {
      ...result,
      x: snapped(original.x + delta.x, grid),
      y: snapped(original.y + delta.y, grid),
    };
  const right = original.x + original.width,
    bottom = original.y + original.height;
  if (handle.includes('w')) {
    result.x = Math.min(right - 1, snapped(original.x + delta.x, grid));
    result.width = right - result.x;
  }
  if (handle.includes('n')) {
    result.y = Math.min(bottom - 1, snapped(original.y + delta.y, grid));
    result.height = bottom - result.y;
  }
  if (handle.includes('e'))
    result.width = Math.max(1, snapped(right + delta.x, grid) - original.x);
  if (handle.includes('s'))
    result.height = Math.max(1, snapped(bottom + delta.y, grid) - original.y);
  return result;
}
export function zoomAt(
  camera: CameraView,
  screen: Point,
  zoom: number,
): CameraView {
  const anchor = screenToWorld(screen, camera),
    next = clampEditorZoom(zoom);
  return {
    zoom: next,
    scrollX: anchor.x - screen.x / next,
    scrollY: anchor.y - screen.y / next,
  };
}
