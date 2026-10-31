import { showExitSeal } from '../schema/renderExit';
import { ExitReveal, EXIT_REVEAL } from '../../systems/exit/ExitReveal';
import { readPlayerCollision } from '../../systems/world/mechanismCollision';
import { playerCollisionFaces } from '../schema/playerCollision';
import type { InputFrame } from '../../systems/input/ActionState';
import { CoinEffects } from '../../systems/coins/CoinEffects';
import { animateDoor } from '../schema/animateObject';
import type { SceneSound } from '../../systems/audio/SceneSound';
import { WorldSystem } from '../../systems/world/WorldSystem';
import type Phaser from 'phaser';
import { FOREST_ASSETS, forestTexture } from '../../assets/forestAssets';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import { GAME_SETTINGS } from '../../config/settings';
import type { PowerInteractions } from '../../systems/powers/PowerEffects';
import type { LevelProgress } from '../LevelProgress';
import { ForestBackdrop } from '../ancientForest/ForestBackdrop';
import { HeavyBlock } from './HeavyBlock';
import { BlockStackTransport } from './BlockStackTransport';
import { blockSupportsPlayer } from './heavyBlockRules';
import { ForestPuzzleState } from './ForestPuzzleState';
import type { ForestPuzzleLayout } from './layouts';
import { colliderBounds } from '../schema/types';
import { renderObject } from '../schema/renderObject';

