# Escenarios ilustrados

> Campaña vigente (27 de octubre de 2026): [diez niveles ilustrados, soluciones y validación](illustrated-campaign.md). Las cifras y diseños históricos de esta página corresponden a su etapa original.

Integración del 25 de octubre de 2026 en `/Users/francismartinez/Projects/Elements`. No cambia la campaña ni los PNG originales.

## Archivos reales

Solo se encontró un paquete ilustrado: `public/assets/environments/illustrated_levels/level_02`, «Dos pesos, una salida», manifiesto `veylith-illustrated-environment` v1. El lienzo exportado mide **1536 × 576**, origen superior izquierdo, X hacia la derecha, Y hacia abajo. La referencia original se declara de 1536 × 1024, con franja instructiva excluida; el master limpio incluido mide 2048 × 768. No son las dimensiones de importación.

| Archivo relativo                | Dimensiones | Transparencia medida                                 |
| ------------------------------- | ----------- | ---------------------------------------------------- |
| `background/background.png`     | 1536 × 576  | RGB opaco                                            |
| `static_world/static_world.png` | 1536 × 576  | RGBA: 502402 píxeles transparentes; 380137 parciales |
| `foreground/foreground.png`     | 1536 × 576  | RGBA: 860702 píxeles transparentes; 23981 parciales  |

Cada capa también trae tres secciones alternativas de 512 × 576. La auditoría comprueba que sus píxeles coinciden exactamente con los recortes de la capa completa. No se cargan ambas variantes.

| Animación         | Hoja bajo `animated/<nombre>/`         | Celda     | Fotogramas / FPS |
| ----------------- | -------------------------------------- | --------- | ---------------- |
| waterfall         | waterfall_sheet.png, 640 × 384         | 160 × 192 | 8 / 12           |
| water_surface     | water_surface_sheet.png, 1024 × 192    | 256 × 96  | 8 / 8            |
| hanging_vine      | hanging_vine_sheet.png, 512 × 512      | 128 × 256 | 8 / 4            |
| moving_leaves     | moving_leaves_sheet.png, 512 × 256     | 128 × 128 | 8 / 6            |
| mist              | mist_sheet.png, 1024 × 192             | 256 × 96  | 8 / 4            |
| magical_particles | magical_particles_sheet.png, 512 × 256 | 128 × 128 | 8 / 4            |

Todas las hojas son RGBA, cuatro columnas por dos filas, orden por filas, bucle continuo. Se verificaron los 48 PNG individuales `frames/frame_00.png` a `frame_07.png`. El alfa coincide exactamente con las celdas; existen diferencias RGB de redondeo de como máximo 1/255, registradas por fotograma. El runtime usa las hojas del manifiesto.

Las **11 instancias** son `distant_fall`, `upper_right_fall`, `lower_right_fall`, `basin_ripples`, `cascade_mist`, `upper_shelf_vine`, `right_ledge_vine`, `leaves_left`, `leaves_middle`, `motes_middle` y `motes_ruins`. Todas tienen coordenadas, tamaño, profundidad, opacidad y fase reales en el manifiesto.

Inventario: **73 PNG** = tres capas + nueve secciones + seis hojas + 48 fotogramas + tres alineaciones + cuatro previews PNG. También existen dos previews animados (GIF/WebP), dos JSON (`manifest`, `validation`) y dos TXT (`IMPORT_README`, `GENERATION_PROMPTS`). Los previews PNG son `composite` (1536 × 576), `static_composite` (1536 × 576), `clean_composite_native` (2048 × 768) y `animation_contact_sheet` (1536 × 864). Los GIF/WebP no se usan como texturas del juego.

