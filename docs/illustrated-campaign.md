# Ancient Forest — campaña ilustrada 1–10

Implementación local verificada el 27 de octubre de 2026 en `/Users/francismartinez/Projects/Elements`. **10/10 niveles con victoria real, reinicio y playtest del editor comprobados.** La dificultad humana y el rendimiento en iPhone físico quedan por evaluar.

## Datos, conservación y fuentes

- La ubicación histórica sigue siendo la ubicación real. No hay repositorio Git en esa carpeta; se hizo un archivo versionado antes de editar, con manifiesto SHA-256 en `docs/level-archive/before-illustrated-campaign-2026-10-26/`.
- Ese archivo conserva todos los JSON de niveles previos, incluidos laboratorios, el catálogo ilustrado anterior, las rutas previas y el orden de campaña. `illustrated-assets-sha256.json` contiene las huellas de los **299 archivos originales** del árbol ilustrado; la prueba de integridad comprueba cada byte. No se regeneró, recortó, deformó ni sobrescribió ninguna ilustración.
- Los saves del usuario no se abrieron ni sobrescribieron. Las pruebas usaron contextos de Chrome nuevos y un saldo de prueba en memoria. Save v1, IDs de nivel, monedas colocadas anteriores y récords se conservan. El nivel visible 8 no tenía monedas: recibe una moneda nueva de valor 1.
- La fuente editable sigue siendo `src/game/levels/data/<id>.json`, esquema v1 del Level Editor. No hay una segunda geometría de gameplay en código. Las rutas de prueba son entradas de controles, no layouts alternativos.
- Los nuevos manifiestos v2 se registran como `campaign_level_01`…`campaign_level_10`. El paquete antiguo `level_02` y `lab-illustrated` siguen disponibles y separados. El laboratorio solo recibió formato de JSON, sin cambio de datos.

## Inventario real y composición

Raíz: `public/assets/environments/illustrated_levels/`. Se inspeccionaron `world_01_campaign/campaign_art_manifest.json`, los diez manifiestos, secciones, previews, capas y animaciones compartidas. Todos los escenarios nuevos tienen lienzo **1728 × 648**, origen superior izquierdo, con una única sección completa por capa. El juego usa escala uniforme **150 %**, mundo **2592 × 972** y zoom inicial 80 %. Los colliders y mecanismos son objetos independientes; no se escala el personaje.

| Visible | ID guardado | Carpeta del manifiesto  | Escena              | Overlays activos | Texturas / MiB RGBA |
| ------: | ----------- | ----------------------- | ------------------- | ---------------: | ------------------: |
|       1 | `forest-1`  | `level_01`              | `campaign_level_01` |                5 |           7 / 15.56 |
|       2 | `forest-2`  | `level_02/blueprint_v2` | `campaign_level_02` |                5 |           7 / 15.56 |
|       3 | `forest-6`  | `level_03`              | `campaign_level_03` |                7 |           9 / 17.25 |
|       4 | `forest-7`  | `level_04`              | `campaign_level_04` |                5 |           7 / 15.56 |
|       5 | `forest-8`  | `level_05`              | `campaign_level_05` |                5 |           7 / 15.56 |
|       6 | `forest-9`  | `level_06`              | `campaign_level_06` |                5 |           7 / 15.56 |
|       7 | `forest-10` | `level_07`              | `campaign_level_07` |                5 |           7 / 15.56 |
|       8 | `forest-3`  | `level_08`              | `campaign_level_08` |                7 |           8 / 16.50 |
|       9 | `forest-4`  | `level_09`              | `campaign_level_09` |                5 |           7 / 15.56 |
|      10 | `forest-5`  | `level_10`              | `campaign_level_10` |                5 |           7 / 15.56 |

Cada carpeta nueva aporta `background/background.png`, `static_world/section_01.png` y `foreground/section_01.png`. Se cargan exactamente las rutas de su manifiesto. La segunda usa `level_02/blueprint_v2`; no se mezcla con el escenario anterior. La quinta conserva una variante opcional de plataforma superior que no se carga.

