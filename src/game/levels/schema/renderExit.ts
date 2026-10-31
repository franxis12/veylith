import type Phaser from 'phaser';
import {
  EXIT_FRAME,
  SEAL_PREVIEW,
  exitPlacement,
  sealKey,
  SEAL_PLACEMENT,
} from '../../assets/exitAssets';
import type { LevelObject } from './types';

export function renderExit(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  object: Extract<LevelObject, { type: 'exit' }>,
  editor = false,
): void {
  const p = exitPlacement(object.width, object.height);
  view.add(
    scene.add
      .image(p.x, p.y, EXIT_FRAME.key)
      .setOrigin(0)
      .setScale(p.scale)
      .setName('art'),
  );
  const seal = scene.add
    .sprite(
      p.x + SEAL_PLACEMENT.left * p.scale,
      p.y + SEAL_PLACEMENT.top * p.scale,
      editor ? SEAL_PREVIEW.key : sealKey('idle'),
    )
    .setOrigin(0)
    .setScale((p.scale * SEAL_PLACEMENT.width) / 512)
    .setName('seal');
  view.add(seal);
  if (!editor) seal.play(sealKey('idle'));
}
export function exitSeal(
  view: Phaser.GameObjects.Container,
): Phaser.GameObjects.Sprite {
  return view.getByName('seal') as Phaser.GameObjects.Sprite;
}
export function showExitSeal(
  view: Phaser.GameObjects.Container,
  state: 'idle' | 'break' | 'activate' | 'open',
): void {
  const seal = exitSeal(view);
  seal.removeAllListeners('animationcomplete');
  if (state === 'open') {
    seal.stop().setVisible(false);
    return;
  }
  seal.setVisible(true).play(sealKey(state));
  if (state === 'break')
    seal.once('animationcomplete', () => seal.setVisible(false));
  if (state === 'activate')
    seal.once('animationcomplete', () => seal.play(sealKey('idle')));
}
