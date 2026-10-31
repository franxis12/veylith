# Tierra 1–10 · Puzzles canónicos, revisión 2

Rediseño del 22 de octubre de 2026 en Veylith. Datos de juego y editor: `src/game/levels/data/forest-*.json`. Los diez mapas comienzan como Tierra y no contienen gemas. El primer descubrimiento de Agua queda reservado al nivel 11, que **no se ha creado ni modificado**.

## Compatibilidad y límites reales

El orden del menú conserva los IDs históricos: **1, 2, 6, 7, 8, 9, 10, 3, 4, 5**. El número de archivo no equivale al número mostrado. No cambian el ledger v1, los desbloqueos ni las recompensas. Cada moneda conserva su ID y valor anteriores. Los récords antiguos se mantienen, aunque sus tiempos corresponden a diseños diferentes y no deben interpretarse como medidas de dominio de estos puzzles.

La copia anterior íntegra está en `docs/level-archive/before-earth-puzzles-v2/`, con SHA-256 por JSON, orden, documentación y reproducción histórica. Se excluye del formateo para mantener esos bytes. Para restaurar, detener Vite, copiar los diez JSON de ese directorio a `src/game/levels/data/` y volver a iniciar; el progreso no necesita migración. No mezclar las rutas automatizadas antiguas con los mapas nuevos.

Se inspeccionaron esquema, compilador, editor, reglas de señales, óptica, carga, transporte, compuertas, reloj, fase y movimiento. Los puzzles usan capacidades reales. El salto de Tierra se ajustó para alcanzar el bloque pesado estándar en un solo salto:

- Tierra usa impulso 620 y gravedad de ascenso 900: unos 208 píxeles en juego (214 teóricos), por encima del bloque estándar de 180 px de colisión. Agua conserva impulso 560 y unos 170 px. Tierra conserva su velocidad horizontal y caída más pesada. Los bloques tienen cuerpo de 128 × 56, salvo el paso móvil de 512 × 56 del nivel 2; todos son editables, y los espejos base de 176 × 56. No se exige salto doble, planeo ni selección de forma.
- Existe una sola pareja bloque/placa por mapa. La placa solo acepta su bloque y lo fija al activarse. El jugador no la pulsa ni recoge bloques con la mano.
- El espejo conserva orientación inicial NE: recibe el haz desde la derecha y lo refleja arriba. Ahora también permite girar manteniendo Acción / E cerca; al soltar conserva el ángulo. La solución por desplazamiento sigue disponible. Los receptores de campaña no memorizan: requieren alineación mantenida.
- Tierra pesa 2 y el bloque 3 en las poleas. En el nivel 5, umbral 3 + masa 1 = 4: ninguno basta solo; juntos sí. La plataforma regresa al descargar.
- El interruptor de la cinta detiene/arranca un tramo; no invierte su dirección. La compuerta conserva su sentido por cuerpo. Las salidas exigen señales y llegada apoyada.
- Los relojes abren puertas temporalmente, no provocan derrota por tiempo. Ambos lados disponen de reactivación donde hace falta. R y el botón ↻ reinician el intento completo sin pagar recompensas.

## Pistas, edición, estrellas y premios

Cada JSON incluye `puzzle.brief` y tres `puzzle.hints`. **Propiedades del nivel** permite editarlos y guardarlos. Este campo es opcional: los documentos v1 antiguos siguen siendo válidos. Campaña y playtest muestran el objetivo breve y un botón de pista; ninguna pista se presenta automáticamente. El botón revela una por pulsación, permite ocultarlas y no altera señales, estrellas ni saldo. Las pistas solicitan observar, comparar y ordenar; la solución completa está solo en esta documentación. Se mantienen español e inglés; el texto personalizado del editor se conserva sin traducción inventada.

