import { playerCollision } from '../systems/world/mechanismCollision';
import type { AudioScope } from '../../services/audio/AudioScope';
import type { SoundId } from '../../services/audio/catalog';
import { uiAudio } from '../../services/audio/gameAudio';
import { SceneSound } from '../systems/audio/SceneSound';
import { MovementAudio } from '../systems/audio/MovementAudio';
import type { LevelDocument } from '../levels/schema/types';
import { compileLevel } from '../levels/schema/compile';
import { ForestPuzzle } from '../levels/forestPuzzles/ForestPuzzle';
import {
  FOREST_PUZZLES,
  isForestPuzzle,
} from '../levels/forestPuzzles/layouts';
import Phaser from 'phaser';
import type { RunSession } from '../session/RunSession';
import { GemSystem } from '../systems/gems/GemSystem';
import type { GemLevel } from '../levels/gems';
import { AncientForest } from '../levels/ancientForest/AncientForest';
import { ANCIENT_FOREST } from '../levels/ancientForest/layout';
import type { LevelId } from '../levels/levelSelection';
import { PowerEffects } from '../systems/powers/PowerEffects';
import { configureWorldCamera } from '../core/WorldCamera';
import { PlayablePlayer } from '../entities/player/PlayablePlayer';
import { createTestLevel, TEST_SPAWN, TEST_GEMS } from '../levels/testLevel';
import { ActionState } from '../systems/input/ActionState';
import { gameplayKeyboard } from '../systems/input/gameplayKeyboard';
import { FirstPuzzle } from '../levels/firstPuzzle/FirstPuzzle';
import { FIRST_PUZZLE } from '../levels/firstPuzzle/layout';
import { LevelProgress } from '../levels/LevelProgress';

export class MainScene extends Phaser.Scene {
  private sounds: SceneSound | undefined;
  private movementAudio: MovementAudio | undefined;
  private forestPuzzle: ForestPuzzle | undefined;
  private player: PlayablePlayer | undefined;
  private gems: GemSystem | undefined;
  private disconnectInput: (() => void) | undefined;
  private collision: Phaser.Physics.Arcade.Collider | undefined;
  private puzzle: FirstPuzzle | undefined;
  private forest: AncientForest | undefined;
  private effects: PowerEffects | undefined;

  constructor(
    private readonly renderScale: number,
    private readonly onReady: () => void,
    private readonly actions: ActionState = new ActionState(),
    private readonly progress: LevelProgress = new LevelProgress(),
    private readonly level: LevelId = 'forest',
    private readonly run?: RunSession,
    private readonly document?: LevelDocument,
    private readonly audio?: AudioScope,
  ) {
    super('MainScene');
  }

