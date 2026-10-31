import type { ForestPuzzleLayout } from '../forestPuzzles/layouts';
import { colliderBounds } from './types';
import type { LevelDocument, LevelObject } from './types';
import { parseLevel, isMechanism } from './validate';
export function compileLevel(input: LevelDocument): ForestPuzzleLayout {
  const doc = parseLevel(input);
  const spawn = doc.objects.find((o) => o.type === 'spawn')! as Extract<
    LevelObject,
    { type: 'spawn' }
  >;
  const wall = doc.objects.find((o) => o.type === 'wall');
  const crossing = doc.objects.find((o) => o.type === 'crossing');
  const exits = doc.objects
    .filter((o) => o.type === 'exit')
    .map((o) => {
      const b = colliderBounds(o);
      return {
        x: (b.left + b.right) / 2,
        feetY: (b.top + b.bottom) / 2,
        halfWidth: o.collider.width / 2,
        tolerance: o.collider.height / 2,
        requires: o.type === 'exit' ? o.requires : [],
      };
    });
  const result: ForestPuzzleLayout = {
    id: doc.id,
    document: doc,
    width: doc.width,
    height: doc.height,
    fallLimit: doc.fallLimit,
    spawn: { x: spawn.x + spawn.width / 2, feetY: spawn.y + spawn.height },
    initialElement: spawn.element,
    exit: exits[0]!,
    exits,
    blocks: doc.objects
      .filter((o) => o.type === 'block')
      .map((block) => {
        const b = colliderBounds(block);
        const plate = doc.objects.find((o) => o.id === block.plateId);
        return {
          id: block.id,
          plateId: block.plateId,
          x: (b.left + b.right) / 2,
          floorY: b.bottom,
          ...(plate ? { plateBounds: colliderBounds(plate) } : {}),
        };
      }),
    surfaces: doc.objects
      .filter((o) => o.type === 'terrain' || o.type === 'platform')
      .map((o) => ({
        id: o.id,
        x: o.x,
        top: o.y,
        columns: o.width / 128,
        kind: o.type === 'terrain' ? 'ground' : 'platform',
      })),
    gems: doc.objects
      .filter((o) => o.type === 'gem')
      .map((o) => ({
        id: o.id,
        element: o.type === 'gem' ? o.element : 'water',
        x: o.x + o.width / 2,
        y: o.y + o.height / 2,
        view: o,
      })),
    targets: doc.objects
      .filter((o) => o.type === 'tank' || o.type === 'torch')
      .map((o) => ({
        id: o.id,
        kind: o.type as 'tank' | 'torch',
        x: (colliderBounds(o).left + colliderBounds(o).right) / 2,
        hits: 'hits' in o ? o.hits : 1,
        bounds: colliderBounds(o),
      })),
    gates: doc.objects
      .filter((o) => o.type === 'door')
      .map((o) => ({
        id: o.id,
        x: o.x + o.collider.x + o.collider.width / 2,
        requires: 'requires' in o ? o.requires : [],
        initiallyOpen: o.type === 'door' && o.initiallyOpen,
      })),
    objectives: doc.objects
      .filter(isMechanism)
      .map((o) => ({ id: o.id, hint: 'hint' in o ? o.hint : '' })),
  };
  return addOther(result, wall, crossing);
}
function addOther(
  result: ForestPuzzleLayout,
  wall: LevelObject | undefined,
  crossing: LevelObject | undefined,
): ForestPuzzleLayout {
  return {
    ...result,
    ...(wall ? { wall: { id: wall.id, x: wall.x + wall.width / 2 } } : {}),
    ...(crossing?.type === 'crossing'
      ? {
          crossing: {
            id: crossing.id,
            from: crossing.x,
            to: crossing.x + crossing.width,
            landingY: crossing.landingY,
          },
        }
      : {}),
  };
}
