# Veylith — primera etapa de mecanismos

Implementación en el proyecto existente `/Users/francismartinez/Projects/Elements`. Se reutilizan los PNG, hojas y sonidos originales del Interactive World Pack. No se generaron espejos, poleas, cintas ni compuertas. No se rediseñó la campaña de Tierra 1–10, ni se modificaron las gemas, recompensas o saves v1.

## Abrir y probar

Ejecuta `npm run dev` y abre `/editor` en el puerto indicado. En **Abrir**, elige uno de estos documentos y pulsa **▶ Probar**. Son niveles personalizados, fuera del catálogo de campaña; playtest no paga monedas ni escribe progreso. A/D o flechas mueven, Espacio salta, E/Shift usa Poder y R reinicia.

| Archivo                   | Prueba manual                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lab-timed-door.json`     | Pulsa Poder al lado del interruptor inicial. La puerta abre 3.5 segundos. Cruza o quédate dentro para comprobar que espera antes de cerrar; sal del hueco. Vuelve al interruptor para reactivarla.  |
| `lab-phase-platform.json` | Cae sobre la primera plataforma: desaparece 1.2 segundos después del contacto. Al caer, apártate para permitir que reaparezca. La segunda plataforma alterna automáticamente entre sólida y oculta. |
| `lab-bounce.json`         | La caída inicial aterriza en el resorte y lanza al personaje. Vuelve a caer encima para repetir. Un contacto lateral o inferior no dispara el rebote.                                               |
| `lab-floating-block.json` | Permanece sobre el bloque: cae, flota y la corriente lo transporta. Se detiene ante la orilla; salta para salir. Tierra sobre el bloque está a salvo; entrar directamente al lago reinicia.         |
| `lab-energy-barrier.json` | Primero camina hasta la barrera activa: bloquea. Reinicia, pulsa Poder junto al interruptor y cruza la barrera apagada.                                                                             |
| `lab-switch.json`         | Prueba los tres interruptores, de izquierda a derecha: Activar, Desactivar y Alternar. Cada uno controla la misma puerta y barrera mediante dos IDs.                                                |

Cada archivo tiene una pista visible. No son nuevos niveles de campaña ni una propuesta de su diseño final.

## Mecánicas operativas y parámetros

Todos los tiempos están en milisegundos de simulación, las distancias en unidades del mundo y las velocidades en unidades por segundo. Pausar congela física, animaciones y relojes. Reiniciar reconstruye estados, tiempos, posiciones, órdenes y activaciones desde el documento.

| Mecánica                                 | Parámetros editables                                                                                                                     | Comportamiento real                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puerta temporizada (`timedDoor`)         | `openMs` 100–120000 (3000 por defecto); `warningMs` 0–`openMs` (800); `initiallyOpen` (false); `retrigger` restart/ignore                | Un flanco de activación abre por el tiempo configurado. Una señal sostenida no vuelve a abrir tras expirar. La orden Activar puede reiniciar el tiempo o ignorarse mientras está abierta. Desactivar cierra; Alternar invierte su estado abierto. El collider sigue el estado real y el cierre espera si hay un cuerpo dentro.                             |
| Plataforma evanescente (`phasePlatform`) | `mode` cycle/contact; `solidMs` 100–120000 (2000); `hiddenMs` 100–120000 (1500); `initiallySolid` (true)                                 | Ciclo continuo o cuenta regresiva iniciada al apoyar los pies encima. Al ocultarse retira su collider y el jugador cae. Al volver espera a tener el espacio libre. Desactivar restaura la solidez inicial y reinicia el ciclo.                                                                                                                             |
| Plataforma de rebote (`bounce`)          | `speed` 100–1800 (900); `cooldownMs` 0–10000 (250)                                                                                       | Impulso vertical al apoyar los pies desde arriba. Respeta un intervalo mínimo entre lanzamientos. No cambia el elemento. Apagada sigue siendo una plataforma sólida. Cancela un poder de movimiento al lanzar, para que una caída fuerte no anule el impulso.                                                                                              |
| Bloque flotante (`float`)                | `draft` 0–0.9 (0.25); `riseSpeed` 1–1000 (160); `currentSpeed` −500–500 (0)                                                              | Gravedad en seco; flotación en las zonas de efecto activas de Agua profunda. El calado es la fracción del alto del collider sumergida. La corriente mueve horizontalmente mientras está en agua. Colisiona con terreno, puertas y otros sólidos, transporta al jugador y se detiene ante obstáculos. Perderlo bajo el límite de caída reinicia el intento. |
| Barrera energética (`barrier`)           | Activación por requisitos o por órdenes                                                                                                  | Activa = sólida; apagada = transitable. Bloquea cuerpos y proyectiles usando el mismo collider. Espera si un cuerpo ocupa el hueco al activarse. No causa daño.                                                                                                                                                                                            |
| Interruptor (`switch`)                   | `action` activate/deactivate/toggle; `trigger` interact/fire/water; `initiallyActive` (false); `cooldownMs` 0–10000 (250); `targets` IDs | Poder cerca consume la pulsación y evita un disparo accidental. También puede configurarse como receptor de proyectiles reales de Fuego o Agua, ignorando el otro elemento. Emite su señal y envía la acción a todos sus destinos, respetando su espera entre usos.                                                                                        |

Puerta, plataforma evanescente, rebote y barrera comparten `requires` y `autostart`, igual que ascensor, ventilador y puente: con requisitos se necesitan todas las señales; sin requisitos se usa «Activo sin conexiones». Sus colliders mantienen offsets y tamaños independientes del dibujo. El efecto del interruptor define su zona de interacción o recepción. Deshabilitar ese efecto impide activarlo. Deshabilitar un collider impide su colisión, rebote o flotación física.

## Conexiones por IDs

Hay dos formas explícitas, compatibles con el sistema anterior:

- **Requisitos:** el receptor sigue la señal de uno o varios emisores. Los interruptores se pueden usar como requisitos de puertas y salidas anteriores, ascensores, ventiladores, puentes y los nuevos receptores. Todos los requisitos deben estar activos.
- **Órdenes:** en el interruptor marca los receptores bajo «Destinos de órdenes por ID». Activar, Desactivar o Alternar sustituye su activación anterior hasta otra orden o reinicio. Destinos admitidos: ascensor, ventilador, puente, puerta temporizada, plataforma evanescente, rebote y barrera. No admite órdenes a interruptores ni circuitos cíclicos. Para controlar puertas antiguas utiliza sus requisitos.

La señal inicial del interruptor no envía órdenes: configura el estado inicial del receptor o enlaza su señal mediante requisitos. Una orden Alternar invierte cada destino por separado. En puertas temporizadas invierte el estado abierto actual, incluso si su tiempo ya expiró.

Renombrar IDs y duplicar grupos actualiza ambas clases de vínculos internos. Borrar un destino conserva la referencia pendiente; validar impide guardar/probar hasta corregirla. El inspector permite desmarcar destinos desaparecidos.

## Arte y compatibilidad

La biblioteca ahora contiene **15 mecanismos funcionales** y **5 visuales**. Las seis familias nuevas usan las animaciones reales de apertura/cierre/aviso, aparición/desaparición, resorte, flotación/estela, barrera e interruptor. Las animaciones son presentación: sus frames no retrasan ni cambian las reglas físicas. Si una hoja opcional no existe o es inválida, se usa un estado estático o miniatura original, manteniendo el funcionamiento.

Un objeto antiguo de estas familias guardado como `behavior: { kind: "prop" }` sigue siendo visual y sólido fijo si así se guardó. En el inspector, **Convertir en mecanismo funcional** cambia explícitamente su comportamiento y habilita las cajas que necesita. Conserva posición, tamaño y offsets; revisa las cajas después de convertirlo. No hay migración silenciosa de borradores o campaña.

JSON sigue siendo versión 1. El servicio de archivos conserva validación de datos desconocidos, escritura explícita y atómica, ETags y restricciones de ruta. No se guardan estados transitorios en los documentos ni en el ledger de progreso.

## Límites del MVP

- Plataformas con colisión rectangular de dos caras. No hay polígonos ni colisión que siga los resortes u ondas dibujadas.
- Flotabilidad estable y corriente configurable por bloque; no hay simulación de fluidos, natación, arrastre con la mano, empuje del bloque flotante ni transporte de bloques pesados. Coloca la ruta libre de techos y usa el calado adecuado al tamaño del collider.
- Cuando un cuerpo ocupa un espacio de materialización, se conserva el estado visual transitable hasta que salga. El tiempo del mecanismo no espera a que termine una animación.
- Los estados activos de puerta, barrera y plataforma son estados operativos, no nuevos objetivos permanentes. La señal del interruptor sí es un emisor compatible con los requisitos existentes.
- Engranaje, túnel de viento, salida de vapor, planta y molino permanecen visuales. La lava apagada no adquiere un disparador. Ninguna mecánica nueva transforma al personaje: las gemas siguen siendo el único método.

## Verificación reproducible

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npm run format:check`.

