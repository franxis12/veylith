# Editor visual de niveles — MVP

> Campaña vigente (27 de octubre de 2026): [diez niveles ilustrados, soluciones y validación](illustrated-campaign.md). Las cifras y diseños históricos de esta página corresponden a su etapa original.

## Abrir y crear

Desde el proyecto real (`/Users/francismartinez/Projects/Elements`), ejecuta `npm run dev` y abre **`http://localhost:<puerto>/editor`**. Usa el puerto que indique Vite. El editor y su servicio de archivos solo funcionan en desarrollo y desde el mismo ordenador; el juego normal sigue disponible en `/`. El guard `import.meta.env.DEV` elimina la importación del editor de la compilación de producción. `vite preview` y el paquete iOS no incluyen un servicio de escritura.

El editor abre `forest-1` al entrar. **Abrir** permite elegir cualquiera de los diez niveles de campaña o un nivel creado anteriormente. **Nuevo** prepara un borrador con suelo, un inicio y una salida. **Duplicar nivel** copia el documento en memoria con otro ID, sin escribir archivos. Cambia el nombre y los umbrales de estrellas en **Propiedades del nivel**.

## Colocar, mover y seleccionar

La biblioteca de la izquierda usa el registro de assets existente: terreno, plataformas, decoraciones, gemas, objetos interactivos, puertas/portales, inicio y fondos. Arrastra una miniatura al lienzo o haz clic para colocarla en el centro de la vista. Los fondos activan las capas del nivel; no añaden objetos físicos.

El centro es una escena Phaser. Clic selecciona; arrastrar mueve en coordenadas del mundo. También puedes seleccionar desde la lista de objetos, incluso objetos ocultos o marcadores grandes. Shift + clic permite seleccionar varios; moverlos conserva sus distancias. **Duplicar objeto** remapea sus IDs y las referencias internas del grupo; **Eliminar objeto** conserva las referencias externas pendientes para que la validación avise, en vez de cambiar silenciosamente las reglas.

- Rueda / botones − y +: zoom alrededor del cursor / centro, entre 1 % y 300 %. También puedes escribir el porcentaje en **Zoom** (por ejemplo, 25 %) y pulsar Enter o salir del campo. **Encuadrar** centra el nivel completo con margen, incluso por debajo del antiguo mínimo de 10 %.
- Espacio + arrastrar, botón central o derecho: desplazar la cámara.
- **Encuadrar**: ver las dimensiones del nivel.
- **Rejilla**, **Snap** y selector de tamaño: guías y ajuste de posiciones.
- Asa azul inferior derecha: tamaño visual. El terreno tiene ancho múltiplo de 128.
- Inspector: ID, posición, tamaño, capa y visibilidad. Solo las decoraciones admiten rotación visual.

Al alejar mucho la vista, la rejilla muestra líneas más separadas para conservar la legibilidad; **Snap** sigue usando el tamaño elegido. Navegar con el zoom del lienzo conserva los assets, sus colliders y el zoom elegido para jugar.

Para definir la distancia de cámara del nivel jugable, ajusta el zoom del lienzo y pulsa **Aplicar zoom al juego**. También puedes escribir **Zoom al jugar (%)** en **Propiedades del nivel**. El rango jugable es 25 %–150 %: 100 % conserva la vista original; 50 % muestra el doble de mundo a lo ancho y a lo alto. La barra indica el porcentaje actual en **Juego**. El botón se desactiva si el zoom del lienzo queda fuera del rango jugable.

**Probar** usa el valor del borrador; **Guardar** lo conserva con el nivel para la campaña. El cambio admite Deshacer/Rehacer. La cámara sigue al jugador y respeta los límites del nivel; desplazar el lienzo no define su posición inicial. Los niveles existentes sin este ajuste mantienen 100 %. Alejar la cámara no cambia tamaños, colisiones, gravedad ni distancias de movimiento.

El rectángulo azul es el límite visual sin rotar; las decoraciones rotadas se seleccionan por ese rectángulo o desde la lista. Ocultar el dibujo no desactiva su collider.

