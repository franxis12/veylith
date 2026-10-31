import { advancedBehavior } from './advancedTypes';
import type { AdvancedKind } from './advancedTypes';
import type { BoxCollider } from '../../levels/schema/types';

export function advancedPreset(kind: AdvancedKind) {
  const box = (
    x: number,
    y: number,
    width: number,
    height: number,
    enabled = true,
  ): BoxCollider => ({ x, y, width, height, enabled });
  const presets = {
    reflector: {
      width: 256,
      height: 256,
      collider: box(40, 170, 176, 70),
      effect: box(0, 0, 256, 256, false),
      hint: 'Tierra empuja la base. Mantén Acción cerca para girar el espejo; suelta para terminar. El reverso absorbe la luz.',
    },
    beam_emitter: {
      width: 64,
      height: 64,
      collider: box(0, 0, 64, 64, false),
      effect: box(31, 31, 2, 2),
      hint: 'El centro de la zona de efecto es el origen del haz. Sin cuerpo sólido ni daño.',
    },
    light_receiver: {
      width: 256,
      height: 256,
      collider: box(0, 0, 256, 256, false),
      effect: box(88, 80, 80, 80),
      hint: 'Recibe el haz en el rectángulo violeta y emite su ID a puertas, salidas y mecanismos.',
    },
    pulley_platform: {
      width: 512,
      height: 256,
      collider: box(30, 150, 452, 30),
      effect: box(0, 0, 512, 256, false),
      hint: 'Enlaza un contrapeso separado por ID. El peso baja la plataforma; el contrapeso sube la misma distancia.',
    },
    pulley_counterweight: {
      width: 128,
      height: 128,
      collider: box(24, 22, 80, 98),
      effect: box(0, 0, 128, 128, false),
      hint: 'Pieza sólida independiente. Enlázala desde una sola plataforma de polea; reserva su recorrido inverso.',
    },
    conveyor: {
      width: 640,
      height: 128,
      collider: box(12, 40, 616, 56),
      effect: box(0, 0, 640, 128, false),
      hint: 'Transporta jugador, bloques y espejos apoyados. Segmentos centrales entre dos extremos; velocidad en unidades por segundo.',
    },
    directional_gate: {
      width: 512,
      height: 512,
      collider: box(166, 147, 180, 330),
      effect: box(0, 0, 512, 512, false),
      hint: 'Desbloquea con una señal. Admite cada cuerpo solo desde el lado permitido y deja terminar un cruce iniciado.',
    },
  };
  return {
    kind,
    ...presets[kind],
    behavior: advancedBehavior(kind),
    state: 'idle',
  };
}
