# Ancient Forest — capítulo de Tierra

Revisión del 21 de octubre de 2026. Los primeros diez niveles empiezan y terminan como **Tierra**. No contienen gemas de transformación, depósitos, antorchas, calderas ni pruebas de planeo. Las capacidades de los otros elementos siguen disponibles en el motor y en los prototipos anteriores.

## Qué cambió y por qué

La versión anterior era una colección de demostraciones: ocho recorridos duraban aproximadamente 8–12 segundos en la reproducción automatizada; predominaban el suelo continuo y una interacción aislada. Se sustituyeron los diez mapas por espacios con aproximación, reto central y salida: canteras con desnivel, muelles, islas, talleres elevados y un santuario encadenado. El capítulo progresa desde contacto y salto corto hasta transportar un contrapeso, esperar plataformas móviles y empujar desde el lado correcto.

Los mapas miden entre 4096 y 6400 unidades. La duración no se alarga con puertas temporizadas ni esperas obligatorias artificiales. Los ascensores y la balsa regresan; perder una salida no obliga a reiniciar. El único tiempo de espera inherente es el desplazamiento físico del mecanismo. Se corrigió un atasco por redondeo al regresar al muelle: un solapamiento menor de 0,01 unidades ya no impide a una plataforma alcanzar su extremo y cambiar de dirección. Las colisiones reales siguen frenando la plataforma y los peligros conservan sus límites exactos. Los puentes necesitan terminar de extenderse antes de pisarlos.

Datos editables: `src/game/levels/data/forest-*.json`, formato `LevelDocument` v1. No existe una segunda versión de los mapas en TypeScript. `scripts/earth-routes.json` contiene únicamente instrucciones para las pruebas, no datos usados por el juego. Todos se abren desde `/editor` → Abrir.

## Reglas comunes

- Tierra mueve bloques caminando contra ellos mientras está apoyada; Poder rompe muros y acciona palancas próximas. Un muro normal necesita un golpe; el último sello necesita dos.
- El salto real tiene un máximo aproximado de 65–70 unidades. Los escalones obligatorios suben 40; los huecos de las islas miden 96. No se requiere doble salto ni planeo. El bloque tiene arte de 192 × 186 y un cuerpo de 192 × 180 (antes 64 × 62 y 64 × 56). Las placas están en rebajes de 128: el bloque encajado queda aproximadamente 52–53 por encima del acceso y funciona como escalón. No se aumentó el salto para compensarlo.
- La animación de empuje usa los sprites originales de Tierra: inicio de 4 fotogramas, ciclo de 8 y final de 3, a 10 fps. Se activa por contacto lateral real con un bloque apoyado y sin resolver, en ambas direcciones; salto, caída y Poder tienen prioridad. Soltar la dirección termina la pose.
- Las palancas arrancan apagadas; muros intactos, placas vacías y puentes retraídos. Una placa encajada queda activada. Los muros destruidos permanecen abiertos. Cada reinicio restaura todos los estados y monedas del intento.
- El agua bajo los puentes es peligrosa para Tierra. El aviso aparece antes del primer lago; las orillas de aterrizaje están a la vista. Las caídas reinician el nivel completo: todavía no hay checkpoints.
- Los ventiladores no desplazan a Tierra. Sirven para mostrar su resistencia; el reto del nivel 3 son el acceso al puesto y los dos pasos enlazados.
- Las monedas doradas son opcionales y no cambian la forma. Cada moneda conserva su ID y valor anteriores. Cobrarla requiere completar el nivel; reiniciar no da dinero.
- Cámara: seguimiento con anticipación a la derecha, límites del mapa y seguimiento vertical existentes. La geometría deja espacio sobre el personaje y delante de los saltos. Terreno y colliders permanecen editables por separado.
- Controles: flechas/A-D, Espacio para saltar, E/Shift para Poder, R para reiniciar; equivalentes táctiles existentes. No hay cambio manual de forma.

## Orden, dificultad y estrellas

Los IDs se mantienen para conservar las partidas; el orden de menú no es su orden numérico. Las metas son iniciales y deben ajustarse con jugadores. Una partida más lenta siempre puede terminar con una estrella.

