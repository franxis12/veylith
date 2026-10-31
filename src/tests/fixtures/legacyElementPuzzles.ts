import documents from './legacy-element-puzzles.json';
import { parseLevel } from '../../game/levels/schema/validate';
import { compileLevel } from '../../game/levels/schema/compile';
export const LEGACY_DOCUMENTS = Object.fromEntries(
  Object.entries(documents).map(([id, doc]) => [id, parseLevel(doc)]),
) as Record<keyof typeof documents, ReturnType<typeof parseLevel>>;
export const LEGACY_PUZZLES = Object.fromEntries(
  Object.entries(LEGACY_DOCUMENTS).map(([id, doc]) => [id, compileLevel(doc)]),
) as Record<keyof typeof documents, ReturnType<typeof compileLevel>>;
