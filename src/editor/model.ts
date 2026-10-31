import type { LevelDocument, LevelObject } from '../game/levels/schema/types';
import { uniqueId } from './library';
export interface EditorSnapshot {
  document: LevelDocument;
  selection: readonly string[];
  revision: number;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
}
/** Immutable committed snapshots. Pointer drafts live in Phaser and commit only on release. */
export class EditorModel {
  private past: LevelDocument[] = [];
  private future: LevelDocument[] = [];
  private saved: string;
  private snapshot: EditorSnapshot;
  private readonly listeners = new Set<() => void>();
  constructor(doc: LevelDocument, saved = true) {
    const document = structuredClone(doc);
    this.saved = saved ? JSON.stringify(document) : '';
    this.snapshot = {
      document,
      selection: [],
      revision: 0,
      dirty: !saved,
      canUndo: false,
      canRedo: false,
    };
  }
  getSnapshot = (): EditorSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(
    document = this.snapshot.document,
    selection = this.snapshot.selection,
  ): void {
    this.snapshot = {
      document,
      selection: selection.filter((id) =>
        document.objects.some((o) => o.id === id),
      ),
      revision: this.snapshot.revision + 1,
      dirty: JSON.stringify(document) !== this.saved,
      canUndo: !!this.past.length,
      canRedo: !!this.future.length,
    };
    this.listeners.forEach((l) => l());
  }
  commit(change: (draft: LevelDocument) => void): void {
    const next = structuredClone(this.snapshot.document);
    change(next);
    if (JSON.stringify(next) === JSON.stringify(this.snapshot.document)) return;
    this.past.push(this.snapshot.document);
    if (this.past.length > 100) this.past.shift();
    this.future = [];
    this.publish(next);
  }
  select(ids: readonly string[]): void {
    this.publish(this.snapshot.document, [...new Set(ids)]);
  }
  undo(): void {
    const prior = this.past.pop();
    if (!prior) return;
    this.future.push(this.snapshot.document);
    this.publish(prior);
  }
  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.snapshot.document);
    this.publish(next);
  }
  markSaved(doc: LevelDocument): void {
    this.saved = JSON.stringify(doc);
    this.publish();
  }
  resizeHeight(height: number): void {
    if (!Number.isFinite(height)) return;
    this.commit((d) => {
      // Keep the death zone attached to the bottom, without moving level objects.
      const bottomMargin = Math.max(0, d.height - d.fallLimit);
      d.height = height;
      d.fallLimit = Math.max(1, Math.min(height, height - bottomMargin));
    });
  }
  update(id: string, patch: Partial<LevelObject>): void {
    this.commit((d) => {
      d.objects = d.objects.map((o) =>
        o.id === id ? ({ ...o, ...patch } as LevelObject) : o,
      );
    });
  }
  rename(id: string, next: string): void {
    this.commit((d) => {
      for (const o of d.objects) {
        if (o.id === id) o.id = next;
        if (o.type === 'door' || o.type === 'exit')
          o.requires = o.requires.map((ref) => (ref === id ? next : ref));
        if (o.type === 'world' && 'requires' in o.behavior)
          o.behavior.requires = o.behavior.requires.map((ref) =>
            ref === id ? next : ref,
          );
        if (
          o.type === 'world' &&
          o.behavior.kind === 'pulley' &&
          o.behavior.counterweightId === id
        )
          o.behavior.counterweightId = next;
        if (o.type === 'block' && o.plateId === id) o.plateId = next;
        if (
          o.type === 'world' &&
          (o.behavior.kind === 'switch' || o.behavior.kind === 'lever') &&
          o.behavior.targets
        )
          o.behavior.targets = o.behavior.targets.map((ref) =>
            ref === id ? next : ref,
          );
      }
    });
    this.select([next]);
  }
  remove(): void {
    const selected = new Set(this.snapshot.selection);
    this.commit((d) => {
      d.objects = d.objects.filter((o) => !selected.has(o.id));
    });
  }
  duplicate(): void {
    const selected = this.snapshot.selection;
    const added: string[] = [];
    this.commit((d) => {
      const copies = d.objects
        .filter((o) => selected.includes(o.id))
        .map((o) => structuredClone(o));
      const mapping = new Map<string, string>();
      for (const o of copies) {
        const old = o.id;
        o.id = uniqueId(o.id, d.objects);
        mapping.set(old, o.id);
        o.x += 32;
        o.y += 32;
        d.objects.push(o);
        added.push(o.id);
      }
      for (const o of copies) {
        if (o.type === 'door' || o.type === 'exit')
          o.requires = o.requires.map((id) => mapping.get(id) ?? id);
        if (o.type === 'world' && 'requires' in o.behavior)
          o.behavior.requires = o.behavior.requires.map(
            (id) => mapping.get(id) ?? id,
          );
        if (o.type === 'world' && o.behavior.kind === 'pulley')
          o.behavior.counterweightId =
            mapping.get(o.behavior.counterweightId) ??
            o.behavior.counterweightId;
        if (o.type === 'block') o.plateId = mapping.get(o.plateId) ?? o.plateId;
        if (
          o.type === 'world' &&
          (o.behavior.kind === 'switch' || o.behavior.kind === 'lever') &&
          o.behavior.targets
        )
          o.behavior.targets = o.behavior.targets.map(
            (id) => mapping.get(id) ?? id,
          );
      }
    });
    this.select(added);
  }
}
