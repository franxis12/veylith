import { PLAYER_BODY } from '../game/config/elements';
import { PlayerCollisionInspector } from './PlayerCollisionInspector';
import { IllustratedInspector } from './IllustratedInspector';
import { illustrationSize } from '../game/assets/illustratedCatalog';
import { WorldInspector } from './WorldInspector';
import { EnvironmentInspector } from './EnvironmentInspector';
import { environmentSize, scaleEnvironment } from './environmentResize';
import { environmentVisualScale } from '../game/assets/environmentCatalog';
import type { EditorModel } from './model';
import type { LevelDocument, LevelObject } from '../game/levels/schema/types';
import { OBJECT_ID } from '../game/levels/schema/types';
import { ELEMENTS } from '../game/types/character';
import { isMechanism } from '../game/levels/schema/validate';
function NumberField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        key={value}
        aria-label={label}
        type="number"
        step="any"
        defaultValue={Number(value.toFixed(4))}
        disabled={disabled}
        onBlur={(e) => {
          const n = e.currentTarget.valueAsNumber;
          if (Number.isFinite(n) && n !== value) onChange(n);
        }}
      />
    </label>
  );
}
export function Inspector({
  model,
  document,
  object,
}: {
  model: EditorModel;
  document: LevelDocument;
  object: LevelObject | undefined;
}) {
  if (!object)
    return (
      <div className="inspector-fields">
        <h2>Nivel</h2>
        <label>
          Nombre
          <input
            key={document.name}
            defaultValue={document.name}
            onBlur={(e) =>
              model.commit((d) => {
                d.name = e.target.value;
              })
            }
          />
        </label>
        <p>ID: {document.id}</p>
        <p>Ancient Forest · JSON v1</p>
        <NumberField
          label="Zoom al jugar (%)"
          value={(document.cameraZoom ?? 1) * 100}
          onChange={(percent) =>
            model.commit((d) => {
              d.cameraZoom = percent / 100;
            })
          }
        />
        <p>
          Menos zoom aleja la cámara: prueba 75 % o 50 %. Se aplica en Probar y
          se guarda con el nivel para el juego. Rango: 25 %–150 %.
        </p>
        <NumberField
          label="Ancho del nivel"
          value={document.width}
          onChange={(width) =>
            model.commit((d) => {
              d.width = width;
            })
          }
        />
        <NumberField
          label="Alto del nivel"
          value={document.height}
          onChange={(height) => model.resizeHeight(height)}
        />
        <p>
          Al cambiar el alto, el límite de caída acompaña al borde inferior. Los
          objetos mantienen su posición.
        </p>
        <NumberField
          label="Límite de caída"
          value={document.fallLimit}
          onChange={(fallLimit) =>
            model.commit((d) => {
              d.fallLimit = fallLimit;
            })
          }
        />
        <button
          disabled={document.fallLimit === document.height}
          onClick={() =>
            model.commit((d) => {
              d.fallLimit = d.height;
            })
          }
        >
          Llevar límite al fondo
        </button>
        <p>
          La línea roja marca el reinicio al llegar con los pies. Coloca el
          suelo jugable por encima. Si ya ampliaste el nivel, puedes llevar este
          límite al fondo para habilitar la parte nueva.
        </p>
        <NumberField
          label="3 estrellas (segundos)"
          value={document.timer.threeStarsMs / 1000}
          onChange={(n) =>
            model.commit((d) => {
              d.timer.threeStarsMs = n * 1000;
            })
          }
        />
        <NumberField
          label="2 estrellas (segundos)"
          value={document.timer.twoStarsMs / 1000}
          onChange={(n) =>
            model.commit((d) => {
              d.timer.twoStarsMs = n * 1000;
            })
          }
        />
        <h3>Pistas opcionales</h3>
        {!document.puzzle ? (
          <button
            onClick={() =>
              model.commit((d) => {
                d.puzzle = {
                  brief: 'Descubre cómo abrir la salida.',
                  hints: [
                    'Observa las conexiones.',
                    'Compara los estados de los mecanismos.',
                  ],
                };
              })
            }
          >
            Añadir pistas graduales
          </button>
        ) : (
          <>
            <label>
              Objetivo breve
              <input
                key={document.puzzle.brief}
                defaultValue={document.puzzle.brief}
                onBlur={(e) =>
                  model.commit((d) => {
                    d.puzzle!.brief = e.target.value;
                  })
                }
              />
            </label>
            {document.puzzle.hints.map((hint, i) => (
              <label key={i}>
                Pista {i + 1}
                <textarea
                  aria-label={`Pista ${i + 1}`}
                  key={hint}
                  defaultValue={hint}
                  onBlur={(e) =>
                    model.commit((d) => {
                      d.puzzle!.hints[i] = e.target.value;
                    })
                  }
                />
              </label>
            ))}
            {document.puzzle.hints.length < 3 && (
              <button
                onClick={() =>
                  model.commit((d) => {
                    d.puzzle!.hints.push('Piensa en el orden de las acciones.');
                  })
                }
              >
                Añadir tercera pista
              </button>
            )}
            <button
              onClick={() =>
                model.commit((d) => {
                  delete d.puzzle;
                })
              }
            >
              Quitar pistas opcionales
            </button>
          </>
        )}
        <h3>Fondos</h3>
        {(['sky', 'forest', 'foreground'] as const).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={document.background[key]}
              onChange={(e) =>
                model.commit((d) => {
                  d.background[key] = e.target.checked;
                })
              }
            />
            {key}
          </label>
        ))}
        <p>Los tiempos califican la partida; no causan derrota.</p>
      </div>
    );
  const update = (patch: Partial<LevelObject>) =>
    model.update(object.id, patch);
  const colliderEditable = ![
    'spawn',
    'label',
    'crossing',
    'illustration',
  ].includes(object.type);
  const doors = document.objects.filter((o) => o.type === 'door');
  return (
    <div className="inspector-fields">
      <h2>Inspector</h2>
      <label>
        ID del objeto
        <input
          key={object.id}
          aria-label="ID del objeto"
          defaultValue={object.id}
          onBlur={(e) => {
            const id = e.target.value;
            if (
              OBJECT_ID.test(id) &&
              !document.objects.some((o) => o.id === id && o.id !== object.id)
            )
              model.rename(object.id, id);
            else {
              e.target.value = object.id;
              e.target.setCustomValidity('ID no válido o repetido');
              e.target.reportValidity();
              e.target.setCustomValidity('');
            }
          }}
        />
      </label>
      <label>
        Tipo
        <input value={object.type} readOnly />
      </label>
      <label>
        Recurso
        <input value={object.asset ?? 'Marcador del editor'} readOnly />
      </label>
      <NumberField
        label="Posición X"
        value={object.x}
        onChange={(x) => update({ x })}
      />
      <NumberField
        label="Posición Y"
        value={object.y}
        disabled={object.type === 'crossing'}
        onChange={(y) => update({ y })}
      />
      <NumberField
        label="Ancho visual"
        value={object.width}
        disabled={object.type === 'spawn'}
        onChange={(width) =>
          update(
            illustrationSize(object, width, 'width') ??
              environmentSize(object, width, object.height, 'width') ?? {
                width,
                ...(object.type === 'boxCollider'
                  ? { collider: { ...object.collider, width } }
                  : {}),
              },
          )
        }
      />
      <NumberField
        label="Alto visual"
        value={object.height}
        disabled={['spawn', 'crossing'].includes(object.type)}
        onChange={(height) =>
          update(
            illustrationSize(object, height, 'height') ??
              environmentSize(object, object.width, height, 'height') ?? {
                height,
                ...(object.type === 'boxCollider'
                  ? { collider: { ...object.collider, height } }
                  : {}),
              },
          )
        }
      />
      {environmentVisualScale(object) !== undefined && (
        <NumberField
          label="Escala visual (%)"
          value={environmentVisualScale(object)! * 100}
          onChange={(percent) => {
            const patch = scaleEnvironment(object, percent / 100);
            if (patch) update(patch);
          }}
        />
      )}
      <NumberField
        label="Rotación (grados)"
        value={object.rotation}
        disabled={object.type !== 'decoration'}
        onChange={(rotation) => update({ rotation })}
      />
      <NumberField
        label="Capa"
        value={object.layer}
        onChange={(layer) => update({ layer })}
      />
      <label>
        <input
          type="checkbox"
          checked={object.visible}
          onChange={(e) => update({ visible: e.target.checked })}
        />
        Visible
      </label>
      {object.type === 'world' && (
        <WorldInspector object={object} document={document} update={update} />
      )}
      <EnvironmentInspector object={object} update={update} />
      {object.type === 'illustration' && (
        <IllustratedInspector object={object} update={update} />
      )}
      {object.type === 'boxCollider' && (
        <p>
          Rectángulo sólido sin dibujo en el juego. Usa Editar collider y sus
          ocho asas para superficies, techos o paredes. Ocultarlo no desactiva
          la colisión.
        </p>
      )}
      {colliderEditable &&
        !(
          object.type === 'world' &&
          ['heat', 'lake'].includes(object.behavior.kind)
        ) && (
          <fieldset>
            <legend>Collider rectangular</legend>
            <label>
              <input
                aria-label="Collision enabled"
                type="checkbox"
                checked={object.collider.enabled}
                onChange={(e) =>
                  update({
                    collider: { ...object.collider, enabled: e.target.checked },
                  })
                }
              />
              Colisión activa
            </label>
            {(['x', 'y', 'width', 'height'] as const).map((key, i) => (
              <NumberField
                key={key}
                label={
                  [
                    'Offset collider X',
                    'Offset collider Y',
                    'Ancho collider',
                    'Alto collider',
                  ][i]!
                }
                value={object.collider[key]}
                onChange={(n) =>
                  update({ collider: { ...object.collider, [key]: n } })
                }
              />
            ))}
            <PlayerCollisionInspector object={object} update={update} />
            <small>
              Independiente del dibujo; siempre alineado con los ejes.
            </small>
          </fieldset>
        )}
      {(object.type === 'gem' || object.type === 'spawn') && (
        <label>
          Elemento
          <select
            aria-label="Elemento"
            value={object.element}
            onChange={(e) => {
              const element = ELEMENTS.find((v) => v === e.target.value)!;
              update(
                object.type === 'gem'
                  ? { element, asset: `gem:${element}` }
                  : { element },
              );
            }}
          >
            {ELEMENTS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
      )}
      {object.type === 'gem' && (
        <p>Reaparición: solo al reiniciar. Reemplazo inmediato del elemento.</p>
      )}
      {object.type === 'coin' && (
        <>
          <NumberField
            label="Valor de la moneda"
            value={object.value}
            onChange={(value) => update({ value })}
          />
          <p>
            Se recoge al tocarla y reaparece al reiniciar. En campaña se abona
            al completar el nivel, una sola vez. Probar no cambia tu saldo.
          </p>
        </>
      )}
      {object.type === 'spawn' && (
        <p>
          El cuerpo del jugador mide {PLAYER_BODY.width} × {PLAYER_BODY.height}.
          El contorno interior muestra su tamaño; la base indica los pies.
        </p>
      )}
      {(object.type === 'tank' || object.type === 'torch') && (
        <NumberField
          label={
            object.type === 'tank'
              ? 'Agua requerida (impactos)'
              : 'Impactos de Fuego'
          }
          value={object.hits}
          onChange={(hits) => update({ hits })}
        />
      )}
      {object.type === 'door' && (
        <label>
          Estado inicial
          <select
            value={object.initiallyOpen ? 'open' : 'closed'}
            onChange={(e) =>
              update({ initiallyOpen: e.target.value === 'open' })
            }
          >
            <option value="closed">Cerrada</option>
            <option value="open">Abierta</option>
          </select>
        </label>
      )}
      {(object.type === 'door' || object.type === 'exit') && (
        <fieldset>
          <legend>Mecanismos requeridos (todos)</legend>
          {document.objects.filter(isMechanism).map((m) => (
            <label key={m.id}>
              <input
                type="checkbox"
                checked={object.requires.includes(m.id)}
                onChange={(e) =>
                  update({
                    requires: e.target.checked
                      ? [...object.requires, m.id]
                      : object.requires.filter((id) => id !== m.id),
                  })
                }
              />
              {m.id}
            </label>
          ))}
          {!object.requires.length && (
            <small>Sin requisitos: acceso inmediato.</small>
          )}
        </fieldset>
      )}
      {(object.type === 'tank' ||
        object.type === 'torch' ||
        object.type === 'plate') && (
        <fieldset>
          <legend>Activa estas puertas</legend>
          {doors.map((door) => (
            <label key={door.id}>
              <input
                type="checkbox"
                checked={
                  door.type === 'door' && door.requires.includes(object.id)
                }
                onChange={(e) =>
                  model.commit((d) => {
                    const gate = d.objects.find((o) => o.id === door.id);
                    if (gate?.type === 'door')
                      gate.requires = e.target.checked
                        ? [...gate.requires, object.id]
                        : gate.requires.filter((id) => id !== object.id);
                  })
                }
              />
              {door.id}
            </label>
          ))}
        </fieldset>
      )}
      {object.type === 'plate' && (
        <p>
          Peso requerido: 1 bloque pesado. Solo el bloque que toca esta placa
          queda encajado; los demás siguen libres.
        </p>
      )}
      {object.type === 'block' && (
        <div className="inspector-fields">
          <button
            onClick={() =>
              update({
                collider: {
                  ...object.collider,
                  x: 0,
                  y: 0,
                  width: object.width,
                  height: object.height,
                },
              })
            }
          >
            Ajustar collider al tamaño visual
          </button>
          <label>
            Placa de destino
            <select
              aria-label="Placa de destino"
              value={object.plateId}
              onChange={(e) => update({ plateId: e.target.value })}
            >
              <option value="">Sin placa (plataforma móvil)</option>
              {document.objects
                .filter((o) => o.type === 'plate')
                .map((o) => (
                  <option key={o.id}>{o.id}</option>
                ))}
            </select>
            <small>
              Puedes añadir varios bloques y subirte sobre ellos. Sin placa, el
              bloque sigue libre; con placa, queda fijo al apoyarse en ella.
              Tierra los empuja desde ambos lados y pueden caer de un borde.
              Ajusta su altura para poder saltar encima. Tamaño visual y
              collider son independientes; usa el botón para igualarlos.
            </small>
          </label>
        </div>
      )}
      {object.type === 'crossing' && (
        <NumberField
          label="Altura de aterrizaje"
          value={object.landingY}
          onChange={(landingY) => update({ landingY })}
        />
      )}
      {'hint' in object && (
        <label>
          Pista
          <textarea
            key={object.hint}
            defaultValue={object.hint}
            onBlur={(e) => update({ hint: e.target.value })}
          />
        </label>
      )}
      {object.type === 'label' && (
        <label>
          Texto
          <textarea
            key={object.text}
            defaultValue={object.text}
            onBlur={(e) => update({ text: e.target.value })}
          />
        </label>
      )}
      {object.type === 'terrain' || object.type === 'platform' ? (
        <p>
          El ancho modular usa múltiplos de 128. Cambiar el dibujo no
          redimensiona el collider.
        </p>
      ) : null}
    </div>
  );
}
