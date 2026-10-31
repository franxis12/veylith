import type { IllustratedOverlay } from '../../assets/illustratedCatalog';
import type { WorldKind, WorldObject } from '../../systems/world/types';
import type { Element } from '../../types/character';
import type { ForestAsset } from '../../assets/forestAssets';
import type { EnvironmentAssetId } from '../../assets/environmentCatalog';
export type AssetId =
  | ForestAsset
  | EnvironmentAssetId
  | `gem:${Element}`
  | 'coin'
  | `world:${WorldKind}`;
export interface PlayerCollisionFaces {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}
export interface BoxCollider {
  /** Solid faces for the player only; absent retains the object-type defaults. */
  playerCollision?: PlayerCollisionFaces;
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ObjectBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** Optional repeat-cell scale for two-axis environment fills; absent means 1×. */
  tileScale?: number;
  visible: boolean;
  layer: number;
  asset: AssetId | null;
  collider: BoxCollider;
}
export type LevelObject =
  | WorldObject
  | (ObjectBase &
      (
        | { type: 'terrain' | 'platform' | 'decoration' | 'boxCollider' }
        | {
            type: 'illustration';
            sceneId: string;
            layers: string[];
            overlays: IllustratedOverlay[];
          }
        | { type: 'gem'; element: Element; respawn: 'restart' }
        | { type: 'coin'; value: number }
        | { type: 'spawn'; element: Element }
        | { type: 'tank' | 'torch'; hits: number; hint: string }
        | { type: 'door'; initiallyOpen: boolean; requires: string[] }
        | { type: 'plate'; requiredWeight: 1; hint: string }
        /** Empty plateId makes a free movable platform; existing v1 links stay valid. */
        | { type: 'block'; plateId: string }
        | { type: 'wall'; hint: string }
        | { type: 'crossing'; landingY: number; hint: string }
        | { type: 'exit'; requires: string[] }
        | { type: 'label'; text: string }
      ));
export interface LevelDocument {
  version: 1;
  id: string;
  name: string;
  theme: 'ancient-forest';
  width: number;
  height: number;
  fallLimit: number;
  /** Gameplay/playtest camera zoom; old v1 levels default to 1. */
  cameraZoom?: number;
  background: { sky: boolean; forest: boolean; foreground: boolean };
  timer: { threeStarsMs: number; twoStarsMs: number };
  /** Optional gradual clues; old v1 documents remain valid. */
  puzzle?: { brief: string; hints: string[] };
  objects: LevelObject[];
}
export const LEVEL_ID = /^[a-z][a-z0-9-]{0,63}$/;
export const OBJECT_ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;
export function colliderBounds(object: ObjectBase) {
  return {
    left: object.x + object.collider.x,
    top: object.y + object.collider.y,
    right: object.x + object.collider.x + object.collider.width,
    bottom: object.y + object.collider.y + object.collider.height,
    enable: object.collider.enabled,
  };
}
