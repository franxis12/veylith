import type Phaser from 'phaser';
import type { WorldState } from './WorldState';
import { effectBounds } from './WorldState';
import type { BeamSegment, OpticalMirror } from './advancedRules';
import { traceBeam } from './advancedRules';
import { advancedPath } from '../../assets/advancedArt';
type Body = Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;

export class AdvancedOptics {
  readonly beams: BeamSegment[] = [];
  private readonly view: Phaser.GameObjects.Container;
  private key = '';
  private readonly segments: Phaser.GameObjects.TileSprite[] = [];
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly bodies: Map<string, Phaser.GameObjects.Rectangle>,
    private readonly solids: Phaser.GameObjects.Rectangle[],
  ) {
    this.view = scene.add.container(0, 0).setDepth(1).setName('advanced:beams');
  }
  step(): void {
    const mirrors: OpticalMirror[] = [],
      receivers = [];
    for (const o of this.state.objects) {
      if (o.behavior.kind === 'reflector' && o.collider.enabled) {
        const b = this.bodies.get(o.id)!.body as Body;
        mirrors.push({
          id: o.id,
          center: {
            x: b.left - o.collider.x + o.width / 2,
            y: b.top - o.collider.y + (o.height * 268) / 512,
          },
          halfLength: Math.min(o.width, o.height) * 0.43,
          orientation: o.behavior.orientation,
          angle: this.state.get(o.id).mirrorAngle!,
        });
      }
      if (o.behavior.kind === 'receiver' && o.effect.enabled)
        receivers.push({ ...effectBounds(o), id: o.id });
    }
    const obstacles = this.solids
      .filter(
        (s) =>
          (s.body as Body)?.enable &&
          !s.getData('reflector') &&
          !s.getData('liquid') &&
          !s.getData('directional-open'),
      )
      .map((s) => s.body as Body);
    const hits = new Set<string>();
    this.beams.length = 0;
    for (const o of this.state.objects) {
      if (
        o.behavior.kind !== 'beamEmitter' ||
        !o.effect.enabled ||
        !this.state.get(o.id).active
      )
        continue;
      const e = effectBounds(o),
        b = o.behavior;
      const trace = traceBeam(
        { x: (e.left + e.right) / 2, y: (e.top + e.bottom) / 2 },
        b.direction,
        b.range,
        b.maxBounces,
        mirrors,
        receivers,
        obstacles,
      );
      trace.hits.forEach((id) => hits.add(id));
      if (o.visible) this.beams.push(...trace.segments);
    }
    for (const o of this.state.objects)
      if (o.behavior.kind === 'receiver') {
        const s = this.state.get(o.id);
        s.active =
          o.effect.enabled &&
          (hits.has(o.id) || (o.behavior.latch && s.active));
      }
    const key = JSON.stringify(
      this.beams.map((s) =>
        [s.from.x, s.from.y, s.to.x, s.to.y].map(
          (n) => Math.round(n * 10) / 10,
        ),
      ),
    );
    if (key === this.key) return;
    this.key = key;
    const texture = `world:${advancedPath('reflectors', 'light_beam_horizontal_tile')}`;
    let used = 0;
    for (const { from, to } of this.beams) {
      if (!this.scene.textures.exists(texture)) break;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length < 0.01) continue;
      let sprite = this.segments[used];
      if (!sprite) {
        sprite = this.scene.add
          .tileSprite(0, 0, 1, 64, texture)
          .setTileScale(0.25);
        this.segments.push(sprite);
        this.view.add(sprite);
      }
      // Reuse the bounded segment pool during continuous aiming instead of allocating every frame.
      sprite
        .setVisible(true)
        .setPosition((from.x + to.x) / 2, (from.y + to.y) / 2)
        .setSize(length, 64)
        .setRotation(Math.atan2(to.y - from.y, to.x - from.x));
      used++;
    }
    for (let i = used; i < this.segments.length; i++)
      this.segments[i]!.setVisible(false);
  }
  destroy(): void {
    this.view.destroy();
    this.segments.length = 0;
  }
}