Las hojas compartidas están en `_shared/ancient_forest_v1/`. Los diez usan liana colgante, hojas móviles (dos instancias), niebla y partículas mágicas. El tercero añade cascada y superficie de agua; el octavo añade cascada y una segunda niebla. Son **54 instancias ambientales** en total, todas comprobadas en ejecución con avance de fotograma. Cada hoja contiene ocho frames; el importador valida dimensiones, posiciones del atlas, alfa y coincidencia de los PNG individuales (admite únicamente el redondeo RGB de 1/255 ya presente en las exportaciones).

Se normaliza la profundidad v2 al renderer existente: fondo −25, mundo estático −15, foreground +5 y efectos delanteros +15; efectos traseros conservan el orden declarado. El personaje queda en 0. El archivo original conserva sus profundidades: la adaptación ocurre en el catálogo generado. Las posiciones, tamaños locales, opacidad, fase y FPS de cada instancia se copian del manifiesto. No se superponen previews, alineaciones ni frames sueltos.

La memoria indicada solo suma píxeles RGBA de las texturas ilustradas usadas por una escena. No es una medición de memoria total ni GPU. La auditoría general puede marcar assets como conectados sin verificar si su evidencia global anterior caducó; la evidencia específica de esta campaña está en `illustrated-campaign-validation.json`.

## Geometría y reglas comunes

- Solo Tierra. No hay gemas ni selección manual en la campaña. Los prototipos y laboratorios históricos conservan sus reglas separadas.
- Box Colliders siguen las superficies planas del dibujo. Suelo/pilares principales usan caras sólidas; repisas usan superficie superior atravesable desde abajo. El follaje y las piedras irregulares no tienen máscara de píxeles ni pendientes. Este compromiso se deja editable y explícito.
- Cada salida exige sus señales y contacto con el portal estando apoyado. Caer bajo Y=963 reinicia el intento completo. Reinicio rápido también está disponible en controles existentes.
- Placas fijan su bloque al contacto válido; los elevadores tienen corredores despejados y las compuertas se rigen por señales reales. Se corrigió el transporte de pilas en poleas: una pequeña penetración de contacto entre bloques ya apoyados no convierte el bloque superior en obstáculo ajeno ni pierde su peso.
- Hay tres pistas opcionales por nivel, español e inglés. No se cobran ni se muestran como solución automática. Todos tienen monedas y tiempos de estrellas.
- Una partida nueva abre solo el primer nivel; una victoria desbloquea el siguiente según el orden visible. Para preservar saves v1 de la versión que permitía selección libre, se mantiene acceso hasta el nivel recordado o más alto completado. No se renumeran los IDs históricos.

## Niveles: diseño, solución y límites

### 1. La puerta sellada — `forest-1`

**Dificultad prevista:** Baja: introducir el empuje hacia atrás. No medida con jugadores humanos.

**Inventario jugable:** 9 Box Colliders, 2 bloques, 1 placas, 1 mecanismos de mundo, 3 monedas (valor total 3). Inicio: centro X=130, pies Y=502; portal sobre Y=427. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `entry-step` → bloque libre / escalón.
- `seal-block` → placa `seal-plate`.
- `seal-door` exige `seal-plate`.
- `upper-seal`: lever.
- `exit` exige `seal-plate`, `upper-seal`.

**Solución prevista:** Usar la piedra inicial como escalón, saltar al lado derecho del peso de la pasarela y empujarlo a la izquierda. Cruzar la puerta, activar el sello de la terraza derecha y saltar al arco.

**Pistas opcionales graduales:**

1. El bloque y su placa están en la misma pasarela, pero la placa queda detrás.
2. Usa la piedra del inicio como escalón. Salta al otro lado del bloque de la pasarela.
3. Empuja ese bloque hacia la izquierda hasta la placa; cruza la puerta, activa la palanca y salta al arco.