| Nº  | ID        | Puzzle                      | 3★ / 2★     | Premio acumulado 1 / 2 / 3★ | Monedas opcionales |
| --- | --------- | --------------------------- | ----------- | --------------------------- | ------------------ |
| 1   | forest-1  | La puerta sellada           | 35 / 90 s   | 30 / 60 / 100               | 5                  |
| 2   | forest-2  | Dos pesos, una salida       | 50 / 120 s  | 30 / 60 / 100               | 5                  |
| 3   | forest-6  | El reflejo perdido          | 50 / 120 s  | 30 / 60 / 100               | 5                  |
| 4   | forest-7  | La ruta invertida           | 55 / 130 s  | 30 / 60 / 100               | 5                  |
| 5   | forest-8  | El contrapeso               | 60 / 150 s  | 30 / 60 / 100               | 5                  |
| 6   | forest-9  | El camino sin retorno       | 75 / 180 s  | 30 / 60 / 100               | 5                  |
| 7   | forest-10 | El mecanismo dormido        | 65 / 160 s  | 30 / 60 / 100               | 5                  |
| 8   | forest-3  | El engaño de la plataforma  | 55 / 140 s  | 30 / 60 / 100               | 5                  |
| 9   | forest-4  | La cámara de las decisiones | 75 / 180 s  | 30 / 60 / 100               | 5                  |
| 10  | forest-5  | El santuario de piedra      | 120 / 300 s | 50 / 100 / 150              | 15                 |

Más tiempo siempre concede 1★. Repetir solo abona mejoras y monedas todavía no cobradas. Los umbrales son objetivos iniciales de dominio; necesitan calibración humana y en dispositivo. No son límites de resolución ni medidas de dificultad obtenidas de una reproducción automatizada.

## 1 · La puerta sellada

**Inferencia:** abrir la salida requiere relacionar dos fuentes de señal y regresar al oeste; avanzar hacia la puerta interior no es llegar a la meta. Introducción de dificultad baja: dos estados persistentes, una dependencia, ninguna amenaza.

**Solución y pasos:** desde X≈700, activar `outer-seal` cerca de X=980; abre `study-door` en X=1300. Entrar y activar `inner-seal` en X=1660. Regresar por el mismo patio al portal X=180. `exit-door` y portal requieren ambas señales.

**Pista visual:** portal y gran puerta al oeste, dos sellos y el rótulo I → II cerca del mando exterior. **Error posible:** quedarse buscando la salida a la derecha o regresar tras activar solo el primer sello. No consume una oportunidad; basta completar la señal pendiente.

**Playtest humano:** antes de tocar mandos, pedir que señale la salida; después de la primera activación, comprobar si identifica qué puerta cambió. Objetivo de primera resolución 1–3 minutos, sin necesidad de la tercera pista. Registrar si el regreso se descubre o solo se obedece tras una pista.

## 2 · Dos pesos, una salida

**Inferencia:** usar la piedra como paso provisional y recuperarla después para la placa. El jugador puede cruzar por encima de la carga, pero debe construir el regreso antes de trasladarla. Dificultad baja–media por reutilización y orden irreversible; no requiere Poder durante un salto.

**Solución y pasos:** empujar el bloque de 512 × 56 desde X=760 hacia la derecha hasta que abarque el canal X=960–1344. Saltar desde el suelo sobre su extremo izquierdo y caminar por encima hasta la orilla derecha. Activar `far-seal` cerca de X=1480: extiende `return-bridge`, que crea suelo para devolver la carga. Desde la derecha, empujar la misma piedra a la izquierda hasta `plate` (X=350). Saltar sobre la piedra fijada, bajar por su izquierda y regresar al portal X=180. El portal requiere el sello del otro lado y la placa.

**Pista visual:** anchura de la piedra comparable con el canal, sello al otro lado y placa occidental. **Error posible:** fijar la piedra primero o retirarla del canal antes de extender el puente. R recupera el intento. El canal tiene fondo seguro, pero no una escalera de escape; la pista final advierte que una piedra fijada no vuelve a moverse.

