import type { LevelObject } from '../levels/schema/types';
import {
  queueIllustratedAssets,
  missingIllustratedAssets,
} from '../assets/illustratedAssets';
import {
  queueWorldAssets,
  registerWorldAnimations,
  missingWorldAssets,
} from '../assets/worldAssets';
import type { WorldKind } from '../systems/world/types';
import {
  queueEnvironmentAssets,
  missingEnvironmentAssets,
} from '../assets/environmentAssets';
import type { EnvironmentName } from '../assets/environmentCatalog';
import Phaser from 'phaser';
import {
  COIN_ASSET,
  queueCoinAsset,
  queueCoinAnimations,
  registerCoinAnimations,
} from '../assets/coinAsset';
import {
  queueForestAnimations,
  registerForestAnimations,
} from '../assets/forestAnimations';
import { queueGemAssets, registerGemAnimations } from '../assets/gemSheets';
import {
  queueTransformationAssets,
  registerTransformationAnimations,
} from '../assets/effectSheets';
import { queueForestAssets, failedForestAssets } from '../assets/forestAssets';
import {
  queueEffectAssets,
  registerEffectAnimations,
} from '../assets/effectSheets';
import {
  failedCharacterAssets,
  queueCharacterAssets,
} from '../assets/loadCharacterAssets';
import type { CharacterLoadScope } from '../assets/loadCharacterAssets';
import { registerCharacterAnimations } from '../systems/animation/animationRegistry';
import type { CharacterAnimation } from '../systems/animation/animationRegistry';

export class BootScene extends Phaser.Scene {
  private clips: readonly CharacterAnimation[] = [];

  constructor(
    private readonly nextScene = 'MainScene',
    private readonly scope: CharacterLoadScope = 'gameplay',
    private readonly onError: (error: Error) => void = console.error,
    private readonly forest = false,
    private readonly worldKinds: readonly WorldKind[] = [],
    private readonly environment: readonly EnvironmentName[] = [],
    private readonly illustrated: readonly LevelObject[] = [],
  ) {
    super('BootScene');
  }

  preload(): void {
    this.clips = queueCharacterAssets(this, this.scope);
    queueWorldAssets(this, this.worldKinds);
    queueEnvironmentAssets(this, this.environment);
    queueIllustratedAssets(this, this.illustrated);
    if (this.scope === 'gameplay') {
      queueEffectAssets(this);
      queueGemAssets(this);
      queueTransformationAssets(this);
    }
    if (this.forest) {
      queueCoinAsset(this);
      queueCoinAnimations(this);
      queueForestAssets(this);
      queueForestAnimations(this);
    }
  }

  create(): void {
    const environmentFailures = [
      ...missingWorldAssets(this, this.worldKinds),
      ...missingEnvironmentAssets(this.textures, this.environment),
      ...missingIllustratedAssets(this, this.illustrated),
      ...(this.forest ? failedForestAssets(this.textures) : []),
    ];
    if (this.forest && !this.textures.exists(COIN_ASSET.key))
      environmentFailures.push(COIN_ASSET.path);
    if (environmentFailures.length > 0) {
      this.onError(
        new Error(
          `Environment assets failed to load: ${environmentFailures.join(', ')}`,
        ),
      );
      return;
    }
    const failures = failedCharacterAssets(this.textures, this.clips);
    const requiredFailures =
      this.scope === 'gameplay'
        ? this.clips
            .filter(
              (clip) => clip.action === 'idle' && failures.includes(clip.path),
            )
            .map((clip) => clip.path)
        : failures;
    if (requiredFailures.length > 0) {
      this.onError(
        new Error(
          `Character assets failed to load: ${requiredFailures.join(', ')}`,
        ),
      );
      return;
    }
    if (failures.length > 0) {
      console.warn(
        `Using idle for unavailable gameplay animations: ${failures.join(', ')}`,
      );
      for (const clip of this.clips) {
        if (failures.includes(clip.path) && this.textures.exists(clip.texture))
          this.textures.remove(clip.texture);
      }
    }
    registerWorldAnimations(this);
    registerCharacterAnimations(this.anims, this.textures);
    if (this.scope === 'gameplay') {
      registerEffectAnimations(this);
      registerGemAnimations(this);
      registerTransformationAnimations(this);
    }
    if (this.forest) {
      registerForestAnimations(this);
      registerCoinAnimations(this);
    }
    this.scene.start(this.nextScene);
  }
}
