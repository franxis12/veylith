import { PLAYER_BODY } from '../../config/elements';
import { renderIllustration } from './renderIllustration';
import { localizeGameText } from '../../../services/i18n/localizeGameText';
import { renderWorldState } from '../../assets/worldAssets';
import type Phaser from 'phaser';
import { COIN_ASSET, coinAnimation } from '../../assets/coinAsset';
import { FOREST_ASSETS, forestTexture } from '../../assets/forestAssets';
import type { ForestAsset } from '../../assets/forestAssets';
import {
  forestAnimationKey,
  PORTAL_FRAME,
  hasPortalFrame,
} from '../../assets/forestAnimations';
import { gemKey } from '../../assets/gemSheets';
import type { LevelObject } from './types';
import { environmentName } from '../../assets/environmentCatalog';
import { renderEnvironment } from './renderEnvironment';

export function objectTexture(object: LevelObject): string {
  if (object.type === 'coin') return COIN_ASSET.key;
  return object.type === 'gem'
    ? gemKey(object.element, 'idle')
    : forestTexture(object.asset as ForestAsset);
}
export function renderObject(
  scene: Phaser.Scene,
  object: LevelObject,
  editor = false,
): Phaser.GameObjects.Container {
  const view = scene.add
    .container(object.x, object.y)
    .setSize(object.width, object.height)
    .setDepth(object.layer)
    .setVisible(editor || object.visible)
    .setAlpha(object.visible ? 1 : 0.25)
    .setName(object.id);
  if (object.type === 'illustration') {
    renderIllustration(scene, view, object);
  } else if (object.type === 'boxCollider') {
    // No artwork in gameplay; all editor guides are drawn by EditorScene.
  } else if (object.type === 'world') {
    renderWorldState(scene, view, object, object.state, editor);
  } else if (object.type === 'spawn' || object.type === 'crossing') {
    if (editor) {
      // Keep the saved spawn anchor; show the current body inside old markers.
      const width = object.type === 'spawn' ? PLAYER_BODY.width : object.width;
      const height =
        object.type === 'spawn' ? PLAYER_BODY.height : object.height;
      const marker = scene.add
        .rectangle(
          object.width / 2,
          object.height - height / 2,
          width,
          height,
          object.type === 'spawn' ? 0x62ceff : 0xd3f8cf,
          0.15,
        )
        .setStrokeStyle(2, 0x85e4ff);
      view.add(marker);
      view.add(
        scene.add.text(4, 4, object.type === 'spawn' ? 'INICIO' : 'PLANE0', {
          fontSize: '18px',
          color: '#ffffff',
        }),
      );
    }
  } else if (object.type === 'label') {
    const text = scene.add
      .text(object.width / 2, object.height / 2, object.text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#f5f4d5',
        align: 'center',
        backgroundColor: '#173c40d9',
        padding: { x: 10, y: 6 },
        wordWrap: { width: object.width },
      })
      .setOrigin(0.5);
    view.add(editor ? text : localizeGameText(text, object.text));
  } else if (environmentName(object.asset)) {
    renderEnvironment(scene, view, object);
  } else if (object.type === 'terrain' || object.type === 'platform') {
    const columns = Math.min(256, Math.max(1, Math.ceil(object.width / 128))),
      rows =
        object.type === 'platform'
          ? 1
          : Math.min(
              Math.floor(4096 / columns),
              Math.max(1, Math.ceil((object.height + 24) / 128)),
            );
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const first = column === 0,
          last = column === columns - 1;
        const asset: ForestAsset =
          object.type === 'platform'
            ? first
              ? 'platformLeft'
              : last
                ? 'platformRight'
                : 'platform'
            : row === 0
              ? first
                ? 'groundLeft'
                : last
                  ? 'groundRight'
                  : 'ground'
              : first
                ? 'wallLeft'
                : last
                  ? 'wallRight'
                  : 'underground';
        view.add(
          scene.add
            .image(column * 128, row * 128 - 24, forestTexture(asset))
            .setOrigin(0)
            .setScale(
              1,
              object.type === 'platform' ? Math.max(1, object.height) / 56 : 1,
            ),
        );
      }
  } else if (object.type === 'coin') {
    const a = COIN_ASSET,
      b = a.bounds;
    const spinning = !editor && scene.anims.exists(coinAnimation('spin'));
    const coin = scene.add.sprite(
      0,
      0,
      spinning ? coinAnimation('spin') : a.key,
    );
    if (spinning) coin.play(coinAnimation('spin'));
    view.add(
      coin
        .setOrigin(b[0] / a.width, b[1] / a.height)
        .setDisplaySize(
          (a.width * object.width) / (b[2] - b[0]),
          (a.height * object.height) / (b[3] - b[1]),
        ),
    );
  } else if (object.type === 'gem') {
    view.add(
      scene.add
        .image(0, 0, objectTexture(object), 0)
        .setOrigin(0)
        .setDisplaySize(object.width, object.height),
    );
  } else if (object.asset && object.asset in FOREST_ASSETS) {
    const asset = FOREST_ASSETS[object.asset as ForestAsset],
      b = asset.bounds;
    view.add(
      scene.add
        .sprite(0, 0, objectTexture(object))
        .setName('art')
        .setOrigin(b[0] / asset.width, b[1] / asset.height)
        .setDisplaySize(
          (asset.width * object.width) / (b[2] - b[0]),
          (asset.height * object.height) / (b[3] - b[1]),
        ),
    );
    if (
      object.type === 'tank' &&
      !editor &&
      scene.anims.exists(forestAnimationKey('water'))
    ) {
      const water = scene.add
        .sprite(0, 0, forestAnimationKey('water'))
        .setName('water')
        .setOrigin(b[0] / asset.width, b[1] / asset.height)
        .setDisplaySize(
          (asset.width * object.width) / (b[2] - b[0]),
          (asset.height * object.height) / (b[3] - b[1]),
        )
        .setVisible(false)
        .play(forestAnimationKey('water'));
      view.addAt(water, 0);
    }
    if (object.type === 'torch') {
      const animated =
        !editor && scene.anims.exists(forestAnimationKey('torch'));
      const flame = scene.add
        .sprite(
          object.width / 2,
          object.height * 0.15,
          animated ? forestAnimationKey('torch') : forestTexture('torchFlame'),
        )
        .setName('flame')
        .setOrigin(0.5, 1)
        .setScale(object.width / 120)
        .setVisible(false);
      if (animated) flame.play(forestAnimationKey('torch'));
      view.add(flame);
    }
  }
  if (!editor && object.type === 'exit') {
    const animation = forestAnimationKey('portal');
    if (scene.anims.exists(animation) && hasPortalFrame(scene)) {
      (view.getByName('art') as Phaser.GameObjects.Sprite).setTexture(
        PORTAL_FRAME.key,
      );
      const asset = FOREST_ASSETS.portal;
      view.add(
        scene.add
          .sprite(object.width / 2, object.height, animation)
          .setName('energy')
          .setOrigin(0.5, 744 / 768)
          .setScale(object.width / (asset.bounds[2] - asset.bounds[0]))
          .play(animation),
      );
      view.sendToBack(view.getByName('energy'));
    }
  }
  view.setRotation((object.rotation * Math.PI) / 180);
  return view;
}