**Playtest humano:** comprobar si el bloque se interpreta como apoyo transitable y si el puente se entiende como vía para recuperar la carga, no como simple decoración. Objetivo 2–4 minutos; registrar fijaciones prematuras y caídas al canal. Esta revisión reemplazó un mando elevado que exigía combinar salto y Poder desde un cuerpo dinámico: las repeticiones revelaron sensibilidad al contacto y se prefirió eliminar esa exigencia del puzzle.

## 3 · El reflejo perdido

**Inferencia:** relacionar cara reflectante, posición y lente; mantener la alineación para volver al portal. Dificultad media prevista de lectura espacial. El giro permite una solución alternativa al desplazamiento descrito abajo.

**Solución y pasos:** pasar por encima de la base del espejo hasta su lado derecho; empujarlo a la izquierda hasta que el haz vertical alcance la lente de X=820. Soltar el movimiento al iluminarse. Volver por encima de la base, sin arrastrarla, hacia el portal occidental. `receiver` abre y mantiene `exit-door` y la salida.

**Pista visual:** haz visible, cara inclinada NE y lente elevada fuera del eje inicial. **Error posible:** empujar desde la izquierda o seguir empujando tras iluminar: la señal se pierde y la puerta se cierra. Se puede corregir desde el otro lado o reiniciar.

**Playtest humano:** preguntar qué predicen al empujar cada lado y al girar la cara; comprobar que entienden mantener y soltar Acción. Objetivo provisional 2–5 minutos; medir sobrepasos, interpretación de la cara reflectante y si la apertura/cierre se ve como consecuencia de la luz. El giro se añadió después del rediseño: los tiempos y la dificultad humana de los niveles 3 y 10 requieren un nuevo playtest con personas. Las rutas automatizadas solo comprueban completabilidad.

## 4 · La ruta invertida

**Inferencia:** detener el transporte adverso y transferir la carga al favorable; detener no significa invertir. Dificultad media, interacción entre movimiento propio y dos superficies.

**Solución y pasos:** usar `brake` cerca de X=1830 para detener `east-belt`, que mueve a la derecha. Desde la derecha de la carga, empujar hacia la izquierda hasta pasar al tramo `west-belt`, que transporta a la izquierda. Acompañar o dejar que entregue el bloque a la placa del extremo occidental. Volver al portal derecho, abierto por `plate`.

**Pista visual:** flechas opuestas sobre los dos tramos, rodillos en movimiento y placa al oeste. **Error posible:** empujar contra la cinta encendida, encenderla de nuevo o confundir qué tramo gobierna el mando. Se recupera con otro uso del interruptor; no hay una cuenta atrás.

**Playtest humano:** verificar que el jugador reconoce transporte autónomo de la carga, asocia el mando con un solo tramo y descubre la entrega entre cintas. Objetivo 2–5 minutos; no exigir una frenada en un instante preciso.

## 5 · El contrapeso

**Inferencia:** el ascenso exige compartir carga y transferirla antes de abandonar el conjunto. Dificultad media de equilibrio y posición. La disposición obliga a avanzar **hacia la izquierda**, desde el muelle derecho.

**Solución y pasos:** empujar la piedra desde X=1686 hasta `balance` (plataforma X=1152–1604, cota inicial 650). Subir detrás de ella: Tierra 2 + piedra 3 supera el umbral total 4. Esperar el ascenso a Y=370. Empujar la piedra hacia la cornisa izquierda hasta la placa, alejada del borde para que el jugador también llegue a terreno firme antes de descargar. Saltar sobre la piedra fijada y entrar en el portal X=640. Al descargar, la polea retorna; ambos corredores están libres.

**Pista visual:** cuerda y contrapeso real, dos alturas y placa en la cornisa. **Error posible:** intentar subir solo, dejar la piedra sola o saltar antes de llegar arriba. Un salto prematuro puede llevar al fondo seguro; reiniciar recupera toda la carga. La entrega final no exige ganarle una carrera a la plataforma que baja.

**Playtest humano:** comprobar que el fracaso de cada peso aislado conduce a combinar, que se nota el movimiento opuesto y que la transferencia es tolerante. Objetivo 3–6 minutos. Registrar intentos de cargar el contrapeso, abandono prematuro y legibilidad del muelle de llegada.

