# Veylith · Reflectores, poleas, cintas y compuertas

Integración de las cuatro familias reales de `public/assets/objects/advanced/`. No reemplaza PNG originales, la campaña 1–10, los saves v1 ni la transformación mediante gemas. Los laboratorios se abren desde _*/editor → Abrir → lab-* → Probar_*; no son entradas de campaña ni conceden progreso.

## Controles y edición

Mover: A/D o flechas. Saltar: Espacio/W/arriba. Poder/interactuar: E/Shift. Reiniciar: R. Conserva los controles táctiles existentes. Solo las gemas cambian el elemento durante una partida; los laboratorios comienzan con Tierra.

En **Pack · Funcionales** hay siete piezas: Espejo móvil, Origen de haz, Receptor de luz, Plataforma de polea, Contrapeso de polea, Cinta transportadora y Compuerta direccional. Todos admiten posición, tamaño visual, collider independiente, visibilidad, duplicación, deshacer/rehacer y JSON versión 1. El rectángulo violeta del emisor/receptor tiene posición y tamaño editables. Ocultar un dibujo no desactiva el mecanismo; usa sus controles físicos/de efecto.

`requires` combina todos los IDs mediante AND. Sin referencias se usa `autostart`. Los interruptores anteriores pueden enviar `activate`, `deactivate` y `toggle` al emisor, plataforma de polea, cinta y compuerta. Una orden explícita tiene prioridad sobre `requires` durante el intento, como en la etapa anterior. El receptor es una fuente de señal que también sirve como requisito de puertas y salidas clásicas. Renombrar y duplicar grupos remapea `requires`, destinos del interruptor y `counterweightId`; eliminar una pieza deja una referencia inválida visible y no guarda silenciosamente otro vínculo.

## Reflectores

Abre **lab-reflectors**. Empuja el espejo hacia la derecha hasta que el rayo ascendente alcance el receptor elevado. Este laboratorio usa memoria: una vez iluminado, el receptor mantiene abierta la puerta. También puedes mantener Acción / E cerca del espejo y girar su cara hacia la lente. Salta sobre la base para continuar. R restaura posición, señal, puerta y gemas.

| Pieza / propiedad      | Valores                             | Efecto real                                                                                     |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Espejo · `orientation` | `nw`, `ne`, `se`, `sw`              | Normal de la cara reflectante, coincide con la flecha de bronce del arte.                       |
| Espejo · `angle`       | número 0 ≤ ángulo < 360, opcional   | Ángulo inicial de la normal: derecha 0°, abajo 90°. Si falta, usa `orientation`.                |
| Espejo · `rotatable`   | booleano opcional, por defecto true | Permite orientar la cara manteniendo Acción cerca. False fija el ángulo, sin impedir el empuje. |
| Espejo · `pushable`    | booleano                            | Tierra apoyada puede empujarlo por ambos lados; cae con gravedad. Desactivado queda fijo.       |
| Emisor · `direction`   | `right`, `down`, `left`, `up`       | Dirección cardinal inicial desde el centro de la zona violeta.                                  |
| Emisor · `range`       | 1–32768                             | Distancia total del recorrido, incluida la suma de todos sus tramos.                            |
| Emisor · `maxBounces`  | entero 0–32                         | Presupuesto de reflexiones; 0 muestra solo el primer tramo.                                     |
| Receptor · `latch`     | booleano                            | Activado: recuerda la iluminación hasta reiniciar. Desactivado: señal solo mientras llega luz.  |

La cara NW recibe luz desde la izquierda y la refleja arriba; NE recibe desde la derecha y refleja arriba; SE recibe desde la derecha y refleja abajo; SW recibe desde la izquierda y refleja abajo. También funcionan los recorridos verticales inversos sobre esas mismas caras. El reverso absorbe luz. La superficie óptica es un segmento finito centrado en el eje exportado `[256,268]`, escalado con el dibujo y separado del collider de la base. Mover el espejo desplaza ambos. Si el espejo cae bajo el límite del nivel, se reinicia el intento completo.

El haz selecciona el contacto más cercano. Terreno, paredes, bloques, cintas, plataformas y puertas cerradas lo detienen. El propio jugador es transparente al haz, que no causa daño. El primer receptor alcanzado termina ese recorrido. El emisor usa el tile de luz original como marcador: este pack no incluye una carcasa de emisor. No se inventó un PNG para ella.

El límite duro es de 16 emisores, 32 rebotes por emisor y 33 tramos por trazado. Visitar de nuevo el mismo espejo con la misma dirección termina el circuito. Las señales se propagan en pasos físicos; no hay recursión de activación. Para puzzles de alineación, deja `latch=false`; para abrir una ruta permanente, usa `latch=true`. Coloca el efecto del receptor sobre su lente y reserva espacio para empujar o saltar la base.

### Mantener Acción para orientar

