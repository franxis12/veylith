import { illustratedScene } from '../../assets/illustratedCatalog';
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function validateIllustration(item: Record<string, unknown>): string[] {
  const error = (message: string) => [`${String(item.id)}: ${message}`];
  const scene = illustratedScene(item.sceneId);
  if (!scene) return error('escenario ilustrado desconocido.');
  if (
    !Array.isArray(item.layers) ||
    new Set(item.layers).size !== item.layers.length ||
    item.layers.some((id) => !scene.layers.some((l) => l.id === id))
  )
    return error('capas ilustradas no válidas.');
  if (
    !finite(item.width) ||
    !finite(item.height) ||
    Math.abs(item.width / scene.width - item.height / scene.height) > 0.00001
  )
    return error('el escenario debe conservar su proporción original.');
  if (!record(item.collider) || item.collider.enabled !== false)
    return error(
      'añade Box Colliders independientes; la ilustración no es sólida.',
    );
  if (!Array.isArray(item.overlays) || item.overlays.length > 100)
    return error('máximo 100 overlays por escenario.');
  const ids = new Set<string>();
  for (const overlay of item.overlays) {
    if (
      !record(overlay) ||
      typeof overlay.id !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(overlay.id) ||
      ids.has(overlay.id)
    )
      return error('ID de overlay no válido o repetido.');
    ids.add(overlay.id);
    const a =
      typeof overlay.animation === 'string' &&
      Object.hasOwn(scene.animations, overlay.animation)
        ? scene.animations[overlay.animation]
        : undefined;
    if (
      !a ||
      !['x', 'y', 'width', 'height', 'z', 'opacity', 'phase', 'fps'].every(
        (k) => finite(overlay[k]),
      ) ||
      Math.abs(overlay.x as number) > 65536 ||
      Math.abs(overlay.y as number) > 65536 ||
      (overlay.width as number) <= 0 ||
      (overlay.height as number) <= 0 ||
      (overlay.width as number) > 32768 ||
      (overlay.height as number) > 32768 ||
      (overlay.opacity as number) < 0 ||
      (overlay.opacity as number) > 1 ||
      (overlay.fps as number) < 1 ||
      (overlay.fps as number) > 60 ||
      !Number.isInteger(overlay.phase) ||
      (overlay.phase as number) < 0 ||
      (overlay.phase as number) >= a.frameCount ||
      Math.abs(overlay.z as number) > 1000 ||
      typeof overlay.visible !== 'boolean'
    )
      return error(
        `overlay ${overlay.id}: animación, posición, tamaño o reproducción no válidos.`,
      );
  }
  return [];
}
