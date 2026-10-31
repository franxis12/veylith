import type { AudioScope } from '../../services/audio/AudioScope';
import type { LevelDocument } from '../levels/schema/types';
import type { RunSession } from '../session/RunSession';
import type Phaser from 'phaser';
import type { LevelId } from '../levels/levelSelection';
import type { CharacterLoadScope } from '../assets/loadCharacterAssets';
import type { ActionState } from '../systems/input/ActionState';
import type { LevelProgress } from '../levels/LevelProgress';

export interface GameOptions {
  audio?: AudioScope;
  document?: LevelDocument;
  input?: ActionState;
  run?: RunSession;
  developmentElements?: boolean;
  progress?: LevelProgress;
  level?: LevelId;
  onError?: (error: Error) => void;
  scene?: {
    key: string;
    assets: CharacterLoadScope;
    create: (renderScale: number, onReady: () => void) => Phaser.Scene;
  };
}
