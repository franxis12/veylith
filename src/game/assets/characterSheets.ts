import type { AnimationAction, Element } from '../types/character';

export interface CharacterSheet {
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  /** Exclusive bottom of visible alpha (>= 32), in source pixels, for each frame. */
  readonly footY: readonly number[];
}

/** Audited original files; no guessed paths or synthesized animation variants. */
export const CHARACTER_SHEETS = {
  water: {
    idle: {
      path: 'assets/characters/water/idle/water_idle_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 479, 479, 479, 479, 479],
    },
    run: {
      path: 'assets/characters/water/run/water_run_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 450, 479, 479, 479, 450],
    },
    jump: {
      path: 'assets/characters/water/jump/water_jump_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [479, 479, 468, 431, 420],
    },
    fall: {
      path: 'assets/characters/water/fall/water_fall_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [413, 424, 417, 420],
    },
    land: {
      path: 'assets/characters/water/land/water_land_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [479, 478, 478, 478, 479],
    },
    attack: {
      path: 'assets/characters/water/attack/water_attack_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 6,
      footY: [478, 478, 478, 478, 478, 479],
    },
  },
  fire: {
    idle: {
      path: 'assets/characters/fire/idle/fire_idle_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 479, 479, 479, 479, 479],
    },
    run: {
      path: 'assets/characters/fire/run/fire_run_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 450, 479, 479, 479, 451],
    },
    jump: {
      path: 'assets/characters/fire/jump/fire_jump_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [479, 479, 457, 422, 423],
    },
    fall: {
      path: 'assets/characters/fire/fall/fire_fall_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [394, 418, 414, 402],
    },
    land: {
      path: 'assets/characters/fire/land/fire_land_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [478, 478, 479, 478, 479],
    },
    attack: {
      path: 'assets/characters/fire/attack/fire_attack_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 6,
      footY: [478, 478, 478, 478, 478, 479],
    },
    double_jump: {
      path: 'assets/characters/fire/double_jump/fire_double_jump_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [411, 436, 469, 377, 388],
    },
  },
  air: {
    idle: {
      path: 'assets/characters/air/idle/air_idle_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 479, 479, 479, 479, 479],
    },
    run: {
      path: 'assets/characters/air/run/air_run_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 450, 479, 479, 479, 450],
    },
    jump: {
      path: 'assets/characters/air/jump/air_jump_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [479, 479, 447, 424, 383],
    },
    fall: {
      path: 'assets/characters/air/fall/air_fall_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [372, 402, 412, 417],
    },
    land: {
      path: 'assets/characters/air/land/air_land_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [478, 478, 478, 478, 479],
    },
    glide_start: {
      path: 'assets/characters/air/glide_start/air_glide_start_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [455, 460, 449, 448],
    },
    glide_loop: {
      path: 'assets/characters/air/glide_loop/air_glide_loop_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 6,
      footY: [448, 444, 446, 449, 451, 450],
    },
  },
  earth: {
    idle: {
      path: 'assets/characters/earth/idle/earth_idle_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 479, 479, 479, 479, 479],
    },
    run: {
      path: 'assets/characters/earth/run/earth_run_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [479, 479, 479, 450, 479, 479, 479, 450],
    },
    jump: {
      path: 'assets/characters/earth/jump/earth_jump_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [479, 479, 415, 420, 398],
    },
    fall: {
      path: 'assets/characters/earth/fall/earth_fall_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [430, 432, 442, 433],
    },
    land: {
      path: 'assets/characters/earth/land/earth_land_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 5,
      footY: [478, 478, 478, 478, 479],
    },
    push_start: {
      path: 'assets/characters/earth/push_start/earth_push_start_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 4,
      footY: [479, 478, 478, 478],
    },
    push_loop: {
      path: 'assets/characters/earth/push_loop/earth_push_loop_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [478, 478, 478, 478, 478, 478, 478, 478],
    },
    push_end: {
      path: 'assets/characters/earth/push_end/earth_push_end_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 3,
      footY: [478, 478, 479],
    },
    smash: {
      path: 'assets/characters/earth/smash/earth_smash_spritesheet.png',
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 8,
      footY: [478, 478, 479, 479, 479, 478, 479, 479],
    },
  },
} as const satisfies Record<
  Element,
  Partial<Record<AnimationAction, CharacterSheet>>
>;