**Decisiones y límites del dibujo:** El bloque inicial añade un escalón móvil para el desnivel pintado. La compuerta cubre la pasarela inferior; la salida exige además el sello derecho incluso si se rodea la puerta por arriba.

**Verificación:** victoria con controles normales en 14.36 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 40/90 s. La ruta de victoria recogió valor 3/3 en monedas; no es una ruta de recolección completa.

### 2. Dos pesos, una salida — `forest-2`

**Dificultad prevista:** Media: dos alturas y dos direcciones de empuje. No medida con jugadores humanos.

**Inventario jugable:** 16 Box Colliders, 3 bloques, 2 placas, 0 mecanismos de mundo, 9 monedas (valor total 9). Inicio: centro X=100, pies Y=525; portal sobre Y=315. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `entry-step` → bloque libre / escalón.
- `west-weight` → placa `west-plate`.
- `east-weight` → placa `east-plate`.
- `final-gate` exige `west-plate`, `east-plate`.
- `exit` exige `west-plate`, `east-plate`.

**Solución prevista:** Subir por el escalón y las terrazas. Empujar el peso inferior a su placa derecha. Saltar al otro lado del peso superior y empujarlo a la placa izquierda. Ambas placas abren la compuerta del arco.

**Pistas opcionales graduales:**

1. Las dos placas están en alturas distintas. Observa hacia dónde debe ir cada bloque.
2. El primer peso avanza a la derecha. Para el segundo tendrás que pasar al otro lado.
3. Coloca el bloque inferior en su placa derecha; sube, salta el peso superior y empújalo a la izquierda. Después cruza al arco.

**Decisiones y límites del dibujo:** Las placas se sitúan sobre dos terrazas reales; los pesos y la compuerta son objetos añadidos, no partes recortadas de la ilustración. Algunas repisas son atravesables desde abajo.

**Verificación:** victoria con controles normales en 14.01 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 45/100 s. La ruta de victoria recogió valor 7/9 en monedas; no es una ruta de recolección completa.

### 3. Elevación cruzada — `forest-6`

**Dificultad prevista:** Media: abandonar la ruta alta y recordar un sello inferior. No medida con jugadores humanos.

**Inventario jugable:** 10 Box Colliders, 0 bloques, 0 placas, 5 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=100, pies Y=525; portal sobre Y=332. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `west-call`: lever.
- `west-lift`: elevator; exige `west-call`.
- `lower-seal`: lever.
- `lift-call`: lever.
- `cross-lift`: elevator; exige `lift-call`.
- `exit` exige `west-call`, `lower-seal`, `lift-call`.

**Solución prevista:** Activar el elevador de entrada. Desde la primera pasarela bajar a la terraza y volver a la izquierda para activar lower-seal. Saltar al elevador central, activar lift-call mientras se está encima, esperar arriba y cruzar al arco.

**Pistas opcionales graduales:**

1. La ruta alta deja atrás una palanca en la terraza baja.
2. Baja desde la primera pasarela y revisa su extremo izquierdo. El ascensor central se controla desde su parada inferior.
3. Activa el ascensor de entrada; baja y vuelve a la izquierda por el sello. Salta al ascensor central, pulsa su palanca, espera arriba y cruza las terrazas.

**Decisiones y límites del dibujo:** Los elevadores ocupan los huecos libres entre pilares. La cascada y la superficie acuática son ambientales: no añaden agua física ni requieren transformación.

**Verificación:** victoria con controles normales en 19.63 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 50/110 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 4. Reflejo de la tierra — `forest-7`

**Dificultad prevista:** Media: observar alineación de luz y posición del espejo. No medida con jugadores humanos.

