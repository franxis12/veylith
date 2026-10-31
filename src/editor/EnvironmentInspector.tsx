import type { LevelObject } from '../game/levels/schema/types';
import {
  ENVIRONMENT_ASSETS,
  environmentName,
  platformName,
  platformCollider,
  environmentSizing,
} from '../game/assets/environmentCatalog';

export function EnvironmentInspector({
  object,
  update,
}: {
  object: LevelObject;
  update: (patch: Partial<LevelObject>) => void;
}) {
  const name = environmentName(object.asset);
  if (!name) return null;
  const art = ENVIRONMENT_ASSETS[name];
  const family = object.type === 'platform' && platformName(object.asset);
  const mode = environmentSizing(object);
  return (
    <section aria-label="Recurso de entorno">
      <p>
        Escala visual: 50 % reduce todo a la mitad; 200 % duplica su tamaño.
        Después puedes seguir ampliándolo por módulos al tamaño elegido. El
        collider no cambia; ajústalo por separado si hace falta.
      </p>
      <p>
        Original: {art.width} × {art.height} px. Se conserva el lienzo completo,
        incluidos los márgenes transparentes.
      </p>
      {family ? (
        <>
          <p>
            Modular horizontal: los extremos conservan su forma y el centro se
            repite hasta cubrir el ancho. Arrastrar cambia la longitud; el alto
            cambia la escala uniforme de las piezas. Superficie a 32 px del
            borde superior a tamaño original. El collider sigue independiente.
          </p>
          <button
            onClick={() =>
              update({
                collider: {
                  ...object.collider,
                  ...platformCollider(family, object.width, object.height),
                },
              })
            }
          >
            Ajustar collider a la plataforma
          </button>
        </>
      ) : (
        <>
          <p>
            {art.collision
              ? 'Pieza con collider rectangular del manifiesto.'
              : 'Decoración estática, sin colisión inicial. No añade movimiento, pendientes físicas ni poderes.'}
          </p>
          <p>
            Ancla de montaje del original: {art.anchor.join(', ')} px desde la
            esquina superior izquierda.
          </p>
          {mode !== 'proportional' ? (
            <p>
              {mode === 'vertical'
                ? 'Extensible vertical: arrastra para alargarla sin cambiar su grosor. Se prolonga con el patrón original; el ancho ajusta su escala uniforme.'
                : mode === 'horizontal'
                  ? 'Extensible horizontal: arrastra para alargarla sin cambiar su grosor. Se prolonga con el patrón original; el alto ajusta su escala uniforme.'
                  : 'Relleno modular: repite las piezas originales en ambas direcciones. Cambiar ancho o alto amplía el área sin estirar la textura.'}{' '}
              Los tramos finales se recortan a la medida solicitada.
            </p>
          ) : (
            <p>
              Pieza única: ancho y alto se ajustan juntos para conservar sus
              proporciones.
            </p>
          )}
        </>
      )}
      {art.underlay && (
        <p>
          Coloca sobre terreno de base: las grietas y bordes transparentes dejan
          ver la capa inferior.
        </p>
      )}
    </section>
  );
}
