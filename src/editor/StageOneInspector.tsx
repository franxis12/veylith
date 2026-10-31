import type { LevelDocument } from '../game/levels/schema/types';
import type { WorldBehavior, WorldObject } from '../game/systems/world/types';
import { CommandTargets } from './CommandTargets';

export function StageOneInspector({
  object,
  document,
  change,
}: {
  object: WorldObject;
  document: LevelDocument;
  change: (patch: Partial<WorldBehavior>) => void;
}) {
  const b = object.behavior;
  const number = (
    label: string,
    value: number,
    update: (n: number) => void,
  ) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        step="any"
        key={value}
        defaultValue={value}
        onBlur={(e) => {
          if (Number.isFinite(e.currentTarget.valueAsNumber))
            update(e.currentTarget.valueAsNumber);
        }}
      />
    </label>
  );
  const check = (
    label: string,
    value: boolean,
    update: (n: boolean) => void,
  ) => (
    <label>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => update(e.target.checked)}
      />
      {label}
    </label>
  );
  if (b.kind === 'timedDoor')
    return (
      <fieldset>
        <legend>Puerta temporizada</legend>
        {number('Tiempo abierta (ms)', b.openMs, (openMs) =>
          change({ openMs }),
        )}
        {number('Aviso antes del cierre (ms)', b.warningMs, (warningMs) =>
          change({ warningMs }),
        )}
        {check('Abierta inicialmente', b.initiallyOpen, (initiallyOpen) =>
          change({ initiallyOpen }),
        )}
        <label>
          Reactivación
          <select
            aria-label="Reactivación"
            value={b.retrigger}
            onChange={(e) =>
              change({ retrigger: e.target.value as 'restart' | 'ignore' })
            }
          >
            <option value="restart">Reiniciar tiempo</option>
            <option value="ignore">Ignorar mientras está abierta</option>
          </select>
        </label>
        <small>
          Una señal sostenida abre una sola vez. Una nueva orden Activar puede
          rearmar el tiempo. El cierre espera si hay un cuerpo dentro.
        </small>
      </fieldset>
    );
  if (b.kind === 'phasePlatform')
    return (
      <fieldset>
        <legend>Solidez temporal</legend>
        <label>
          Modo de desaparición
          <select
            aria-label="Modo de desaparición"
            value={b.mode}
            onChange={(e) =>
              change({ mode: e.target.value as 'cycle' | 'contact' })
            }
          >
            <option value="cycle">Ciclo continuo</option>
            <option value="contact">Después de pisarla</option>
          </select>
        </label>
        {number('Tiempo sólida (ms)', b.solidMs, (solidMs) =>
          change({ solidMs }),
        )}
        {number('Tiempo oculta (ms)', b.hiddenMs, (hiddenMs) =>
          change({ hiddenMs }),
        )}
        {check('Sólida inicialmente', b.initiallySolid, (initiallySolid) =>
          change({ initiallySolid }),
        )}
        <small>
          Sin activación vuelve a su solidez inicial. Reaparece solo con el
          hueco libre. Configura sus caras sólidas en Collider rectangular.
        </small>
      </fieldset>
    );
  if (b.kind === 'bounce')
    return (
      <fieldset>
        <legend>Rebote</legend>
        {number('Velocidad de rebote', b.speed, (speed) => change({ speed }))}
        {number('Espera entre rebotes (ms)', b.cooldownMs, (cooldownMs) =>
          change({ cooldownMs }),
        )}
        <small>
          Impulso vertical al aterrizar encima. Apagado conserva una plataforma
          sólida. La animación no mueve el collider.
        </small>
      </fieldset>
    );
  if (b.kind === 'float')
    return (
      <fieldset>
        <legend>Flotabilidad</legend>
        {number('Fracción sumergida (0–0.9)', b.draft, (draft) =>
          change({ draft }),
        )}
        {number('Velocidad vertical en agua', b.riseSpeed, (riseSpeed) =>
          change({ riseSpeed }),
        )}
        {number('Corriente horizontal', b.currentSpeed, (currentSpeed) =>
          change({ currentSpeed }),
        )}
        <small>
          Gravedad en seco; flota en zonas activas de Agua profunda. Una
          corriente positiva va a la derecha. Transporta al jugador y se detiene
          ante obstáculos. No se empuja ni transporta bloques pesados.
        </small>
      </fieldset>
    );
  if (b.kind === 'barrier')
    return (
      <p>
        Activa = sólida. No hace daño. Los cuerpos y proyectiles quedan
        bloqueados. Espera a que el espacio quede libre para activarse.
      </p>
    );
  if (b.kind !== 'switch') return null;
  return (
    <fieldset>
      <legend>Interruptor configurable</legend>
      <label>
        Acción del interruptor
        <select
          aria-label="Acción del interruptor"
          value={b.action}
          onChange={(e) =>
            change({
              action: e.target.value as 'activate' | 'deactivate' | 'toggle',
            })
          }
        >
          <option value="activate">Activar</option>
          <option value="deactivate">Desactivar</option>
          <option value="toggle">Alternar</option>
        </select>
      </label>
      <label>
        Disparador
        <select
          aria-label="Disparador"
          value={b.trigger}
          onChange={(e) =>
            change({ trigger: e.target.value as 'interact' | 'fire' | 'water' })
          }
        >
          <option value="interact">Poder cerca (cualquier elemento)</option>
          <option value="fire">Proyectil de Fuego</option>
          <option value="water">Proyectil de Agua</option>
        </select>
      </label>
      {check(
        'Señal activa inicialmente',
        b.initiallyActive,
        (initiallyActive) => change({ initiallyActive }),
      )}
      {number('Espera del interruptor (ms)', b.cooldownMs, (cooldownMs) =>
        change({ cooldownMs }),
      )}
      <CommandTargets
        document={document}
        selected={b.targets}
        change={(targets) => change({ targets })}
      />
      <small>
        Las órdenes sustituyen la activación del receptor hasta otra orden o
        reinicio. La señal propia puede usarse en requisitos de puertas, salidas
        y otros receptores. El estado inicial no envía órdenes.
      </small>
    </fieldset>
  );
}
