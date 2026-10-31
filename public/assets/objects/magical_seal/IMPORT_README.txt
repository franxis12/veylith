VEYLITH — SELLO MAGICO DEL ARCO ANTIGUO

CONTENIDO
Sprites PNG de energia exclusivamente. No contienen piedra, puerta, suelo, personajes,
interfaz, fondo ni cuadricula de transparencia. La captura original solo aparece en
las vistas de validacion dentro de preview/.

ANIMACIONES PRINCIPALES
SEALED_IDLE: 8 fotogramas, 6 FPS, bucle.
SEAL_BREAK: 10 fotogramas, 10 FPS, una reproduccion; mantener el ultimo fotograma vacio.
SEAL_ACTIVATE: 8 fotogramas, 8 FPS, una reproduccion; pasar a SEALED_IDLE desde el fotograma 01.

Cada fotograma mide 512 x 1024 px. PNG RGBA, sRGB, alpha recto/no premultiplicado.
Anclaje comun: centro inferior (0.5, 1), equivalente a (256, 1024) px.
Mezcla recomendada: normal / source-over. No se necesita mezcla aditiva.

ATLAS Y FOTOGRAMAS
seal_idle_spritesheet.png: 2048 x 2048; 4 columnas x 2 filas.
seal_break_spritesheet.png: 2560 x 2048; 5 columnas x 2 filas.
seal_activate_spritesheet.png: 2048 x 2048; 4 columnas x 2 filas.
Orden: izquierda a derecha y despues de arriba abajo.
Los PNG individuales estan en idle/frames/, break/frames/ y activate/frames/.
La numeracion comienza en frame_01.png.
manifest.json incluye las dimensiones y el rectangulo de cada celda.

AJUSTE A LA CAPTURA APORTADA
Captura: 968 x 1096 px.
Escala uniforme sugerida: 0.5625.
Tamano mostrado: 288 x 576 px.
Posicion superior izquierda: (374, 520).
Posicion del anclaje inferior central: (518, 1096).
Rotacion: 0 grados.
Estos valores estan expresados en pixeles de la captura, no en unidades del motor.
Si la vista del editor usa otro zoom, aplicar el mismo factor uniforme a posicion y tamano.

La mascara sigue el contorno interior del arco con un pequeno margen respecto a la piedra.
Todos los fotogramas principales usan la misma mascara vfx/arch_clip_mask.png.
El soporte alpha del Idle es identico en los ocho fotogramas. Durante la disolucion
pueden aparecer huecos interiores, pero ningun fragmento rebasa esa envolvente fija.
La mascara es una ayuda tecnica; no debe mostrarse como una capa visible del juego.

LIMITACION DE LA REFERENCIA
El borde inferior de la captura corta el suelo. Se usa ese borde como base provisional.
La linea visible de energia queda en Y=1093.75, con el anclaje en Y=1096.
Verificar la altura final del suelo en el Level Editor: no es posible comprobar el
contacto con una parte del suelo que no aparece en la captura. El encaje lateral y
superior se ha revisado sobre la arquitectura visible.

TRANSICIONES GARANTIZADAS
Break 01 es una copia exacta de Idle 01.
Break 10 tiene todos sus canales RGBA a cero.
Activate 01 es completamente transparente.
Activate 08 es una copia exacta de Idle 01.
La activacion reutiliza en orden inverso los estados de ruptura 10, 09, 08, 07, 06, 04, 02, 01.
No se ha desplazado ni recentrado el contenido al reducirse los fragmentos.

EFECTOS OPCIONALES
vfx/golden_rune_particles/
vfx/turquoise_sparks/
vfx/seal_breaking_flash/
vfx/residual_magical_dust/
Cada efecto es independiente: un PNG de referencia, cuatro fotogramas de pulso/desvanecimiento
de 128 x 128 px y un atlas de 512 x 128 px. Reproduccion sugerida: 12 FPS, una vez.
El cuarto fotograma es transparente. Usar sus posiciones sugeridas del manifiesto.
Son opcionales y no estan incorporados a las animaciones principales del sello.

VISTAS PREVIAS
preview/idle.webp, break.webp, activate.webp: animaciones transparentes de los sprites.
preview/seal_in_original_archway.png: superposicion sobre la captura original.
preview/idle_in_archway.gif, break_in_archway.gif, activate_in_archway.gif:
vistas animadas sobre la captura; Break y Activate se reproducen una sola vez.
preview/seal_lifecycle_in_archway.gif: demostracion repetida de las tres fases.
preview/animation_contact_sheet.png: Idle en la fila superior, Break en la central,
Activate en la inferior. Las celdas finales sin usar quedan vacias.
La arquitectura de estas vistas previas no debe importarse como parte del sprite.

VALIDACION Y PROCEDENCIA
validation.json contiene las comprobaciones de dimensiones, alpha, contorno, transiciones,
fotogramas vacios y cierre del bucle. Ningun pixel fuera del sello fue alterado al
componer la vista de validacion sobre la captura en sRGB.
Se utilizo generacion de imagenes integrada para el arte. La normalizacion tecnica
incluye registro sobre una mascara fija, interpolacion ciclica de poses interiores,
control de transparencia, empaquetado y exportacion. GENERATION_PROMPTS.txt conserva
las indicaciones de generacion utilizadas. No se incluyo codigo de juego ni colisiones.
No se modificaron recursos anteriores del proyecto.
