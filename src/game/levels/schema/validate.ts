import { validateIllustration } from './validateIllustration';
import { validateAdvancedLinks } from '../../systems/world/validateAdvanced';
import { validateWorld } from '../../systems/world/validateWorld';
import { isWorldKind, sourceBehavior } from '../../systems/world/types';
import { FOREST_ASSETS } from '../../assets/forestAssets';
import {
  environmentName,
  platformName,
  environmentTileCount,
  environmentSizing,
  MAX_ENVIRONMENT_TILES,
} from '../../assets/environmentCatalog';
import { ELEMENTS } from '../../types/character';
import { GAME_CAMERA_ZOOM } from '../../config/settings';
import { LEVEL_ID, OBJECT_ID } from './types';
import type { LevelDocument, LevelObject } from './types';
const TYPES = [
  'illustration',
  'boxCollider',
  'world',
  'terrain',
  'platform',
  'decoration',
  'gem',
  'coin',
  'spawn',
  'tank',
  'torch',
  'door',
  'plate',
  'block',
  'wall',
  'crossing',
  'exit',
  'label',
];
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const size = (v: unknown): v is number => finite(v) && v > 0 && v <= 32768;
const element = (v: unknown) => ELEMENTS.some((e) => e === v);
const refs = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= 500 &&
  v.every((id) => typeof id === 'string') &&
  new Set(v).size === v.length;
