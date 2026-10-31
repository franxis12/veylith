# Puerta de salida y sello mágico

Integrado el 31 de octubre de 2026 en `/Users/francismartinez/Projects/Elements`.

Los objetos `exit` del esquema v1, tanto en la campaña como en el editor y su playtest, utilizan ahora `assets/objects/ancient_doorway_frame/ancient_doorway_frame.png` y las tres animaciones originales de `assets/objects/magical_seal/`. El ID de asset `portal` permanece compatible con los documentos guardados. Los prototipos históricos conservan su presentación anterior.

## Montaje y edición

- Marco original: 1280 × 1344. Ancla del umbral: (700, 1234).
- Sello: celdas originales de 512 × 1024, colocado en (560, 676), con tamaño 280 × 560 dentro del marco. Mezcla normal.
- `alignment/seal_clip_mask.png` recorta exclusivamente el sello. Se aplica una vez en memoria, en coordenadas originales, sustituyendo cada atlas en lugar de conservar una segunda textura. Funciona con los renderizadores Canvas y WebGL; los PNG del disco permanecen intactos.
- El editor muestra el primer fotograma original del sello (sin cargar los tres atlas); el juego y Probar cargan las animaciones completas. Esto reduce de 65,125 a 15,125 MiB las texturas adicionales de la salida en edición, antes de copias de navegador/GPU.
- `SEALED_IDLE`: 8 fotogramas, 6 fps. `SEAL_BREAK`: 10 fotogramas, 10 fps. `SEAL_ACTIVATE`: 8 fotogramas, 8 fps.
- El rectángulo visual v1 sigue siendo la guía del vano. La altura controla la escala uniforme; el centro horizontal y la base conservan el anclaje anterior. La fachada se extiende fuera de esa guía. Los colliders se editan por separado, exactamente como antes. No se estira la ilustración para cubrir un rectángulo de otra proporción.
- Se conserva la pared de piedra opaca que trae el recurso. La apertura es la desaparición del sello; el paquete no contiene hojas móviles de puerta ni un interior alternativo. Los cuatro VFX opcionales del paquete no se utilizan.

## Desbloqueo

Se comprueban las conexiones `requires` reales. Cuando pasan de bloqueadas a resueltas, la cámara se desplaza hacia la puerta durante 600 ms y aumenta su zoom un 14 %. Al llegar comienza la ruptura del sello, con 1200 ms para mostrarla completa. La cámara regresa durante 600 ms a su posición y zoom anteriores. Los límites del mundo siguen aplicándose.

Durante esos 2,4 segundos se detienen física, mecanismos, controles del personaje y cronómetro. Pausa y reinicio siguen funcionando. No se puede ganar antes de que termine la presentación, aunque el jugador ya esté dentro del área de salida. Después hay que entrar apoyado dentro del collider original; premios, monedas, estrellas y desbloqueos conservan su lógica.

Si se retira una condición, el sello reaparece con `SEAL_ACTIVATE` y vuelve a su espera animada. Otra activación permite una nueva presentación. Una salida sin requisitos empieza abierta sin escena inicial. Varias salidas desbloqueadas juntas se muestran en cola. Reiniciar reconstruye todas las condiciones y descarta la presentación anterior.

## Preservación y recuperación de recursos

Copia previa: `docs/level-archive/before-exit-door-2026-10-31/`, con niveles, archivos de integración originales y hashes de ambos paquetes de puerta. No se escribe ni se migra el progreso del usuario.

Al probar la campaña faltaba por completo `public/assets/environments/illustrated_levels`. Se recuperaron **285 archivos de contenido** desde `Projects/Assets for game/public 3`, `public 2` y `Level2/public`, todos coincidentes por SHA-256 con el archivo histórico del proyecto. No se regeneró ninguna imagen. Los otros 14 registros históricos eran metadatos `.DS_Store`; no se restauraron ni se consideran assets en la prueba de preservación. La auditoría de los once escenarios registrados vuelve a pasar.

## Validación

- `scripts/exit-door-smoke.js`: controles reales sobre un mapa de prueba con palanca. Verifica espera, zoom, desplazamiento, ruptura, retorno, tiempo y física detenidos, volver a sellar, pausa/resume, resize, reinicio durante la escena, victoria, entrada ya ocupada, salida inicialmente abierta y desmontaje/montaje. No altera señales ni teletransporta al jugador.
- `scripts/illustrated-campaign-smoke.js`, `LEVELS=forest-2`: solución y victoria reales del nivel 2, con la puerta nueva y reinicio completo.
- `scripts/illustrated-campaign-editor-smoke.js`: guardar una copia, reabrir, probar, reiniciar y volver al editor. El progreso y el contenido de los canónicos se comparan antes/después.
- Pruebas unitarias adicionales: secuencia temporal, reanudación del reloj, bloqueo de victoria durante la presentación, correspondencia de dimensiones/fps con los manifests y error de carga de assets esenciales.

Las pruebas repetidas detectaron errores de decodificación/carga de imágenes al alternar muchos mapas en la misma pestaña. El cargador del editor y del juego usa ahora imágenes directas y ocho descargas simultáneas, aprovechando la caché del navegador sin las copias Blob del cargador anterior.

Esto no vuelve a certificar la dificultad ni la solución de los diez mapas. La geometría actual de `forest-1` ya fallaba al comenzar: colliders fuera del mundo, inicio intersectando terreno y salida sin soporte permanente. Se conservan esas ediciones. Las dos pruebas históricas de evidencia de campaña también requieren nuevas rutas/recorridos por cambios anteriores del personaje y de ese nivel; no se sustituyen sus hashes para aparentar una validación nueva. No se ha probado en un iPhone físico.

### Resultado final

Presentación y reinicio: correctos. Ciclo de editor: **10/10**, sin errores de navegador ni cambios de progreso. Victoria real de campaña: **forest-2**, con reinicio completo. Typecheck, lint, build, formato y auditorías: correctos (1838 archivos de assets; ninguna referencia faltante o incompatibilidad). La suite completa tiene **574 pruebas correctas y 3 fallos previos** descritos arriba. El build mantiene su aviso anterior de bundle grande. [Evidencia y huellas de código](exit-door-validation.json).