## Altura y zona de caída

Al cambiar **Alto del nivel**, el **Límite de caída** se mueve la misma distancia y conserva el margen respecto al borde inferior. El espacio añadido hacia abajo queda disponible para construir; las posiciones de los objetos no cambian. Altura y límite se deshacen o rehacen juntos.

La línea roja del lienzo indica la altura a la que los pies del jugador (o la base del bloque) provocan un reinicio. La franja roja inferior es la zona de caída; el suelo jugable debe quedar por encima de la línea. Esta guía permanece visible aunque desactives la rejilla y sigue el zoom/desplazamiento.

Puedes editar el límite manualmente. Si ampliaste un nivel con la versión anterior y el límite quedó arriba, pulsa **Llevar límite al fondo** para colocarlo en la altura total actual. Después puedes reservar de nuevo el margen que prefieras. Reducir mucho la altura no mueve ni elimina objetos: si el inicio queda fuera del área jugable, la validación impide guardar o probar hasta corregirlo.

## Editar colliders

Selecciona un objeto y activa **Editar collider**. El contorno verde es el collider activo; naranja indica desactivado. Arrastra sus ocho asas para cambiar el tamaño o su interior para cambiar el offset. El inspector permite editar estos valores numéricamente. Cada gesto completo genera una sola acción de historial.

Los colliders son rectángulos independientes de los PNG y del tamaño visual. Siempre están alineados con los ejes, aunque una decoración gire. El movimiento del objeto arrastra también su collider; redimensionar el dibujo no cambia el collider. Inicio, textos y prueba de planeo usan marcadores especializados sin collider editable.

Tipos físicos: terreno, plataformas, decoraciones con colisión, puertas, bloque y pared son sólidos. Depósitos y antorchas usan el collider para recibir proyectiles; las gemas para detectar recogida; la salida para comprobar la llegada de los pies del jugador estando en suelo. El jugador puede atravesar el terreno, las plataformas, las decoraciones con colisión y los Box Colliders desde abajo y por los lados; aterriza sobre ellos al caer. Los bloques y espejos empujables, puertas, paredes rompibles y barreras conservan el contacto lateral necesario para sus mecanismos. Se aplica también a los **Box Colliders independientes**, sin configurar nada más. Hay que alcanzar la superficie con los pies para subir. Los bloques y proyectiles conservan sus propias colisiones. El contorno interior del inicio muestra el cuerpo actual de 55,8 × 156,6, un 10 % más pequeño. Su base sigue marcando los pies. Las dimensiones guardadas del marcador (62 × 174) se conservan como referencia de posición para no desplazar los puntos de aparición de niveles existentes.

### Caras sólidas para el personaje

En **Collider rectangular → Caras sólidas para el personaje**, marca las caras que deben detener al jugador:

- **Solo superficie:** permite entrar desde abajo y desde ambos lados; al caer se apoya encima.
- **Pared sólida:** activa las cuatro caras; bloquea por los lados y también la cabeza.
- **Arriba · apoyarse**, **Abajo · detener la cabeza**, **Lado izquierdo** y **Lado derecho** permiten configuraciones independientes. Los lados corresponden al rectángulo en el mundo: el lado izquierdo detiene a quien llega desde la izquierda.
- **Restablecer caras:** recupera los valores del tipo de objeto. Los colliders normales conservan solo la superficie; bloques, espejos, puertas, paredes rompibles y barreras también bloquean lateralmente.

Cada cambio admite Deshacer/Rehacer y se conserva al guardar, abrir, duplicar o redimensionar. Ajustar un collider a una plataforma conserva sus caras. **Probar** usa el borrador actual sin necesidad de guardarlo. Las caras afectan al personaje; bloques y proyectiles conservan sus propias colisiones. Los mecanismos siguen controlando si un objeto está activo/abierto. Los límites exteriores del mundo permanecen sólidos.

