import { BLOCKER_FACES } from '../schema/playerCollision';
import { localizeGameText } from '../../../services/i18n/localizeGameText';
import type Phaser from 'phaser';
import type { SceneSound } from '../../systems/audio/SceneSound';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { LevelProgress } from '../LevelProgress';
import { FIRST_PUZZLE } from './layout';
import { FirstPuzzleState } from './FirstPuzzleState';

export class FirstPuzzle {
  readonly solids: Phaser.GameObjects.Rectangle[];
  private readonly state = new FirstPuzzleState();
  private readonly plate: Phaser.GameObjects.Rectangle;
  private readonly gate: Phaser.GameObjects.Rectangle;
  private lastSeconds = 0;
  private readonly exit: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    renderScale: number,
    private readonly progress: LevelProgress,
    private readonly audio?: SceneSound,
  ) {
    scene.add.rectangle(800, 686, 480, 68, 0x09121c);
    scene.add.rectangle(800, 712, 480, 16, 0x5a3947);
    this.solids = FIRST_PUZZLE.platforms.map(({ x, y, width, height }) => {
      const slab = scene.add.rectangle(x, y, width, height, 0x365362);
      scene.physics.add.existing(slab, true);
      return slab;
    });
    this.plate = scene.add.rectangle(
      FIRST_PUZZLE.plate.x,
      FIRST_PUZZLE.plate.top + 3,
      FIRST_PUZZLE.plate.width,
      6,
      0xbfd28b,
    );
    this.gate = scene.add
      .rectangle(
        FIRST_PUZZLE.gate.x,
        360,
        FIRST_PUZZLE.gate.width,
        FIRST_PUZZLE.gate.height,
        0xb99064,
      )
      .setStrokeStyle(3, 0xf2d4a0)
      .setData('player-collision', BLOCKER_FACES);
    scene.physics.add.existing(this.gate, true);
    this.solids.push(this.gate);
    this.exit = scene.add
      .rectangle(1190, 568, 76, 164, 0x193c43)
      .setStrokeStyle(4, 0x71b6bd);
    localizeGameText(
      scene.add
        .text(400, 455, 'TIERRA', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: '#bfd28b',
        })
        .setOrigin(0.5, 0)
        .setResolution(renderScale),
      'TIERRA',
    );
    localizeGameText(
      scene.add
        .text(1190, 460, 'SALIDA', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: '#a4e3d9',
        })
        .setOrigin(0.5, 0)
        .setResolution(renderScale),
      'SALIDA',
    );
    this.audio?.scope.preload([
      'stone_gate_open',
      'door_close',
      'mechanism_activate',
      'timed_gate_warning',
    ]);
    this.audio?.changed(
      'prototype:gate',
      false,
      'stone_gate_open',
      'door_close',
      FIRST_PUZZLE.gate.x,
      400,
    );
    this.audio?.changed(
      'prototype:plate',
      false,
      'mechanism_activate',
      undefined,
      FIRST_PUZZLE.plate.x,
      FIRST_PUZZLE.plate.top,
    );
    this.progress.publish(this.state.snapshot);
  }

  get completed(): boolean {
    return this.state.snapshot.phase === 'complete';
  }

  update(player: PlayablePlayer, deltaMs: number): boolean {
    const body = player.body;
    if (!this.completed && body.bottom >= FIRST_PUZZLE.fallLimit) return true;
    const snapshot = this.state.update(
      {
        x: body.center.x,
        feetY: body.bottom,
        element: player.element,
        grounded:
          (body.blocked.down || body.touching.down) && body.velocity.y >= 0,
      },
      deltaMs,
    );
    const gateBody = this.gate.body as Phaser.Physics.Arcade.StaticBody;
    const overlapsGate =
      body.right > gateBody.left && body.left < gateBody.right;
    // Never enable a solid door inside the player as its timer expires.
    const open = snapshot.phase !== 'locked' || overlapsGate;
    this.audio?.changed(
      'prototype:gate',
      open,
      'stone_gate_open',
      'door_close',
      FIRST_PUZZLE.gate.x,
      400,
    );
    this.audio?.changed(
      'prototype:plate',
      snapshot.activated,
      'mechanism_activate',
      undefined,
      FIRST_PUZZLE.plate.x,
      FIRST_PUZZLE.plate.top,
    );
    if (
      snapshot.phase === 'open' &&
      snapshot.secondsLeft > 0 &&
      snapshot.secondsLeft < this.lastSeconds
    )
      this.audio?.at('timed_gate_warning', FIRST_PUZZLE.gate.x, 400, 0.7);
    this.lastSeconds = snapshot.secondsLeft;
    gateBody.enable = !open;
    this.gate.setAlpha(open ? 0.12 : 1);
    this.plate.setFillStyle(snapshot.phase === 'locked' ? 0xbfd28b : 0x7ff0c6);
    this.exit.setFillStyle(snapshot.phase === 'complete' ? 0x3c947e : 0x193c43);
    this.progress.publish(snapshot);
    return false;
  }

  destroy(): void {
    this.progress.publish(null);
  }
}
