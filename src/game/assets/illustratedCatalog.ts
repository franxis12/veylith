import manifest from './illustratedManifest.json';
import type { LevelObject } from '../levels/schema/types';

export interface IllustratedAnimation {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}
export interface IllustratedOverlay {
  id: string;
  animation: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  opacity: number;
  phase: number;
  fps: number;
  visible: boolean;
}
export interface IllustratedScene {
  title: string;
  width: number;
  height: number;
  layers: {
    id: string;
    path: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
  }[];
  animations: Record<string, IllustratedAnimation>;
  overlays: IllustratedOverlay[];
  warnings: string[];
}
export const ILLUSTRATED_SCENES: Readonly<Record<string, IllustratedScene>> =
  manifest;
export function illustratedScene(id: unknown): IllustratedScene | undefined {
  return typeof id === 'string' && Object.hasOwn(ILLUSTRATED_SCENES, id)
    ? ILLUSTRATED_SCENES[id]
    : undefined;
}
export type IllustrationObject = Extract<LevelObject, { type: 'illustration' }>;
/** Manifest z=20 is behind gameplay (depth 0), z=30 is in front. */
export const illustratedDepth = (z: number, offset = 0): number =>
  z - 25 + offset;
export function illustrationSize(
  object: LevelObject,
  value: number,
  axis: 'width' | 'height',
) {
  if (object.type !== 'illustration') return undefined;
  const scene = illustratedScene(object.sceneId);
  if (!scene || !Number.isFinite(value) || value <= 0) return undefined;
  const scale = value / scene[axis];
  return { width: scene.width * scale, height: scene.height * scale };
}
export function illustrationObjects(
  objects: readonly LevelObject[],
): IllustrationObject[] {
  return objects.filter(
    (o): o is IllustrationObject => o.type === 'illustration',
  );
}
/** Dependency list excludes disabled art, previews, alignment aids and alternative sections. */
export function illustratedResources(objects: readonly LevelObject[]) {
  const resources = new Map<
    string,
    { key: string; path: string; animation?: IllustratedAnimation }
  >();
  for (const object of illustrationObjects(objects)) {
    if (!object.visible) continue;
    const scene = illustratedScene(object.sceneId);
    if (!scene) continue;
    for (const layer of scene.layers.filter((l) =>
      object.layers.includes(l.id),
    )) {
      const key = `illustrated:${object.sceneId}:layer:${layer.id}`;
      resources.set(key, { key, path: layer.path });
    }
    for (const overlay of object.overlays.filter((o) => o.visible)) {
      const animation = scene.animations[overlay.animation];
      if (!animation) continue;
      const key = `illustrated:${object.sceneId}:animation:${overlay.animation}`;
      resources.set(key, { key, path: animation.path, animation });
    }
  }
  return [...resources.values()];
}