/** The game and editor render the same document. Only this adapter creates live physics. */
export class ForestPuzzle implements PowerInteractions {
  private readonly world: WorldSystem;
  private readonly coinEffects: CoinEffects;
  readonly solids: Phaser.GameObjects.Rectangle[] = [];
  private readonly state: ForestPuzzleState;
  private readonly backdrop: ForestBackdrop;
  private readonly bodies = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly views = new Map<string, Phaser.GameObjects.Container>();
  private lastSolved = '';
  private readonly exitReady = new Map<string, boolean>();
  private readonly revealQueue: string[] = [];
  private reveal: ExitReveal | undefined;
  private pausedForReveal = false;
  get revealingExit(): boolean {
    return !!this.reveal;
  }
  advanceExitReveal(deltaMs: number): void {
    if (!this.reveal) return;
    const frame = this.reveal.update(deltaMs);
    this.scene.cameras.main
      .setZoom(frame.pose.zoom)
      .centerOn(frame.pose.x, frame.pose.y);
    if (frame.breakSeal) {
      const view = this.views.get(this.reveal.id);
      if (view) showExitSeal(view, 'break');
    }
    this.backdrop.update();
    if (frame.done) {
      this.reveal = undefined;
      this.startNextReveal();
      if (!this.reveal && this.pausedForReveal) {
        this.scene.physics.world.resume();
        this.pausedForReveal = false;
      }
    }
  }
  private startNextReveal(): void {
    if (this.reveal) return;
    const id = this.revealQueue.shift();
    if (!id) return;
    const object = this.layout.document.objects.find((o) => o.id === id)!;
    const camera = this.scene.cameras.main;
    this.reveal = new ExitReveal(
      id,
      { x: camera.midPoint.x, y: camera.midPoint.y, zoom: camera.zoom },
      {
        x: object.x + object.width / 2,
        y: object.y + object.height / 2,
        zoom: camera.zoom * EXIT_REVEAL.zoom,
      },
    );
    if (!this.scene.physics.world.isPaused) {
      this.scene.physics.world.pause();
      this.pausedForReveal = true;
    }
  }
  private readonly heavyBlocks: HeavyBlock[] = [];
  private readonly blockStacks: BlockStackTransport;
  constructor(
    private readonly scene: Phaser.Scene,
    _renderScale: number,
    private readonly progress: LevelProgress,
    readonly layout: ForestPuzzleLayout,
    private readonly audio?: SceneSound,
  ) {
    this.state = new ForestPuzzleState(layout);
    this.coinEffects = new CoinEffects(scene);
    scene.physics.world.setBounds(0, 0, layout.width, layout.height);
    scene.cameras.main.setBounds(0, 0, layout.width, layout.height);
    this.follow(layout.spawn.x, layout.spawn.feetY);
    this.backdrop = new ForestBackdrop(
      scene.cameras.main,
      scene,
      layout.document.background,
    );
    for (const object of layout.document.objects) {
      if (
        object.type === 'gem' ||
        object.type === 'spawn' ||
        object.type === 'crossing'
      )
        continue;
      const view = renderObject(scene, object);
      this.views.set(object.id, view);
      if (object.type === 'block') {
        const block = new HeavyBlock(scene, object, view, audio);
        this.heavyBlocks.push(block);
        this.solids.push(block.collider);
        this.bodies.set(object.id, block.collider);
        continue;
      }
      if (
        [
          'terrain',
          'platform',
          'decoration',
          'door',
          'plate',
          'wall',
          'boxCollider',
        ].includes(object.type)
      ) {
        const b = colliderBounds(object);
        const solid = scene.add
          .rectangle(
            (b.left + b.right) / 2,
            (b.top + b.bottom) / 2,
            object.collider.width,
            object.collider.height,
          )
          .setVisible(false)
          .setName(object.id)
          .setData('breakable', object.type === 'wall')
          .setData('player-collision', playerCollisionFaces(object));
        scene.physics.add.existing(solid, true);
        (solid.body as Phaser.Physics.Arcade.StaticBody).enable = b.enable;
        if (object.type !== 'plate') this.solids.push(solid);
        this.bodies.set(object.id, solid);
      }
    }
    this.world = new WorldSystem(
      scene,
      layout.document,
      this.solids,
      this.views,
      this.state,
      audio,
    );
    const blocks = new Set(this.heavyBlocks.map((b) => b.collider));
    const terrain = this.solids.filter((s) => !blocks.has(s));
    const plates = layout.document.objects
      .filter((o) => o.type === 'plate')
      .map((o) => this.bodies.get(o.id)!);
    this.heavyBlocks.forEach((block, index) => {
      block.collideWith([
        ...terrain,
        ...plates,
        // Each block pair separates once per physics step, independent of ID.
        ...this.heavyBlocks.slice(index + 1).map((b) => b.collider),
      ]);
    });
    this.blockStacks = new BlockStackTransport(
      scene.physics.world,
      this.heavyBlocks.map((b) => b.body),
      this.solids,
    );
    this.sync();
  }
  get retryCue() {
    return this.world.retryCue;
  }
  get completed(): boolean {
    return this.state.snapshot.phase === 'complete';
  }
  get collectedCoinIds(): readonly string[] {
    return this.state.coins.ids;
  }
  targets(): ReturnType<PowerInteractions['targets']> {
    return [
      ...this.world.targets(),
      ...this.layout.targets.map((t) => ({
        ...t.bounds,
        id: t.id,
        enable: t.bounds.enable && !this.state.isSolved(t.id),
      })),
    ];
  }
  hit(id: string, element: 'water' | 'fire'): void {
    this.world.hit(id, element);
    const before = this.state.targetHits(id);
    this.state.hitTarget(id, element);
    const target = this.layout.targets.find((t) => t.id === id);
    if (target && this.state.targetHits(id) > before) {
      const x = (target.bounds.left + target.bounds.right) / 2,
        y = target.bounds.bottom;
      if (target.kind === 'tank')
        this.audio?.at(
          this.state.isSolved(id) ? 'tank_ready' : 'tank_fill',
          x,
          y,
          0.7,
        );
      else if (this.state.isSolved(id))
        this.audio?.at('torch_ignite', x, y, 0.8);
    }
    this.sync();
  }
  strike(id: string): void {
    this.world.strike(id);
    const broken = this.state.isSolved(id);
    this.state.breakWall(id);
    const object = this.layout.document.objects.find((o) => o.id === id);
    if (object && !broken && this.state.isSolved(id))
      this.audio?.at('wall_break', object.x, object.y);
    this.sync();
  }
  settlePlayerSupport(player: PlayablePlayer): void {
    this.blockStacks.setPlayer(player.body);
    const p = player.body;
    for (const block of this.heavyBlocks) {
      if (!readPlayerCollision(block.collider).top) continue;
      const b = block.body;
      const supported =
        b.immovable ||
        ((b.blocked.down || b.touching.down) && b.velocity.y === 0);
      if (!blockSupportsPlayer(p, p.velocity.y, b, supported)) continue;
      // Reconcile only the subpixel contact tolerance before reading jump input.
      p.position.y = b.top - p.height;
      p.updateCenter();
      p.setVelocityY(0);
      p.blocked.down = true;
      p.blocked.none = false;
      break;
    }
  }
  controlReflector(player: PlayablePlayer, input: InputFrame, delta: number) {
    const b = player.body;
    return this.world.reflectors.update(
      b,
      (b.blocked.down || b.touching.down) && b.velocity.y >= 0,
      input,
      delta,
    );
  }
  interact(player: PlayablePlayer): boolean {
    return this.world.interact(player);
  }
  canPush(player: PlayablePlayer, direction: number): boolean {
    return (
      this.heavyBlocks.some((block) =>
        block.canPush(player, direction, this.state),
      ) || this.world.canPush(player, direction)
    );
  }
  update(
    player: PlayablePlayer,
    frame: ReturnType<PlayablePlayer['update']>,
    deltaMs = 0,
  ): boolean {
    this.coinEffects.update(deltaMs);
    if (this.world.update(player, deltaMs)) return true;
    const body = player.body,
      grounded =
        (body.blocked.down || body.touching.down) && body.velocity.y >= 0;
    let blockLost = false;
    for (const block of this.heavyBlocks) {
      if (block.update(player, this.state, this.layout.fallLimit))
        blockLost = true;
    }
    if (!blockLost && body.bottom < this.layout.fallLimit)
      for (const coin of this.state.collectCoins(body)) {
        this.audio?.at('coin_collect', body.center.x, body.bottom, 0.8);
        this.views.get(coin.id)?.setVisible(false);
        this.coinEffects.collect(coin);
      }
    const observation = {
      x: body.center.x,
      feetY: body.bottom,
      grounded,
      element: player.element,
      gliding: frame.gliding,
    };
    // Resolve newly satisfied prerequisites before permitting a victory under
    // an already-overlapping player. Presentation must finish first.
    const retry = this.state.update(observation, false);
    this.follow(body.center.x, body.bottom);
    this.backdrop.update();
    this.sync();
    if (!this.revealingExit) {
      this.state.update(observation);
      this.sync();
    }
    return retry || blockLost;
  }
  private sync(): void {
    const snapshot = this.state.snapshot,
      key = JSON.stringify([
        snapshot,
        this.layout.document.objects
          .filter((o) => o.type === 'exit')
          .map((o) => o.requires.every((id) => this.state.isSolved(id))),
      ]);
    this.progress.publish({
      ...snapshot,
      reflector: this.world.reflectors.snapshot,
    });
    if (key === this.lastSolved) return;
    this.lastSolved = key;
    for (const target of this.layout.targets) {
      const solved = this.state.isSolved(target.id),
        view = this.views.get(target.id);
      (
        view?.getByName('art') as Phaser.GameObjects.Image | undefined
      )?.setTexture(
        forestTexture(
          target.kind === 'tank'
            ? solved
              ? view?.getByName('water')
                ? 'tank'
                : 'tankFull'
              : 'tank'
            : solved
              ? 'torchLit'
              : 'torch',
        ),
      );
      (
        view?.getByName('water') as Phaser.GameObjects.Sprite | undefined
      )?.setVisible(solved);
      (
        view?.getByName('flame') as Phaser.GameObjects.Image | undefined
      )?.setVisible(solved);
    }
    for (const gate of this.layout.gates) {
      const open = this.state.gateOpen(gate.id),
        body = this.bodies.get(gate.id),
        object = this.layout.document.objects.find((o) => o.id === gate.id)!;
      this.audio?.changed(
        `gate:${gate.id}`,
        open,
        'stone_gate_open',
        'door_close',
        object.x,
        object.y,
      );
      if (body)
        (body.body as Phaser.Physics.Arcade.StaticBody).enable =
          object.collider.enabled && !open;
      const view = this.views.get(gate.id);
      if (view) animateDoor(view, open);
    }
    if (this.layout.wall && this.state.isSolved(this.layout.wall.id)) {
      const id = this.layout.wall.id,
        body = this.bodies.get(id);
      if (body) (body.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      const object = this.layout.document.objects.find((o) => o.id === id)!;
      const art = this.views.get(id)?.getByName('art') as
        Phaser.GameObjects.Image | undefined;
      const asset = FOREST_ASSETS.wallBroken;
      art
        ?.setTexture(forestTexture('wallBroken'))
        .setOrigin(0.5, asset.bounds[3] / asset.height)
        .setPosition(object.width / 2, object.height)
        .setScale(0.35);
    }
    for (const object of this.layout.document.objects) {
      if (object.type === 'plate') {
        if (this.state.isSolved(object.id))
          (
            this.views.get(object.id)?.getByName('art') as
              Phaser.GameObjects.Image | undefined
          )?.setTexture(forestTexture('plateActive'));
        this.audio?.changed(
          `plate:${object.id}`,
          this.state.isSolved(object.id),
          'mechanism_activate',
          undefined,
          object.x,
          object.y,
        );
      }
      if (object.type === 'exit') {
        this.audio?.changed(
          `exit:${object.id}`,
          object.requires.every((id) => this.state.isSolved(id)),
          'exit_ready',
          undefined,
          object.x,
          object.y,
        );
        const ready = object.requires.every((id) => this.state.isSolved(id));
        const previous = this.exitReady.get(object.id);
        const view = this.views.get(object.id)!;
        if (previous === undefined) showExitSeal(view, ready ? 'open' : 'idle');
        else if (ready !== previous) {
          if (ready) this.revealQueue.push(object.id);
          else showExitSeal(view, 'activate');
        }
        this.exitReady.set(object.id, ready);
      }
    }
    this.startNextReveal();
  }
  private follow(x: number, feet: number): void {
    if (this.revealingExit) return;
    const zoom = this.layout.document.cameraZoom ?? 1;
    this.scene.cameras.main.centerOn(
      x + 180 / zoom,
      Math.max(GAME_SETTINGS.height / (2 * zoom), feet - 290 / zoom),
    );
  }
  destroy(): void {
    this.reveal = undefined;
    this.revealQueue.length = 0;
    if (this.pausedForReveal) this.scene.physics.world?.resume();
    this.pausedForReveal = false;
    this.blockStacks.destroy();
    this.world.destroy();
    this.coinEffects.destroy();
    for (const block of this.heavyBlocks) block.destroy();
    this.backdrop.destroy();
    this.progress.publish(null);
  }
}
