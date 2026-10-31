import type Phaser from 'phaser';
import {
  renderWorldState,
  WORLD_ANIMATIONS,
  worldAnimation,
} from '../../assets/worldAssets';
import type { WorldObject } from './types';
import type { MechanismState } from './WorldState';

/** Optional animation never owns collision or clocks. Missing sheets use real static states. */
export class StageOneVisuals {
  private readonly previous = new Map<string, string>();
  render(
    scene: Phaser.Scene,
    view: Phaser.GameObjects.Container,
    o: WorldObject,
    s: MechanismState,
    solid: boolean,
  ): boolean {
    let state: string,
      transition: string | undefined,
      revision = 0;
    switch (o.behavior.kind) {
      case 'timedDoor':
        state = solid
          ? 'closed'
          : s.remainingMs <= o.behavior.warningMs && s.remainingMs > 0
            ? 'door_warning'
            : 'open';
        transition = solid ? 'door_closing' : 'door_opening';
        break;
      case 'phasePlatform':
        state = solid ? 'solid' : 'hidden';
        transition = solid ? 'platform_appearing' : 'platform_disappearing';
        break;
      case 'barrier':
        state = solid ? 'barrier_active' : 'inactive';
        transition = solid ? 'barrier_activate' : 'barrier_deactivate';
        break;
      case 'switch':
        state = s.active ? 'active' : 'unlit';
        transition = s.active ? 'igniting' : 'extinguishing';
        break;
      case 'bounce':
        state = 'idle';
        transition = 'bounce_launch';
        revision = s.launches;
        break;
      case 'float':
        state = s.active
          ? o.behavior.currentSpeed
            ? 'wooden_block_wake'
            : 'wooden_block_floating'
          : 'idle';
        break;
      default:
        return false;
    }
    const key = `${state}:${revision}`;
    const previous = this.previous.get(o.id);
    if (previous === key) return true;
    this.previous.set(o.id, key);
    // A warning is a loop driven by the remaining gameplay time, never an opening transition.
    if (
      previous !== undefined &&
      transition &&
      state !== 'door_warning' &&
      !(state === 'open' && previous.startsWith('door_warning:'))
    ) {
      const clip = WORLD_ANIMATIONS.find(
        (a) =>
          a.object === o.kind &&
          (a.id === transition ||
            (o.behavior.kind === 'switch' &&
              a.id === `fire_switch_${transition}`)),
      );
      if (clip && scene.anims.exists(worldAnimation(clip.id))) {
        renderWorldState(scene, view, o, transition, false, undefined, {
          next: state,
          revision,
        });
        return true;
      }
    }
    renderWorldState(scene, view, o, state);
    return true;
  }
}