## 6 · El camino sin retorno

**Inferencia:** el paso permitido hacia el este no sirve para volver; el retorno usa otra altura y otra flecha. Dificultad media, circuito espacial con dos compuertas.

**Solución y pasos:** cruzar `outbound` hacia la derecha por el corredor inferior. Activar `far-seal` en X≈1980: alimenta el ascensor de retorno y la compuerta superior `inbound`. Esperar y subir en `return-lift`, salir por la izquierda a la pasarela Y=350, atravesar `inbound` en su sentido permitido y activar `return-seal` cerca de X=980. Bajar por el extremo occidental de la pasarela y volver al portal.

**Pista visual:** dos flechas opuestas en alturas distintas; la máquina de regreso responde al sello del fondo. **Error posible:** insistir en atravesar `outbound` al revés. La máquina vuelve periódicamente; no hay que reiniciar por perder un viaje. La pasarela impide saltar la compuerta inferior y la superior no admite entrada desde el oeste.

**Playtest humano:** intentar explícitamente el retorno incorrecto, observar si el bloqueo se interpreta como dirección o como fallo, y comprobar descubrimiento de la ruta elevada. Objetivo 3–6 minutos, con una señal clara de sentido antes de entrar.

## 7 · El mecanismo dormido

**Inferencia:** resolver la preparación persistente antes de iniciar una ventana temporal. Dificultad media–alta por separar planificación y ejecución, con tiempo suficiente para controles táctiles.

**Solución y pasos:** pasar por encima del bloque, colocarse a su derecha y llevarlo a la placa occidental. Esto abre `prepared-door`. Volver al mando X=950, activar `clock-start` y cruzar `clock-door` (6 s) hasta `far-seal`, en X=1880. Este segundo mando recuerda el sello y rearma el reloj para volver. Regresar, saltar la piedra fijada y entrar en el portal oeste.

**Pista visual:** placa y puerta persistente antes de la puerta de reloj; aviso luminoso al acercarse su cierre. **Error posible:** disparar el reloj antes de preparar la carga o quedarse detrás al expirar. Repetir el mando del lado ocupado restaura la oportunidad; el cierre espera si el jugador ocupa el hueco.

**Playtest humano:** probar expresamente expiración en ambos lados y verificar que se descubre la reactivación. Objetivo 3–6 minutos. Registrar si el intervalo de 6 s castiga la lectura del mando o solo una ruta todavía sin preparar.

## 8 · El engaño de la plataforma

**Inferencia:** la desaparición descubre la entrada buscada; atravesar continuamente la plataforma mantiene al jugador en el camino equivocado. Dificultad media, cambio de interpretación de un estado.

**Solución y pasos:** avanzar hasta X≈1000 y permanecer apoyado en `veil`. A los 2.2 s de contacto se retira el suelo; caer a la cámara Y=900. Activar `below-seal`, abrir la puerta interior en X=1120 y caminar al portal X=1190. La plataforma se reconstruye a los 6 s cuando su espacio está libre; la salida inferior no depende de esa ventana. No se exige esperar una segunda desaparición ni regresar por un ascensor.

**Pista visual:** santuario señalado debajo del sendero, dibujo de plataforma y transición de desaparición. **Error posible:** recorrer la superficie sin detenerse, buscando la salida en el extremo derecho. Se puede volver y observar; R sigue disponible. La cámara tiene suelo seguro.

**Playtest humano:** comprobar que la etiqueta hace comprensible la ubicación de la meta sin dictar la espera. Objetivo 2–5 minutos. Registrar el momento de la inferencia y evitar interpretar una caída accidental como comprensión del puzzle.

## 9 · La cámara de las decisiones

**Inferencia:** los sellos conservan la visita aunque cambie qué cámara está accesible. Dificultad media–alta por estado compartido, dos órdenes opuestas y dependencia AND.

