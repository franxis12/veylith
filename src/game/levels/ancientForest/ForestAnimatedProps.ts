import type Phaser from 'phaser';
import type { SceneSound } from '../../systems/audio/SceneSound';
import { FOREST_ASSETS, forestTexture } from '../../assets/forestAssets';
import {
  FOREST_DOOR_CYCLE,
  FOREST_ANIMATION_SHEETS,
  PORTAL_FRAME,
  forestAnimationKey,
  hasPortalFrame,
} from '../../assets/forestAnimations';
import { ANCIENT_FOREST } from './layout';

/** Purely visual, scene-owned objects: no bodies, triggers, timers or puzzle state. */
export function createForestAnimatedProps(
  scene: Phaser.Scene,
  audio?: SceneSound,
): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const place = <
    T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  >(
    object: T,
    asset: 'tank' | 'door' | 'portal',
    scale: number,
    name: string,
    depth = -2,
  ): T => {
    const source = FOREST_ASSETS[asset];
    object
      .setOrigin(0.5, source.bounds[3] / source.height)
      .setScale(scale)
      .setDepth(depth)
      .setName(name);
    objects.push(object);
    return object;
  };

  // The supplied layers share full-canvas coordinates, including transparent margins.
  const water = forestAnimationKey('water');
  if (scene.anims.exists(water))
    place(
      scene.add.sprite(4900, 650, water).play(water),
      'tank',
      0.5,
      'forest-prop:water',
      -3,
    );
  place(
    scene.add.image(4900, 650, forestTexture('tank')),
    'tank',
    0.5,
    'forest-prop:tank',
  );

  if (scene.anims.exists(FOREST_DOOR_CYCLE)) {
    const door = scene.add
      .sprite(5230, 650, forestAnimationKey('door'))
      .play(FOREST_DOOR_CYCLE);
    if (audio)
      door
        .on('animationrepeat', () =>
          audio.at('stone_gate_open', 5230, 650, 0.6),
        )
        .on(
          'animationupdate',
          (
            _animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
          ) => {
            if (frame.index === FOREST_ANIMATION_SHEETS.door.frames + 1)
              audio.at('door_close', 5230, 650, 0.6);
          },
        );
    place(door, 'door', 0.5, 'forest-prop:door');
  } else
    place(
      scene.add.image(5230, 650, forestTexture('door')),
      'door',
      0.5,
      'forest-prop:door',
    );

  const portal = forestAnimationKey('portal');
  const animatedPortal = scene.anims.exists(portal) && hasPortalFrame(scene);
  if (animatedPortal)
    place(
      scene.add.sprite(ANCIENT_FOREST.exit.x, 650, portal).play(portal),
      'portal',
      0.65,
      'forest-prop:portal-energy',
      -3,
    );
  place(
    scene.add.image(
      ANCIENT_FOREST.exit.x,
      650,
      animatedPortal ? PORTAL_FRAME.key : forestTexture('portal'),
    ),
    'portal',
    0.65,
    'forest-prop:portal',
  );
  return objects;
}