La comparación visual de `static_composite` y `composite` no mostró cascadas duplicadas en las capas estáticas; coincide con `waterBakedIntoStaticLayers: false`. La hiedra corta adherida a las piedras sigue estática deliberadamente. Las imágenes de `animated/alignment` contienen efectos de registro y **no se renderizan** debajo de los sprites. Las vigas fijas y el hueco de puerta son parte del paisaje; bloques, placas, elevador y puerta interactiva deben añadirse por separado. El paquete es una reconstrucción ilustrada, no una separación idéntica a la referencia ni un nivel jugable predefinido.

## Uso del editor

1. Abre `/editor` en desarrollo. En Biblioteca → **Escenarios ilustrados**, pulsa o arrastra **Escenario · Dos pesos, una salida**. Se coloca con escala 100 %: un píxel equivale a una unidad del mundo. No mueve ni rediseña objetos existentes.
2. Ajusta **Posición X/Y**, **Escala del escenario (%)** o ancho/alto. Se conserva la relación 8:3; el asa azul también escala uniformemente. Las capas y animaciones se transforman juntas. Los colliders y mecanismos permanecen independientes; para trasladar también estos objetos usa selección múltiple.
3. El inspector permite activar cada capa. El orden original usa `z - 25 + Capa`: fondo −25, agua detrás −15…−13, mundo −5, overlays delanteros 5…7 y primer plano 15. El jugador conserva profundidad 0. La propiedad Capa desplaza el conjunto; no cambia la física. Las ilustraciones tienen menor prioridad al seleccionar que los objetos interactivos y colliders; también pueden seleccionarse desde la lista.
4. Añade **Box Collider independiente** desde biblioteca o activa **Dibujar collider** y arrastra un rectángulo. Desactiva el modo de dibujo para seleccionar/mover. Activa **Editar collider** para mover el rectángulo o cambiarlo con sus ocho asas. Los valores y offsets también son numéricos. Verde indica colisión activa; naranja, desactivada. Todos los Box Colliders son guías del editor e invisibles en gameplay. Por defecto, el jugador puede atravesarlos desde abajo y por los lados, y aterrizar encima al caer. Para una pared, selecciona **Pared sólida** en **Caras sólidas para el personaje**, o activa solo los lados que necesites. Estos valores se guardan con cada collider. Los bloques y proyectiles conservan sus propias colisiones. No incorporan pendientes. Ocultar un objeto no desactiva la física; usa Colisión activa.
5. Expande una instancia ambiental para ajustar X/Y locales, ancho/alto, escala, orden z, opacidad, fotograma inicial y FPS. Puedes desactivarla, quitarla o añadir otra instancia de una animación registrada. Las coordenadas incluyen todo el padding transparente, sin recorte. Las animaciones se reproducen tanto en editor como en juego y se pausan con la escena.
6. **Guardar**, **Guardar como**, **Abrir**, deshacer/rehacer y duplicación conservan estos objetos en JSON v1. **Probar** usa una copia del borrador y la física real, sin escribir progreso ni saldo. Los límites y validaciones existentes siguen activos.

El modo modular sigue disponible y puede combinarse con ilustraciones. Los fondos históricos no se desactivan automáticamente al colocar un escenario; se controlan en Propiedades del nivel. El laboratorio los desactiva explícitamente en su propio JSON.

## Catálogo, validación y carga

`node scripts/integrate-illustrated-assets.js` examina los manifiestos reales bajo `illustrated_levels`, verifica archivos, dimensiones, alfa, fotogramas y secciones, y genera `src/game/assets/illustratedManifest.json` y `docs/asset-illustrated-audit.json`. No modifica PNG. `--check` comprueba ambos registros sin escribir. Para incorporar otro paquete compatible: coloca sus archivos, ejecuta el importador y recarga el editor. No hay subida de archivos arbitrarios desde el navegador.

No se inventan capas o animaciones inexistentes. Las instancias sin coordenadas completas se registran desactivadas y muestran una advertencia para colocarlas en el inspector; las animaciones sin instancia también quedan disponibles desactivadas. Si no se confirma la separación de agua estática, los overlays empiezan apagados. El paquete actual no necesita estos fallbacks. No hay una prueba visual de otro paquete incompleto.