| Nº  | ID        | Nivel                    | Dificultad               | 3★ / 2★    | Recompensa 1/2/3★ | Monedas opcionales |
| --- | --------- | ------------------------ | ------------------------ | ---------- | ----------------- | ------------------ |
| 1   | forest-1  | El primer despertar      | Iniciación               | 40 / 80 s  | 30/60/100         | 5                  |
| 2   | forest-2  | La cantera hundida       | Fácil                    | 45 / 90 s  | 30/60/100         | 5                  |
| 3   | forest-6  | Contra el viento         | Fácil                    | 45 / 90 s  | 30/60/100         | 5                  |
| 4   | forest-7  | Las islas del lago       | Media                    | 45 / 90 s  | 30/60/100         | 5                  |
| 5   | forest-8  | La escalera rota         | Media                    | 45 / 90 s  | 30/60/100         | 5                  |
| 6   | forest-9  | La máquina dormida       | Media                    | 55 / 110 s | 30/60/100         | 5                  |
| 7   | forest-10 | El puente engañoso       | Media                    | 55 / 110 s | 30/60/100         | 5                  |
| 8   | forest-3  | El camino de las alturas | Media                    | 55 / 110 s | 30/60/100         | 5                  |
| 9   | forest-4  | El peso de la decisión   | Media-alta               | 55 / 110 s | 30/60/100         | 5                  |
| 10  | forest-5  | El santuario de piedra   | Alta dentro del capítulo | 75 / 150 s | 50/100/150        | 15                 |

La recompensa por estrellas es un derecho acumulado: mejorar paga solo la diferencia. Las monedas se pagan una vez por ID al ganar. No se modificó el servicio de progreso.

## 1. El primer despertar

**Cambio:** el depósito aislado se convierte en aprendizaje gradual de Tierra con dos terrazas, un patio de contrapeso y un recinto sellado.

Inicio `(180,760)`. Sube los bordes X=512 y 768, de 40 unidades cada uno. Empuja el bloque de X=1320 a la placa hundida `(1712,808)`; la puerta X=2020 abre. Salta sobre el bloque encajado, sube los tres escalones X=2304/2560/2816 y rompe `grove-wall` desde su izquierda, cerca de X=3255. Portal `(3850,560)`, requiere `plate` + `grove-wall`.

Sin peligro mortal ni falsas pistas en el recorrido. La moneda `first-hop` premia el último salto de aproximación. La puerta y el portal impiden terminar omitiendo el contrapeso. Tiempo de aprendizaje esperado: 45–90 s; meta de dominio: 40 s.

## 2. La cantera hundida

**Cambio:** dos antorchas sobre una explanada se sustituyen por transporte vertical y recuperación del contrapeso.

Inicio `(180,560)`. Rompe `rim-wall` en X=680. Empuja el bloque de X=900 por el borde X=1024. Déjalo caer a Y=800, baja por su izquierda y empújalo hasta la placa hundida `(1840,928)`. Baja detrás del bloque: su altura libre no se puede saltar. Si te adelantas y quedas al otro lado, reinicia; el nivel 9 enseña un acceso superior para empujar en sentido contrario. La puerta X=2110 abre. Sube cinco terrazas hasta Y=600, recoge opcionalmente `torch-bonus`, rompe `root-wall` X=3950 y llega a `(4380,600)`.

El portal exige ambos muros y la placa. El error razonable es dejar el bloque arriba o adelantarse a él durante la caída. La pista anuncia que debe bajar contigo; no hay un reinicio automático por perder la posición. La cantera no tiene agua ni huecos mortales. Aprendizaje: 60–120 s; meta: 45 s.

## 3. Contra el viento

**Cambio:** caminar contra un ventilador y golpear una pared deja de ser todo el nivel. Ahora hay un puesto elevado, dos puentes y un patio intermedio.

