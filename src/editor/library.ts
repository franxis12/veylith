import { EXIT_FRAME } from '../game/assets/exitAssets';
import {
  ILLUSTRATED_SCENES,
  illustratedScene,
} from '../game/assets/illustratedCatalog';
import { WORLD_KINDS, isWorldKind } from '../game/systems/world/types';
import { worldPreset } from '../game/systems/world/presets';
import { WORLD_ART } from '../game/assets/worldAssets';
import { FOREST_ASSETS } from '../game/assets/forestAssets';
import { COIN_ASSET } from '../game/assets/coinAsset';
import type { ForestAsset } from '../game/assets/forestAssets';
import { GEM_SHEETS } from '../game/assets/gemSheets';
import { ELEMENTS } from '../game/types/character';
import {
  ENVIRONMENT_ASSETS,
  ENVIRONMENT_PLATFORMS,
  environmentName,
  platformName,
  platformCollider,
} from '../game/assets/environmentCatalog';
import type { EnvironmentAssetId } from '../game/assets/environmentCatalog';
import type {
  LevelDocument,
  LevelObject,
  AssetId,
} from '../game/levels/schema/types';
export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  asset: AssetId | null;
  type: LevelObject['type'] | 'background';
  path?: string;
  frames?: number;
}
const entries: [
  ForestAsset,
  string,
  string,
  LevelObject['type'] | 'background',
][] = [
  ['ground', 'Suelo modular', 'Terreno', 'terrain'],
  ['platform', 'Plataforma modular', 'Plataformas', 'platform'],
  ['fern', 'Helecho', 'Decoraciones', 'decoration'],
  ['flowers', 'Flores', 'Decoraciones', 'decoration'],
  ['grass', 'Hierba', 'Decoraciones', 'decoration'],
  ['pillar', 'Pilar roto', 'Decoraciones', 'decoration'],
  ['column', 'Columna', 'Decoraciones', 'decoration'],
  ['roots', 'Raíces', 'Decoraciones', 'decoration'],
  ['mushrooms', 'Hongos', 'Decoraciones', 'decoration'],
  ['tank', 'Depósito', 'Objetos interactivos', 'tank'],
  ['torch', 'Antorcha', 'Objetos interactivos', 'torch'],
  ['block', 'Bloque pesado', 'Objetos interactivos', 'block'],
  ['plate', 'Placa', 'Objetos interactivos', 'plate'],
  ['wallIntact', 'Pared agrietada', 'Objetos interactivos', 'wall'],
  ['doorClosed', 'Puerta', 'Puertas y portales', 'door'],
  ['portal', 'Salida · puerta sellada', 'Puertas y portales', 'exit'],
  ['sky', 'Cielo', 'Fondos', 'background'],
  ['forest', 'Bosque', 'Fondos', 'background'],
  ['foreground', 'Primer plano', 'Fondos', 'background'],
];
export const LIBRARY: LibraryItem[] = [
  ...Object.entries(ILLUSTRATED_SCENES).map(([id, scene]) => ({
    id: `illustration:${id}`,
    name: `Escenario · ${scene.title}`,
    category: 'Escenarios ilustrados',
    asset: null,
    type: 'illustration' as const,
    ...(scene.layers[0] ? { path: scene.layers[0].path } : {}),
  })),
  {
    id: 'boxCollider',
    name: 'Box Collider independiente',
    category: 'Escenarios ilustrados',
    asset: null,
    type: 'boxCollider',
  },
  ...Object.entries(ENVIRONMENT_PLATFORMS).map(([name, family]) => ({
    id: `platform:${name}`,
    name: family.name,
    category: 'Plataformas · Modulares',
    asset: `environment:${name}` as EnvironmentAssetId,
    type: 'platform' as const,
    path: ENVIRONMENT_ASSETS[name as keyof typeof ENVIRONMENT_PLATFORMS].path,
  })),
  ...Object.entries(ENVIRONMENT_ASSETS).map(([name, art]) => ({
    id: `environment:${name}`,
    name: name.replaceAll('_', ' '),
    category: art.category,
    asset: `environment:${name}` as EnvironmentAssetId,
    type: 'decoration' as const,
    path: art.path,
  })),
  ...WORLD_KINDS.map((kind) => ({
    id: `world:${kind}`,
    name: WORLD_ART[kind].label,
    category:
      worldPreset(kind).behavior.kind === 'prop'
        ? 'Pack · Visuales'
        : 'Pack · Funcionales',
    asset: `world:${kind}` as AssetId,
    type: 'world' as const,
    path: WORLD_ART[kind].thumbnail,
  })),
  {
    id: 'coin',
    name: 'Moneda',
    category: 'Recolectables',
    asset: 'coin',
    type: 'coin',
    path: COIN_ASSET.path,
  },
  ...entries.map(([asset, name, category, type]) => ({
    id: asset,
    name,
    category,
    type,
    asset,
    path: type === 'exit' ? EXIT_FRAME.path : FOREST_ASSETS[asset].path,
  })),
  ...ELEMENTS.map((element) => {
    const sheet = GEM_SHEETS.find(
      (s) => s.element === element && s.action === 'idle',
    )!;
    return {
      id: `gem:${element}`,
      name: `Gema ${element}`,
      category: 'Gemas',
      type: 'gem' as const,
      asset: `gem:${element}` as AssetId,
      path: sheet.path,
      frames: sheet.frames,
    };
  }),
  {
    id: 'spawn',
    name: 'Inicio del jugador',
    category: 'Puntos de inicio',
    type: 'spawn',
    asset: null,
  },
  {
    id: 'crossing',
    name: 'Prueba de planeo',
    category: 'Objetos interactivos',
    type: 'crossing',
    asset: null,
  },
  {
    id: 'label',
    name: 'Texto / pista',
    category: 'Decoraciones',
    type: 'label',
    asset: null,
  },
];
export function uniqueId(
  prefix: string,
  objects: readonly LevelObject[],
): string {
  const safe = prefix.replace(/[^a-z0-9-]/gi, '-');
  let id = safe,
    i = 2;
  while (objects.some((o) => o.id === id)) id = `${safe}-${i++}`;
  return id;
}
export function createObject(
  item: LibraryItem,
  x: number,
  y: number,
  objects: readonly LevelObject[],
): LevelObject {
  if (item.type === 'background')
    throw new Error('Un fondo se activa desde la configuración del nivel.');
  const base = {
    id: uniqueId(item.type, objects),
    asset: item.asset,
    x,
    y,
    width: 128,
    height: 128,
    rotation: 0,
    visible: true,
    layer: -2,
    collider: { enabled: false, x: 0, y: 0, width: 128, height: 128 },
  };
  const sized = (width: number, height: number, enabled = false) => ({
    ...base,
    width,
    height,
    collider: { enabled, x: 0, y: 0, width, height },
  });
  const name = environmentName(item.asset);
  if (name) {
    const art = ENVIRONMENT_ASSETS[name];
    const family = item.type === 'platform' && platformName(item.asset);
    return {
      ...sized(family ? 384 : art.width, art.height),
      id: uniqueId(name, objects),
      type: family ? 'platform' : 'decoration',
      layer: art.layer,
      collider: family
        ? platformCollider(family, 384, art.height)
        : {
            enabled: art.collision !== null,
            ...(art.collision ?? {
              x: 0,
              y: 0,
              width: art.width,
              height: art.height,
            }),
          },
    };
  }
  switch (item.type) {
    case 'illustration': {
      const sceneId = item.id.slice('illustration:'.length),
        scene = illustratedScene(sceneId);
      if (!scene) throw new Error('Escenario desconocido');
      return {
        ...sized(scene.width, scene.height),
        type: 'illustration',
        sceneId,
        layer: 0,
        layers: scene.layers.map((l) => l.id),
        overlays: structuredClone(scene.overlays),
      };
    }
    case 'boxCollider':
      return { ...sized(256, 32, true), type: 'boxCollider', layer: -4 };
    case 'world': {
      const kind = item.id.slice(6);
      if (!isWorldKind(kind)) throw new Error('Objeto del pack desconocido');
      return {
        ...base,
        ...worldPreset(kind),
        id: uniqueId(kind, objects),
        type: 'world',
      };
    }
    case 'coin':
      return { ...sized(48, 48, true), type: 'coin', value: 1, layer: 3 };
    case 'terrain':
      return {
        ...sized(512, 450, true),
        type: 'terrain',
        layer: -5,
        collider: { enabled: true, x: 16, y: 0, width: 480, height: 450 },
      };
    case 'platform':
      return {
        ...sized(256, 56, true),
        type: 'platform',
        layer: -5,
        collider: { enabled: true, x: 16, y: 0, width: 224, height: 56 },
      };
    case 'gem': {
      const element = ELEMENTS.find((e) => item.asset === `gem:${e}`)!;
      return {
        ...sized(104, 104),
        type: 'gem',
        element,
        respawn: 'restart',
        layer: 3,
        collider: { enabled: true, x: 30, y: 12, width: 44, height: 80 },
      };
    }
    case 'spawn':
      return { ...sized(62, 174), type: 'spawn', element: 'water', layer: 3 };
    case 'tank':
      return {
        ...sized(223, 218, true),
        type: 'tank',
        hits: 3,
        hint: 'Usa Agua para llenar el depósito.',
      };
    case 'torch':
      return {
        ...sized(59, 195, true),
        type: 'torch',
        hits: 1,
        hint: 'Usa Fuego para encender la antorcha.',
      };
    case 'door':
      return {
        ...sized(403, 618, true),
        type: 'door',
        initiallyOpen: false,
        requires: [],
        collider: { enabled: true, x: 155.5, y: 0, width: 92, height: 618 },
      };
    case 'plate':
      return {
        ...sized(240, 40),
        type: 'plate',
        requiredWeight: 1,
        hint: 'Encaja el bloque pesado en la placa.',
        collider: { enabled: true, x: 24, y: 39, width: 192, height: 1 },
      };
    case 'block':
      return {
        ...sized(192, 186, true),
        collider: { enabled: true, x: 0, y: 6, width: 192, height: 180 },
        type: 'block',
        plateId:
          objects.find(
            (o) =>
              o.type === 'plate' &&
              !objects.some((b) => b.type === 'block' && b.plateId === o.id),
          )?.id ?? '',
      };
    case 'wall':
      return {
        ...sized(100, 618, true),
        type: 'wall',
        hint: 'Golpea la pared con Tierra.',
      };
    case 'crossing':
      return {
        ...sized(800, 650),
        type: 'crossing',
        landingY: y + 650,
        hint: 'Cruza el abismo planeando con Aire.',
      };
    case 'exit':
      return {
        ...sized(255, 276),
        type: 'exit',
        requires: [],
        collider: { enabled: true, x: 62.5, y: 273, width: 130, height: 6 },
      };
    case 'label':
      return { ...sized(400, 70), type: 'label', text: 'Tu pista', layer: 2 };
    default: {
      const a = FOREST_ASSETS[item.asset as ForestAsset],
        scale = 0.5;
      return {
        ...sized(
          (a.bounds[2] - a.bounds[0]) * scale,
          (a.bounds[3] - a.bounds[1]) * scale,
        ),
        type: 'decoration',
      };
    }
  }
}
export function newLevel(id = 'new-level'): LevelDocument {
  const terrain = createObject(
    LIBRARY.find((a) => a.id === 'ground')!,
    0,
    650,
    [],
  );
  terrain.width = 2048;
  terrain.collider.width = 2016;
  const spawn = createObject(
    LIBRARY.find((a) => a.id === 'spawn')!,
    149,
    476,
    [terrain],
  );
  const exit = createObject(
    LIBRARY.find((a) => a.id === 'portal')!,
    1672.5,
    374,
    [terrain, spawn],
  );
  return {
    version: 1,
    id,
    name: 'Nuevo nivel',
    theme: 'ancient-forest',
    width: 2048,
    height: 1100,
    fallLimit: 1000,
    background: { sky: true, forest: true, foreground: true },
    timer: { threeStarsMs: 30000, twoStarsMs: 60000 },
    objects: [terrain, spawn, exit],
  };
}
