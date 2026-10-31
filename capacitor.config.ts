import type { CapacitorConfig } from '@capacitor/cli';
import { APP_CONFIG } from './src/app/config';
import { GAME_SETTINGS } from './src/game/config/settings';

const config: CapacitorConfig = {
  appId: APP_CONFIG.id,
  appName: APP_CONFIG.name,
  webDir: 'dist',
  backgroundColor: GAME_SETTINGS.backgroundColor,
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: GAME_SETTINGS.backgroundColor,
  },
};

export default config;
