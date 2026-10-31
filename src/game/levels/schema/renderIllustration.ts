import type Phaser from 'phaser';
import {
  illustratedScene,
  illustratedDepth,
} from '../../assets/illustratedCatalog';
import type { IllustrationObject } from '../../assets/illustratedCatalog';

/** Sibling render nodes allow gameplay to sit between world and foreground layers. */
export function renderIllustration(
  scene: Phaser.Scene,
  owner: Phaser.GameObjects.Container,
  object: IllustrationObject,
): void {
  const art = illustratedScene(object.sceneId);
  if (!art || !object.visible || object.width <= 0) return;
  const scale = object.width / art.width;
  const nodes: (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] = [];
  for (const layer of art.layers) {
    const key = `illustrated:${object.sceneId}:layer:${layer.id}`;
    if (!object.layers.includes(layer.id) || !scene.textures.exists(key))
      continue;
    nodes.push(
      scene.add
        .image(object.x + layer.x * scale, object.y + layer.y * scale, key)
        .setOrigin(0)
        .setDisplaySize(layer.width * scale, layer.height * scale)
        .setDepth(illustratedDepth(layer.z, object.layer))
        .setName(`${object.id}:${layer.id}`),
    );
  }
  for (const overlay of object.overlays.slice(0, 100)) {
    const a = art.animations[overlay.animation];
    const key = `illustrated:${object.sceneId}:animation:${overlay.animation}`;
    if (
      !overlay.visible ||
      !a ||
      !scene.textures.exists(key) ||
      overlay.width <= 0 ||
      overlay.height <= 0
    )
      continue;
    const phase = Math.max(
      0,
      Math.min(a.frameCount - 1, Math.floor(overlay.phase)),
    );
    const sprite = scene.add
      .sprite(
        object.x + overlay.x * scale,
        object.y + overlay.y * scale,
        key,
        phase,
      )
      .setOrigin(0)
      .setDisplaySize(overlay.width * scale, overlay.height * scale)
      .setDepth(illustratedDepth(overlay.z, object.layer))
      .setAlpha(overlay.opacity)
      .setName(`${object.id}:${overlay.id}`);
    // Local animations avoid stale global registrations when editor textures are released.
    sprite.anims.create({
      key: 'ambient',
      frames: scene.anims.generateFrameNumbers(key, {
        start: 0,
        end: a.frameCount - 1,
      }),
      frameRate: Math.max(1, Math.min(60, overlay.fps)),
      repeat: a.loop ? -1 : 0,
    });
    sprite.play({ key: 'ambient', startFrame: phase });
    nodes.push(sprite);
  }
  owner.once('destroy', () => {
    for (const node of nodes) node.destroy();
  });
}
