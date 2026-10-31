import { localizeGameText } from '../../../services/i18n/localizeGameText';
import type Phaser from 'phaser';
import type { SceneSound } from '../../systems/audio/SceneSound';
import { FOREST_ASSETS, forestTexture } from '../../assets/forestAssets';
import type { ForestAsset } from '../../assets/forestAssets';
import { GAME_SETTINGS } from '../../config/settings';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { LevelProgress } from '../LevelProgress';
import { ANCIENT_FOREST } from './layout';
import { createForestSurface } from './ForestTerrain';
import { ForestBackdrop } from './ForestBackdrop';
import { ForestState } from './ForestState';
import { createForestAnimatedProps } from './ForestAnimatedProps';

export class AncientForest {
  readonly solids: Phaser.GameObjects.Rectangle[];
  private readonly state = new ForestState();
  private readonly backdrop: ForestBackdrop;
  private readonly animatedProps: Phaser.GameObjects.GameObject[];

  constructor(
    private readonly scene: Phaser.Scene,
    renderScale: number,
    private readonly progress: LevelProgress,
    private readonly audio?: SceneSound,
  ) {
    scene.physics.world.setBounds(
      0,
      0,
      ANCIENT_FOREST.width,
      ANCIENT_FOREST.height,
    );
    scene.cameras.main.setBounds(
      0,
      0,
      ANCIENT_FOREST.width,
      GAME_SETTINGS.height,
    );
    this.follow(ANCIENT_FOREST.spawn.x);
    this.backdrop = new ForestBackdrop(scene.cameras.main, scene);
    this.solids = ANCIENT_FOREST.surfaces.map((surface) =>
      createForestSurface(scene, surface),
    );
    // Props have no collision or puzzle behavior; their animations are cosmetic.
    for (const [asset, x, feet, scale] of [
      ['column', 70, 650, 0.7],
      ['fern', 360, 650, 0.6],
      ['flowers', 480, 650, 0.5],
      ['grass', 690, 594, 0.5],
      ['mushrooms', 970, 494, 0.45],
      ['pillar', 1550, 650, 0.65],
      ['roots', 1740, 650, 0.5],
      ['fern', 2450, 370, 0.5],
      ['grass', 2820, 370, 0.55],
      ['column', 4220, 650, 0.7],
      ['block', 4490, 650, 0.65],
      ['plate', 4670, 650, 0.3],
      ['fern', 5780, 650, 0.7],
    ] as const)
      this.prop(asset, x, feet, scale);
    this.audio?.scope.preload([
      'lake_ambience',
      'stone_gate_open',
      'door_close',
    ]);
    this.animatedProps = createForestAnimatedProps(scene, audio);
    for (const [x, y, label] of [
      [340, 370, '01 · EL SENDERO\nSalta entre las cornisas'],
      [1910, 205, '02 · GEMA DE FUEGO\nRecógela y salta dos veces'],
      [2860, 170, '03 · GEMA DE AIRE →\nRecógela, salta y mantén Jump'],
      [4780, 280, 'RUINAS ANTIGUAS\nReliquias inactivas'],
      [ANCIENT_FOREST.exit.x, 280, 'SALIDA'],
    ] as const)
      localizeGameText(
        scene.add
          .text(x, y, label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '21px',
            color: '#f5f4d5',
            align: 'center',
            backgroundColor: '#173c40d9',
            padding: { x: 12, y: 8 },
          })
          .setOrigin(0.5)
          .setDepth(2)
          .setResolution(renderScale),
        label,
      );
    this.progress.publish(this.state.snapshot);
  }

  get completed(): boolean {
    return this.state.snapshot.phase === 'complete';
  }

  update(player: PlayablePlayer): boolean {
    this.audio?.loop('legacy:water', 'lake_ambience', 4900, 650, true, 0.6);
    this.follow(player.body.center.x);
    this.backdrop.update();
    const retry = this.state.update({
      x: player.body.center.x,
      feetY: player.body.bottom,
      grounded:
        (player.body.blocked.down || player.body.touching.down) &&
        player.body.velocity.y >= 0,
    });
    this.progress.publish(this.state.snapshot);
    return retry;
  }

  private follow(x: number): void {
    this.scene.cameras.main.centerOn(x + 180, GAME_SETTINGS.height / 2);
  }

  private prop(
    asset: ForestAsset,
    x: number,
    feetY: number,
    scale: number,
  ): void {
    const source = FOREST_ASSETS[asset];
    this.scene.add
      .image(x, feetY, forestTexture(asset))
      .setOrigin(0.5, source.bounds[3] / source.height)
      .setScale(scale)
      .setDepth(-2)
      .setName(`forest-prop:${asset}`);
  }

  destroy(): void {
    this.backdrop.destroy();
    for (const prop of this.animatedProps.splice(0)) prop.destroy();
    this.progress.publish(null);
    // Phaser owns and clears terrain, prop, text and static-body display objects on shutdown.
  }
}
