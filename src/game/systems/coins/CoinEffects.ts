import type Phaser from 'phaser';
import { coinAnimation, COIN_SHEETS } from '../../assets/coinAsset';
import type { CoinObject } from './CoinState';

/** One short effect per confirmed pickup, capped independently of coin count. */
export class CoinEffects {
  private readonly bursts: {
    sprite: Phaser.GameObjects.Sprite;
    remaining: number;
  }[] = [];
  constructor(private readonly scene: Phaser.Scene) {}
  collect(coin: CoinObject): void {
    const key = coinAnimation('collect');
    if (!coin.visible || !this.scene.anims.exists(key)) return;
    if (this.bursts.length >= 16) this.bursts.shift()!.sprite.destroy();
    const sprite = this.scene.add
      .sprite(coin.x + coin.width / 2, coin.y + coin.height / 2, key)
      .setName(key)
      .setDepth(coin.layer + 1)
      .setDisplaySize(coin.width * 2, coin.height * 2)
      .play(key);
    this.bursts.push({
      sprite,
      remaining:
        (1000 * COIN_SHEETS.collect.frames) / COIN_SHEETS.collect.fps + 50,
    });
  }
  update(deltaMs: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]!;
      burst.remaining -= Math.max(0, deltaMs);
      if (burst.remaining <= 0) {
        burst.sprite.destroy();
        this.bursts.splice(i, 1);
      }
    }
  }
  destroy(): void {
    for (const burst of this.bursts) burst.sprite.destroy();
    this.bursts.length = 0;
  }
}