**Solución y pasos:** inicialmente la barrera este está apagada y la oeste encendida. Visitar `east-seal`, volver al selector central y alternar: ahora se abre el oeste y se cierra el este. Cruzar por encima de la plataforma baja del ascensor, visitar `west-seal` y regresar. También es válida la visita en orden inverso, alternando el selector dos veces. Con ambos sellos, `judgment-lift` funciona; esperar abajo, subir y saltar a la cornisa del santuario. El portal requiere ambos.

**Pista visual:** dos barreras y dos sellos separados, más la indicación OESTE + ESTE junto a la salida elevada. **Error posible:** alternar sin observar, creer que cambiar el acceso borra el sello anterior o esperar el ascensor con una sola señal. Nada de ello fuerza reinicio.

**Playtest humano:** pedir que predigan el estado de ambas barreras tras una pulsación; probar ambos órdenes de visita. Objetivo 4–8 minutos. Una solución por pulsaciones aleatorias cuenta como completabilidad, no como evidencia de inferencia.

## 10 · El santuario de piedra

**Inferencia:** componer una cadena estable de luz → transporte → carga → viaje temporal → regreso, preservando lo ya resuelto. Dificultad alta dentro de Tierra; no introduce una forma ni una regla nueva.

**Solución y pasos:** pasar al lado derecho del espejo y alinearlo hacia la izquierda con la lente de X=900; esa señal alimenta la cinta occidental. Ir a la carga, saltar sobre ella y usar `brake` cerca de X=3030 para detener la cinta adversa. Bajar por el lado derecho y empujarla al oeste hasta que la cinta útil la entregue a `plate`. Volver a `clock-start` (X=2850), abrir la puerta temporal (6.5 s), cruzar el acceso preparado y activar `final-seal` en X=3460. Este mando rearma el retorno. Volver al oeste saltando por encima del bloque fijado y de la base del espejo para no perder la alineación; portal X=180.

**Pista visual:** tres familias visibles, señal de luz continua y el rótulo Luz · Carga · Tiempo. **Error posible:** empujar la carga contra la puerta cerrada sin dejar hueco para situarse a su derecha, activar el reloj demasiado pronto o mover el espejo al regresar. Reiniciar es inmediato; la alineación perdida también puede corregirse por contacto real.

**Playtest humano:** objetivo inicial 5–10 minutos. Registrar orden de descubrimiento, conservación de señales, interpretación de las cintas y errores de retorno. Verificar que la carga sigue ofreciendo espacio de maniobra antes de acercarla a la puerta; un atasco por empuje equivocado debe ser comprensible y no parecer un fallo del motor.

## Validación y lectura de la evidencia

`auditEarthPuzzle` complementa la validación general del editor: objetos y referencias, emisores necesarios activos físicamente, ausencia de elementos futuros, salida cerrada al inicio, apoyos seguros, límites del mundo, corredores de polea/contrapeso/ascensor y grafo optimista de superficies. Ese grafo **no** prueba orden de señales, altura libre del personaje, temporización ni dificultad.

Los tests cubren además todos los requisitos de salida por omisión individual, rechazo de llegada sin señales, edición/serialización de pistas, selector de barreras, expiración/reactivación, estado inicial nuevo, archivos archivados y ledger sin pagos repetidos. Los tests geométricos y de mecanismos previos siguen ejecutándose.

Las soluciones espaciales están en `scripts/earth-routes.json`; `earth-puzzle-smoke.js` verifica igualdad exacta con el JSON cargado, controla únicamente acciones normales, comprueba Tierra, ausencia de reinicios inesperados y victoria. No teletransporta ni enciende señales artificialmente. Captura estado, pasos, hash de documento y capturas.

`earth-puzzle-negative-smoke.js` ejecuta dos políticas en cada mapa: mantener derecha y mantener derecha con saltos/Poder repetidos. Cada política termina al quedar sin avance durante 4 s o al llegar al máximo de 25 s; registra hasta dónde llegó y exige que no gane. Son **20 intentos adversarios acotados**, no una demostración exhaustiva contra cualquier secuencia. Comprueba también reinicio de las diez escenas, señales, monedas y conservación de Tierra. La capacidad humana de encontrar un atajo diferente sigue siendo un objetivo de playtest.

