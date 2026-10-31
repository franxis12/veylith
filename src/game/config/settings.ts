export const GAME_SETTINGS = {
  width: 1280,
  height: 720,
  backgroundColor: '#101b26',
  maxRenderScale: 2,
  gravity: { x: 0, y: 900 },
} as const;

/** Level-authored lens zoom, independent of backing pixel density and physics. */
export const GAME_CAMERA_ZOOM = { min: 0.25, max: 1.5, default: 1 } as const;

/** Integer backing scale keeps the logical world stable and limits Retina GPU cost. */
export function getRenderScale(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
    return 1;
  }

  return Math.min(
    GAME_SETTINGS.maxRenderScale,
    Math.max(1, Math.ceil(devicePixelRatio)),
  );
}