`src/tests/stageOneMechanisms.test.ts` cubre activación y órdenes, flancos de señal, expiración/reactivación, ciclos/contacto, reinicio, colisiones y ocupación, rebote, flotación y terreno, validación, serialización de los seis laboratorios, compatibilidad de props y remapeo de vínculos. Complementa las pruebas existentes de repositorio, conflictos y saves.

Con Vite activo y Playwright disponible, ejecuta:

```sh
PLAYWRIGHT_MODULE=/ruta/a/playwright VEYLITH_URL=http://127.0.0.1:5184 node scripts/stage-one-smoke.js
PLAYWRIGHT_MODULE=/ruta/a/playwright VEYLITH_URL=http://127.0.0.1:5184 node scripts/stage-one-editor-smoke.js
```

Aceptan `SMOKE_OUTPUT` y `BROWSER_CHANNEL`. La prueba física usa controles reales de movimiento, Poder, gemas y reinicio. La del editor modifica parámetros, guarda/abre un archivo temporal propio, verifica JSON, monta/pausa/redimensiona/reinicia/detiene playtest y comprueba que no cambia el progreso; elimina su archivo temporal al finalizar. Los smokes de mecanismos anteriores y campaña siguen disponibles.

Las pruebas web no certifican rendimiento, memoria o colisiones en un iPhone físico. No hubo cambios nativos; no es necesario sincronizar Capacitor para usar estos laboratorios en desarrollo.