`earth-puzzle-editor-smoke.js` abre los diez documentos, edita una pista en una copia temporal, guarda/reabre, comprueba revelado gradual, pausa, retorno al borrador, reinicio, tamaño de pantalla y aislamiento del saldo. Elimina únicamente su copia de prueba. Verifica también el HUD público en escritorio y 932 × 430; esa emulación no sustituye un iPhone.

## Resultado verificado de esta entrega

En la verificación anterior, Tierra y Agua alcanzaron **169,6 píxeles** de altura en Chrome. La revisión posterior eleva solo Tierra para alcanzar el bloque pesado estándar; esa medición anterior ya no describe su salto actual. Se ampliaron el canal del nivel 2 a 384 píxeles y su piedra a 512 para conservar la necesidad de reutilizarla. Tierra mantiene su descenso más pesado.

Pasaron **468 tests en 49 archivos**, typecheck, lint, formato y build web. Se completaron los diez mapas con acciones reales y sin reinicios inesperados; las 20 estrategias ingenuas acotadas no ganaron. Los diez mapas abrieron en el editor y sus reinicios restauraron el intento.

| Nivel                           | ID        | Reproducción de solución |
| ------------------------------- | --------- | ------------------------ |
| 1 · La puerta sellada           | forest-1  | 11.1 s                   |
| 2 · Dos pesos, una salida       | forest-2  | 11.9 s                   |
| 3 · El reflejo perdido          | forest-6  | 9.1 s                    |
| 4 · La ruta invertida           | forest-7  | 17.7 s                   |
| 5 · El contrapeso               | forest-8  | 11.4 s                   |
| 6 · El camino sin retorno       | forest-9  | 22.4 s                   |
| 7 · El mecanismo dormido        | forest-10 | 20.0 s                   |
| 8 · El engaño de la plataforma  | forest-3  | 5.3 s                    |
| 9 · La cámara de las decisiones | forest-4  | 22.0 s                   |
| 10 · El santuario de piedra     | forest-5  | 49.8 s                   |

Estos tiempos prueban completabilidad con conocimiento previo. No equivalen al tiempo de descubrimiento de una persona ni calibran las estrellas. El informe JSON contiene hashes, pasos, estado y límites de cada prueba.

## Reproducir

```sh
npm run dev -- --host 127.0.0.1 --port 5187
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

Abrir `/editor` → **Abrir** → elegir ID de la tabla → **Probar**. Flechas/A-D mueven; Espacio salta; E/Shift usa Poder e interactúa; R/↻ reinicia. No hay selector de forma. Las pistas se abren con el botón opcional de campaña o playtest; su idioma sigue las preferencias.

Los smokes requieren Playwright externo y Chrome; no se añadió una dependencia al proyecto:

```sh
PLAYWRIGHT_MODULE=/ruta/a/playwright VEYLITH_URL=http://127.0.0.1:5187 node scripts/earth-campaign-smoke.js
PLAYWRIGHT_MODULE=/ruta/a/playwright VEYLITH_URL=http://127.0.0.1:5187 node scripts/earth-puzzle-negative-smoke.js
PLAYWRIGHT_MODULE=/ruta/a/playwright VEYLITH_URL=http://127.0.0.1:5187 node scripts/earth-puzzle-editor-smoke.js
```

Aceptan `SMOKE_OUTPUT`; las reproducciones de rutas y estrategias aceptan `LEVELS` con IDs separados por comas. Los cambios externos a JSON necesitan reiniciar Vite: el editor desactiva deliberadamente la vigilancia automática de su directorio para conservar borradores. Guardar desde el editor ya invalida su módulo correctamente.

Resultados y limitaciones de la entrega: consultar `earth-puzzle-verification.json`. No se atribuye dificultad humana a los tiempos automatizados. No se realizaron sesiones con jugadores nuevos, compilación iOS ni medición de rendimiento/memoria en iPhone físico. La validación web conserva el alcance de esta entrega.
