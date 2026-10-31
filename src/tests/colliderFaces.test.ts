import { expect, it } from 'vitest';
import { newLevel, LIBRARY, createObject } from '../editor/library';
import { EditorModel } from '../editor/model';
import { editCollider } from '../editor/geometry';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { compileLevel } from '../game/levels/schema/compile';
import {
  playerCollisionFaces,
  PLATFORM_FACES,
  BLOCKER_FACES,
  SOLID_FACES,
} from '../game/levels/schema/playerCollision';

function fixture() {
  const doc = newLevel('collider-faces-check');
  const wall = createObject(
    LIBRARY.find((o) => o.id === 'boxCollider')!,
    700,
    250,
    doc.objects,
  );
  doc.objects.push(wall);
  return { doc, wall };
}
it('keeps old v1 data unchanged and resolves defaults by object role', () => {
  const { doc, wall } = fixture();
  expect(validateLevel(doc)).toEqual([]);
  expect(parseLevel(JSON.parse(serializeLevel(doc)))).toEqual(doc);
  expect(playerCollisionFaces(wall)).toEqual(PLATFORM_FACES);
  for (const id of [
    'block',
    'doorClosed',
    'wallIntact',
    'world:reflector',
    'world:directional_gate',
  ]) {
    const o = createObject(
      LIBRARY.find((o) => o.id === id)!,
      700,
      250,
      doc.objects,
    );
    expect(playerCollisionFaces(o)).toEqual(BLOCKER_FACES);
    expect(o.collider.playerCollision).toBeUndefined();
  }
});
it('retains explicit faces through save, compile, undo/redo, duplication and collider resizing', () => {
  const { doc, wall } = fixture();
  const model = new EditorModel(doc);
  model.update(wall.id, {
    collider: {
      ...wall.collider,
      playerCollision: { ...SOLID_FACES, right: false },
    },
  });
  model.undo();
  expect(
    model.getSnapshot().document.objects.at(-1)!.collider.playerCollision,
  ).toBeUndefined();
  model.redo();
  model.select([wall.id]);
  model.duplicate();
  const current = model.getSnapshot().document;
  const parsed = parseLevel(JSON.parse(serializeLevel(current)));
  expect(compileLevel(parsed).document).toEqual(current);
  for (const o of parsed.objects.filter((o) => o.type === 'boxCollider')) {
    expect(o.collider.playerCollision).toEqual({
      ...SOLID_FACES,
      right: false,
    });
    expect(
      editCollider(o.collider, 'e', { x: 40, y: 0 }, 1).playerCollision,
    ).toEqual(o.collider.playerCollision);
  }
  expect(parsed.objects.filter((o) => o.type === 'boxCollider')).toHaveLength(
    2,
  );
});
it.each([
  null,
  false,
  {},
  { top: true },
  { ...SOLID_FACES, left: 'yes' },
  { ...SOLID_FACES, bottom: 1 },
  [],
])('rejects invalid player collision faces: %j', (faces) => {
  const { doc, wall } = fixture();
  Object.assign(wall.collider, { playerCollision: faces });
  expect(validateLevel(doc).some((e) => e.includes('caras de colisión'))).toBe(
    true,
  );
});