Inicio `(180,760)`. Tres ascensos de 40 llevan al puesto Y=640. `wind-lever` X=1550 abre `first-bridge` (1792–2304). Tierra atraviesa el viento sin retroceso. Rompe `wind-wall` X=2690 para abrir `second-bridge` (3072–3584). Portal `(4360,640)` requiere ambas señales. `wind-reward` requiere un salto opcional en el patio.

El agua está a Y=910 bajo los puentes. Intentar cruzar antes de extenderlos produce caída visible. No hay una gema oculta ni un supuesto poder para apagar el ventilador. Aprendizaje: 60–100 s; meta: 45 s.

## 4. Las islas del lago

**Cambio:** se elimina caminar sobre el lago como Agua. Tierra debe abrir pasos y saltar entre piedras.

Inicio `(180,740)`. Sube dos terrazas y acciona `island-lever` X=860. El primer puente lleva a la isla (1536–2048), donde `island-wall` X=1770 abre el segundo puente (2048–2560). Cruza tres piedras de 256 de ancho a Y=660, con huecos de 96: lanza los saltos aproximadamente desde X=2760 y 3110. Portal `(4350,660)` requiere palanca y muro.

`lake-reward` está sobre la piedra central: recogerla es opcional. El agua Y=900 reinicia; no hay aterrizajes ocultos. Se enseña a detenerse en una isla antes del siguiente salto. Aprendizaje: 60–120 s; meta: 45 s.

## 5. La escalera rota

**Cambio:** la cornisa que exigía el doble salto de Fuego ahora es un problema de transporte para Tierra.

Inicio `(180,760)`. `lift-lever` X=820 activa `lift`: plataforma X=1024–1376, recorrido Y=800→480 (40 por debajo del muelle para facilitar el embarque). Espera su regreso, sube y salta a la cornisa X=1408 cuando esté arriba. Rompe `high-wall` X=1820 para extender el puente 2176–2688. Tres terrazas finales suben a Y=360; `double-jump-reward` conserva su ID histórico, pero se obtiene con el salto de Tierra. Portal `(4360,360)` exige palanca y muro.

La falsa solución es saltar directamente 280 unidades; queda descartada por la altura visible y la palanca próxima. Perder el ascensor permite volver a esperar. El agua está bajo el vacío, a Y=1030. Aprendizaje: 75–140 s; meta: 45 s.

## 6. La máquina dormida

**Cambio:** se retira la secuencia Agua/Fuego de la caldera. La máquina tiene una zona de acceso y un taller superior con contrapeso.

Inicio `(180,800)`. Dos escalones llevan a Y=720. Rompe `engine-wall` X=1200 y acciona `engine-lever` X=1570. El ascensor X=1792–2144 necesita **ambas** señales y sube de Y=760 a Y=440, con su parada inferior 40 por debajo del muelle; desembarca en X=2176. Empuja el bloque X=2430 a la placa hundida `(2992,568)` para extender el puente 3712–4224. Portal `(4860,440)` exige muro, palanca y placa.

`lift-reward` es un salto opcional en el taller, lejos del borde. La pista deja claro que el contrapeso se usa arriba; no se sugiere cargar el bloque en el ascensor, función que el motor no implementa. Aprendizaje: 90–150 s; meta: 55 s.

## 7. El puente engañoso

**Cambio:** la gema distractora desaparece. La decisión pasa a ser espacial y recuperable: mirador con recompensa o camino inferior al santuario.

Inicio `(180,680)`. `route-lever` X=800 extiende el puente principal 1024–2304. Las pequeñas plataformas de la subida al mirador comienzan en X=1120 y ascienden de 40 en 40 hasta Y=440. Después del cuarto escalón (termina en X=1632), puedes bajar al puente principal o saltar un hueco de 80 hasta el siguiente escalón X=1712. El mirador X=1968–2224 contiene `bridge-reward` en X=2100. Su cartel anuncia que es un desvío y que se debe regresar al puente inferior. El puente inferior queda dentro de la cámara desde el mirador. Puedes dejarte caer sobre él; no se consume ninguna transformación ni se cierra el regreso.