**Inventario jugable:** 11 Box Colliders, 0 bloques, 0 placas, 3 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=110, pies Y=525; portal sobre Y=292. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `mirror`: reflector.
- `emitter`: beamEmitter.
- `receiver`: receiver.
- `light-gate` exige `receiver`.
- `exit` exige `receiver`.

**Solución prevista:** Alcanzar la plataforma central, saltar al lado derecho del espejo y empujarlo a la izquierda bajo el haz vertical. El espejo fijo a 315° desvía la luz hacia el receptor, que retiene la señal. Subir y cruzar la puerta abierta.

**Pistas opcionales graduales:**

1. El haz baja desde arriba; el espejo refleja hacia la derecha.
2. El receptor conserva la luz recibida. El espejo empieza demasiado a la derecha.
3. Salta al lado derecho del espejo y empújalo a la izquierda hasta encender el receptor; después asciende y cruza al arco.

**Decisiones y límites del dibujo:** El espejo mantiene el ángulo fijo; el razonamiento consiste en desplazarlo, no en seleccionar elementos ni rotarlo manualmente. El receptor conserva la activación después de alinear.

**Verificación:** victoria con controles normales en 13.19 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 40/90 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 5. Corriente natural — `forest-8`

**Dificultad prevista:** Media: regresar al inicio y completar dos controles de alimentación. No medida con jugadores humanos.

**Inventario jugable:** 8 Box Colliders, 1 bloques, 1 placas, 5 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=210, pies Y=520; portal sobre Y=337. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `return-control`: lever.
- `entry-bridge`: bridge; exige `return-control`.
- `belt-control`: lever.
- `delivery-belt`: conveyor; exige `return-control`, `belt-control`.
- `cargo` → placa `cargo-plate`.
- `exit-bridge`: bridge; exige `cargo-plate`.
- `exit` exige `cargo-plate`, `return-control`.

**Solución prevista:** Volver primero a la palanca situada detrás del inicio. Cruzar el puente, saltar el bloque de la cinta y activar el control de la isla. Ambos controles alimentan la cinta hacia la izquierda; esperar la entrega a la placa y el despliegue del puente de salida.

**Pistas opcionales graduales:**

1. Hay un control detrás del punto de inicio. El bloque debe viajar hacia la izquierda.
2. El puente de entrada y la alimentación de la cinta comparten el control izquierdo. El mando de la isla completa el circuito.
3. Vuelve a la izquierda y activa la palanca; cruza el puente, salta el bloque y activa el mando de la isla. Espera a que la cinta entregue el peso antes de cruzar.

**Decisiones y límites del dibujo:** Se usa la variante por defecto sin la plataforma superior fija. La alternativa static_world/optional_upper_fixed_platform.png y su preview quedan intactos, fuera de runtime. La placa está a ras de la cinta para evitar que un labio suspenda la carga y la frene.

**Verificación:** victoria con controles normales en 15.14 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 45/100 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 6. Equilibrio elemental — `forest-9`

**Dificultad prevista:** Media–alta: peso de pila, equilibrio y despejar el descenso. No medida con jugadores humanos.

**Inventario jugable:** 7 Box Colliders, 3 bloques, 1 placas, 2 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=100, pies Y=500; portal sobre Y=347. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `power-weight` → placa `power-plate`.
- `lower-weight` → bloque libre / escalón.
- `upper-weight` → bloque libre / escalón.
- `balance`: pulley; exige `power-plate`; contrapeso `counterweight`, umbral 1.
- `counterweight`: pulleyWeight.
- `exit` exige `power-plate`.

**Solución prevista:** Saltar el primer bloque y empujarlo a la placa izquierda. Empujar la base de la pila de dos bloques sobre la polea del hueco; retroceder para no quedar a caballo entre la orilla y la plataforma. La carga baja y eleva el contrapeso. Cruzar la repisa central y usar el contrapeso elevado para alcanzar el arco.

**Pistas opcionales graduales:**

