import { describe, expect, it } from 'vitest';
import { LIBRARY, createObject, newLevel } from '../editor/library';
import { EditorModel } from '../editor/model';
import { compileLevel } from '../game/levels/schema/compile';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { colliderBounds } from '../game/levels/schema/types';
import type { LevelDocument } from '../game/levels/schema/types';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { auditEarthPuzzle } from '../game/levels/earthValidation';
import lab from '../game/levels/data/lab-multiple-blocks.json';

function fixture() {
  const d = newLevel();
  for (const [type, x] of [
    ['plate', 500],
    ['block', 300],
    ['plate', 900],
    ['block', 1100],
    ['block', 1400],
  ] as const)
    d.objects.push(
      createObject(
        LIBRARY.find((o) => o.id === type)!,
        x,
        500,
        d.objects,
      ),
    );
  return d;
}
function contact(
  d: LevelDocument,
  state: ForestPuzzleState,
  blockId: string,
  plateId: string,
  supported = true,
) {
  const p = colliderBounds(d.objects.find((o) => o.id === plateId)!);
  state.observeBlock(
    blockId,
    { ...p, top: p.top - 96, bottom: p.top },
    supported,
  );
}

describe('multiple editor blocks and independent plate latches', () => {
  it('creates two independent pairs and an unlinked platform, round trips all objects in v1', () => {
    const d = fixture();
    const blocks = d.objects.filter((o) => o.type === 'block');
    const plates = d.objects.filter((o) => o.type === 'plate');
    expect(blocks.map((o) => o.plateId)).toEqual([
      plates[0]!.id,
      plates[1]!.id,
      '',
    ]);
    expect(new Set(blocks.map((o) => o.id)).size).toBe(3);
    expect(validateLevel(d)).toEqual([]);
    expect(parseLevel(JSON.parse(serializeLevel(d)))).toEqual(d);
    const layout = compileLevel(d);
    expect(layout.blocks).toHaveLength(3);
    expect(layout.blocks[2]!.plateBounds).toBeUndefined();
  });
  it('only activates the matching plate on supported contact and requires both signals for a door', () => {
    const d = fixture();
    const [a, b, free] = d.objects.filter((o) => o.type === 'block');
    const [pa, pb] = d.objects.filter((o) => o.type === 'plate');
    const gate = createObject(
      LIBRARY.find((o) => o.type === 'door')!,
      1500,
      0,
      d.objects,
    );
    if (gate.type !== 'door') throw new Error('door fixture');
    gate.requires = [pa!.id, pb!.id];
    d.objects.push(gate);
    const state = new ForestPuzzleState(compileLevel(d));
    contact(d, state, a!.id, pb!.id);
    contact(d, state, b!.id, pb!.id, false);
    contact(d, state, free!.id, pa!.id);
    expect(state.snapshot.solved).toBe(0);
    contact(d, state, a!.id, pa!.id);
    expect(state.isBlockDocked(a!.id)).toBe(true);
    expect(state.isBlockDocked(b!.id)).toBe(false);
    expect(state.gateOpen(gate.id)).toBe(false);
    contact(d, state, b!.id, pb!.id);
    expect(state.gateOpen(gate.id)).toBe(true);
    expect(state.isBlockDocked(free!.id)).toBe(false);
    const reset = new ForestPuzzleState(compileLevel(d));
    expect(reset.snapshot.solved).toBe(0);
    for (const block of [a!, b!, free!])
      expect(reset.isBlockDocked(block.id)).toBe(false);
  });
  it('allows two blocks to share a plate without freezing the distant block', () => {
    const d = fixture();
    const [a, , free] = d.objects.filter((o) => o.type === 'block');
    free!.plateId = a!.plateId;
    const state = new ForestPuzzleState(compileLevel(d));
    contact(d, state, a!.id, a!.plateId);
    expect(state.isSolved(a!.plateId)).toBe(true);
    expect(state.isBlockDocked(free!.id)).toBe(false);
    contact(d, state, free!.id, a!.plateId);
    expect(state.isBlockDocked(free!.id)).toBe(true);
    expect(state.snapshot.solved).toBe(1);
  });
  it('can save a platform-only level, but rejects broken nonempty links and orphan plates', () => {
    const d = newLevel();
    const block = createObject(
      LIBRARY.find((o) => o.id === 'block')!,
      400,
      500,
      d.objects,
    );
    d.objects.push(block);
    expect(validateLevel(d)).toEqual([]);
    Object.assign(block, { plateId: 'missing' });
    expect(validateLevel(d).join(' ')).toContain('placa de destino no existe');
    Object.assign(block, { plateId: '' });
    d.objects.push(
      createObject(
        LIBRARY.find((o) => o.id === 'plate')!,
        600,
        600,
        d.objects,
      ),
    );
    expect(validateLevel(d).join(' ')).toContain('falta el bloque asociado');
  });
  it('preserves pair links through duplicate, rename, undo/redo and explicit serialization', () => {
    const d = fixture(),
      model = new EditorModel(d);
    const block = d.objects.find((o) => o.type === 'block')!;
    model.select([block.id, block.plateId]);
    model.duplicate();
    const copies = model
      .getSnapshot()
      .document.objects.filter((o) =>
        model.getSnapshot().selection.includes(o.id),
      );
    const plateCopy = copies.find((o) => o.type === 'plate')!;
    const blockCopy = copies.find((o) => o.type === 'block')!;
    expect(blockCopy.plateId).toBe(plateCopy.id);
    model.rename(plateCopy.id, 'renamed-plate');
    expect(
      model.getSnapshot().document.objects.find((o) => o.id === blockCopy.id),
    ).toMatchObject({ plateId: 'renamed-plate' });
    model.undo();
    model.undo();
    expect(model.getSnapshot().document).toEqual(d);
    model.redo();
    model.redo();
    expect(validateLevel(model.getSnapshot().document)).toEqual([]);
    expect(
      parseLevel(JSON.parse(serializeLevel(model.getSnapshot().document))),
    ).toEqual(model.getSnapshot().document);
  });
  it('audits the playable laboratory without treating a free block as a missing plate', () => {
    const doc = parseLevel(lab);
    expect(auditEarthPuzzle(doc)).toEqual([]);
    expect(compileLevel(doc).blocks).toHaveLength(3);
  });
});