En la orilla lejana, tres terrazas llevan a Y=560. Rompe `exit-wall` X=4020 y llega al portal `(4360,560)`, que requiere la palanca y el muro, **no la moneda**. El agua Y=960 hace peligroso salir del puente lateralmente. Aprendizaje: 80–150 s; meta con desvío: 55 s.

## 8. El camino de las alturas

**Cambio:** se elimina el planeo obligatorio. El cruce central es una balsa mecánica horizontal que Tierra puede utilizar.

Inicio `(180,720)`. `ferry-lever` X=560 activa la plataforma: empieza en X=768–1088 y viaja 768 unidades a la derecha. Espera y embarca; desembarca en la orilla X=1888 cuando esté cerca. La plataforma vuelve si la pierdes. Cuatro terrazas ascienden a Y=560. Rompe `cliff-wall` X=3650 para abrir el puente 3936–4320. Portal `(4620,560)` exige palanca y muro.

`landing-reward` invita a un salto de precisión en las terrazas, sobre suelo seguro. El lago Y=990 no se puede cruzar a pie. No hay un planeo implícito ni saltos superiores al alcance de Tierra. Aprendizaje: 90–150 s; meta: 55 s.

## 9. El peso de la decisión

**Cambio:** el bloque ya no se resuelve avanzando siempre a la derecha. La placa está detrás de él.

Inicio `(180,640)`. Sube dos escalones de 40, en X=256 y 512. La pasarela superior X=512–1792, Y=560 permite observar el patio y pasar por encima del bloque X=1640 sin saltarlo desde abajo. Baja por su derecha, cerca de X=1857, y empújalo **hacia la izquierda** hasta la placa hundida `(1296,928)`. La placa abre la puerta X=2290 y el puente 3584–4096. Regresa a la derecha, sube cuatro terrazas, cruza y rompe `weight-wall` X=4330. Portal `(4620,640)` exige placa y muro.

El bloque tiene suelo hasta la placa. El acceso superior sitúa al jugador en el lado correcto; empujarlo inicialmente hacia la derecha permite volver a aproximarse desde ese mismo lado. Bajo la pasarela hay 220 unidades de altura libre para el cuerpo de Tierra de 174. `plate-reward` está en el patio a X=1900. Agua solo bajo el puente final. Aprendizaje: 90–180 s; meta: 55 s.

## 10. El santuario de piedra

**Cambio:** culminación de las habilidades de Tierra; ya no pide cuatro transformaciones.

Inicio `(180,520)`. Empuja el bloque X=830 por el borde X=1024 y bájalo hasta la placa hundida `(1584,888)`; abre `first-seal` X=1930. Sube tres terrazas, rompe `engine-seal` X=2860 y acciona `sanctuary-lever` X=3130. Las tres señales alimentan el ascensor X=3328–3680, Y=680→360, con embarque 40 por debajo del muelle. Desembarca en X=3712, rompe `last-seal` X=4120 con **dos** golpes y cruza el puente 4736–5248. Portal `(6130,360)` exige las cuatro señales principales.

Tres monedas opcionales conservan sus IDs históricos (`sanctuary-water`, `sanctuary-air`, `sanctuary-earth`); ninguna necesita otro elemento. El último sello tiene aviso de dos golpes. El contrapeso se resuelve antes de subir: no hay regreso necesario desde la cornisa. Agua bajo el gran vacío. Aprendizaje: 120–240 s; meta: 75 s.

## Preservación y alcance de las pruebas

Se conservaron IDs de nivel, valores/IDs de monedas, derechos de recompensa y formato de guardado v1. No se borran estrellas ni mejores tiempos existentes: esas marcas procedentes de diseños anteriores quedan conservadas, aunque ya no sean comparables con el trazado nuevo. No se tocó `localStorage` del navegador del usuario. El borrador `forest-1-saved-draft`, los niveles personalizados y los prototipos se conservan. Los diez mapas sustituidos están en `docs/level-archive/before-earth/`. Los PNG originales permanecen intactos. El editor crea nuevos bloques de 192 × 186; no se cambió el tamaño de bloques en borradores guardados o prototipos. Se cargan tres spritesheets de empuje ya suministrados: el presupuesto de personajes pasa de 21/131 MiB a 24/146 MiB de píxeles RGBA; no es una medición de memoria total ni de rendimiento en iPhone.

