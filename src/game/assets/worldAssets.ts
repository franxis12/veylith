import { registerOptionalSheet } from './optionalSheet';
import { assetUrl } from './loadCharacterAssets';
import type Phaser from 'phaser';
import manifest from './worldManifest.json';
import advanced from './advancedManifest.json';
import { renderAdvanced } from './advancedArt';
import type { WorldKind, WorldObject } from '../systems/world/types';
interface WorldStateArt {
  layers?: string[];
  animation?: string;
}
interface WorldArt {
  id: string;
  label: string;
  width: number;
  height: number;
  thumbnail: string;
  states: Record<string, WorldStateArt>;
}
export const WORLD_ART = Object.fromEntries(
  [...manifest.objects, ...advanced.objects].map((o) => [o.id, o]),
) as unknown as Record<WorldKind, WorldArt>;
export const WORLD_ANIMATIONS = [
  ...manifest.animations,
  ...advanced.animations,
];
export const worldTexture = (path: string) => `world:${path}`;
export const worldAnimation = (id: string) => `world-animation:${id}`;
/** Load only objects present in this level; legacy levels pay no additional texture cost. */
export function queueWorldAssets(
  scene: Phaser.Scene,
  kinds: readonly WorldKind[],
  thumbnailsOnly = false,
): void {
  const paths = new Set<string>();
  for (const kind of new Set(kinds)) {
    const art = WORLD_ART[kind];
    paths.add(art.thumbnail);
    if (thumbnailsOnly) {
      paths.add(art.thumbnail);
      continue;
    }
    for (const state of Object.values(art.states))
      for (const path of state.layers ?? []) paths.add(path);
    for (const a of WORLD_ANIMATIONS.filter((a) => a.object === kind)) {
      for (const path of [...a.backLayers, ...a.frontLayers]) paths.add(path);
      const key = worldTexture(a.spritesheet);
      if (!scene.textures.exists(key))
        scene.load.spritesheet(key, assetUrl(a.spritesheet), {
          frameWidth: a.frameWidth,
          frameHeight: a.frameHeight,
          endFrame: a.frames.length - 1,
        });
    }
  }
  for (const path of paths)
    if (!scene.textures.exists(worldTexture(path)))
      scene.load.image(worldTexture(path), assetUrl(path));
}
export function registerWorldAnimations(scene: Phaser.Scene): void {
  for (const a of WORLD_ANIMATIONS) {
    const texture = worldTexture(a.spritesheet),
      key = worldAnimation(a.id);
    if (!scene.textures.exists(texture)) continue;
    registerOptionalSheet(
      scene,
      key,
      {
        path: a.spritesheet,
        width: a.frameWidth,
        height: a.frameHeight,
        frames: a.frames.length,
        fps: a.frameRate,
        loop: a.repeat === -1,
      },
      texture,
    );
  }
}
export function missingWorldAssets(
  scene: Phaser.Scene,
  kinds: readonly WorldKind[],
): string[] {
  // Optional animation failure must not prevent a functional puzzle from starting.
  return [...new Set(kinds)]
    .filter((kind) => {
      const art = WORLD_ART[kind];
      return ![
        art.thumbnail,
        ...Object.values(art.states).flatMap((state) => state.layers ?? []),
      ].some((path) => scene.textures.exists(worldTexture(path)));
    })
    .map((kind) => WORLD_ART[kind].thumbnail);
}
/** Full original canvas on every layer. No alpha trimming or artwork changes. */
export function renderWorldState(
  scene: Phaser.Scene,
  view: Phaser.GameObjects.Container,
  o: WorldObject,
  state: string,
  editor = false,
  progress?: number,
  transition?: { next?: string | null; revision?: number },
): void {
  if (renderAdvanced(scene, view, o)) return;
  const art = WORLD_ART[o.kind];
  const stateArt = art.states[state];
  const a = WORLD_ANIMATIONS.find(
    (a) =>
      a.object === o.kind && (a.id === state || a.id === stateArt?.animation),
  );
  const frame =
    progress === undefined || !a
      ? undefined
      : Math.max(
          0,
          Math.min(a.frames.length - 1, Math.floor(progress * a.frames.length)),
        );
  const key = `${state}:${frame ?? 'animated'}:${transition?.revision ?? ''}`;
  if (view.getData('world-state') === key) return;
  view.setData('world-state', key);
  view.removeAll(true);
  if (
    editor &&
    !scene.textures.exists(
      worldTexture(a?.spritesheet ?? stateArt?.layers?.[0] ?? ''),
    )
  ) {
    view.add(
      scene.add
        .image(0, 0, worldTexture(art.thumbnail))
        .setOrigin(0)
        .setDisplaySize(o.width, o.height),
    );
    return;
  }
  const layer = (path: string) => {
    if (!scene.textures.exists(worldTexture(path))) return;
    view.add(
      scene.add
        .image(0, 0, worldTexture(path))
        .setOrigin(0)
        .setDisplaySize(o.width, o.height),
    );
  };
  if (a && scene.anims.exists(worldAnimation(a.id))) {
    a.backLayers.forEach(layer);
    const sprite = scene.add
      .sprite(0, 0, worldTexture(a.spritesheet))
      .setOrigin(0)
      .setDisplaySize(o.width, o.height);
    view.add(sprite);
    if (frame !== undefined) sprite.setFrame(frame);
    else if (scene.anims.exists(worldAnimation(a.id))) {
      sprite.play(worldAnimation(a.id));
      const next = transition?.next === undefined ? a.next : transition.next;
      if (a.repeat === 0 && next)
        sprite.once('animationcomplete', () =>
          renderWorldState(scene, view, o, next),
        );
    }
    a.frontLayers.forEach(layer);
    const overlay =
      a.id === 'lava_surface'
        ? 'fire_particles'
        : a.id === 'water_surface'
          ? 'water_bubbles'
          : undefined;
    const extra = WORLD_ANIMATIONS.find((entry) => entry.id === overlay);
    if (extra && scene.anims.exists(worldAnimation(extra.id)))
      view.add(
        scene.add
          .sprite(0, 0, worldTexture(extra.spritesheet))
          .setOrigin(0)
          .setDisplaySize(o.width, o.height)
          .play(worldAnimation(extra.id)),
      );
  } else (stateArt?.layers ?? []).forEach(layer);
  if (view.length === 0) layer(art.thumbnail);
  if (o.behavior.kind === 'fan' && o.behavior.direction < 0) {
    // Mirror each layer together, retaining the object's original canvas bounds.
    for (const child of view.list) {
      const image = child as Phaser.GameObjects.Image;
      image.setFlipX(true).setX(0);
    }
  }
}
