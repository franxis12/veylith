import { validateAdvanced } from './validateAdvanced';
import { WORLD_ART } from '../../assets/worldAssets';
import { behaviorKind, isWorldKind, STAGE_ONE_KINDS } from './types';
const rec = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const range = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validateWorld(o: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const bad = (message: string) => errors.push(`${String(o.id)}: ${message}`);
  if (!isWorldKind(o.kind))
    return [`${String(o.id)}: objeto del pack desconocido.`];
  if (o.asset !== `world:${o.kind}`)
    bad('el recurso no coincide con el objeto del pack.');
  if (
    typeof o.state !== 'string' ||
    !Object.hasOwn(WORLD_ART[o.kind].states, o.state)
  )
    bad('estado visual desconocido.');
  if (typeof o.hint !== 'string' || o.hint.length > 1000)
    bad('pista no válida.');
  const e = o.effect;
  if (
    !rec(e) ||
    typeof e.enabled !== 'boolean' ||
    !range(e.x, -65536, 65536) ||
    !range(e.y, -65536, 65536) ||
    !range(e.width, 1, 32768) ||
    !range(e.height, 1, 32768)
  )
    bad('zona de efecto rectangular no válida.');
  const b = o.behavior;
  if (
    !rec(b) ||
    (b.kind !== behaviorKind(o.kind) &&
      !(b.kind === 'prop' && STAGE_ONE_KINDS.includes(o.kind)))
  )
    return [
      ...errors,
      `${String(o.id)}: comportamiento incompatible con el recurso.`,
    ];
  if (
    [
      'elevator',
      'fan',
      'bridge',
      'timedDoor',
      'phasePlatform',
      'barrier',
      'bounce',
      'beamEmitter',
      'pulley',
      'conveyor',
      'directionalGate',
    ].includes(String(b.kind))
  ) {
    if (
      !Array.isArray(b.requires) ||
      b.requires.length > 500 ||
      !b.requires.every((id) => typeof id === 'string') ||
      new Set(b.requires).size !== b.requires.length
    )
      bad('conexiones no válidas.');
    if (typeof b.autostart !== 'boolean') bad('activación inicial no válida.');
  }
  if (
    b.kind === 'elevator' &&
    (!range(b.travelX, -32768, 32768) ||
      !range(b.travelY, -32768, 32768) ||
      (b.travelX === 0 && b.travelY === 0) ||
      !range(b.speed, 1, 1000) ||
      !['once', 'pingpong', 'controlled'].includes(String(b.mode)))
  )
    bad('recorrido, velocidad o modo del ascensor no válido.');
  if (
    b.kind === 'fan' &&
    (![-1, 1].includes(Number(b.direction)) ||
      typeof b.direction !== 'number' ||
      !range(b.strength, 1, 2000))
  )
    bad('dirección o velocidad del viento no válida.');
  for (const field of b.kind === 'waterwheel'
    ? ['hits']
    : b.kind === 'boiler'
      ? ['waterHits', 'fireHits']
      : b.kind === 'breakable'
        ? ['strikes']
        : [])
    if (!range(b[field], 1, 100) || !Number.isInteger(b[field]))
      bad(`${field}: usa entre 1 y 100 impactos.`);
  if (b.kind === 'bridge' && !range(b.duration, 100, 10000))
    bad('duración del puente: 100–10000 ms.');
  if (
    b.kind === 'lever' &&
    (typeof b.initiallyActive !== 'boolean' ||
      (b.action !== undefined &&
        !['activate', 'deactivate', 'toggle'].includes(String(b.action))) ||
      (b.targets !== undefined &&
        (!Array.isArray(b.targets) ||
          b.targets.length > 500 ||
          !b.targets.every((id) => typeof id === 'string') ||
          new Set(b.targets).size !== b.targets.length)))
  )
    bad('configuración o destinos de la palanca no válidos.');
  if (
    b.kind === 'timedDoor' &&
    (!range(b.openMs, 100, 120000) ||
      !range(b.warningMs, 0, Number(b.openMs)) ||
      typeof b.initiallyOpen !== 'boolean' ||
      !['restart', 'ignore'].includes(String(b.retrigger)))
  )
    bad(
      'temporizador de puerta no válido (100–120000 ms; aviso dentro de la duración).',
    );
  if (
    b.kind === 'phasePlatform' &&
    (!range(b.solidMs, 100, 120000) ||
      !range(b.hiddenMs, 100, 120000) ||
      typeof b.initiallySolid !== 'boolean' ||
      !['cycle', 'contact'].includes(String(b.mode)))
  )
    bad('ciclo de plataforma no válido (100–120000 ms).');
  if (
    b.kind === 'bounce' &&
    (!range(b.speed, 100, 1800) || !range(b.cooldownMs, 0, 10000))
  )
    bad('rebote no válido: velocidad 100–1800, espera 0–10000 ms.');
  if (
    b.kind === 'float' &&
    (!range(b.draft, 0, 0.9) ||
      !range(b.riseSpeed, 1, 1000) ||
      !range(b.currentSpeed, -500, 500))
  )
    bad(
      'flotabilidad no válida: calado 0–0.9, ascenso 1–1000, corriente −500–500.',
    );
  if (
    b.kind === 'switch' &&
    (!['activate', 'deactivate', 'toggle'].includes(String(b.action)) ||
      !['interact', 'fire', 'water'].includes(String(b.trigger)) ||
      typeof b.initiallyActive !== 'boolean' ||
      !range(b.cooldownMs, 0, 10000) ||
      !Array.isArray(b.targets) ||
      b.targets.length > 500 ||
      !b.targets.every((id) => typeof id === 'string') ||
      new Set(b.targets).size !== b.targets.length)
  )
    bad('configuración o destinos del interruptor no válidos.');
  errors.push(...validateAdvanced(o, b));
  return errors;
}