Las pruebas de tanque, antorchas, gemas y planeo se mantienen contra documentos de regresión congelados (`legacy-element-puzzles.json`), para que el cambio de campaña no elimine cobertura del motor. Las pruebas actuales validan esquema, round trip del editor, exclusividad de Tierra, conexiones, señales requeridas, reinicio, soporte físico de inicio/salida, trayectorias libres de ascensores, un grafo optimista de superficies alcanzables y compatibilidad de progreso.

El grafo asume puentes activados y no demuestra el orden espacial de los mecanismos. La prueba de solucionabilidad más fuerte es la reproducción en navegador con la física real: solamente movimiento, salto y Poder; sin teletransporte, cambio manual de forma ni activación directa de señales. `earth-campaign-smoke.js` guarda pasos, resultados y capturas. `browser-smoke.js` verifica selección, montaje, pausa, redimensionado, desmontaje y reinicio. `campaign-editor-smoke.js` comprueba los diez archivos, las conexiones de un ascensor y el aislamiento del playtest.

## Resultado de la revisión

**Diez de diez niveles completados en Chrome con la física real, exclusivamente como Tierra y sin reiniciar la ruta ganadora.** La prueba compara el documento cargado por el navegador con el JSON canónico y guarda su SHA-256. La ejecución final está identificada como `earth-final-current`; las pruebas previas con bloques de otro tamaño no se usan como evidencia de esta versión.

| Nº  | Nivel                    | Tiempo de la reproducción | Estrellas |
| --- | ------------------------ | ------------------------- | --------- |
| 1   | El primer despertar      | 19.3 s                    | 3★        |
| 2   | La cantera hundida       | 24.8 s                    | 3★        |
| 3   | Contra el viento         | 23.3 s                    | 3★        |
| 4   | Las islas del lago       | 24.5 s                    | 3★        |
| 5   | La escalera rota         | 31.0 s                    | 3★        |
| 6   | La máquina dormida       | 39.0 s                    | 3★        |
| 7   | El puente engañoso       | 25.0 s                    | 3★        |
| 8   | El camino de las alturas | 40.9 s                    | 3★        |
| 9   | El peso de la decisión   | 25.6 s                    | 3★        |
| 10  | El santuario de piedra   | 39.0 s                    | 3★        |

Estos tiempos son de un recorrido automatizado que ya conoce la solución y dependen de la carga del equipo; no son tiempos de jugadores nuevos. Se verificó el desvío con moneda y la ruta inferior sin moneda del nivel 7: ambas permiten ganar. En los niveles 1 y 9 se comprobó el inicio, avance de fotogramas del ciclo y final del empuje, además del desplazamiento real del bloque, en sentidos opuestos. Las capturas muestran el bloque de 192 × 186 y las manos apoyadas sobre su cara.

Typecheck, lint, 355 pruebas automatizadas en 40 archivos, build y comprobación de formato pasaron. El build conserva el aviso de tamaño del bundle de Phaser y Vite avisa sobre una futura configuración nativa; no fueron errores de compilación. Se verificaron por SHA-256 651 PNG originales del personaje/efectos y del Interactive World Pack, sin cambios. Los diez diseños archivados siguen idénticos a la copia anterior.

Las comprobaciones adicionales de reinicio, interfaz y editor se registran por separado en `level-validation.json`. Las rutas ganadoras no demuestran que cada combinación de errores sea recuperable: en las canteras, bajar por el lado incorrecto de un bloque alto puede requerir Reiniciar. El juego no tiene checkpoints. Las monedas opcionales que no aparecen en la ruta ganadora no forman parte de esa prueba de recorrido.

No se ha hecho una sesión de balance con jugadores ni una prueba en iPhone físico. La reproducción automática demuestra rutas concretas; no garantiza ausencia de todos los atascos ni dificultad final. No se añadieron enemigos, checkpoints, nuevas habilidades ni arte original.