1. La placa da energía, pero la polea también necesita suficiente peso.
2. Una piedra no basta para mantener elevado el contrapeso mientras tú lo pisas. La pila puede moverse empujando su base.
3. Salta el primer bloque y empújalo a su placa izquierda. Luego empuja la pila completa sobre la polea del hueco; retrocede para dejar bajar la carga y usa el contrapeso elevado como escalón al arco.

**Decisiones y límites del dibujo:** La polea es estrecha (40 px nativos); la pila usa bloques de 32 px de ancho, con alturas 120 y 70. Esto permite salir de la carga sin interceptar su descenso. El contrapeso es una plataforma editable. No se dibuja una cuerda física continua: es una discrepancia visual conocida.

**Verificación:** victoria con controles normales en 14.97 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 55/120 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 7. Ruta alternativa — `forest-10`

**Dificultad prevista:** Media–alta: ordenar visitas y alternar accesos sin perder sellos. No medida con jugadores humanos.

**Inventario jugable:** 12 Box Colliders, 1 bloques, 0 placas, 5 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=100, pies Y=540; portal sobre Y=327. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `entry-step` → bloque libre / escalón.
- `west-seal`: lever.
- `east-seal`: lever.
- `west-barrier`: barrier.
- `east-barrier`: barrier.
- `selector`: switch; toggle → `west-barrier`, `east-barrier`.
- `exit` exige `west-seal`, `east-seal`.

**Solución prevista:** Tomar la ruta alta y bajar al selector central. Volver a la terraza izquierda, activar su sello y regresar. Alternar el selector para cerrar el paso oeste y abrir el este. Activar el sello derecho, cruzar el puente pintado fijo y subir al arco.

**Pistas opcionales graduales:**

1. El selector central abre un lado mientras cierra el otro. Los sellos ya visitados quedan activos.
2. Desde la ruta alta puedes bajar al selector. Visita primero la terraza izquierda y regresa antes de cambiarlo.
3. Baja al suelo central, vuelve a la terraza izquierda, activa su sello y regresa. Alterna el selector, visita el sello derecho y cruza el puente fijo al arco.

**Decisiones y límites del dibujo:** El puente de madera pintado permanece estático y tiene collider propio. Las barreras alternan en el corredor inferior; el portal exige los dos sellos para evitar un salto por la ruta alta que eluda el puzzle.

**Verificación:** victoria con controles normales en 17.18 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 55/120 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 8. Ascenso en cadena — `forest-3`

**Dificultad prevista:** Media–alta: dos ascensores y reutilización del peso como escalón. No medida con jugadores humanos.

**Inventario jugable:** 13 Box Colliders, 2 bloques, 1 placas, 4 mecanismos de mundo, 1 monedas (valor total 1). Inicio: centro X=100, pies Y=540; portal sobre Y=292. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `entry-step` → bloque libre / escalón.
- `first-lift`: elevator; exige `first-call`.
- `first-call`: lever.
- `relay-weight` → placa `relay-plate`.
- `relay-gate` exige `relay-plate`.
- `second-lift`: elevator; exige `second-call`.
- `second-call`: lever.
- `exit` exige `first-call`, `relay-plate`, `second-call`.

**Solución prevista:** Subir por el bloque escalón inicial, bajar a la primera plataforma elevadora y activar su palanca a bordo. Desde la repisa siguiente caer a la isla central. Saltar el bloque, empujarlo a la placa izquierda y usar su parte superior para alcanzar la compuerta. Embarcar y activar el segundo elevador; cruzar las cornisas al arco.

**Pistas opcionales graduales:**

1. Cada ascensor se acciona en su parada inferior. La isla central guarda la conexión entre ambos.
2. La placa queda a la izquierda del bloque. Una vez fijado, su parte superior aún sirve de apoyo.
3. Sube en el primer ascensor y baja a la isla central. Salta el bloque, empújalo a la izquierda y úsalo de escalón hacia la compuerta; toma el segundo ascensor y llega al arco.