## Resultado de la entrega — 21 de octubre de 2026

- Typecheck, lint, build y format:check: correctos.
- Vitest: 404 pruebas correctas en 47 archivos, incluidas las nuevas reglas y los tests anteriores de guardado, gemas y progreso.
- Chrome: las seis mecánicas, los tres modos del interruptor, la transformación mediante gema para activación por Fuego, pausa/reinicio, colisión, transporte hasta la orilla y fallback con hojas incompletas pasaron sin errores.
- Editor real: seis presets, parámetros, conexiones, guardado/carga, pausa, resize, reinicio y retorno al borrador verificados; ledger de campaña intacto.
- Regresión: ocho comprobaciones de los mecanismos anteriores y las rutas completas de los diez niveles canónicos de Tierra correctas, además de las nueve comprobaciones de presentación y assets.
- Los diez JSON canónicos son idénticos byte por byte a los del inicio. No se añadieron ni modificaron assets originales. El inventario auditó 1122 assets útiles; la comprobación de preservación también incluyó archivos ocultos existentes.
- La evidencia visual actualizada queda en `docs/asset-browser-evidence.json` y la cobertura en `docs/asset-coverage.md`. Los informes diferencian presencia en registro, render observado y animaciones completas; no se afirma haber escuchado individualmente cada WAV ni medido rendimiento de iPhone.
