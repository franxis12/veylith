import type { LevelDocument } from '../game/levels/schema/types';

export function CommandTargets({
  document,
  selected,
  change,
}: {
  document: LevelDocument;
  selected: string[];
  change: (targets: string[]) => void;
}) {
  const targets = document.objects.filter(
    (o) => o.type === 'world' && 'requires' in o.behavior,
  );
  return (
    <fieldset>
      <legend>Destinos de órdenes por ID</legend>
      {[
        ...targets.map((o) => o.id),
        ...selected.filter((id) => !targets.some((o) => o.id === id)),
      ].map((id) => (
        <label key={id}>
          <input
            type="checkbox"
            checked={selected.includes(id)}
            onChange={(e) =>
              change(
                e.target.checked
                  ? [...selected, id]
                  : selected.filter((ref) => ref !== id),
              )
            }
          />
          {id}
          {targets.some((o) => o.id === id) ? '' : ' (falta o incompatible)'}
        </label>
      ))}
    </fieldset>
  );
}
