import type { LevelDocument } from '../game/levels/schema/types';
import type {
  SwitchAction,
  WorldBehavior,
  WorldObject,
} from '../game/systems/world/types';
import { CommandTargets } from './CommandTargets';

export function LeverInspector({
  object,
  document,
  change,
}: {
  object: WorldObject;
  document: LevelDocument;
  change: (patch: Partial<WorldBehavior>) => void;
}) {
  const b = object.behavior;
  if (b.kind !== 'lever') return null;
  return (
    <fieldset>
      <legend>Palanca configurable</legend>
      <label>
        <input
          type="checkbox"
          checked={b.initiallyActive}
          onChange={(e) => change({ initiallyActive: e.target.checked })}
        />
        Palanca activa inicialmente
      </label>
      <label>
        Acción de la palanca
        <select
          aria-label="Acción de la palanca"
          value={b.action ?? 'toggle'}
          onChange={(e) => change({ action: e.target.value as SwitchAction })}
        >
          <option value="toggle">Alternar (ida / regreso)</option>
          <option value="activate">Activar (ir al destino)</option>
          <option value="deactivate">Desactivar (regresar al inicio)</option>
        </select>
      </label>
      <CommandTargets
        document={document}
        selected={b.targets ?? []}
        change={(targets) => change({ targets })}
      />
      <small>
        Para devolver un ascensor, selecciona en él «Ida y regreso por palanca».
        Con una sola palanca puedes usar su ID en la activación del ascensor.
        Con dos palancas, marca el mismo ascensor como destino en ambas: una
        activa y la otra desactiva; o las dos alternan. Las órdenes sustituyen
        los requisitos del receptor hasta otra orden o reinicio. El estado
        inicial solo emite la señal, no envía órdenes.
      </small>
    </fieldset>
  );
}
