# Verificación de la remediación

Proyecto de destino: `/Users/francismartinez/Projects/Elements` (Veylith). Los cambios se prepararon en una copia de trabajo para preservar el proyecto y se aplican mediante comparación con la base: nunca se sobrescribe un archivo que haya cambiado entretanto.

## Alcance comprobado

- Inventario recursivo de `public/assets`: PNG, WAV y metadata originales, dimensiones, alpha, hashes, duplicados y celdas de cada spritesheet contrastadas contra sus PNG individuales. No se cuentan copias de compilación como nuevos recursos.
- Revisión de carga, registro y consumidores React/Phaser, editor y niveles. El inventario separa evidencia del navegador, integración estática pendiente de observar, duplicados y reservas explícitas. Un archivo nuevo no hereda automáticamente una reserva por estar en una carpeta de UI.
- Chrome: menús, opciones, selección, HUD, pausa, continuación, reinicio, cambio a 844 × 390, retirada del canvas, resultado por llegada real al portal y muestreo de todos los frames de las cuatro animaciones CSS de recompensa.
- Fixtures compatibles con el editor ejecutados en `MainScene`: cuatro gemas y transformaciones, monedas, puertas, antorcha, depósito, palanca, ventilador, ascensor, agua/lava, caldera, rueda, muro y puente. Solo entradas de juego para activar mecanismos; el estado inicial de cada fixture no altera la campaña. Los cuerpos físicos no se teletransportan para resolverlos.
- Los diez documentos canónicos de Tierra recorridos con controles y física reales mediante `earth-campaign-smoke.js`; comparación del documento cargado con el JSON de disco. Se verifican bloques/placas, paredes, palancas, ascensores, saltos, llegada, premios y ausencia de reinicios inesperados.
- Editor: miniaturas, colocación, estados, colliders y zonas de efecto independientes, conexiones, undo/redo, guardado/reapertura de un archivo temporal, pausa/reinicio/resize del playtest y aislamiento del progreso.
- Audio: 74/74 WAV cargados y decodificados, además de eventos de movimiento, salto, aterrizaje, pausa, ajustes y victoria. La prueba no constituye una escucha humana individual de los 74 sonidos.

## Evidencia y límites

Los resultados de navegador y el inventario se enlazan mediante `docs/asset-browser-evidence.json`. `npm run audit:assets` solo cuenta evidencia vigente frente a la huella del código. `verification.completeFrameCycle` exige que se hayan observado todos los índices de un spritesheet; ver unos pocos frames no equivale a completar la animación.

Los recursos se cuentan en cuatro reinicios consecutivos: texturas, objetos de escena y listeners físicos deben mantenerse constantes. La estimación RGBA de texturas no es la memoria total del proceso, GPU o iPhone. No se ejecutó Xcode ni se certificó rendimiento en iPhone físico.

No se editan los PNG/WAV/JSON originales de assets, los diez niveles, el esquema de saves ni las reglas elementales. Solo existen diez niveles canónicos; los dos prototipos siguen separados. Los futuros capítulos de Agua/Fuego/Aire no se crean en esta tarea.

## Repetir

```sh
npm run audit:assets
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

Para los smokes, iniciar Vite y proporcionar `VEYLITH_URL`, `PLAYWRIGHT_MODULE` si Playwright está instalado externamente y `SMOKE_OUTPUT`. Ejecutar:

```sh
node scripts/asset-coverage-smoke.js
node scripts/world-smoke.js
node scripts/earth-campaign-smoke.js
node scripts/world-editor-smoke.js
node scripts/audio-smoke.js
```

Con todos los informes exitosos y correspondientes al código actual:

```sh
node scripts/collect-asset-evidence.js ruta/ui/results.json ruta/world/results.json ruta/campaign/results.json ruta/editor/results.json ruta/audio/results.json
npm run audit:assets
```