A pie, apoyado y a 96 unidades o menos de la base, sin una pared intermedia, **mantén Acción / E / Shift**. Aparece un mando circular; arrastra con ratón o con un segundo dedo. La flecha indica la normal de la cara reflectante, no la dirección de salida del haz. A/D gira continuamente; con el mando enfocado, las flechas ajustan 1°. El jugador deja de caminar y lanzar poderes durante el ajuste. El mundo y el reloj continúan.

**Soltar Acción cierra el mando y conserva el ángulo.** Un toque no deja un modo activo. Escape cancela y exige soltar antes de abrir de nuevo. Pausar, perder el foco o alejarse termina la interacción. En móvil se muestran botones cerca del espejo incluso si está seleccionado el modo gestos; Acción permanece montado y en el mismo sitio para mantenerlo con un dedo. El control no atraviesa paredes ni funciona en el aire. Si hay varios espejos cerca, selecciona el más próximo.

La reflexión admite ángulos continuos, incluidos haces diagonales, conservando cara posterior, oclusión, alcance y límite de rebotes. Los tramos gráficos se reutilizan durante el giro. Los cambios del intento no escriben el JSON: R restaura el ángulo inicial guardado y toda la partida. Los documentos antiguos sin `angle` ni `rotatable` siguen siendo válidos, sin migrar saves.

## Poleas y contrapesos

Abre **lab-pulleys**. Tierra empieza sobre la plataforma: su peso la baja 200 unidades mientras el contrapeso sube exactamente 200. Camina hacia la derecha hasta abandonar la plataforma y observa el retorno. Son dos objetos físicos distintos enlazados por ID; las cuerdas y ruedas son presentación, sin colisión propia.

| Propiedad           | Valores                      | Efecto real                                                                                               |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `counterweightId`   | ID de un Contrapeso de polea | Una sola plataforma puede poseer ese contrapeso. Vacío: plataforma inmóvil y aviso en el selector.        |
| `travelY`           | −8192 a −1 o 1 a 8192        | Desplazamiento final de la plataforma desde su posición guardada. El contrapeso recorre el valor opuesto. |
| `speed`             | 1–300 unidades/s             | Velocidad del par.                                                                                        |
| `mode`              | `weight` / `signal`          | Decide el destino por carga o por activación.                                                             |
| `threshold`         | 0.1–100                      | Diferencia adicional de carga requerida en modo peso.                                                     |
| Contrapeso · `mass` | 0–100                        | Resistencia propia del contrapeso.                                                                        |

En modo peso, la plataforma se dirige al extremo cuando está activa y **carga sobre plataforma − carga sobre contrapeso ≥ threshold + mass**. Tierra pesa 2, los otros elementos 1 y los bloques/espejos móviles 3. Solo cuenta contacto real desde arriba, incluyendo al jugador apoyado sobre un bloque transportado. Al quitar peso o desactivar la alimentación regresa al origen; en modo señal basta con la activación, sin pesar ocupantes. Un bloque ya fijado a su placa conserva su anclaje y no se transporta.

Ambos cuerpos y sus pasajeros se comprueban antes de mover cualquiera de ellos. Un obstáculo o techo detiene el par: no se comprime ni expulsa al jugador. El desplazamiento es simétrico, tiene dos límites y no depende de la animación de rueda. Reserva dos corredores libres, incluidos los cuerpos completos y la altura del jugador. Un recorrido bloqueado es un problema de diseño que el editor estructural no puede resolver. Para un ascensor activado por luz, conecta `requires` al receptor y elige `mode=signal`.

## Cintas transportadoras

Abre **lab-conveyors**. Sin tocar movimiento, el jugador y el bloque avanzan. El bloque cae por su borde y puede activar la placa clásica. Poder junto al interruptor alterna encendido/apagado. La cinta conserva su superficie sólida cuando está apagada.

| Propiedad                | Valores                      | Efecto real                                                                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `segments`               | entero 1–32                  | Módulos centrales entre dos extremos. El inspector extiende dibujo y collider conservando los márgenes. |
| `speed`                  | 1–500 unidades/s             | Transporte añadido a la posición del cuerpo apoyado.                                                    |
| `direction`              | `1` derecha / `-1` izquierda | Dirección del transporte y del loop gráfico.                                                            |
| `requires` / `autostart` | IDs / booleano               | Alimentación; admite las órdenes de interruptor anteriores.                                             |

El montaje conserva módulos, cinta y rodillos separados. Se reproducen los spritesheets reales de movimiento, arranque y parada; el loop de movimiento se ajusta a la velocidad. Los clips originales de arranque/parada son derechos: se espejan para presentar esos transitorios a la izquierda. La física cambia inmediatamente con la señal; los transitorios gráficos no retrasan el control.

Solo se transportan cuerpos realmente apoyados: jugador, bloque y espejo móvil. Un salto deja de recibir transporte. No se aplica una segunda vez cuando un cuerpo toca dos cintas contiguas; se elige la de mayor contacto, con desempate estable por ID. El desplazamiento se comprueba contra paredes incluso de una unidad de grosor. Los bloques fijados a una placa no vuelven a desplazarse. Al abandonar el borde no se inventa un lanzamiento horizontal: continúa su física habitual.

