import type { GameOptions } from '../core/GameOptions';
import { CharacterPreviewScene } from './CharacterPreviewScene';
import { PreviewBridge } from './previewBridge';

export function createPreviewSession() {
  const bridge = new PreviewBridge();
  const scene: NonNullable<GameOptions['scene']> = {
    key: 'CharacterPreviewScene',
    assets: 'all',
    create: (renderScale, onReady) =>
      new CharacterPreviewScene(renderScale, onReady, bridge),
  };
  return { bridge, scene, dispose: () => bridge.dispose() };
}