  create(): void {
    const levelDocument =
      this.document ??
      (isForestPuzzle(this.level)
        ? FOREST_PUZZLES[this.level].document
        : undefined);
    configureWorldCamera(
      this,
      this.renderScale,
      levelDocument?.cameraZoom ?? 1,
    );
    this.audio?.reset();
    this.sounds = this.audio ? new SceneSound(this.audio) : undefined;
    this.movementAudio = this.audio ? new MovementAudio(this.audio) : undefined;
    this.forestPuzzle =
      this.document || isForestPuzzle(this.level)
        ? new ForestPuzzle(
            this,
            this.renderScale,
            this.progress,
            this.document
              ? compileLevel(this.document)
              : FOREST_PUZZLES[this.level as keyof typeof FOREST_PUZZLES],
            this.sounds,
          )
        : undefined;
    this.puzzle =
      !this.document && this.level === 'puzzle'
        ? new FirstPuzzle(this, this.renderScale, this.progress, this.sounds)
        : undefined;
    this.forest =
      !this.document && this.level === 'forest'
        ? new AncientForest(this, this.renderScale, this.progress, this.sounds)
        : undefined;
    if (!this.puzzle && !this.forest && !this.forestPuzzle)
      this.progress.publish(null);
    const platforms =
      this.forestPuzzle?.solids ??
      this.forest?.solids ??
      this.puzzle?.solids ??
      createTestLevel(this);
    const spawn = this.forestPuzzle
      ? this.forestPuzzle.layout.spawn
      : this.forest
        ? ANCIENT_FOREST.spawn
        : this.puzzle
          ? FIRST_PUZZLE.spawn
          : TEST_SPAWN;
    const gemLevel: GemLevel = this.forestPuzzle
      ? this.forestPuzzle.layout
      : this.forest
        ? ANCIENT_FOREST
        : this.puzzle
          ? FIRST_PUZZLE
          : TEST_GEMS;
    this.player = new PlayablePlayer(
      this,
      spawn.x,
      spawn.feetY,
      gemLevel.initialElement,
    );
    this.sounds?.listener(spawn.x, spawn.feetY);
    const forms = new Set([
      gemLevel.initialElement,
      ...gemLevel.gems.map((g) => g.element),
    ]);
    const cues: SoundId[] = [
      'gem_collect',
      'coin_collect',
      'mechanism_activate',
      'stone_gate_open',
      'door_close',
      'wall_break',
      'exit_ready',
      'tank_fill',
      'tank_ready',
      'torch_ignite',
      'stone_push',
      'earth_land',
    ];
    for (const form of forms) {
      cues.push(`${form}_step`, `${form}_jump`, `${form}_land`);
      if (form === 'water' || form === 'fire')
        cues.push(`${form}_cast`, `${form}_impact`);
      if (form === 'fire') cues.push('fire_double_jump');
      if (form === 'air') cues.push('air_dash', 'air_glide');
      if (form === 'earth')
        cues.push('earth_swing', 'earth_plunge', 'earth_smash');
    }
    if (this.forest || this.forestPuzzle) cues.push('forest_ambience');
    this.audio?.preload(cues);
    if (this.forest || this.forestPuzzle)
      this.audio?.loop('forest', 'forest_ambience', 0.5);
    this.gems = new GemSystem(this, gemLevel.gems, this.sounds);
    this.collision = this.physics.add.collider(
      this.player.collider,
      platforms,
      undefined,
      playerCollision(this.player.body),
    );
    this.effects = new PowerEffects(
      this,
      platforms,
      this.forestPuzzle,
      this.sounds,
    );
    this.actions.reset();
    this.connectKeyboard();
    this.game.events.on(Phaser.Core.Events.PAUSE, this.suspendInput, this);
    this.game.events.on(Phaser.Core.Events.RESUME, this.connectKeyboard, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.run?.start(gemLevel.initialElement);
    this.onReady();
  }

  update(_time: number, delta: number): void {
    if (this.run?.suspended) return;
    this.run?.tick(this.player?.element ?? 'water');
    const input = this.actions.read();
    // Gameplay transformations are exclusively granted by world gems.
    input.element = undefined;
    if (input.restartPressed) {
      uiAudio.play('ui_restart');
      this.actions.reset();
      this.scene.restart();
      return;
    }
    if (!this.player) return;
    if (this.forestPuzzle?.revealingExit) {
      this.run?.setPresentation(true);
      this.forestPuzzle.advanceExitReveal(delta);
      if (!this.forestPuzzle.revealingExit) this.run?.setPresentation(false);
      return;
    }
    this.sounds?.listener(this.player.body.center.x, this.player.body.bottom);
    const completed =
      this.forestPuzzle?.completed ||
      this.forest?.completed ||
      this.puzzle?.completed;
    if (completed) this.player.stopPowers();
    if (!completed && this.forestPuzzle) {
      this.forestPuzzle.settlePlayerSupport(this.player);
      const control = this.forestPuzzle.controlReflector(
        this.player,
        input,
        delta,
      );
      if (control.blocked) {
        this.player.stopPowers();
        input.direction = 0;
        input.jumpPressed = input.abilityPressed = input.glideHeld = false;
      }
    }
    if (
      !completed &&
      input.abilityPressed &&
      this.forestPuzzle?.interact(this.player)
    )
      input.abilityPressed = false;
    const frame = this.player.update(
      completed
        ? {
            direction: 0,
            jumpPressed: false,
            abilityPressed: false,
            restartPressed: false,
            glideHeld: false,
            element: undefined,
          }
        : input,
      delta,
      !completed &&
        (this.forestPuzzle?.canPush(this.player, input.direction) ?? false),
    );
    this.movementAudio?.update(
      this.player.element,
      this.player.body.center.x,
      completed ? 0 : input.direction,
      frame,
    );
    this.effects?.update(this.player, frame, delta);
    this.gems?.update(this.player, delta, !completed);
    if (
      this.forestPuzzle?.update(this.player, frame, delta) ||
      this.forest?.update(this.player) ||
      this.puzzle?.update(this.player, delta)
    ) {
      uiAudio.play(this.forestPuzzle?.retryCue ?? 'ui_restart');
      this.actions.reset();
      this.scene.restart();
      return;
    }
    this.run?.setPresentation(this.forestPuzzle?.revealingExit ?? false);
    this.run?.tick(this.player.element);
    if (
      this.forestPuzzle?.completed ||
      this.forest?.completed ||
      this.puzzle?.completed
    )
      this.run?.complete(this.forestPuzzle?.collectedCoinIds ?? []);
  }

  private connectKeyboard(): void {
    this.disconnectInput?.();
    this.disconnectInput = gameplayKeyboard(window).connect((action) =>
      this.actions.dispatch(action, 'keyboard'),
    );
  }

  private suspendInput(): void {
    // Native app inactivity can arrive without DOM blur or keyup events.
    this.disconnectInput?.();
    this.disconnectInput = undefined;
    this.actions.reset();
  }

  private cleanup(): void {
    this.run?.setPresentation(false);
    this.audio?.reset();
    this.movementAudio = undefined;
    this.sounds = undefined;
    this.suspendInput();
    this.game.events.off(Phaser.Core.Events.PAUSE, this.suspendInput, this);
    this.game.events.off(Phaser.Core.Events.RESUME, this.connectKeyboard, this);
    this.collision?.destroy();
    this.collision = undefined;
    this.effects?.destroy();
    this.effects = undefined;
    this.gems?.destroy();
    this.gems = undefined;
    this.player?.destroy();
    this.player = undefined;
    this.puzzle?.destroy();
    this.puzzle = undefined;
    this.forestPuzzle?.destroy();
    this.forestPuzzle = undefined;
    this.forest?.destroy();
    this.forest = undefined;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }
}
