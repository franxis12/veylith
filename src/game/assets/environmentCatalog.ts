import manifest from './environmentManifest.json';
import type { BoxCollider, LevelObject } from '../levels/schema/types';

export type EnvironmentName = keyof typeof manifest.assets;
export type EnvironmentAssetId = `environment:${EnvironmentName}`;
export interface EnvironmentAsset {
  path: string;
  width: number;
  height: number;
  anchor: readonly number[];
  layer: number;
  category: string;
  repeat: readonly string[];
  step: readonly number[];
  underlay: boolean;
  collision: Omit<BoxCollider, 'enabled'> | null;
}
export const ENVIRONMENT_ASSETS: Readonly<
  Record<EnvironmentName, EnvironmentAsset>
> = manifest.assets;
export const ENVIRONMENT_PLATFORMS = manifest.platforms;
type PlatformName = keyof typeof ENVIRONMENT_PLATFORMS;
export function environmentName(value: unknown): EnvironmentName | undefined {
  if (typeof value !== 'string' || !value.startsWith('environment:')) return;
  const name = value.slice('environment:'.length);
  return Object.hasOwn(ENVIRONMENT_ASSETS, name)
    ? (name as EnvironmentName)
    : undefined;
}
export function platformName(value: unknown): PlatformName | undefined {
  const name = environmentName(value);
  return name && Object.hasOwn(ENVIRONMENT_PLATFORMS, name)
    ? (name as PlatformName)
    : undefined;
}
export function platformParts(
  name: PlatformName,
): readonly [EnvironmentName, EnvironmentName, EnvironmentName] {
  const family = ENVIRONMENT_PLATFORMS[name];
  // Generated from inspected manifests; the audit checks every referenced part.
  return [
    family.left as EnvironmentName,
    name,
    family.right as EnvironmentName,
  ];
}
export type EnvironmentSizing =
  'platform' | 'horizontal' | 'vertical' | 'tiled' | 'proportional';
/** Only the inspected repeat axes opt an image into extension. */
export function environmentSizing(object: {
  type: unknown;
  asset: unknown;
}): EnvironmentSizing | undefined {
  const name = environmentName(object.asset);
  if (!name) return;
  if (object.type === 'platform' && platformName(object.asset))
    return 'platform';
  const repeat = ENVIRONMENT_ASSETS[name].repeat;
  if (repeat.includes('x') && repeat.includes('y')) return 'tiled';
  if (repeat.includes('x')) return 'horizontal';
  if (repeat.includes('y')) return 'vertical';
  return 'proportional';
}
export const MAX_ENVIRONMENT_TILES = 4096;
/** Fractional scales can put an exact cell boundary a few floating-point bits over. */
export function environmentCellCount(span: number, cellSize: number): number {
  return span > 0 ? Math.max(1, Math.ceil(span / cellSize - 1e-9)) : 0;
}
interface EnvironmentDimensions {
  type: unknown;
  asset: unknown;
  width: number;
  height: number;
  tileScale?: number;
}
/** One uniform scale per piece. Only two-axis fills need an extra saved value. */
export function environmentVisualScale(
  object: EnvironmentDimensions,
): number | undefined {
  const name = environmentName(object.asset);
  if (!name) return;
  const art = ENVIRONMENT_ASSETS[name],
    mode = environmentSizing(object);
  if (mode === 'platform') return platformScale(object.width, object.height);
  if (mode === 'horizontal') return object.height / art.height;
  if (mode === 'vertical') return object.width / art.width;
  if (mode === 'tiled')
    return Number.isFinite(object.tileScale) && object.tileScale! > 0
      ? object.tileScale!
      : 1;
  return Math.min(object.width / art.width, object.height / art.height);
}
export function environmentTileCount(object: EnvironmentDimensions): number {
  const name = environmentName(object.asset);
  if (!name) return 0;
  const art = ENVIRONMENT_ASSETS[name],
    mode = environmentSizing(object),
    scale = environmentVisualScale(object)!;
  if (mode === 'platform')
    return Math.max(2, environmentCellCount(object.width, 128 * scale));
  if (mode === 'horizontal')
    return environmentCellCount(object.width, art.width * scale);
  if (mode === 'vertical')
    return environmentCellCount(object.height, art.height * scale);
  if (mode === 'tiled')
    return (
      environmentCellCount(object.width, art.width * scale) *
      environmentCellCount(object.height, art.height * scale)
    );
  return 1;
}
/** Older documents may have a height too large for their two end caps. Fit uniformly. */
export function platformScale(width: number, height: number): number {
  return Math.min(height / 128, width / 256);
}
export function environmentNames(
  objects: readonly LevelObject[],
): EnvironmentName[] {
  const names = new Set<EnvironmentName>();
  for (const object of objects) {
    const name = environmentName(object.asset);
    if (!name) continue;
    const family = object.type === 'platform' && platformName(object.asset);
    for (const part of family ? platformParts(family) : [name]) names.add(part);
  }
  return [...names];
}
export function platformCollider(
  name: PlatformName,
  width: number,
  height: number,
): BoxCollider {
  const [left, , right] = platformParts(name);
  const l = ENVIRONMENT_ASSETS[left].collision!;
  const r = ENVIRONMENT_ASSETS[right].collision!;
  const scale = platformScale(width, height);
  return {
    enabled: true,
    x: l.x * scale,
    y: l.y * scale,
    width: width - (l.x + 128 - r.x - r.width) * scale,
    height: l.height * scale,
  };
}
