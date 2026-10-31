# Interactive World Pack — MVP

El proyecto sigue en `/Users/francismartinez/Projects/Elements`. Abre `/editor` con el servidor de desarrollo. La biblioteca tiene **Pack · Funcionales** (15 objetos) y **Pack · Visuales** (5 objetos). Arrastra una miniatura o pulsa para colocarla. Se mantienen los diez niveles canónicos Ancient Forest y los documentos personalizados anteriores, sus IDs, monedas y progreso. Las gemas siguen siendo el único medio normal de transformación.

## Objetos funcionales

| Objeto                | Funcionamiento y configuración                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ascensor mecánico     | Recorrido relativo X/Y, velocidad, regreso por palanca, solo ida o ida/vuelta automática. Se activa mediante los IDs requeridos o «Activo sin conexiones». Transporta al jugador. Sin señal regresa al inicio en modo controlado; los modos anteriores se detienen donde están. Ante terreno o un obstáculo del pasajero se detiene; no aplasta. El collider completo se mueve con el objeto. |
| Ventilador horizontal | Dirección izquierda/derecha y velocidad de empuje. Agua, Fuego y Aire avanzan un poco antes de que el viento los haga retroceder; Tierra conserva su movimiento. La fuerza crece gradualmente y mantiene un breve impulso al salir, evitando vibración en el borde. Zona y base sólida independientes.                                                                                        |
| Lava                  | La zona de efecto reinicia el intento al tocarla con Agua, Aire o Tierra. Fuego puede caminar por su superficie fija. No transforma al jugador ni introduce puntos de vida.                                                                                                                                                                                                                   |
| Agua profunda         | Agua cruza sobre una superficie fija; los otros elementos reinician al entrar. MVP de cruce elemental, sin simulación de natación o profundidad. Los bloques flotantes sí interactúan con su superficie.                                                                                                                                                                                      |
| Rueda hidráulica      | Receptor de proyectiles de Agua; cantidad de impactos configurable. Al completarse gira y emite su ID activo hasta reiniciar. Fuego no la activa.                                                                                                                                                                                                                                             |
| Caldera               | Acumula impactos de Agua y Fuego, en cualquier orden, con umbrales independientes. El calor refleja Fuego recibido; solo produce vapor y activa su ID al completar ambos requisitos.                                                                                                                                                                                                          |
| Puente retráctil      | Sigue las señales conectadas. Duración de extensión/retracción configurable. Su collider aparece al extenderse por completo y se retira al comenzar a retraerse.                                                                                                                                                                                                                              |
| Muro destructible     | Uno o más golpes reales de Tierra, configurables. Respeta obstáculos que bloquean el puño. La rotura retira el collider y activa su ID hasta reiniciar. Pueden colocarse varios muros del pack.                                                                                                                                                                                               |
| Palanca               | Pulsa **Poder (E/Shift o botón táctil)** dentro de la zona de efecto para alternarla. La interacción consume esa pulsación, evitando lanzar un poder accidental. Estado inicial configurable. Si hay varias al alcance, responde la más cercana.                                                                                                                                              |

Las conexiones son listas de IDs en cada receptor. Todos deben estar activos. Con una lista vacía se usa «Activo sin conexiones»; con una lista no vacía ese ajuste se ignora. Pueden emitir señales los mecanismos anteriores (depósito, antorcha, placa, pared, cruce de Aire), además de palancas, ruedas, calderas y muros del pack. Los emisores nuevos también funcionan como requisitos de puertas y salidas anteriores. Una palanca puede apagar su señal; rueda, caldera y pared permanecen resueltas durante el intento. No hay conexiones cíclicas entre receptores ni scripts arbitrarios.

## Primera etapa: seis mecanismos adicionales

Puerta temporizada, plataforma evanescente, rebote, bloque flotante, barrera de energía e interruptor configurable son funcionales. Consulta [parámetros, laboratorios, controles y límites](stage-one-mechanics.md). Los seis niveles `lab-*` están separados de la campaña. Los props antiguos se conservan hasta usar «Convertir en mecanismo funcional».