El campo opcional `collider.playerCollision` usa cuatro booleanos (`top`, `bottom`, `left`, `right`) en JSON v1. Su ausencia conserva el comportamiento por defecto, sin migrar los archivos ni las partidas guardadas. Las gemas, monedas y otros detectores sin superficie física no muestran este control.

## Monedas recogibles

En **Biblioteca → Recolectables → Moneda**, arrastra la miniatura al lienzo o pulsa para colocarla en el centro. Selecciona la moneda para editar **Valor de la moneda** (entero entre 1 y 1000; por defecto 1), posición, tamaño y collider. Puedes duplicarla como cualquier objeto. El dibujo reutiliza `golden_elemental_coin.png`, sin cambiar el archivo original.

El jugador la recoge al tocar su collider activo, con cualquier elemento. Desaparece una vez recogida y reaparece al reiniciar; el contador muestra el valor total recogido en ese intento. Son opcionales: no bloquean puertas ni la salida. El collider desactivado impide recogerla y la excluye del total disponible.

En **Probar**, el contador funciona pero no se guarda saldo ni progreso. Los niveles personalizados siguen jugándose desde el editor. En un nivel de campaña guardado, las monedas recogidas se abonan al completar el nivel, además de las recompensas por estrellas. Caer, reiniciar o salir antes de ganar descarta las monedas del intento. Cada moneda se paga una sola vez por nivel; su ID identifica el premio, así que conserva ese ID si solo quieres moverla o cambiar el dibujo. Duplicarla crea otra moneda con un ID nuevo. Repetir muestra la recogida del recorrido, aunque las ya cobradas no vuelven a sumar saldo. Las partidas v1 anteriores conservan sus monedas y récords.

## Mecanismos

- **Depósito:** número de impactos de Agua y puertas que activa.
- **Antorcha:** impactos de Fuego y puertas que activa.
- **Puerta:** abierta inicialmente o requisitos de mecanismos. Todos los requisitos deben completarse; sin requisitos abre inmediatamente.
- **Salida:** requisitos independientes; un nivel puede tener varias salidas.
- **Placas y bloques:** puedes colocar y duplicar varios bloques y varias placas por nivel. Cada placa requiere un bloque de peso 1. En **Placa de destino**, elige una placa o **Sin placa (plataforma móvil)** para dejarlo libre. Un bloque nuevo elige la primera placa sin bloque asociado; si no hay ninguna, empieza sin placa. El bloque cae por gravedad desde la altura donde lo coloques. Tierra puede empujarlo desde ambos lados, incluso hasta hacerlo caer de una plataforma; al caer conserva la velocidad horizontal del último empuje. Al aterrizar sobre su placa, esta queda activada y solo ese bloque se fija en el punto de contacto. Si varios bloques comparten placa, los demás continúan libres hasta tocarla. Un bloque sin placa puede pasar sobre una placa sin activar ni fijarse a ella. La placa puede estar a cualquier lado y a otra altura. Las paredes, el terreno y otros bloques impiden atravesarlos. Se empuja el bloque en contacto directo con Tierra; no se transmite el empuje a toda una fila. Puedes saltar y apoyarte encima de un bloque, o dejar caer otro bloque sobre él. Si cualquier bloque cae bajo el límite de caída, se reinicia todo el intento.
- **Tamaño del bloque:** puedes cambiar ancho y alto visuales libremente. Su collider sigue siendo independiente; **Ajustar collider al tamaño visual** copia el tamaño del dibujo y pone sus offsets en cero. No existe un tamaño físico fijo de 64 × 56 para los bloques editados. Tierra puede subirse al bloque estándar con un solo salto: alcanza unos 208 px y el collider del bloque mide 180 px. Si lo redimensionas, mantén su superficie dentro del alcance del salto; dibujo y collider conservan medidas independientes. La placa necesita al menos la mitad del ancho del menor de los dos colliders en contacto y el bloque apoyado a su altura. No hay una acción de recoger o lanzar con la mano; se deja caer o se empuja desde un borde.
- **Pared:** una por nivel, destruida por el golpe real de Tierra.
- **Prueba de planeo:** una por nivel. Define inicio X, ancho del cruce y altura de aterrizaje. Se completa tras planear con Aire dentro del intervalo y aterrizar con Aire al otro lado.
- **Gemas:** reemplazan el elemento inmediatamente; se consumen hasta reiniciar. No hay selector manual de elementos en playtest. Puedes cambiar su elemento en el inspector.