**Decisiones y límites del dibujo:** Se añadió un bloque inicial porque el pilar pintado impedía llegar al primer elevador desde el suelo. Las plataformas elevadoras son objetos independientes; la cascada y niebla extra son ambientales.

**Verificación:** victoria con controles normales en 20.43 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 60/130 s. La ruta de victoria recogió valor 1/1 en monedas; no es una ruta de recolección completa.

### 9. Puentes de piedra — `forest-4`

**Dificultad prevista:** Media–alta: entrega por caída, regreso y compuerta recuperable. No medida con jugadores humanos.

**Inventario jugable:** 12 Box Colliders, 2 bloques, 1 placas, 4 mecanismos de mundo, 1 monedas (valor total 5). Inicio: centro X=100, pies Y=480; portal sobre Y=347. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `falling-weight` → placa `lower-plate`.
- `return-bridge`: bridge; exige `lower-plate`.
- `return-step` → bloque libre / escalón.
- `clock-door`: timedDoor.
- `clock-start`: lever; activate → `clock-door`.
- `clock-return`: lever; activate → `clock-door`.
- `exit` exige `lower-plate`, `clock-start`.

**Solución prevista:** Saltar al lado derecho del bloque de la tercera pasarela y empujarlo a la izquierda hasta que caiga a la placa inferior. El personaje puede aterrizar sobre el propio bloque. Usarlo para volver a la pasarela y cruzar el puente desplegado. Activar clock-start junto al escalón de piedra, subir y atravesar la puerta durante sus 18 segundos; el control del otro lado permite rearmarla.

**Pistas opcionales graduales:**

1. La placa está debajo del hueco. El bloque conserva el impulso al caer.
2. Empujarlo desde la derecha lo lleva hacia la isla. Una vez encajado sirve de escalón de regreso.
3. Salta el bloque y empújalo a la izquierda hasta que caiga sobre la placa; baja, usa el bloque para volver y cruza el puente desplegado. Activa la palanca inferior, sube por la piedra y atraviesa la compuerta; puedes rearmarla desde ambos lados.

**Decisiones y límites del dibujo:** La entrega inferior usa gravedad y empuje reales. La placa fija el bloque al recibirlo; no se exige precisión de píxel. La compuerta de 18 s añade secuencia después de preparar el regreso, con rearme desde ambos lados; el nivel no es una carrera continua.

**Verificación:** victoria con controles normales en 20.29 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 60/130 s. La ruta de victoria recogió valor 5/5 en monedas; no es una ruta de recolección completa.

### 10. La prueba final — `forest-5`

**Dificultad prevista:** Alta dentro del capítulo: combinar golpe, peso, sello y ascensor. No medida con jugadores humanos.

**Inventario jugable:** 16 Box Colliders, 2 bloques, 1 placas, 5 mecanismos de mundo, 3 monedas (valor total 15). Inicio: centro X=100, pies Y=535; portal sobre Y=312. Coordenadas de esta frase en píxeles nativos; JSON en unidades de mundo ×1,5.

**Conexiones:**

- `entry-step` → bloque libre / escalón.
- `upper-weight` → placa `upper-plate`.
- `relay-bridge`: bridge; exige `upper-plate`.
- `lower-seal`: lever; toggle → `final-barrier`.
- `final-barrier`: barrier.
- `final-lift`: elevator; exige `root-wall`, `upper-plate`, `lower-seal`, `lift-call`.
- `lift-call`: lever.
- `exit` exige `root-wall`, `upper-plate`, `lower-seal`, `lift-call`.

**Solución prevista:** Romper la pared inicial con Poder de Tierra. Usar el bloque escalón, subir, saltar el peso superior y empujarlo hacia su placa izquierda. Cruzar el puente y saltar a la repisa alta; bajar a la columna central y activar lower-seal, que apaga la barrera final. Saltar a final-lift, activar lift-call a bordo y esperar arriba. Cruzar las dos repisas al arco.