export function validateLevel(value: unknown): string[] {
  const errors: string[] = [];
  if (!record(value)) return ['El nivel debe ser un objeto JSON.'];
  if (value.version !== 1)
    errors.push('Versión de nivel no compatible (se requiere 1).');
  if (typeof value.id !== 'string' || !LEVEL_ID.test(value.id))
    errors.push(
      'ID de nivel: usa letras minúsculas, números y guiones; empieza con una letra.',
    );
  if (
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 120
  )
    errors.push('El nombre debe tener entre 1 y 120 caracteres.');
  if (value.theme !== 'ancient-forest')
    errors.push('Solo está disponible el mundo Ancient Forest.');
  if (
    value.cameraZoom !== undefined &&
    (!finite(value.cameraZoom) ||
      value.cameraZoom < GAME_CAMERA_ZOOM.min ||
      value.cameraZoom > GAME_CAMERA_ZOOM.max)
  )
    errors.push('El zoom de la cámara al jugar debe estar entre 25 % y 150 %.');
  if (
    !size(value.width) ||
    !size(value.height) ||
    value.width < 1280 ||
    value.height < 720
  )
    errors.push('Dimensiones del nivel: mínimo 1280 × 720 y máximo 32768.');
  if (
    !finite(value.fallLimit) ||
    !finite(value.height) ||
    value.fallLimit < 1 ||
    value.fallLimit > value.height
  )
    errors.push('El límite de caída debe estar dentro de la altura del nivel.');
  if (
    !record(value.background) ||
    ['sky', 'forest', 'foreground'].some(
      (k) =>
        typeof (value.background as Record<string, unknown>)[k] !== 'boolean',
    )
  )
    errors.push('Configuración de fondos no válida.');
  if (
    !record(value.timer) ||
    !finite(value.timer.threeStarsMs) ||
    !finite(value.timer.twoStarsMs) ||
    value.timer.threeStarsMs <= 0 ||
    value.timer.twoStarsMs < value.timer.threeStarsMs
  )
    errors.push(
      'Los tiempos de estrellas deben ser positivos y estar ordenados.',
    );
  if (value.puzzle !== undefined) {
    const p = value.puzzle;
    if (
      !record(p) ||
      typeof p.brief !== 'string' ||
      !p.brief.trim() ||
      p.brief.length > 300 ||
      !Array.isArray(p.hints) ||
      p.hints.length < 2 ||
      p.hints.length > 3 ||
      p.hints.some((h) => typeof h !== 'string' || !h.trim() || h.length > 500)
    )
      errors.push(
        'Puzzle: objetivo breve y entre 2 y 3 pistas no vacías (máximo 500 caracteres).',
      );
  }
  if (!Array.isArray(value.objects) || value.objects.length > 500)
    return [...errors, 'Se permiten hasta 500 objetos.'];
  const illustratedCount = value.objects.reduce(
    (count: number, item: unknown) => {
      if (!record(item) || item.type !== 'illustration') return count;
      return (
        count +
        (Array.isArray(item.layers) ? item.layers.length : 0) +
        (Array.isArray(item.overlays) ? item.overlays.length : 0)
      );
    },
    0,
  );
  if (illustratedCount > 1024)
    errors.push('Máximo 1024 capas y overlays ilustrados por nivel.');
  const ids = new Set<string>();
  let tiles = 0;
  for (const [index, item] of value.objects.entries()) {
    const tag = `Objeto ${index + 1}`;
    if (!record(item)) {
      errors.push(`${tag}: formato no válido.`);
      continue;
    }
    const name = typeof item.id === 'string' ? item.id : tag;
    if (
      typeof item.id !== 'string' ||
      !OBJECT_ID.test(item.id) ||
      ids.has(item.id)
    )
      errors.push(`${name}: ID no válido o repetido.`);
    if (typeof item.id === 'string') ids.add(item.id);
    if (!TYPES.includes(String(item.type)))
      errors.push(`${name}: tipo de objeto no soportado.`);
    if (
      typeof item.asset !== 'string' ||
      !(
        Object.hasOwn(FOREST_ASSETS, item.asset) ||
        environmentName(item.asset) !== undefined ||
        item.asset === 'coin' ||
        (item.asset.startsWith('world:') && isWorldKind(item.asset.slice(6))) ||
        ELEMENTS.some((e) => item.asset === `gem:${e}`)
      )
    ) {
      if (!(
        item.asset === null &&
        ['spawn', 'crossing', 'label', 'illustration', 'boxCollider'].includes(
          String(item.type),
        )
      ))
        errors.push(`${name}: recurso gráfico desconocido.`);
    }
    if (item.type === 'world') errors.push(...validateWorld(item));
    if (item.type === 'illustration')
      errors.push(...validateIllustration(item));
    const fixedAssets: Record<string, string | null> = {
      terrain: 'ground',
      illustration: null,
      boxCollider: null,
      spawn: null,
      crossing: null,
      label: null,
      tank: 'tank',
      torch: 'torch',
      door: 'doorClosed',
      plate: 'plate',
      block: 'block',
      wall: 'wallIntact',
      exit: 'portal',
      coin: 'coin',
    };
    if (
      (Object.hasOwn(fixedAssets, String(item.type)) &&
        item.asset !== fixedAssets[String(item.type)]) ||
      (item.type === 'decoration' &&
        !Object.hasOwn(FOREST_ASSETS, String(item.asset)) &&
        !environmentName(item.asset)) ||
      (item.type === 'platform' &&
        item.asset !== 'platform' &&
        !platformName(item.asset))
    )
      errors.push(`${name}: el recurso no corresponde al tipo de objeto.`);
    if (item.type === 'spawn' && (item.width !== 62 || item.height !== 174))
      errors.push(`${name}: el marcador de inicio debe medir 62 × 174.`);
    if (
      item.tileScale !== undefined &&
      (!size(item.tileScale) ||
        item.type !== 'decoration' ||
        environmentSizing({ type: item.type, asset: item.asset }) !== 'tiled')
    )
      errors.push(
        `${name}: la escala de piezas debe ser positiva y solo se admite en rellenos de entorno.`,
      );
    if (environmentName(item.asset) && size(item.width) && size(item.height)) {
      const count = environmentTileCount({
        type: item.type,
        asset: item.asset,
        width: item.width,
        height: item.height,
        ...(size(item.tileScale) ? { tileScale: item.tileScale } : {}),
      });
      tiles += count;
      if (count > MAX_ENVIRONMENT_TILES)
        errors.push(
          `${name}: el entorno excede el límite de ${MAX_ENVIRONMENT_TILES} piezas por objeto.`,
        );
    } else if (
      ['terrain', 'platform'].includes(String(item.type)) &&
      !environmentName(item.asset) &&
      size(item.width) &&
      size(item.height)
    )
      tiles +=
        Math.max(
          platformName(item.asset) ? 2 : 1,
          Math.ceil(item.width / 128),
        ) *
        (item.type === 'platform' ? 1 : Math.ceil((item.height + 24) / 128));
    if (
      !finite(item.x) ||
      !finite(item.y) ||
      Math.abs(item.x) > 65536 ||
      Math.abs(item.y) > 65536 ||
      !size(item.width) ||
      !size(item.height)
    )
      errors.push(`${name}: posición o tamaño no válido.`);
    if (
      !finite(item.rotation) ||
      !finite(item.layer) ||
      typeof item.visible !== 'boolean'
    )
      errors.push(`${name}: rotación, capa o visibilidad no válida.`);
    if (item.rotation !== 0 && item.type !== 'decoration')
      errors.push(
        `${name}: solo las decoraciones admiten rotación en este MVP.`,
      );
    if (
      !record(item.collider) ||
      typeof item.collider.enabled !== 'boolean' ||
      !finite(item.collider.x) ||
      !finite(item.collider.y) ||
      !size(item.collider.width) ||
      !size(item.collider.height)
    )
      errors.push(
        `${name}: el collider rectangular necesita dimensiones positivas y offsets numéricos.`,
      );
    if (record(item.collider) && item.collider.playerCollision !== undefined) {
      const faces = item.collider.playerCollision;
      if (
        !record(faces) ||
        ['top', 'bottom', 'left', 'right'].some(
          (key) => typeof faces[key] !== 'boolean',
        )
      )
        errors.push(
          `${name}: las cuatro caras de colisión con el personaje deben ser verdaderas o falsas.`,
        );
    }
    if (
      item.type === 'coin' &&
      (!finite(item.value) ||
        !Number.isInteger(item.value) ||
        item.value < 1 ||
        item.value > 1000)
    )
      errors.push(
        `${name}: el valor de la moneda debe ser un entero entre 1 y 1000.`,
      );
    if (['gem', 'spawn'].includes(String(item.type)) && !element(item.element))
      errors.push(`${name}: elemento no válido.`);
    if (
      item.type === 'gem' &&
      (item.respawn !== 'restart' || item.asset !== `gem:${item.element}`)
    )
      errors.push(
        `${name}: las gemas deben coincidir con su elemento y reaparecer solo al reiniciar.`,
      );
    if (
      ['tank', 'torch'].includes(String(item.type)) &&
      (!Number.isInteger(item.hits) ||
        !finite(item.hits) ||
        item.hits < 1 ||
        item.hits > 100)
    )
      errors.push(`${name}: se requieren entre 1 y 100 impactos.`);
    if (
      ['tank', 'torch', 'plate', 'wall', 'crossing'].includes(
        String(item.type),
      ) &&
      (typeof item.hint !== 'string' || item.hint.length > 1000)
    )
      errors.push(`${name}: pista no válida (máximo 1000 caracteres).`);
    if (['door', 'exit'].includes(String(item.type)) && !refs(item.requires))
      errors.push(`${name}: lista de mecanismos no válida.`);
    if (item.type === 'door' && typeof item.initiallyOpen !== 'boolean')
      errors.push(`${name}: estado inicial no válido.`);
    if (item.type === 'plate' && item.requiredWeight !== 1)
      errors.push(`${name}: cada placa requiere un bloque pesado (peso 1).`);
    if (item.type === 'block' && typeof item.plateId !== 'string')
      errors.push(
        `${name}: la placa de destino debe ser un ID o una cadena vacía (sin placa).`,
      );
    if (item.type === 'crossing' && !finite(item.landingY))
      errors.push(`${name}: altura de aterrizaje no válida.`);
    if (
      item.type === 'label' &&
      (typeof item.text !== 'string' || item.text.length > 1000)
    )
      errors.push(`${name}: texto no válido.`);
    if (
      ['terrain', 'platform'].includes(String(item.type)) &&
      !environmentName(item.asset) &&
      (!finite(item.width) || item.width < 128 || item.width % 128 !== 0)
    )
      errors.push(
        `${name}: el ancho de terreno/plataforma debe ser múltiplo de 128.`,
      );
  }
  if (tiles > 8192)
    errors.push(
      'El terreno y entorno exceden el límite de 8192 piezas del MVP.',
    );
  if (errors.length) return errors;
  const doc = value as unknown as LevelDocument;
  errors.push(...validateAdvancedLinks(doc));
  if (doc.objects.filter((o) => o.type === 'spawn').length !== 1)
    errors.push('Debe existir exactamente un punto de inicio.');
  if (!doc.objects.some((o) => o.type === 'exit'))
    errors.push('Añade al menos una salida.');
  for (const type of ['wall', 'crossing'])
    if (doc.objects.filter((o) => o.type === type).length > 1)
      errors.push(`MVP: se admite un objeto de tipo ${type} por nivel.`);
  const mechanisms = new Set(doc.objects.filter(isMechanism).map((o) => o.id));
  for (const o of doc.objects) {
    if (
      o.type === 'world' &&
      (o.behavior.kind === 'switch' || o.behavior.kind === 'lever') &&
      o.behavior.targets?.some(
        (id) =>
          !doc.objects.some(
            (target) =>
              target.id === id &&
              target.type === 'world' &&
              'requires' in target.behavior,
          ),
      )
    )
      errors.push(
        `${o.id}: hay referencias a destinos incompatibles o que no existen (elige receptores del pack).`,
      );
    if (
      o.type === 'world' &&
      'requires' in o.behavior &&
      o.behavior.requires.some((id) => !mechanisms.has(id))
    )
      errors.push(`${o.id}: hay referencias a mecanismos que no existen.`);
    if (
      (o.type === 'door' || o.type === 'exit') &&
      o.requires.some((id) => !mechanisms.has(id))
    )
      errors.push(`${o.id}: hay referencias a mecanismos que no existen.`);
    if (o.type === 'block' && o.plateId !== '') {
      const plate = doc.objects.find(
        (p) => p.id === o.plateId && p.type === 'plate',
      );
      if (!plate) errors.push(`${o.id}: la placa de destino no existe.`);
      else if (!o.collider.enabled || !plate.collider.enabled)
        errors.push(
          `${o.id}: activa los colliders del bloque y de la placa para que puedan hacer contacto.`,
        );
    }
    if (
      o.type === 'plate' &&
      !doc.objects.some((b) => b.type === 'block' && b.plateId === o.id)
    )
      errors.push(`${o.id}: falta el bloque asociado a la placa.`);
    if (
      o.type === 'spawn' &&
      (o.x < 0 ||
        o.y < 0 ||
        o.x + o.width > doc.width ||
        o.y + o.height >= doc.fallLimit)
    )
      errors.push(
        `${o.id}: coloca el inicio dentro del nivel y por encima del límite de caída.`,
      );
    if (o.type === 'exit' && !o.collider.enabled)
      errors.push(`${o.id}: activa el área de llegada de la salida.`);
  }
  return errors;
}
export function parseLevel(value: unknown): LevelDocument {
  const errors = validateLevel(value);
  if (errors.length) throw new Error(errors.join('\n'));
  return structuredClone(value) as LevelDocument;
}
export function serializeLevel(doc: LevelDocument): string {
  return `${JSON.stringify(parseLevel(doc), null, 2)}\n`;
}
export const isMechanism = (object: LevelObject): boolean =>
  ['tank', 'torch', 'plate', 'wall', 'crossing'].includes(object.type) ||
  (object.type === 'world' && sourceBehavior(object.behavior));