Los mecanismos clásicos de depósito, antorcha, placa y pared quedan activados durante el intento; los mecanismos temporales y configurables se detallan en la guía de primera etapa. Reiniciar reconstruye todo el estado, incluidas las gemas. La validación comprueba estructura y referencias, no rutas de solución: una gema mal colocada o una puerta demasiado pequeña pueden hacer imposible un puzzle o permitir saltarlo. Usa playtest para comprobarlo.

## Guardar y abrir archivos

**Guardar** escribe explícitamente `src/game/levels/data/<id>.json`. **Guardar como** exige otro ID y crea un archivo nuevo; no sobrescribe uno existente. Los cambios sin guardar se marcan con un punto en la cabecera. Abrir otro documento o crear uno nuevo pide descartar el borrador cuando corresponde. Cerrar la pestaña también avisa; no hay recuperación automática de borradores.

**Eliminar nivel** pide confirmación y elimina un archivo personalizado. Los diez archivos de campaña están protegidos contra borrado, aunque se pueden modificar mediante Guardar. Duplica un nivel base si quieres conservarlo. El historial del editor no revierte escrituras o eliminaciones de archivos.

El servicio Vite está limitado al directorio de niveles, IDs de archivo estrictos y JSON validado. Rechaza rutas arbitrarias, traversal y enlaces simbólicos; comprueba origen/Host y dirección loopback, requiere token de sesión y limita el cuerpo a 2 MiB. Las escrituras son atómicas y serializadas. La versión leída se comprueba mediante ETag para no pisar cambios de otra pestaña: ante conflicto, conserva el borrador y usa Guardar como o abre de nuevo. Reiniciar Vite exige recargar el editor para obtener nueva sesión.

Guardar no recarga el editor ni destruye su historial. Para ver cambios guardados en un nivel de campaña, recarga la pestaña del juego. Los niveles personalizados se abren y juegan desde el editor; **no se añaden automáticamente al catálogo de campaña**, sus recompensas ni sus desbloqueos.

## Probar sin guardar

Pulsa **▶ Probar**. Primero se validan los datos. Una copia del borrador entra en el `MainScene` real con el mismo jugador, cámara, habilidades, VFX, gemas, colisiones y mecanismos del juego. Mover: A/D o flechas; saltar: Espacio/W/arriba; poder: E/Shift; reiniciar: R o botón. Los controles táctiles existentes también están disponibles.

**Detener y volver al editor** recupera el documento y todo su historial, incluidos los cambios sin guardar. La cámara de edición vuelve a su posición inicial. Puedes pausar o reiniciar la prueba. El cronómetro no provoca derrota y las estrellas usan los umbrales del documento; el playtest no paga monedas ni escribe progreso de campaña.

## Historial y atajos

- Cmd/Ctrl + Z: deshacer.
- Cmd/Ctrl + Shift + Z: rehacer.
- Delete/Backspace: eliminar selección, salvo al escribir en un campo.
- Cmd/Ctrl + S: guardar, incluido el valor del campo que está editándose.
- Escape: cancelar un arrastre activo; sin arrastre, quitar selección.

El historial conserva hasta 100 operaciones: añadir, borrar, duplicar, mover, redimensionar, collider y propiedades. Un arrastre es una sola operación. Los campos numéricos confirman al perder foco; dentro de campos de texto funcionan los atajos nativos de edición.

## Datos y extensión

`src/game/levels/schema/types.ts` define `LevelDocument` versión 1. `validate.ts` valida entradas desconocidas antes de guardar o jugar. `compile.ts` produce una vista de ejecución desde el documento canónico; no hay otro layout editable. `renderObject.ts` dibuja los mismos objetos en editor y juego. Los cinco JSON migrados reemplazan los anteriores literales de TypeScript; sus IDs de campaña, recompensas y progreso v1 se conservan.