**Pistas opcionales graduales:**

1. La piedra agrietada, la placa elevada y el sello inferior forman un solo circuito.
2. El bloque de arriba se empuja a la izquierda. Después hay que abandonar la ruta alta para visitar la columna central.
3. Rompe el muro, sube, salta el peso y llévalo a su placa. Cruza el puente y baja a activar el sello; comprueba que la barrera se apague. Sube al ascensor central, activa su palanca y cruza los últimos estantes.

**Decisiones y límites del dibujo:** El sello inferior controla la barrera y alimenta el elevador final. Las tres cornisas altas no se han desplazado ni deformado. El salto del puente a la repisa siguiente es necesario: caminar debajo lleva a una caída y reinicio.

**Verificación:** victoria con controles normales en 18.38 s de reloj de juego; un intento, sin cambiar Tierra. Reinicio completo tras victoria comprobado. Umbrales de 3/2 estrellas: 60/140 s. La ruta de victoria recogió valor 15/15 en monedas; no es una ruta de recolección completa.

## Validación reproducible

`docs/illustrated-campaign-validation.json` registra las diez rutas completas, victoria efectiva, monedas recogidas, nivel siguiente, reinicio y huellas de datos/código. `scripts/illustrated-routes.json` es el testigo de entradas reproducibles. No se teletransporta al personaje, no se inyectan señales resueltas y no se acelera la física.

- `illustrated-campaign-smoke.js`: compara el documento runtime con el canónico, comprueba las tres capas y todas las instancias con posiciones/tamaños correctos, observa animación, ejecuta la solución y espera victoria. Después reinicia y contrasta bloques, placas, señales, monedas de intento, reloj, texturas y listeners. Los reinicios observados tardaron aproximadamente 0,34–0,39 s, incluido un margen de observación de 300 ms.
- `earth-puzzle-negative-smoke.js`: intenta caminar a la derecha y avanzar a la derecha pulsando salto/Poder. Ninguna de las veinte pruebas gana. Cada política dura como máximo 25 s y termina si no progresa durante 4 s. Es una refutación de esas dos estrategias concretas, no una búsqueda exhaustiva de atajos.
- `illustrated-campaign-editor-smoke.js`: para cada uno de los diez, abre el canónico, verifica escala/capas, cambia visibilidad y deshace, guarda una copia temporal, la reabre, inicia playtest, reinicia, cambia tamaño y vuelve al editor. Comprueba un único canvas y el save sin cambios; elimina la copia. Las diez rutas de victoria se ejecutan aparte en el mismo runtime, no mediante estado simulado del editor.
- Unitarias: integridad de conexiones, condiciones completas de salida, rechazo sin requisitos o sin apoyo, persistencia real con LevelRepository, undo/load/compile, límites de estrellas, monedas sin doble pago, desbloqueo y compatibilidad de saves v1, corredores de elevadores y carga apilada. La auditoría geométrica es deliberadamente optimista; no sustituye a las rutas de navegador.
- Las pruebas de evidencia invalidan los testigos si cambia la geometría, las rutas o la física/renderer comprobados. Los tests del contrato de salida que sí inyectan señales están etiquetados y no se cuentan como prueba espacial.

Con Vite en el puerto 5187 y Playwright/Chrome disponibles externamente (sin dependencia añadida al proyecto):

```sh
npm run dev -- --port 5187
PLAYWRIGHT_MODULE=/ruta/a/playwright SMOKE_OUTPUT=work/illustrated/solutions npm run test:illustrated:browser
PLAYWRIGHT_MODULE=/ruta/a/playwright SMOKE_OUTPUT=work/illustrated/negative npm run test:illustrated:negative
PLAYWRIGHT_MODULE=/ruta/a/playwright SMOKE_OUTPUT=work/illustrated/editor npm run test:illustrated:editor
node scripts/collect-illustrated-evidence.js work/illustrated/solutions/results.json work/illustrated/negative/results.json work/illustrated/editor/results.json
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npm run audit:illustrated
npm run audit:assets
```

