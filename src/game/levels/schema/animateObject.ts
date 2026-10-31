import type Phaser from 'phaser';
import { forestAnimationKey } from '../../assets/forestAnimations';
import { forestTexture } from '../../assets/forestAssets';

/** Visual transition only: the puzzle remains the sole owner of collision and signals. */
export function animateDoor(
  view: Phaser.GameObjects.Container,
  open: boolean,
): void {
  const art = view.getByName('art') as Phaser.GameObjects.Sprite | null;
  if (!art) return;
  const before = view.getData('door-open') as boolean | undefined;
  if (before === open) return;
  view.setData('door-open', open);
  art.removeAllListeners('animationcomplete');
  const still = () =>
    art.setTexture(forestTexture(open ? 'door' : 'doorClosed'));
  if (
    before === undefined ||
    !view.scene.anims.exists(forestAnimationKey('door'))
  ) {
    art.stop();
    still();
    return;
  }
  art.once('animationcomplete', still);
  if (open) art.play(forestAnimationKey('door'));
  else art.playReverse(forestAnimationKey('door'));
}
