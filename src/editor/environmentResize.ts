import type { LevelObject } from '../game/levels/schema/types';
import {
  ENVIRONMENT_ASSETS,
  environmentName,
  environmentSizing,
  environmentVisualScale,
} from '../game/assets/environmentCatalog';

/** Editor-only sizing; neither an old JSON document nor its collider is rewritten. */
export function environmentSize(
  object: LevelObject,
  width: number,
  height: number,
  source: 'width' | 'height' | 'drag',
): Pick<LevelObject, 'width' | 'height'> | undefined {
  const name = environmentName(object.asset);
  if (!name) return;
  const mode = environmentSizing(object);
  const art = ENVIRONMENT_ASSETS[name];
  width = Math.max(1, width);
  height = Math.max(1, height);
  if (source === 'drag') {
    if (mode === 'platform' || mode === 'horizontal') height = object.height;
    if (mode === 'vertical') width = object.width;
  }
  if (mode === 'proportional') {
    const fromWidth =
      source === 'width' ||
      (source === 'drag' &&
        Math.abs(width - object.width) / art.width >=
          Math.abs(height - object.height) / art.height);
    const scale = Math.max(
      1 / Math.min(art.width, art.height),
      fromWidth ? width / art.width : height / art.height,
    );
    return { width: art.width * scale, height: art.height * scale };
  }
  if (mode === 'platform') width = Math.max(height * 2, width);
  return { width, height };
}

/** Scale the whole assembly; later extension keeps the selected module size. */
export function scaleEnvironment(
  object: LevelObject,
  scale: number,
): Pick<LevelObject, 'width' | 'height' | 'tileScale'> | undefined {
  const current = environmentVisualScale(object);
  if (!current || !Number.isFinite(scale) || scale <= 0) return;
  const tiled = environmentSizing(object) === 'tiled';
  const ratio = Math.min(
    32768 / Math.max(object.width, object.height),
    tiled ? 32768 / current : Infinity,
    Math.max(1 / Math.min(object.width, object.height), scale / current),
  );
  return {
    width: object.width * ratio,
    height: object.height * ratio,
    ...(tiled ? { tileScale: current * ratio } : {}),
  };
}
