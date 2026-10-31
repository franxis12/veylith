import type { LevelDocument } from '../../levels/schema/types';
const range = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validateAdvanced(
  o: Record<string, unknown>,
  b: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const bad = (s: string) => errors.push(`${String(o.id)}: ${s}`);
  if (
    b.kind === 'reflector' &&
    (!['nw', 'ne', 'se', 'sw'].includes(String(b.orientation)) ||
      typeof b.pushable !== 'boolean' ||
      (b.angle !== undefined && (!range(b.angle, 0, 360) || b.angle === 360)) ||
      (b.rotatable !== undefined && typeof b.rotatable !== 'boolean'))
  )
    bad('orientación, ángulo (0–<360), giro o empuje del espejo no válido.');
  if (b.kind === 'receiver' && typeof b.latch !== 'boolean')
    bad('memoria del receptor no válida.');
  if (
    b.kind === 'beamEmitter' &&
    (!['up', 'down', 'left', 'right'].includes(String(b.direction)) ||
      !range(b.range, 1, 32768) ||
      !range(b.maxBounces, 0, 32) ||
      !Number.isInteger(b.maxBounces))
  )
    bad('haz: alcance 1–32768 y entre 0 y 32 reflexiones enteras.');
  if (
    b.kind === 'pulley' &&
    (typeof b.counterweightId !== 'string' ||
      !range(Math.abs(Number(b.travelY)), 1, 8192) ||
      typeof b.travelY !== 'number' ||
      !range(b.speed, 1, 300) ||
      !['weight', 'signal'].includes(String(b.mode)) ||
      !range(b.threshold, 0.1, 100))
  )
    bad(
      'polea: ID, recorrido (±1–8192), velocidad (1–300), peso o modo no válido.',
    );
  if (b.kind === 'pulleyWeight' && !range(b.mass, 0, 100))
    bad('masa del contrapeso: 0–100.');
  if (
    b.kind === 'conveyor' &&
    (!range(b.speed, 1, 500) ||
      !range(b.segments, 1, 32) ||
      !Number.isInteger(b.segments))
  )
    bad('cinta: velocidad 1–500 y entre 1 y 32 segmentos enteros.');
  if (
    ['conveyor', 'directionalGate'].includes(String(b.kind)) &&
    b.direction !== 1 &&
    b.direction !== -1
  )
    bad('dirección: izquierda o derecha.');
  const collider = o.collider as Record<string, unknown> | undefined;
  if (
    b.kind === 'directionalGate' &&
    collider &&
    !range(collider.width, 24, 32768)
  )
    bad('compuerta: collider de al menos 24 unidades de ancho.');
  return errors;
}
export function validateAdvancedLinks(doc: LevelDocument): string[] {
  const errors: string[] = [],
    used = new Set<string>();
  const emitters = doc.objects.filter(
    (o) => o.type === 'world' && o.behavior.kind === 'beamEmitter',
  );
  if (emitters.length > 16)
    errors.push(
      'Máximo 16 emisores por nivel para limitar el trazado de haces.',
    );
  for (const o of doc.objects) {
    if (
      o.type !== 'world' ||
      o.behavior.kind !== 'pulley' ||
      !o.behavior.counterweightId
    )
      continue;
    const id = o.behavior.counterweightId,
      weight = doc.objects.find((w) => w.id === id);
    if (
      !weight ||
      weight.type !== 'world' ||
      weight.behavior.kind !== 'pulleyWeight'
    )
      errors.push(
        `${o.id}: el contrapeso enlazado no existe o es incompatible.`,
      );
    if (used.has(id))
      errors.push(
        `${o.id}: cada contrapeso solo puede pertenecer a una polea.`,
      );
    used.add(id);
  }
  return errors;
}