Para añadir un recurso gráfico existente, verifica su archivo y sus medidas. Los recursos históricos están en `forestAssets.ts`; las nuevas piezas de entorno usan el catálogo acotado `environmentManifest.json` y carga por uso. Añade una entrada/preset en `editor/library.ts`. Para un nuevo tipo con comportamiento, extiende primero la unión del esquema y su validación; después el inspector, renderer, adaptador y lógica real de juego, con pruebas. No expongas campos sin efecto en el runtime. Los estados alternativos (depósito lleno, antorcha encendida, puerta abierta, pared rota y placa activa) se seleccionan por la lógica, no como mecanismos adicionales.

## Nuevos assets de entorno Veylith

La biblioteca ofrece **155 PNG originales** auditados contra sus 19 manifiestos: 50 piezas de plataformas y 105 piezas de Ancient Forest. **Buscar recursos** filtra por nombre, categoría, ID o archivo; por ejemplo, `wood`, `ruined_archway` o `vegetation`. Las miniaturas se pueden pulsar o arrastrar. El catálogo añade 167 entradas: las 155 piezas individuales y 12 plataformas completas.

- **Plataformas · Modulares:** madera, piedra antigua, piedra erosionada, tierra con hierba, cristal, metal, hongos, escalinata, puente de piedra, suspendida, rama y piedra ceremonial. Se colocan con tres módulos (384 × 128), extremos originales y centro repetido. Usan al menos dos módulos. Al arrastrar, cambia la longitud y se conserva el grosor. El centro repite módulos de 128 px a escala 1×; para anchos intermedios se recorta el último tramo, sin comprimirlo. Editar el alto aplica una escala uniforme a cada pieza; los extremos nunca se deforman. El ancho mínimo admite ambos extremos. La altura visual corresponde al lienzo completo; la superficie está a 32 px del borde superior a escala 1×.
- **Plataformas · Piezas y soportes:** las 50 piezas originales independientes, incluidos extremos, centros, cadenas, postes, bases y resplandores. Las piezas de superficie usan el rectángulo sólido sugerido por el manifiesto; los soportes y efectos empiezan sin colisión.
- **Bosque:** arquitectura, capas de fondo, primer plano, magia estática, soportes, detalles de terreno, vegetación y rocas. Son decoraciones sin colisión inicial. Las capas de fondo se colocan en coordenadas del mundo, como cualquier decoración; no añaden una capa de parallax. Las pendientes y escaleras dibujadas no incorporan físicas inclinadas. Los anillos, partículas y piedras flotantes son imágenes estáticas.

Los dibujos nuevos conservan **el lienzo completo y sus márgenes transparentes**, sin recortar ni cambiar archivos. El inspector muestra medidas, ancla de montaje y comportamiento de tamaño según los ejes de repetición del manifiesto. **Cadenas, cuerdas y postes** se alargan verticalmente manteniendo el grosor al arrastrar; **vigas y bordes horizontales** se prolongan a lo ancho. Cambiar el grosor desde el campo numérico aplica una escala uniforme al patrón. Los **rellenos de terreno** repiten piezas en ambas direcciones a la escala elegida (original por defecto). Los últimos tramos se recortan a la medida solicitada. Las **piezas únicas**, como arcos, vegetación y adornos, mantienen la proporción: al editar ancho o alto se ajusta la otra medida, en una sola acción deshacible. Ninguna de estas operaciones cambia el collider. Los detalles con grietas transparentes necesitan terreno de base detrás, indicado en el inspector. Se asignan capas iniciales según el manifiesto, editables como antes.

