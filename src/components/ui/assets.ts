// Paths refer to the supplied artwork; originals and filenames are preserved.
export const UI = {
  settingsPanel: 'assets/ui/panels/settings_panel.png',
  settingsIcon: 'assets/ui/icons/icon_settings.png',
  audioIcon: 'assets/ui/icons/icon_audio.png',
  stopwatch: 'assets/ui/icons/icon_stopwatch.png',
  bestTime: 'assets/ui/icons/icon_best_time.png',
  resume: 'assets/ui/icons/icon_resume.png',
  levelEmpty: 'assets/ui/level-select/level_node_empty.png',
  mapStar: 'assets/ui/level-select/star_filled.png',
  mapEmptyStar: 'assets/ui/level-select/star_empty.png',
  menu: 'assets/ui/backgrounds/main_menu_background.png',
  map: 'assets/ui/backgrounds/level_map_background.png',
  logo: 'assets/ui/logo/veylith_logo.png',
  crystals: 'assets/ui/logo/elemental_crystal_arrangement.png',
  pausePanel: 'assets/ui/panels/pause_panel.png',
  victoryPanel: 'assets/ui/panels/level_completed_panel.png',
  timer: 'assets/ui/hud/timer_hud_frame.png',
  element: 'assets/ui/hud/current_element_indicator_frame.png',
  coin: 'assets/ui/hud/hud_coin_icon.png',
  reward: 'assets/ui/rewards/coin_reward_display_frame.png',
  record: 'assets/ui/victory/new_record_ribbon.png',
  victoryGlow: 'assets/ui/effects/victory_glow.png',
  goldenCoin: 'assets/ui/rewards/golden_elemental_coin.png',
  locked: 'assets/ui/level-select/level_node_locked.png',
  current: 'assets/ui/level-select/level_node_current.png',
  completed: 'assets/ui/level-select/level_node_completed.png',
  star: 'assets/ui/victory/star_filled.png',
  emptyStar: 'assets/ui/victory/star_empty.png',
} as const;

export const BUTTON_ART = {
  close: [
    'assets/ui/buttons/button_close_normal.png',
    'assets/ui/buttons/button_close_pressed.png',
    'assets/ui/buttons/button_close_disabled.png',
  ],
  primary: [
    'assets/ui/buttons/button_primary_normal.png',
    'assets/ui/buttons/button_primary_pressed.png',
    'assets/ui/buttons/button_primary_disabled.png',
  ],
  secondary: [
    'assets/ui/buttons/button_secondary_normal.png',
    'assets/ui/buttons/button_secondary_pressed.png',
    'assets/ui/buttons/button_secondary_disabled.png',
  ],
  retry: [
    'assets/ui/buttons/button_retry_normal.png',
    'assets/ui/buttons/button_retry_pressed.png',
    'assets/ui/buttons/button_retry_disabled.png',
  ],
  next_level: [
    'assets/ui/buttons/button_next_level_normal.png',
    'assets/ui/buttons/button_next_level_pressed.png',
    'assets/ui/buttons/button_next_level_disabled.png',
  ],
  main_menu: [
    'assets/ui/buttons/button_main_menu_normal.png',
    'assets/ui/buttons/button_main_menu_pressed.png',
    'assets/ui/buttons/button_main_menu_disabled.png',
  ],
  level_selection: [
    'assets/ui/buttons/button_level_selection_normal.png',
    'assets/ui/buttons/button_level_selection_pressed.png',
    'assets/ui/buttons/button_level_selection_disabled.png',
  ],
  move_left: [
    'assets/ui/hud/hud_move_left.png',
    'assets/ui/hud/hud_move_left_pressed.png',
    'assets/ui/hud/hud_move_left_disabled.png',
  ],
  move_right: [
    'assets/ui/hud/hud_move_right.png',
    'assets/ui/hud/hud_move_right_pressed.png',
    'assets/ui/hud/hud_move_right_disabled.png',
  ],
  jump: [
    'assets/ui/hud/hud_jump.png',
    'assets/ui/hud/hud_jump_pressed.png',
    'assets/ui/hud/hud_jump_disabled.png',
  ],
  ability: [
    'assets/ui/hud/hud_ability.png',
    'assets/ui/hud/hud_ability_pressed.png',
    'assets/ui/hud/hud_ability_disabled.png',
  ],
  pause: [
    'assets/ui/hud/hud_pause.png',
    'assets/ui/hud/hud_pause_pressed.png',
    'assets/ui/hud/hud_pause_disabled.png',
  ],
  restart: [
    'assets/ui/hud/hud_restart.png',
    'assets/ui/hud/hud_restart_pressed.png',
    'assets/ui/hud/hud_restart_disabled.png',
  ],
} as const;

// Audited against the individual PNGs: one row of 256 × 256 cells in every strip.
// Playback durations below are UI timing choices, not asset-export metadata.
export const UI_ANIMATIONS = {
  starUnlock: {
    path: 'assets/ui/victory/star_unlock/star_unlock_spritesheet.png',
    frames: 6,
    durationMs: 600,
  },
  record: {
    path: 'assets/ui/effects/time_record_celebration/time_record_celebration_spritesheet.png',
    frames: 6,
    durationMs: 750,
  },
  rewardSparkle: {
    path: 'assets/ui/effects/coin_reward_sparkle/coin_reward_sparkle_spritesheet.png',
    frames: 6,
    durationMs: 650,
  },
  coinSpin: {
    path: 'assets/ui/rewards/coin_spin/coin_spin_spritesheet.png',
    frames: 8,
    durationMs: 840,
  },
} as const;
