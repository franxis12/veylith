import { playerCollisionFaces } from '../schema/playerCollision';
import type Phaser from 'phaser';
import { mechanismCollision } from '../../systems/world/mechanismCollision';
import type { SceneSound } from '../../systems/audio/SceneSound';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { LevelObject } from '../schema/types';
import { colliderBounds } from '../schema/types';
import type { ForestPuzzleState } from './ForestPuzzleState';
import { BLOCK, blockPushVelocity } from './heavyBlockRules';

/** One gravity-driven Arcade body. Art and physics retain independent dimensions. */
export class HeavyBlock {
  readonly collider: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private previousX?: number;
  private previousYSpeed = 0;
  private collision: Phaser.Physics.Arcade.Collider | undefined;
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly object: Extract<LevelObject, { type: 'block' }>,
    private readonly view: Phaser.GameObjects.Container,
    private readonly audio?: SceneSound,
  ) {
    const b = colliderBounds(object);
    this.collider = scene.add
      .rectangle(
        (b.left + b.right) / 2,
        (b.top + b.bottom) / 2,
        object.collider.width,
        object.collider.height,
      )
      .setVisible(false)
      .setName(object.id)
      .setData('player-collision', playerCollisionFaces(object));
    scene.physics.add.existing(this.collider);
    this.body = this.collider.body as Phaser.Physics.Arcade.Body;
    // Non-pushable blocks still collide with static terrain. Only the Earth contact
    // rule supplies horizontal velocity; other forms cannot move them by separation.
    this.body.pushable = false;
    this.body.setBounce(0).setMaxVelocity(BLOCK.speed, BLOCK.maxFall);
    this.body.enable = object.collider.enabled;
  }
  collideWith(solids: Phaser.GameObjects.Rectangle[]): void {
    this.collision = this.scene.physics.add.collider(
      this.collider,
      solids,
      undefined,
      mechanismCollision,
    );
  }
  canPush(
    player: PlayablePlayer,
    direction: number,
    state: ForestPuzzleState,
  ): boolean {
    const p = player.body,
      b = this.body;
    return (
      !state.isBlockDocked(this.object.id) &&
      blockPushVelocity(
        player.element,
        p,
        (p.blocked.down || p.touching.down) && p.velocity.y >= 0,
        direction,
        b,
        (b.blocked.down || b.touching.down) && b.velocity.y >= 0,
      ) !== 0
    );
  }
  update(
    player: PlayablePlayer,
    state: ForestPuzzleState,
    fallLimit: number,
  ): boolean {
    const b = this.body,
      p = player.body;
    const grounded = (b.blocked.down || b.touching.down) && b.velocity.y >= 0;
    const moved =
      this.previousX !== undefined &&
      Math.abs(b.center.x - this.previousX) > 0.05;
    this.audio?.loop(
      `block:${this.object.id}`,
      'stone_push',
      b.center.x,
      b.bottom,
      grounded && moved,
      0.8,
    );
    if (grounded && this.previousYSpeed > 180)
      this.audio?.at('earth_land', b.center.x, b.bottom, 0.85);
    this.previousX = b.center.x;
    this.previousYSpeed = b.velocity.y;
    state.observeBlock(this.object.id, b, grounded);
    if (state.isBlockDocked(this.object.id)) {
      b.setVelocity(0).setAllowGravity(false).setImmovable(true);
    } else if (grounded) {
      b.setVelocityX(
        blockPushVelocity(
          player.element,
          p,
          (p.blocked.down || p.touching.down) && p.velocity.y >= 0,
          p.velocity.x,
          b,
          grounded,
        ),
      );
    }
    // In flight retain the horizontal velocity from the last push until landing.
    this.view.setPosition(
      b.left - this.object.collider.x,
      b.top - this.object.collider.y,
    );
    return b.enable && b.bottom >= fallLimit;
  }
  destroy(): void {
    this.collision?.destroy();
    this.collision = undefined;
  }
}