## Objetos visuales disponibles

Engranaje, túnel de viento, salida de vapor, planta regable y molino de viento. Conservan sus estados seleccionables y collider fijo opcional. Su animación no añade una mecánica implícita.

## Arte, collider y zona de efecto

- Azul: lienzo completo del objeto. Las capas conservan origen superior izquierdo y transparencia; no se recortan ni se modifican los PNG.
- Verde/naranja: collider sólido habilitado/deshabilitado. **Editar collider** permite mover y redimensionar con ocho asas o editar sus valores en el inspector.
- Violeta: zona de efecto para viento, líquidos, interacción de palanca y recepción de proyectiles. **Editar efecto** permite ajustar su offset/tamaño con las mismas asas; también tiene campos numéricos propios.
- Amarillo: recorrido y posición final del ascensor.

Cambiar ancho/alto del dibujo no cambia las cajas. Mover el objeto desplaza sus cajas. La dirección del ventilador refleja sus capas, pero no mueve automáticamente la zona de efecto: coloca esta donde necesites el viento. En líquidos, la zona de efecto determina el plano seguro y la región peligrosa; el collider del dibujo no se usa. Las ondas son visuales. La escala de un módulo de agua/lava puede ajustarse, pero este MVP no añade un editor de líquidos por celdas.

El ascensor transporta al jugador, no bloques pesados. Diseña el recorrido libre de terreno y evita extremos fuera del mundo. El jugador puede saltar a través de la cara inferior de puentes y plataformas y aterrizar encima al caer. También puede entrar por los lados de las plataformas por defecto. El inspector permite cambiar las cuatro caras por objeto en **Caras sólidas para el personaje**. Bloques, espejos, puertas, paredes rompibles y barreras conservan contacto lateral; los bloques y proyectiles conservan sus propias colisiones. La física no prueba que un nivel sea resoluble.

## Guardado y playtest

Los objetos nuevos amplían JSON v1 con `type: world`, `kind`, `behavior`, `state`, `effect` e `hint`, además de identidad, arte y collider comunes. `behavior` es una unión de propiedades específicas por mecánica, validada contra el recurso real. Los documentos anteriores siguen siendo válidos.

Guardar y Guardar como usan el servicio existente: validación, escritura explícita/atómica, control de conflictos y restricción al directorio de niveles. Renombrar IDs actualiza conexiones; duplicar una selección remapea sus conexiones internas. Eliminar un emisor deja una referencia pendiente y el validador bloquea guardar/probar hasta corregirla. El inspector permite quitar conexiones nuevas pendientes.

Probar clona el documento. Estados, golpes, desplazamientos, gemas y monedas se reinician por intento y no se escriben en el borrador. Detener conserva historial y cambios. El playtest no paga monedas ni altera progreso. No se añadió selección manual de elemento.

## Auditoría y carga

Origen inspeccionado: `Projects/Assets for game/veylith_interactive_world/delivery`. Veinte objetos; 376 PNG bajo `assets/objects`: 276 frames individuales, 41 spritesheets, 39 piezas/estados y 20 miniaturas. Se verificó cada spritesheet horizontal sin padding contra todos sus frames, píxel por píxel. `interactive-world-audit.json` registra dimensiones, modo y SHA-256 de cada PNG; `interactive-world-collider-hints.json` conserva las cajas orientativas del pack. `worldManifest.json` contiene nombres, capas, anclas y metadata reales.

Los archivos copiados conservan exactamente sus bytes. Se cargan texturas del pack solo para los tipos presentes en el nivel. Un nivel anterior sin objetos nuevos no carga ninguna de estas texturas. El editor carga miniaturas y luego el arte completo de cada tipo colocado. Las texturas se liberan al destruir la instancia de juego/editor. La carga bajo demanda no equivale a una medición de memoria en iPhone: el pack tiene hojas grandes y esa validación sigue pendiente.

## Verificación

`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` y `npm run format:check`.

