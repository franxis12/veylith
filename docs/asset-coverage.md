# Auditoría y remediación de assets — Veylith

Generado por `npm run audit:assets`. Fuente: `public/assets`; 1838 archivos (1589 PNG, 74 WAV y 94 JSON). Se recorrieron 203 archivos de código, estilos y datos, además de las pruebas. Los originales no se modifican. `dist`, dependencias y copias nativas generadas no se cuentan otra vez.

## Cobertura comprobada

Una referencia o registro **no prueba integración**. “Visible” exige evidencia del navegador con la misma huella del código; “conectado” indica revisión estática sin comprobación visual individual. Las variantes fuente de un spritesheet se contabilizan como duplicados, no como integraciones adicionales. Los visuales del editor sin mecánica se reservan aunque puedan reproducirse allí. Evidencia vigente: **no**.

| Categoría    | Total | Visible/funcional | Conectado sin verificar | Duplicados | Reservados | Solo registro/condicional | Sin referencia | Incompatible |
| ------------ | ----: | ----------------: | ----------------------: | ---------: | ---------: | ------------------------: | -------------: | -----------: |
| audio        |    74 |                 0 |                      74 |          0 |          0 |                         0 |              0 |            0 |
| characters   |   208 |                 0 |                      25 |        178 |          5 |                         0 |              0 |            0 |
| effects      |    36 |                 0 |                       4 |         32 |          0 |                         0 |              0 |            0 |
| environments |   567 |                 0 |                     224 |        163 |         78 |                         0 |            102 |            0 |
| items        |    92 |                 0 |                      12 |         80 |          0 |                         0 |              0 |            0 |
| objects      |   655 |                 0 |                      72 |        431 |         92 |                        12 |             48 |            0 |
| ui           |   139 |                 0 |                      34 |         76 |         22 |                         7 |              0 |            0 |
| vfx          |    67 |                 0 |                       7 |         60 |          0 |                         0 |              0 |            0 |

El detalle por ruta, dimensiones, transparencia, hash, layout, coincidencia de frames, consumidores, eventos, exclusión, acción y verificación está en [JSON](asset-coverage.json) y [CSV](asset-coverage.csv). 0 incompatibilidades o referencias faltantes.

## Remediación implementada

- UI: skins normal/presionado/deshabilitado, botón sostenido por captura táctil/teclado, logo Veylith, panel e iconos de opciones, cierre, cronómetro, récord y continuación. Nodos de niveles distinguen actual/disponible/completado/bloqueado; las estrellas del mapa usan su arte propio y los prototipos se etiquetan P1/P2. Los textos, cifras y traducciones siguen siendo dinámicos.
- Recompensas: todos los frames CSS tienen duración efectiva, incluido el último; se conservan fallback, semántica accesible y movimiento reducido.
- Monedas: giro en el mundo y destello de seis frames tras recogida confirmada; máximo 16 efectos, vida por tiempo de juego y limpieza al salir/reiniciar. No se toca el abono de monedas.
- Puertas canónicas: apertura/cierre real de ocho frames, sin esperar la animación para actualizar la colisión. Salidas de puzzles con marco antiguo y sello mágico: ruptura al resolver, enfoque de cámara y fotograma original estático en el editor. El portal anterior queda en los prototipos.
- Depósitos y antorchas: agua y llama originales animadas al resolver el receptor; estados estáticos conservados como fallback.
- Pack funcional: arranque/parada del ventilador, activación del ascensor, calentamiento completo de caldera y agrietado completo por golpe. Las animaciones ya no saltan directamente al último frame; calentar no produce vapor antes de cumplir la mecánica y agrietar no destruye anticipadamente. Puente avanza por los frames de su progreso físico, sin recrear por cada porcentaje. Agua/lava componen burbujas/partículas y el contacto seguro con agua produce splash independiente.
- Las animaciones opcionales inválidas usan arte estático/miniatura, sin impedir la simulación. La primera etapa añade colisiones y seis laboratorios separados; conserva gemas, campaña canónica, save v1 y el servicio de archivos del editor.
- Campaña ilustrada: diez escenarios con capas y overlays observados en navegador; ver [inventario, soluciones y límites](illustrated-campaign.md) y su evidencia específica. La evidencia global antigua mantiene su propia huella y no se renueva por registrar assets.
- Entorno nuevo: 155 PNG y 12 familias de plataformas conectados al catálogo buscable y al renderer compartido. La carga depende de los objetos colocados; las decoraciones conservan el lienzo completo y las plataformas tienen colliders independientes. Medidas y hashes en [auditoría de expansión](asset-environment-expansion-audit.json); pruebas y límites en [verificación de integración](asset-environment-integration-verification.json).

## Exclusiones y límites reales

Solo existen diez niveles canónicos, todos de Tierra. Los prototipos multielemento siguen separados y compatibles con sus saves. Los capítulos 11–20 Agua, 21–30 Fuego y 31+ Aire aún no existen; esta auditoría no inventa niveles ni añade botones de transformación. Las gemas conservan la transformación inmediata.

Land de los cuatro personajes y glide_start siguen reservados al laboratorio conforme al presupuesto de 24 hojas de gameplay. Quedan cinco familias visuales del pack. La primera etapa incorpora puerta temporizada, desaparición, rebote, flotabilidad, barrera e interruptor configurable: ver [mecánicas y pruebas](stage-one-mechanics.md). Los objetos antiguos guardados como prop conservan su comportamiento hasta conversión explícita. Crecimiento, molino, engranaje, túnel de viento y vapor siguen siendo visuales. Los estados de lava apagada tampoco tienen disparador. Los botones de pistas/compra y layouts alternativos quedan fuera del alcance. La placa y la pared antigua tienen estados estáticos reales, no una secuencia exportada; no se inventan frames.

## Repetición y evidencia

1. Ejecutar `npm run audit:assets`: comprueba todos los PNG/WAV/JSON, dimensiones, alpha, duplicados y coincidencia de cada celda con su frame fuente. Sale con error ante archivos incompatibles o referencias revisadas faltantes. Un asset nuevo sin consumidor aparece como sin referencia; no se aprueba automáticamente.
2. Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format:check`.
3. Con Vite y Playwright disponible externamente, ejecutar `scripts/asset-coverage-smoke.js`, `scripts/world-smoke.js` y `scripts/earth-campaign-smoke.js`. Admiten `PLAYWRIGHT_MODULE`, `VEYLITH_URL` y `SMOKE_OUTPUT`. El harness es de desarrollo y usa entradas reales de movimiento/poder; no se importa al juego de producción.
4. La evidencia del navegador se conserva en `docs/asset-browser-evidence.json`; si cambia la huella del código, el auditor deja de contar esa evidencia como vigente. La reproducción completa solo se afirma para secuencias con todos los índices observados.

Las pruebas de Chrome no certifican consumo de memoria ni rendimiento de GPU en iPhone físico. Se informa memoria de texturas calculada y estabilidad de recursos en reinicios, no memoria total del dispositivo. El audio dispone de consumidores existentes; no se declara escuchado cada WAV individualmente.

Huella del código: `aa5da45c87cffda89b34b8bab6ea50a377bf966e8c43c0fe185bd6bf23490d35`.