Para puzzles, coloca una placa bajo el extremo o conecta un receptor a la alimentación. Prueba también caminar contra la cinta, detenerse, saltar y dejar caer carga. Aumenta segmentos desde su campo específico para extender a la vez el collider; redimensionar el arte con el asa mantiene el collider independiente, como en el resto del editor.

## Compuertas direccionales

Abre **lab-directional-gates**. Usa Poder junto al primer interruptor, cruza a la derecha y prueba regresar. El segundo interruptor vuelve a bloquear el mecanismo.

`direction=1` admite entrada desde la izquierda; `direction=-1`, desde la derecha. `autostart=true` significa desbloqueada si no hay requisitos. Activa/desactiva mediante `requires` o un interruptor. El collider tiene un mínimo de 24 unidades de ancho y debe cubrir el paso que diseñes. El preset usa la abertura medida del marco `[166,147,180,330]` sobre un canvas de 512 × 512.

La decisión de colisión es por cuerpo y compara su posición anterior. Un jugador, bloque o espejo que entra por el lado permitido conserva permiso hasta salir por completo. Bloquearla durante ese cruce le permite terminar; después impide otra entrada. Los demás cuerpos siguen respetando su propia dirección aunque el panel esté visualmente abierto para alguien. Caer desde arriba no concede permiso lateral. El paso en sentido contrario sigue cerrado aun estando desbloqueada.

Se usan panel independiente, marco, flecha y candado. Los spritesheets reales abren, cierran y desbloquean; nunca deciden el estado físico. La dirección izquierda espeja la flecha. Para impedir un salto sobre ella, añade techo o diseña un corredor, como el laboratorio. Una compuerta no crea paredes exteriores automáticamente.

## Assets auditados y estados

`advanced-assets-audit.json` registra ruta, dimensiones PNG, frames, fps y SHA-256 de cada componente y sheet original. `advancedManifest.json` registra solamente las texturas que necesitan estas piezas. Se cargan por tipo presente en el nivel; solo los niveles con estas familias solicitan sus texturas avanzadas. No se modifica el presupuesto de personajes.

| Familia     | Exportaciones medidas                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reflectores | Base y cabezas 512 × 512, receptor 512 × 512, tiles de luz 256 × 256. Rotación 6 × 512 a 12 fps; impacto 6 × 256 a 16 fps; activación de receptor 6 × 512 a 12 fps.                  |
| Poleas      | Plataforma 1024 × 512; carcasa, rueda y contrapeso 512 × 512; cuerda y topes 256 × 256. Rueda 8 × 512 a 12 fps; activación de contrapeso 6 × 512 a 12 fps; impacto 4 × 256 a 16 fps. |
| Cintas      | Componentes 256 × 256. Loops de cinta/rodillos derecha e izquierda: 8 × 256 a 12 fps. Arranque/parada: 4 × 256 a 12 fps.                                                             |
| Compuertas  | Marco/panel 512 × 512; flecha/candados 256 × 256. Apertura/cierre: 6 × 512 a 12 fps; desbloqueo: 4 × 256 a 12 fps.                                                                   |

Todos los sheets son tiras horizontales sin separación ni padding. La cabeza original del espejo gira alrededor del eje medido [256,268] con el ángulo físico; la base y su collider no giran. No se cargan sus clips discretos de rotación o impacto. Tampoco se carga el impacto cosmético de polea. Las ruedas, receptores, contrapesos, cintas y compuertas sí usan sus animaciones funcionales. Las imágenes estáticas originales sirven de fallback si un sheet opcional es inválido; la lógica continúa independientemente de la presentación.

## Validación reproducible

Comprobaciones del proyecto: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format:check`.

Con Chrome y Playwright externos disponibles, ejecuta `scripts/advanced-mechanisms-smoke.js`, `scripts/advanced-edge-smoke.js` y `scripts/advanced-editor-smoke.js`. Admiten `PLAYWRIGHT_MODULE`, `VEYLITH_URL`, `SMOKE_OUTPUT` y `BROWSER_CHANNEL`. Usan acciones normales del juego y el editor real. El editor de prueba crea/elimina exclusivamente un archivo temporal con ID propio. `scripts/earth-campaign-smoke.js` recorre los diez niveles canónicos, sin escribirlos.

`scripts/reflector-hold-smoke.js` verifica giro diagonal, tecla mantenida, dos contactos táctiles, liberación individual y reinicio. `scripts/reflector-editor-smoke.js` comprueba ángulo editable, guardado/reapertura en una copia temporal, pausa, pérdida de foco, reinicio, tres tamaños y regreso al editor. Aceptan las mismas variables de entorno y no añaden dependencias al juego.

Los tests geométricos comprueban las cuatro normales, la cara posterior, oclusión, alcance acumulado, ciclos, presupuesto de rebotes, transporte frente a paredes finas, límites de poleas, entradas direccionales, validación, enlaces y persistencia. Las pruebas de navegador documentan por separado sus resultados y frames realmente observados. No equivalen a una validación nativa o de rendimiento/memoria en iPhone físico.