**Escala visual (%)** cambia el tamaño de todo el objeto uniformemente, incluidos sus módulos: 50 % usa piezas a mitad de tamaño; 200 % usa piezas al doble. Conserva la cantidad de módulos y la posición de la esquina superior izquierda. Después, cambia **Ancho visual**, **Alto visual** o arrastra el asa para extenderlo con ese tamaño de pieza. Por ejemplo, una plataforma de tres módulos a 50 % mide 192 × 64; al añadir un módulo mide 256 × 64. Las plataformas pequeñas ya no están sujetas al mínimo fijo de 256 px ni a la rejilla original de 128 px: el arrastre usa el módulo escalado y el campo numérico permite tramos parciales. Escala, deshacer/rehacer, duplicar, guardar/reabrir y Probar conservan este comportamiento. Los PNG originales no cambian.

Cambiar ancho/alto visual no modifica el collider. Para una plataforma modular, **Ajustar collider a la plataforma** aplica explícitamente el rectángulo recomendado a sus medidas actuales, en una operación deshacible. El collider puede seguir editándose por separado. Las colisiones son rectángulos alineados con los ejes, también en piezas decorativas rotadas.

Guardar conserva IDs `environment:<nombre>` en JSON v1, y Probar usa esos mismos objetos. No se reescriben niveles de campaña ni se cambia progreso. Las nuevas texturas se cargan en Phaser solo cuando el documento las necesita; una plataforma pide sus tres piezas y las reutiliza. Los niveles anteriores cargan cero texturas de esta expansión. El editor sigue siendo exclusivo de desarrollo.

`node scripts/integrate-environment-assets.js --check` verifica los registros generados, medidas PNG, hashes originales y manifiestos sin escribir. Sin `--check`, regenera explícitamente el catálogo y `docs/asset-environment-expansion-audit.json`; nunca modifica los PNG. `scripts/environment-editor-smoke.js` verifica en Chrome los 155 archivos, búsqueda/arrastre, guardado/reapertura temporal, resize, desmontaje, aislamiento del playtest, proporciones, repetición de cadenas/vigas/terreno con recorte de tramos finales, y una ruta real sobre la plataforma de madera hasta la salida. Usa `PLAYWRIGHT_MODULE`, `VEYLITH_URL` y `SMOKE_OUTPUT` como los demás smokes. Su archivo temporal se elimina al terminar.

## Límites deliberados

Editor de escritorio, un mundo (Ancient Forest), colliders rectangulares, hasta 500 objetos y 8192 piezas de terreno/entorno en total. Cada objeto de la expansión admite hasta 4096 piezas; un borrador que exceda ese límite limita su previsualización y no puede guardarse ni probarse. Múltiples bloques y placas, una pared y una prueba de planeo por nivel. El peso de placa y tamaño del jugador son fijos. No hay selección por lazo, ordenación de capas por arrastre, importación de assets, scripts, polígonos o lanzamiento manual, autoguardado, colaboración ni nube. Los dos prototipos anteriores siguen funcionando pero no se editan aquí. No se han modificado PNG originales ni añadido dependencias.

## Verificación

Ejecuta `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npm run format:check`. Los tests cubren validación, serialización, servicio de archivos, conflictos y rutas, coordenadas/zoom, colliders independientes, historial y compatibilidad geométrica exacta con los cinco layouts anteriores.

Con Playwright instalado externamente y Vite activo, los scripts opcionales `scripts/editor-smoke.js`, `scripts/heavy-block-smoke.js`, `scripts/level-height-smoke.js`, `scripts/coins-smoke.js` y `scripts/browser-smoke.js` ejercitan el editor y resuelven los cinco niveles con el motor real. Admite `PLAYWRIGHT_MODULE`, `VEYLITH_URL`, `SMOKE_OUTPUT` y `BROWSER_CHANNEL` (por defecto Chrome). El smoke del editor crea y elimina solo un archivo temporal con ID propio, sin escribir los niveles de campaña.

La compilación web y las pruebas de Chrome no sustituyen una compilación nativa ni pruebas de memoria/rendimiento en un iPhone físico.

`scripts/editor-camera-smoke.js` comprueba el zoom hasta 1 %, la rueda anclada al cursor, el encuadre de un nivel de 32768 × 32768, el cambio de tamaño de ventana y el desmontaje/remontaje real. Solo modifica borradores de prueba en memoria; no guarda archivos.