La carga se deduplica por recurso y solo solicita capas/overlays visibles del nivel. El paquete completo usa **nueve texturas y 14,5625 MiB RGBA** antes de copias GPU, buffers y mipmaps. Las tres cascadas comparten hoja; los demás efectos también se reutilizan. No se cargan los 48 fotogramas sueltos, secciones, master, composites, alineaciones ni previews. Un nivel modular solicita cero texturas ilustradas. Al quitar o desactivar arte del editor se liberan sus texturas sin uso; duplicar un escenario no duplica la memoria de las texturas. Las animaciones son locales al sprite, evitando registros globales obsoletos al liberar texturas. El importador rechaza texturas mayores de 4096 por lado para exigir una estrategia explícita de secciones antes de registrar paquetes enormes; esta versión no hace streaming de secciones.

El esquema rechaza escenas/animaciones/capas desconocidas, tamaños no positivos, deformación del escenario, FPS fuera de 1–60, opacidad fuera de 0–1, fase fuera de los fotogramas existentes y colliders activos en el objeto ilustración. Se mantienen hasta 500 objetos por nivel, con máximo 100 overlays por escenario y 1024 capas/overlays ilustrados en total. Los errores de carga se muestran en editor; playtest aborta con el error de asset requerido. La exportación de producción conserva soporte de render para un nivel ilustrado guardado, pero excluye editor, importador y API de escritura.

## Laboratorio y comprobación

Abre **Laboratorio · Escenario ilustrado (`lab-illustrated`)**. Es un nivel adicional, fuera de campaña: arte a 200 %, ocho Box Colliders manuales para suelo, superficies y pared; gema Tierra, bloque con gravedad, placa, plataforma modular de madera, moneda y portal. El recorrido validado baja al suelo, recoge Tierra, empuja el bloque a la placa y salta por la plataforma y el pequeño pilar hasta la salida. No pretende reproducir «Dos pesos, una salida» completo ni aportar colisión exhaustiva para cada columna pintada.

`scripts/illustrated-editor-smoke.js` usa Chrome/Playwright externo (`PLAYWRIGHT_MODULE`, `VEYLITH_URL`, `SMOKE_OUTPUT`), crea y elimina solo una copia temporal y verifica edición, collider dibujado, historial, guardado/reapertura, capas, overlays, montaje, resize, reinicio y regreso al editor. Su harness de desarrollo recorre el laboratorio con entradas normales, comprueba caída/contacto/empuje/gema/placa/salida, número de texturas, orden de capas, animación y ausencia de acumulación al reiniciar. También prueba paredes desactivadas, caída sin suelo y niveles solo modulares.

Pruebas unitarias: `illustratedLevels.test.ts` cubre persistencia con rechazo de escrituras inválidas, historia, escala y colliders independientes, validación de entradas y selección/liberación de texturas. La suite completa conserva 12 fallos previos de campaña: nueve en `campaignIntegrity`, uno en `environmentAssets`, uno en `heavyBlock` y uno en `localization`. Se reprodujeron los mismos fallos con el código anterior en una copia separada. No se corrigen reescribiendo los niveles del usuario.

Pendiente: perfil de memoria/rendimiento en iPhone real y un recorrido diseñado del nivel completo de referencia. No se modificó configuración nativa. Los colliders del laboratorio son rectangulares y aproximan las superficies pintadas; ajustar colisión de un nivel de producción sigue siendo trabajo manual.

Resultado final: typecheck, lint y build correctos; navegador sin errores y recorrido completado. La suite tiene 558 pruebas: 546 correctas y los 12 fallos previos descritos. `format:check` solo señala `forest-1.json` y `forest-2.json`, archivos existentes conservados byte por byte. Se verificaron por hash los 73 PNG originales y la igualdad de los diez JSON de campaña; la copia temporal del smoke se eliminó. El build conserva el aviso de chunks mayores de 500 kB.
