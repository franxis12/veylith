# Corrección de plataformas móviles

Veylith · 21 de octubre de 2026.

Se corrigió la pérdida de apoyo y la vibración al viajar sobre ascensores y plataformas horizontales. No se cambiaron los mapas, la altura de salto, los assets, los controles, las partidas ni los archivos de audio.

## Causa y cambio

La plataforma modificaba a la vez la posición del cuerpo Arcade y la posición de su GameObject durante la actualización visual. Después, `Body.postUpdate` volvía a aplicar el desplazamiento del cuerpo al objeto. Además, la plataforma avanzaba en fotogramas donde la física no había dado un paso. Esto generaba desplazamiento relativo, pérdida de contacto y caídas. La prueba anterior al arreglo produjo una caída y un reinicio sin mantener ningún control de movimiento.

`WorldSystem` ahora avanza mecanismos y transporta al pasajero en el evento `worldstep`, después de resolver contactos y una vez por paso físico. Solo modifica el cuerpo del pasajero; Phaser sincroniza el GameObject. La posición del ascensor se calcula respecto a su origen para evitar error acumulado en los extremos. El pasajero conserva contacto descendente, velocidad vertical cero y pies sobre el plano de apoyo. El salto y la salida lateral liberan ese apoyo; no hay adhesión en el aire.

`PlatformMotion` comprueba contacto desde arriba y obstáculos del ascensor/pasajero. Continúa la protección frente a techo o pared. Un collider desactivado permite movimiento visual, pero no transporta ni bloquea al jugador. La suscripción se retira usando la referencia del mundo físico original, incluso cuando Phaser ya desmontó el plugin de la escena.

El archivo compartido `WorldSystem` ya contenía nuevas llamadas de audio. Se conservaron su inicialización, efectos, actualización y señales sin cambios. No se editaron MainScene, los módulos de audio ni sus pruebas.

## Evidencia

- `PlatformMotion.test.ts`, `platformContact.test.ts` y `worldMechanisms.test.ts`: 26 pruebas aprobadas.
- `platform-stability-smoke.js`: seis escenarios con documentos del editor, plataforma horizontal/vertical y objetivos de actualización de 30/60/120 Hz. Cada caso permanece 8,5 segundos sin movimiento del jugador, recorre ambos sentidos, salta, vuelve a aterrizar, sale por el borde y reinicia. No se teletransporta al jugador ni se activan mecanismos por acceso interno. La palanca se usa mediante Poder.
- Los seis casos mantuvieron apoyo en todas las muestras. Error de pies/collider/posición visual: 0; deriva horizontal máxima inferior a 0,000001 unidades. La suscripción de física permanece única después del reinicio. Los objetivos de Hz no equivalen a una certificación de frecuencia de pantalla o de rendimiento nativo.
- `earth-campaign-smoke.js`: completos los cuatro mapas reales con plataformas (`forest-8`, `forest-9`, `forest-3`, `forest-5`), usando movimiento, salto y Poder, incluyendo embarque y desembarque. Un intento cada uno. Se mantuvieron como Tierra.
- Typecheck, lint y build aprobaron. El build conserva el aviso conocido de tamaño del bundle.
- La ejecución de toda la suite tuvo 368 pruebas aprobadas y 1 fallo relacionado con la integración concurrente de audio: el mock de sprite en `forestAnimations.test.ts` no implementa `.on`, usado ahora por `ForestAnimatedProps.ts`. No se modificó ese trabajo.
- La revisión global de formato detectó únicamente `scripts/audio-smoke.js`; se dejó intacto para el otro agente. El formato de los archivos de esta corrección se comprueba por separado.

La prueba de estabilidad usa un escenario de diagnóstico cuyo spawn está sobre la plataforma inicialmente detenida; los cuatro recorridos canónicos prueban el embarque real. Las pruebas se ejecutaron en perfiles de Chrome aislados sin escribir el progreso del usuario. No hubo prueba en iPhone físico.