`scripts/level-camera-smoke.js` verifica el zoom jugable: aplicar, deshacer/rehacer, guardar/reabrir, Probar, reiniciar, redimensionar y volver al editor. Comprueba también la carga de campaña, compatibilidad con niveles sin zoom y fondos de tamaño acotado en pantallas estándar y Retina. Guarda únicamente un nivel temporal con ID único y lo elimina al terminar; la campaña se simula mediante una respuesta de red del navegador de prueba.

## Interactive World Pack

La biblioteca incorpora 20 objetos originales en **Pack · Funcionales** y **Pack · Visuales**. Los tipos funcionales originales incluyen ascensor, ventilador, lava, lago, rueda hidráulica, caldera, puente, muro y palanca. Usa **Editar efecto** para mover/redimensionar el rectángulo violeta sin cambiar el arte o la colisión sólida. El inspector ofrece configuración específica y conexiones por IDs, compatibles con puertas/salidas anteriores. La restricción de una pared sigue aplicando a la pared antigua; puedes colocar varios muros nuevos del pack. Los cinco visuales restantes permiten escoger estados/animaciones y un collider fijo opcional, sin mecánica implícita. Consulta [comportamientos, límites y controles](interactive-world.md).

## Campaña Ancient Forest ampliada

Los diez documentos canónicos se detallan en [Diseño de niveles](level-design.md). El orden de campaña conserva los IDs antiguos. `forest-1-saved-draft` es la copia recuperable del primer nivel editado antes de reconstruir la introducción; no forma parte de la campaña. `scripts/earth-campaign-smoke.js` (también accesible mediante `campaign-smoke.js`) recorre los diez niveles actuales exclusivamente con Tierra. `campaign-editor-smoke.js` comprueba archivos, conexiones y aislamiento del playtest. Los bloques nuevos tienen arte de 192 × 186 y colisión de 192 × 180; las placas nuevas miden 240 × 40. Los borradores existentes conservan sus dimensiones.

## Primera etapa de mecanismos

La biblioteca añade puerta temporizada, plataforma evanescente, rebote, bloque flotante, barrera e interruptor configurable con órdenes por IDs. Abre los seis archivos `lab-*` para probarlos fuera de campaña. [Parámetros, compatibilidad, controles y pruebas](stage-one-mechanics.md).

## Mecanismos avanzados

La biblioteca incorpora espejos móviles, emisores y receptores, plataformas y contrapesos enlazados, cintas extensibles y compuertas por dirección. Abre los cuatro laboratorios nuevos sin alterar la campaña. [Parámetros, diseño de puzzles, límites y assets reales](advanced-mechanics.md).

## Rediseño de Tierra y pistas opcionales

La campaña actual se documenta en [earth-level-design.md](earth-level-design.md). **Propiedades del nivel** permite editar objetivo breve y dos o tres pistas graduales. Son datos opcionales del JSON v1; los documentos antiguos siguen siendo válidos. Las pistas se muestran solo bajo petición en campaña y playtest, sin afectar premios ni señales. Los diseños anteriores se conservaron en `docs/level-archive/before-earth-puzzles-v2/`. Al editar JSON por fuera del editor, reinicia Vite para invalidar su caché; Guardar desde el editor ya lo hace.

### Ángulo y giro del espejo

El inspector del espejo incluye **Ángulo inicial de la cara (°)** y **Permitir giro con Acción**. El ángulo representa la normal de la cara: 0° derecha, 90° abajo; el campo normaliza vueltas completas. Elegir NW/NE/SE/SW restablece el ángulo a ese preset. Solo gira la cabeza, con base y collider independientes. Los archivos v1 anteriores conservan su orientación y permiten el giro de forma predeterminada.

En Probar, mantén Acción / E junto a la base para abrir el mando, ajusta y suelta para cerrar. Reiniciar recupera el ángulo del borrador; jugar nunca guarda la orientación del intento. Puedes desmarcar la casilla para diseñar un puzzle exclusivamente de desplazamiento.

