import { isAdvancedKind } from './advancedTypes';
import { advancedPreset } from './advancedPresets';
import { WORLD_ART } from '../../assets/worldAssets';
import hints from '../../../../docs/interactive-world-collider-hints.json';
import type { BoxCollider } from '../../levels/schema/types';
import { defaultBehavior } from './types';
import type { WorldKind, WorldObject } from './types';
export function worldPreset(
  kind: WorldKind,
): Pick<
  WorldObject,
  | 'width'
  | 'height'
  | 'collider'
  | 'effect'
  | 'behavior'
  | 'state'
  | 'hint'
  | 'kind'
> {
  if (isAdvancedKind(kind)) return advancedPreset(kind);
  const art = WORLD_ART[kind],
    scale = ['lava', 'deep_water', 'timed_door', 'energy_barrier'].includes(
      kind,
    )
      ? 1
      : 0.5;
  const width = art.width * scale,
    height = art.height * scale;
  const behavior = defaultBehavior(kind);
  const boxes = hints.objects[kind] as Record<string, unknown>;
  const raw = Object.values(boxes).find(
    (v) =>
      Array.isArray(v) &&
      v.length === 4 &&
      v.every((n) => typeof n === 'number'),
  ) as number[] | undefined;
  const box = (enabled: boolean, r = raw): BoxCollider => ({
    enabled,
    x: (r?.[0] ?? 0) * scale,
    y: (r?.[1] ?? 0) * scale,
    width: (r?.[2] ?? art.width) * scale,
    height: (r?.[3] ?? art.height) * scale,
  });
  const collider = box(
    [
      'elevator',
      'bridge',
      'breakable',
      'fan',
      'timedDoor',
      'phasePlatform',
      'bounce',
      'float',
      'barrier',
    ].includes(behavior.kind),
  );
  let effect = box(false);
  if (behavior.kind === 'fan')
    effect = { enabled: true, x: width * 0.75, y: 0, width: 600, height };
  if (behavior.kind === 'heat' || behavior.kind === 'lake') effect = box(true);
  if (behavior.kind === 'lever' || behavior.kind === 'switch')
    effect = {
      enabled: true,
      x: -45,
      y: -40,
      width: width + 90,
      height: height + 40,
    };
  if (behavior.kind === 'waterwheel' || behavior.kind === 'boiler')
    effect = { enabled: true, x: 0, y: 0, width, height };
  const descriptions: Record<string, string> = {
    timedDoor:
      'Abre por tiempo al recibir activación. Espera a que el hueco quede libre para cerrar.',
    phasePlatform:
      'Alterna solidez por ciclo o después de pisarla. Reaparece cuando el hueco queda libre.',
    bounce:
      'Aterriza encima para recibir un impulso vertical. No cambia el elemento.',
    float:
      'Cae en seco, flota en agua profunda y transporta al jugador. Corriente horizontal configurable.',
    barrier:
      'La señal activa su colisión. Espera a que el hueco quede libre para materializarse.',
    switch:
      'Envía activar, desactivar o alternar a los IDs elegidos; también emite su propia señal.',
    elevator:
      'La señal activa lo lleva al destino; al apagarla regresa al inicio. Configura el recorrido en el inspector.',
    fan: 'Tierra resiste el viento horizontal.',
    heat: 'Solo Fuego cruza la lava.',
    lake: 'Solo Agua cruza el lago.',
    waterwheel: 'Activa la rueda con Agua.',
    boiler: 'Combina impactos de Agua y Fuego en la caldera.',
    bridge: 'Activa el puente con un mecanismo.',
    breakable: 'Golpea la pared con Tierra.',
    lever: 'Pulsa Poder junto a la palanca para alternarla.',
    prop: 'Objeto visual; sin mecánica propia.',
  };
  return {
    kind,
    width,
    height,
    collider,
    effect,
    behavior,
    state: Object.keys(art.states)[0]!,
    hint: descriptions[behavior.kind]!,
  };
}