Los scripts aceptan `VEYLITH_URL`, `PLAYWRIGHT_MODULE` y `SMOKE_OUTPUT`; las rutas positiva/negativa aceptan `LEVELS` para aislar un ID. El colector de evidencia exige los diez resultados actuales. Las herramientas y harness de navegador son de desarrollo y no se incorporan al juego de producción.

## Limitaciones pendientes

- **Jugabilidad verificada: 10/10. Niveles bloqueados sin victoria comprobada: 0.** Queda balance humano de dificultad, claridad de pistas y tiempos de estrellas; los umbrales son una primera propuesta conservadora por encima del recorrido conocido, no un estudio de usuarios.
- No se certifica que todas las monedas puedan recogerse en una única ruta óptima. Se preservaron sus valores e IDs, se verificó la recogida en los diez niveles y el sistema de pago/repetición con pruebas. El tercero incluye un desvío opcional desde el ascensor a la repisa izquierda para recoger su moneda y volver a la plataforma elevada.
- Los objetos mecánicos añadidos pueden necesitar pulido visual de tamaño/encaje; las superficies son rectángulos, algunos atravesables desde abajo. Las ilustraciones originales permanecen intactas. No se ocultaron estas adaptaciones dentro de imágenes nuevas.
- No se probó en iPhone/iPad físico ni se ejecutó build nativo: el entorno tiene la licencia de Xcode pendiente. No se modificó configuración nativa. Chrome no certifica rendimiento térmico, memoria GPU ni ergonomía táctil.
- La auditoría general incluye recursos históricos de otros elementos, laboratorios y variantes sin uso. No se declara toda la biblioteca integrada por aparecer registrada. Las tres hojas alternativas de impacto/giro avanzado se verifican por metadata y frames, pero permanecen sin consumidor de gameplay.
- Los documentos históricos `earth-puzzles.md` y `illustrated-environments.md` describen etapas anteriores; esta especificación y los JSON canónicos son la referencia de la campaña vigente.

## Resultado de comprobaciones

- Typecheck, lint y build de producción: correctos.
- Suite completa: **570 pruebas aprobadas en 63 archivos**; sin fallos.
- Formato: comprobación completa correcta, con originales y archivo histórico excluidos deliberadamente.
- Importador ilustrado `--check`: correcto; diez escenas nuevas y el laboratorio histórico, sin advertencias.
- Auditoría general: cero incompatibilidades o referencias faltantes; no renueva la evidencia global antigua ni afirma uso de las variantes reservadas.
- Navegador: diez victorias y diez reinicios después de ganar; veinte estrategias ingenuas rechazadas; diez ciclos reales de guardar/abrir/playtest/reinicio/resize en el editor; cero errores de página o carga en los recorridos positivos/editor.
- Avisos no bloqueantes existentes: tamaño de chunks de producción superior a 500 kB y recomendaciones de importación del cargador de configuración de Vite.

## Actualización de salida — 31 de octubre de 2026

Los diez documentos usan automáticamente la nueva puerta antigua y el sello mágico mediante el renderer compartido, manteniendo sus posiciones, colliders y conexiones. El desbloqueo muestra un breve acercamiento de cámara y la ruptura del sello. [Detalles y límites de validación actuales](exit-door.md).

Los escenarios originales se recuperaron de «Assets for game», con verificación SHA-256, tras detectar que su carpeta ya no estaba en el proyecto. La evidencia histórica de diez soluciones corresponde a la versión anterior: actualmente `forest-1` tiene ediciones de geometría que fallan la auditoría, y el tamaño del personaje también había cambiado. La validación de esta actualización no sustituye esa evidencia por hashes nuevos sin repetir las soluciones.
