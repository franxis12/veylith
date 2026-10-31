import type { MirrorOrientation } from './advancedTypes';

// Screen-space normal: right=0°, down=90°. Old four-way documents keep their face.
export const MIRROR_ANGLES: Record<MirrorOrientation, number> = {
  nw: 225,
  ne: 315,
  se: 45,
  sw: 135,
};
export const normalizeAngle = (angle: number): number =>
  ((angle % 360) + 360) % 360;
export function reflectorAngle(b: {
  orientation: MirrorOrientation;
  angle?: number;
}): number {
  return b.angle ?? MIRROR_ANGLES[b.orientation];
}
export function mirrorNormal(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}
