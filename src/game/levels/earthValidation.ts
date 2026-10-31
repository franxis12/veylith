import { PLAYER_BODY } from '../config/elements';
import { colliderBounds } from './schema/types';
import type { LevelDocument } from './schema/types';
import { validateLevel } from './schema/validate';
import { compileLevel } from './schema/compile';
import { ForestPuzzleState } from './forestPuzzles/ForestPuzzleState';
import { WorldState, overlaps } from '../systems/world/WorldState';
import type { Rect } from '../systems/world/WorldState';
import { MOVEMENT } from '../entities/player/PlayerMotor';
import { sourceBehavior } from '../systems/world/types';

/** Campaign design audit, separate from the general editor schema.
 * Surface reachability is optimistic: it catches impossible rises/isolated exits,
 * but ignores signal order, headroom and timing. Browser witnesses test those.
 */
export function auditEarthPuzzle(doc: LevelDocument): string[] {
  const errors = validateLevel(doc);
  if (errors.length) return errors;
  const layout = compileLevel(doc);
  if (
    layout.initialElement !== 'earth' ||
    layout.gems.length ||
    layout.targets.length ||
    layout.crossing
  )
    errors.push(
      'Earth chapter must use Earth without transformation or elemental targets.',
    );
  if (!doc.puzzle || doc.puzzle.hints.length < 2)
    errors.push('Missing gradual optional clues.');
  const sources = doc.objects.filter((o) => o.type === 'world');
  if (
    sources.some(
      (o) =>
        ['boiler', 'waterwheel'].includes(o.behavior.kind) ||
        (o.behavior.kind === 'switch' && o.behavior.trigger !== 'interact'),
    )
  )
    errors.push('Mechanism requires an unavailable element.');
  const world = new WorldState(sources),
    puzzle = new ForestPuzzleState(layout);
  for (const o of sources)
    if (sourceBehavior(o.behavior))
      puzzle.setWorldSignal(o.id, world.get(o.id).active);
  for (const exit of layout.exits) {
    if (
      !exit.requires.length ||
      exit.requires.every((id) => puzzle.isSolved(id))
    )
      errors.push('Exit must start locked by an unsolved signal.');
  }
  const needed = new Set(layout.exits.flatMap((exit) => [...exit.requires]));
  for (const o of sources)
    if ('requires' in o.behavior)
      for (const id of o.behavior.requires) needed.add(id);
  for (const o of sources)
    if (needed.has(o.id) && sourceBehavior(o.behavior)) {
      const enabled =
        o.behavior.kind === 'breakable' ? o.collider.enabled : o.effect.enabled;
      if (!enabled) errors.push(`${o.id}: required signal source is disabled.`);
    }
  for (const o of doc.objects)
    if (o.collider.enabled) {
      const b = colliderBounds(o);
      if (
        b.left < 0 ||
        b.right > doc.width ||
        b.top < 0 ||
        b.bottom > doc.height
      )
        errors.push(`${o.id}: collider extends outside the world.`);
    }
  const terrain = doc.objects
    .filter(
      (o) =>
        ['terrain', 'platform', 'boxCollider'].includes(o.type) &&
        o.collider.enabled &&
        o.collider.playerCollision?.top !== false,
    )
    .map(colliderBounds);
  const player = {
    left: layout.spawn.x - PLAYER_BODY.width / 2,
    right: layout.spawn.x + PLAYER_BODY.width / 2,
    top: layout.spawn.feetY - PLAYER_BODY.height,
    bottom: layout.spawn.feetY,
  };
  for (const solid of terrain)
    if (overlaps(player, solid, 0.1)) errors.push('Spawn intersects terrain.');
  const supports = (p: { x: number; feetY: number }, nodes: Rect[]) =>
    nodes.findIndex(
      (n) =>
        p.x > n.left + 30 &&
        p.x < n.right - 30 &&
        Math.abs(p.feetY - n.top) < 2,
    );
  if (supports(layout.spawn, terrain) < 0)
    errors.push('Spawn lacks safe terrain support.');
  for (const exit of layout.exits)
    if (supports(exit, terrain) < 0)
      errors.push('Exit lacks permanent support.');
  const nodes: Rect[] = [...terrain],
    rides: [number, number][] = [];
  for (const o of doc.objects) {
    if (!o.collider.enabled) continue;
    if (o.type === 'block') {
      nodes.push(colliderBounds(o));
      const plate = doc.objects.find((p) => p.id === o.plateId);
      if (plate) {
        const p = colliderBounds(plate);
        nodes.push({
          left: p.left,
          right: p.right,
          top: p.top - o.collider.height,
          bottom: p.top,
        });
      }
    }
    if (o.type !== 'world') continue;
    const b = o.behavior,
      start = colliderBounds(o);
    if (['phasePlatform', 'conveyor', 'reflector', 'bridge'].includes(b.kind))
      nodes.push(start);
    if (b.kind === 'elevator' || b.kind === 'pulley') {
      const dx = b.kind === 'elevator' ? b.travelX : 0;
      const end = {
        left: start.left + dx,
        right: start.right + dx,
        top: start.top + b.travelY,
        bottom: start.bottom + b.travelY,
      };
      rides.push([nodes.length, nodes.length + 1]);
      nodes.push(start, end);
      const sweep = {
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
      };
      for (const solid of terrain) {
        // Slight initial embedding in a floor is not a safe track either.
        if (overlaps(sweep, solid, 0.1))
          errors.push(`${o.id}: motion corridor intersects permanent terrain.`);
      }
      if (b.kind === 'pulley') {
        const counter = doc.objects.find((w) => w.id === b.counterweightId);
        if (counter) {
          const c = colliderBounds(counter),
            shifted = {
              ...c,
              top: c.top - b.travelY,
              bottom: c.bottom - b.travelY,
            };
          rides.push([nodes.length, nodes.length + 1]);
          nodes.push(c, shifted);
          const swept = {
            left: c.left,
            right: c.right,
            top: Math.min(c.top, shifted.top),
            bottom: Math.max(c.bottom, shifted.bottom),
          };
          if (terrain.some((s) => overlaps(swept, s, 0.1)))
            errors.push(
              `${counter.id}: counterweight track intersects terrain.`,
            );
        }
      }
    }
  }
  const start = supports(layout.spawn, nodes),
    visited = new Set([start]),
    pending = [start];
  while (pending.length) {
    const i = pending.pop()!,
      a = nodes[i];
    if (!a) continue;
    nodes.forEach((b, j) => {
      const gap = Math.max(0, b.left - a.right, a.left - b.right);
      const ride = rides.some(
        ([u, v]) => (u === i && v === j) || (v === i && u === j),
      );
      if (
        !visited.has(j) &&
        (ride ||
          (a.top - b.top <=
            MOVEMENT.earthJump ** 2 / (2 * MOVEMENT.gravity) - 6 &&
            gap <=
              MOVEMENT.earthSpeed *
                (MOVEMENT.earthJump / MOVEMENT.gravity +
                  Math.sqrt(
                    (2 *
                      Math.max(
                        0,
                        MOVEMENT.earthJump ** 2 / (2 * MOVEMENT.gravity) +
                          b.top -
                          a.top,
                      )) /
                      MOVEMENT.earthFallGravity,
                  )) +
                PLAYER_BODY.width))
      ) {
        visited.add(j);
        pending.push(j);
      }
    });
  }
  for (const exit of layout.exits)
    if (!visited.has(supports(exit, nodes)))
      errors.push('No optimistic Earth surface route to exit.');
  return errors;
}