## Laboratorio de varios bloques

Abre **lab-multiple-blocks** y pulsa **▶ Probar**. Empuja el primer bloque a la derecha hasta su placa; salta encima para pasar. Rodea el segundo bloque y empújalo a la izquierda hasta la otra placa. Al abrirse la puerta, acerca la tercera piedra al borde elevado, salta sobre ella y úsala de escalón hasta el portal. La tercera piedra no tiene placa y sigue moviéndose libremente. R restablece los tres bloques y ambos mecanismos.

El documento continúa en versión 1; las conexiones antiguas y las partidas guardadas conservan su formato. La validación comprueba todas las referencias no vacías, placas sin bloque e IDs duplicados. Duplicar una pareja seleccionada remapea su conexión; duplicar solo un bloque conserva la placa elegida, que puedes cambiar o quitar.

Las pruebas `multipleBlocks.test.ts` y `multiple-blocks-smoke.js` cubren pares independientes, destinos compartidos, bloques libres, colisiones, escalones, reinicio y compatibilidad. `multiple-blocks-editor-smoke.js` comprueba añadir, duplicar, guardar, reabrir y probar desde la interfaz. Son pruebas de funcionamiento, no una medición de dificultad humana.

## Ascensor con palanca de regreso

En el ascensor elige **Recorrido → Ida y regreso por palanca**. Activo va al destino; inactivo regresa a la posición inicial. La misma palanca en **Alternar** permite ida y regreso. Para usar dos palancas, selecciona ese ascensor como **Destino de órdenes por ID** en ambas: una **Activar (ir al destino)** y otra **Desactivar (regresar al inicio)**. Mantener Poder no repite la pulsación. Guarda explícitamente y prueba las dos paradas. Los modos anteriores mantienen su comportamiento. [Detalles y ejemplo editable](interactive-world.md#palancas-para-regresar-el-ascensor).

## Bloques apilados

Coloca un bloque sobre otro haciendo coincidir la base del collider superior con la superficie del inferior. También puedes dejarlo caer sobre él. Al empujar el inferior con Tierra, los bloques apoyados encima lo acompañan automáticamente; funciona con torres y con tamaños distintos. No hace falta activar una opción ni enlazar IDs. Los bloques conservan sus rectángulos físicos independientes del dibujo.

Una pared puede detener al bloque superior mientras el inferior sigue deslizándose: si pierde el apoyo, cae. No se transmite empuje a una fila de bloques colocados lado a lado. Una placa fija solamente el bloque que la toca; su carga queda apoyada. Reiniciar devuelve toda la pila a sus posiciones iniciales y perder cualquier bloque reinicia el intento. Los niveles ya guardados usan este comportamiento sin cambiar de versión.

`scripts/block-stack-smoke.js` comprueba el comportamiento con física real y controles normales. `scripts/multiple-blocks-editor-smoke.js` sigue comprobando guardar, reabrir y probar los mismos datos del editor. No se modifican los niveles canónicos ni los saves.

## Escenarios ilustrados y Box Colliders independientes

Biblioteca → **Escenarios ilustrados** incorpora «Dos pesos, una salida» desde sus archivos verificados. El inspector controla escala uniforme, capas e instancias ambientales; **Dibujar collider** crea rectángulos independientes de la ilustración. Desactiva dibujo y usa **Editar collider** para mover/redimensionar con ocho asas. El modo modular, historial, JSON v1 y playtest siguen disponibles. Abre `lab-illustrated` para el laboratorio. Ver [inventario exacto, parámetros, importador y validación](illustrated-environments.md).

## Nueva puerta de salida

«Salida · puerta sellada» utiliza el marco antiguo y el sello mágico. Conserva las conexiones y el collider independiente de los archivos v1. La guía visual representa el vano; la fachada sobresale de esa guía y mantiene su proporción original. En Probar, resolver todos los requisitos muestra la ruptura del sello con un breve enfoque de cámara. [Montaje, estados y validación](exit-door.md).
