import type { LevelObject, PlayerCollisionFaces } from './types';

export const PLATFORM_FACES: Readonly<PlayerCollisionFaces> = {
  top: true,
  bottom: false,
  left: false,
  right: false,
};
export const BLOCKER_FACES: Readonly<PlayerCollisionFaces> = {
  ...PLATFORM_FACES,
  left: true,
  right: true,
};
export const SOLID_FACES: Readonly<PlayerCollisionFaces> = {
  top: true,
  bottom: true,
  left: true,
  right: true,
};

/** Defaults preserve existing documents; only an explicit editor change serializes faces. */
export function playerCollisionFaces(
  object: LevelObject,
): PlayerCollisionFaces {
  if (object.collider.playerCollision)
    return { ...object.collider.playerCollision };
  const blocker =
    ['block', 'door', 'wall'].includes(object.type) ||
    (object.type === 'world' &&
      [
        'reflector',
        'breakable',
        'timedDoor',
        'barrier',
        'directionalGate',
      ].includes(object.behavior.kind));
  return { ...(blocker ? BLOCKER_FACES : PLATFORM_FACES) };
}
export function hasPlayerSurface(object: LevelObject): boolean {
  return (
    [
      'terrain',
      'platform',
      'decoration',
      'boxCollider',
      'block',
      'door',
      'wall',
    ].includes(object.type) ||
    (object.type === 'world' &&
      !['heat', 'lake'].includes(object.behavior.kind))
  );
}