`src/tests/WindMotion.test.ts` verifica entrada gradual, retrocesos sostenidos en el borde a 30/60/120 fps, resistencia inmediata de Tierra y disipación/reinicio del impulso. `scripts/wind-smoke.js` comprueba trayectorias del jugador y cámara en Chrome, ambos sentidos y los cuatro elementos.

`src/tests/worldMechanisms.test.ts` comprueba reglas elementales, acumulación de Agua/Fuego, señales y conexiones, reinicio, recorrido y parada, puente, duplicación/renombrado, cajas independientes y guardado real con rechazo de datos inválidos/conflictos. `scripts/world-smoke.js` usa Chrome y el motor real con controles de juego. `scripts/world-editor-smoke.js` comprueba miniaturas, drag-and-drop, inspector, guardado/carga y ciclo del playtest. Aceptan `PLAYWRIGHT_MODULE`, `VEYLITH_URL` y `SMOKE_OUTPUT`. No requieren añadir dependencias al proyecto. Los smokes de campaña/editor anteriores continúan disponibles.

La compilación web y Chrome no sustituyen una compilación Xcode ni pruebas en un iPhone físico. No se cambiaron archivos nativos.

## Palancas para regresar el ascensor

Los ascensores nuevos usan **Ida y regreso por palanca** (`mode: controlled`): señal activa = destino; señal inactiva = posición de inicio. Al llegar esperan allí. Otra pulsación invierte el recorrido incluso a mitad de camino, conservando posición, velocidad configurada, transporte y protección ante obstáculos.

- **Una palanca:** deja su acción en **Alternar (ida / regreso)**. Selecciona su ID en **Activación por IDs** del ascensor, o marca el ascensor como destino de órdenes en la palanca. Pulsa Poder cerca para ir y vuelve a pulsar para regresar. Mantener el botón no repite la acción.
- **Dos palancas:** marca el mismo ascensor en **Destinos de órdenes por ID** de ambas. Elige **Activar (ir al destino)** en la primera y **Desactivar (regresar al inicio)** en la segunda. Puedes configurar ambas como Alternar si deben poder llamar al ascensor desde cualquiera de los extremos. En Alternar, cada orden invierte el destino actual del ascensor, independientemente del estado visual de la otra palanca. Sitúa las zonas de interacción al alcance del jugador en sus respectivas paradas.
- Las órdenes tienen prioridad sobre los requisitos hasta otra orden o reinicio. Para usar dos mandos, configura destinos en **ambos**; añadir las dos palancas como requisitos exigiría las dos señales simultáneamente. Una orden Regresar repetida sigue llevando al inicio.
- **Solo ida** (`once`) e **Ida y vuelta automática** (`pingpong`) conservan su comportamiento guardado: sin señal se paran. Para habilitar el regreso manual en un ascensor existente, cambia explícitamente su Recorrido. No se migran los demás niveles.

Los campos opcionales `action` y `targets` de las palancas conservan JSON v1: sin ellos, una palanca antigua sigue alternando solo su señal. El estado inicial no envía órdenes. Los destinos se validan, se remapean al renombrar/duplicar y admiten Deshacer/Rehacer. Reiniciar restaura posición, señales y órdenes; los saves de campaña no cambian.

Ejemplo editable: **Abrir → lab-lever-return → Probar**. El jugador empieza en el ascensor: pulsa Poder para subir 300 px, vuelve a pulsar junto a la palanca superior para bajar y repite. La plataforma de la derecha permite salir al llegar arriba. En `forest-1`, el ascensor conectado a `interactive-lever` queda configurado con regreso manual; el resto del diseño se conserva.

Pruebas reproducibles: `scripts/lever-return-smoke.js` comprueba las pulsaciones, el recorrido inverso, transporte real y reinicio; `scripts/lever-return-editor-smoke.js` comprueba configuración, guardado/reapertura y playtest aislado. Usan un Playwright externo mediante `PLAYWRIGHT_MODULE`, sin añadir dependencias. Estas pruebas verifican funcionamiento, no dificultad humana ni rendimiento en iPhone.
