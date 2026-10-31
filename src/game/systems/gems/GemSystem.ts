import type Phaser from 'phaser';
import type { SceneSound } from '../audio/SceneSound';
import { GEM_SHEETS, gemKey } from '../../assets/gemSheets';
import type { GemAction } from '../../assets/gemSheets';
import { ELEMENT_CONFIG } from '../../config/elements';
import type { PlayablePlayer } from '../../entities/player/PlayablePlayer';
import type { GemPlacement } from '../../levels/gems';
import { GemState } from './GemState';
import { TransformationEffect } from './TransformationEffect';

type Visual = Phaser.GameObjects.Sprite | Phaser.GameObjects.Polygon;
interface GemView {
  visual: Visual;
  phase: GemAction;
  remaining: number;
}

export class GemSystem {
  private readonly state: GemState;
  private readonly views = new Map<string, GemView>();
  private readonly transformation: TransformationEffect;

  constructor(
    private readonly scene: Phaser.Scene,
    placements: readonly GemPlacement[],
    private readonly audio?: SceneSound,
  ) {
    this.state = new GemState(placements);
    this.transformation = new TransformationEffect(scene);
    for (const gem of placements) this.show(gem, 'spawn');
  }

  update(player: PlayablePlayer, deltaMs: number, enabled = true): void {
    const elapsed = Math.max(0, deltaMs);
    this.transformation.update(player, elapsed);
    for (const gem of this.state.placements) {
      const view = this.views.get(gem.id);
      if (!view || view.phase === 'idle') continue;
      view.remaining -= elapsed;
      if (view.remaining > 0) {
        if (view.phase === 'collect')
          view.visual.setAlpha(Math.min(1, view.remaining / 180));
        continue;
      }
      view.visual.destroy();
      this.views.delete(gem.id);
      if (!this.state.isCollected(gem.id)) this.show(gem, 'idle');
    }
    if (!enabled) return;
    for (const gem of this.state.collect(player.body)) {
      // Marked consumed before any animation or callback: repeated overlaps are harmless.
      this.audio?.at('gem_collect', gem.x, gem.y);
      player.transform(gem.element);
      this.show(gem, 'collect');
      this.transformation.play(gem.element, player);
    }
  }

  private show(gem: GemPlacement, phase: GemAction): void {
    this.views.get(gem.id)?.visual.destroy();
    const key = gemKey(gem.element, phase);
    const idle = gemKey(gem.element, 'idle');
    const available = this.scene.anims.exists(key)
      ? key
      : this.scene.anims.exists(idle)
        ? idle
        : undefined;
    const visual: Visual = available
      ? this.scene.add
          .sprite(gem.x, gem.y, available)
          .setDisplaySize(gem.view?.width ?? 104, gem.view?.height ?? 104)
          .play(available)
      : this.scene.add
          .polygon(
            gem.x,
            gem.y,
            [22, 0, 44, 40, 22, 80, 0, 40],
            Number.parseInt(ELEMENT_CONFIG[gem.element].color.slice(1), 16),
          )
          .setStrokeStyle(2, 0xffffff);
    visual
      .setName(`gem:${gem.id}`)
      .setDepth(gem.view?.layer ?? 3)
      .setVisible(gem.view?.visible ?? true);
    const sheet = GEM_SHEETS.find(
      (entry) => entry.element === gem.element && entry.action === phase,
    )!;
    this.views.set(gem.id, {
      visual,
      phase,
      remaining: (1000 * sheet.frames) / sheet.fps,
    });
  }

  destroy(): void {
    for (const view of this.views.values()) view.visual.destroy();
    this.views.clear();
    this.transformation.destroy();
  }
}
