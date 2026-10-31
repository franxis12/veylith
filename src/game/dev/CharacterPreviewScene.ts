import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/settings';
import { PLAYER_VISUAL_HEIGHT } from '../config/elements';
import { configureWorldCamera } from '../core/WorldCamera';
import { Player } from '../entities/player/Player';
import { elementPreviewKeyboard } from './elementPreviewKeyboard';
import type {
  PreviewBridge,
  PreviewCommand,
  PreviewSnapshot,
} from './previewBridge';

export class CharacterPreviewScene extends Phaser.Scene {
  private player: Player | undefined;
  private disconnect: (() => void) | undefined;
  private disconnectKeyboard: (() => void) | undefined;
  private mode: PreviewSnapshot['mode'] = 'default';
  private afterOnce: PreviewSnapshot['afterOnce'] = 'hold';
  private paused = false;
  private completed = false;
  private error: string | null = null;

  constructor(
    private readonly renderScale: number,
    private readonly onReady: () => void,
    private readonly bridge: PreviewBridge,
  ) {
    super('CharacterPreviewScene');
  }

  create(): void {
    configureWorldCamera(this, this.renderScale);
    const { width, height } = GAME_SETTINGS;
    const baseline = height / 2 + PLAYER_VISUAL_HEIGHT / 2;
    this.add
      .text(width / 2, 92, 'ELEMENTS', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#edf5f6',
      })
      .setOrigin(0.5)
      .setResolution(this.renderScale);
    this.add
      .text(width / 2, 132, 'Character preview · animation only', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#8fc6bf',
      })
      .setOrigin(0.5)
      .setResolution(this.renderScale);
    this.add
      .rectangle(
        width / 2,
        baseline - PLAYER_VISUAL_HEIGHT / 2,
        250,
        PLAYER_VISUAL_HEIGHT,
      )
      .setStrokeStyle(1, 0x2b414d);
    this.add
      .line(
        0,
        0,
        width / 2 - 230,
        baseline,
        width / 2 + 230,
        baseline,
        0x64858c,
      )
      .setOrigin(0);
    this.add
      .line(
        0,
        0,
        width / 2,
        baseline - PLAYER_VISUAL_HEIGHT - 20,
        width / 2,
        baseline + 20,
        0x2b414d,
      )
      .setOrigin(0);
    this.player = new Player(
      this,
      width / 2,
      baseline,
      this.onAnimationComplete,
    );
    this.disconnect = this.bridge.connect(this.handleCommand);
    this.disconnectKeyboard = elementPreviewKeyboard(window).connect((action) =>
      this.handleCommand({ type: 'input', action }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.publish();
    this.onReady();
  }

  private handleCommand = (command: PreviewCommand): void => {
    const player = this.player;
    if (!player) return;
    this.error = null;
    switch (command.type) {
      case 'input':
        if (command.action.type !== 'switch_element') return;
        if (!player.setElement(command.action.element))
          this.error = 'This element could not be loaded.';
        this.mode = 'default';
        this.paused = false;
        this.completed = false;
        break;
      case 'animation':
        this.play(command.action);
        break;
      case 'mode':
        this.mode = command.mode;
        this.play(player.animation);
        break;
      case 'after_once':
        this.afterOnce = command.value;
        break;
      case 'facing':
        player.setFacing(command.facing);
        break;
      case 'pause_animation':
        this.paused = command.paused;
        player.setAnimationPaused(command.paused);
        break;
      case 'replay':
        this.play(player.animation);
        break;
    }
    this.publish();
  };

  private play(action: PreviewSnapshot['animation']): void {
    if (!this.player?.playAnimation(action, this.mode)) {
      this.error = `Animation unavailable: ${this.player?.element}:${action}`;
      return;
    }
    this.paused = false;
    this.completed = false;
  }

  private onAnimationComplete = (): void => {
    this.completed = true;
    if (this.afterOnce === 'idle' && this.player?.animation !== 'idle') {
      this.player?.playAnimation('idle');
      this.mode = 'default';
      this.completed = false;
    }
    this.publish();
  };

  private publish(): void {
    if (!this.player) return;
    this.bridge.publish({
      element: this.player.element,
      animation: this.player.animation,
      facing: this.player.facing,
      mode: this.mode,
      afterOnce: this.afterOnce,
      paused: this.paused,
      completed: this.completed,
      error: this.error,
    });
  }

  private cleanup(): void {
    this.disconnect?.();
    this.disconnectKeyboard?.();
    this.player?.destroy();
    this.player = undefined;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }
}
