import {
  MIRROR_ANGLES,
  reflectorAngle,
} from '../systems/world/reflectorAngles';
import type Phaser from 'phaser';
import manifest from './advancedManifest.json';
import { isAdvancedKind } from '../systems/world/advancedTypes';
import type { WorldObject } from '../systems/world/types';

export interface AdvancedFrame {
  active: boolean;
  moving?: boolean;
  open?: boolean;
  mirrorAngle?: number | undefined;
}
const texture = (path: string) => `world:${path}`;
const animation = (id: string) => `world-animation:${id}`;
export const advancedPath = (family: string, id: string) =>
  `assets/objects/advanced/${family}/static/${id}.png`;
export function advancedImage(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  family: string,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const key = texture(advancedPath(family, id));
  if (!scene.textures.exists(key)) return undefined;
  const image = scene.add.image(x, y, key).setOrigin(0).setDisplaySize(w, h);
  view.add(image);
  return image;
}
export function advancedClip(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  next?: () => void,
) {
  const a = manifest.animations.find((a) => a.id === id);
  if (!a || !scene.anims.exists(animation(id))) return undefined;
  const sprite = scene.add
    .sprite(x, y, texture(a.spritesheet))
    .setOrigin(0)
    .setDisplaySize(w, h)
    .play(animation(id));
  view.add(sprite);
  if (next) sprite.once('animationcomplete', next);
  return sprite;
}
/** Compose independent canvases at their measured attachment points. Physics never reads animation clocks. */
export function renderAdvanced(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  o: WorldObject,
  frame?: AdvancedFrame,
): boolean {
  if (!isAdvancedKind(o.kind)) return false;
  const b = o.behavior,
    active = frame?.active ?? ('autostart' in b && b.autostart),
    open = frame?.open ?? false;
  const prior = view.getData('advanced-active') as boolean | undefined;
  const key = JSON.stringify([o.kind, b, o.width, o.height, active, open]);
  const angle =
    b.kind === 'reflector' ? (frame?.mirrorAngle ?? reflectorAngle(b)) : 0;
  const turnHead = () => {
    const head = view.getByName('reflector-head') as
      Phaser.GameObjects.Image | undefined;
    if (head && b.kind === 'reflector')
      head.setAngle(angle - MIRROR_ANGLES[b.orientation]);
  };
  if (view.getData('advanced-key') === key) {
    turnHead();
    return true;
  }
  view
    .setData('advanced-key', key)
    .setData('advanced-active', active)
    .setData('world-state', `${b.kind}:${active}:${open}`);
  view.removeAll(true);
  const img = (
    family: string,
    id: string,
    x = 0,
    y = 0,
    w = o.width,
    h = o.height,
  ) => advancedImage(scene, view, family, id, x, y, w, h);
  if (b.kind === 'reflector') {
    img('reflectors', 'reflector_base');
    const head = img('reflectors', `mirror_${b.orientation}`);
    head
      ?.setName('reflector-head')
      .setOrigin(0.5, 268 / 512)
      .setPosition(o.width / 2, (o.height * 268) / 512);
    turnHead();
  }
  if (b.kind === 'beamEmitter') {
    const image = img(
      'reflectors',
      b.direction === 'up' || b.direction === 'down'
        ? 'light_beam_vertical_tile'
        : 'light_beam_horizontal_tile',
    );
    image?.setAlpha(active ? 1 : 0.25);
  }
  if (b.kind === 'receiver') {
    img('reflectors', 'light_receptor_inactive');
    if (active && prior === false) {
      const glow = advancedClip(
        scene,
        view,
        'receptor_activation',
        0,
        0,
        o.width,
        o.height,
      );
      if (!glow) img('reflectors', 'receptor_glow_active');
    } else if (active) img('reflectors', 'receptor_glow_active');
  }
  if (b.kind === 'pulley') img('pulleys', 'movable_platform');
  if (b.kind === 'pulleyWeight') {
    img('pulleys', 'counterweight');
    if (active && prior === false) {
      if (
        !advancedClip(
          scene,
          view,
          'counterweight_activation',
          0,
          0,
          o.width,
          o.height,
        )
      )
        img('pulleys', 'counterweight_active_glow');
    } else if (active) img('pulleys', 'counterweight_active_glow');
  }
  if (b.kind === 'conveyor') {
    const w = o.width / (b.segments + 2),
      h = o.height;
    img('conveyors', 'conveyor_left_end_cap', 0, 0, w, h);
    img('conveyors', 'conveyor_right_end_cap', (b.segments + 1) * w, 0, w, h);
    const loop = b.direction === 1 ? 'moving_right' : 'moving_left';
    const part = (
      type: 'belt' | 'roller',
      x: number,
      y: number,
      pw: number,
      ph: number,
    ) => {
      const idle = () =>
        img('conveyors', `conveyor_${type}_idle`, x, y, pw, ph);
      const playLoop = () => {
        const s = advancedClip(
          scene,
          view,
          `conveyor_${type}_${loop}`,
          x,
          y,
          pw,
          ph,
        );
        if (s) s.anims.timeScale = b.speed / ((96 * w) / 256);
        else idle();
      };
      if (active) {
        if (prior === false) {
          const s = advancedClip(
            scene,
            view,
            `conveyor_${type}_starting`,
            x,
            y,
            pw,
            ph,
            () => {
              s?.destroy();
              playLoop();
            },
          );
          if (s) s.setFlipX(b.direction < 0);
          else playLoop();
        } else playLoop();
      } else if (prior === true) {
        const s = advancedClip(
          scene,
          view,
          `conveyor_${type}_stopping`,
          x,
          y,
          pw,
          ph,
          () => {
            s?.destroy();
            idle();
          },
        );
        if (s) s.setFlipX(b.direction < 0);
        else idle();
      } else idle();
    };
    for (let i = 1; i <= b.segments; i++) {
      img('conveyors', 'conveyor_center_segment', i * w, 0, w, h);
      part('belt', i * w, 0, w, h);
    }
    // Roller export is a full 256 canvas; its hub center is [128,128].
    part('roller', ((67 - 128) * w) / 256, ((145 - 128) * h) / 256, w, h);
    part(
      'roller',
      (b.segments + 1) * w + ((184 - 128) * w) / 256,
      ((148 - 128) * h) / 256,
      w,
      h,
    );
    img(
      'conveyors',
      b.direction === 1
        ? 'conveyor_direction_right'
        : 'conveyor_direction_left',
      o.width / 2 - w / 2,
      h * 0.48,
      w,
      h * 0.5,
    );
  }
  if (b.kind === 'directionalGate') {
    const staticPanel = () =>
      img('directional_gates', open ? 'gate_panel_open' : 'gate_panel_closed');
    const panel = advancedClip(
      scene,
      view,
      open ? 'gate_open' : 'gate_close',
      0,
      0,
      o.width,
      o.height,
    );
    if (!panel) staticPanel();
    img('directional_gates', 'gate_frame');
    const arrow = img(
      'directional_gates',
      'gate_direction_right',
      o.width * 0.375,
      o.height * 0.12,
      o.width * 0.25,
      o.height * 0.125,
    );
    arrow?.setFlipX(b.direction < 0);
    const x = o.width * 0.37,
      y = o.height * 0.39,
      w = o.width * 0.26,
      h = o.height * 0.26;
    if (active && prior === false) {
      if (!advancedClip(scene, view, 'gate_unlock', x, y, w, h))
        img('directional_gates', 'gate_unlocked_indicator', x, y, w, h);
    } else
      img(
        'directional_gates',
        active ? 'gate_unlocked_indicator' : 'gate_locked_indicator',
        x,
        y,
        w,
        h,
      );
  }
  // The editor initially loads only thumbnails; redraw after its full asset load.
  if (view.length === 0) {
    const art = manifest.objects.find((a) => a.id === o.kind)!;
    if (scene.textures.exists(texture(art.thumbnail)))
      view.add(
        scene.add
          .image(0, 0, texture(art.thumbnail))
          .setOrigin(0)
          .setDisplaySize(o.width, o.height),
      );
    view.setData('advanced-key', null);
  }
  return true;
}
