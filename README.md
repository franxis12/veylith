# Veylith

Juego de plataformas y puzzles 2D para web e iPhone en horizontal, desarrollado con React, TypeScript, Phaser 3 y Capacitor. La campaña **Ancient Forest** contiene diez escenarios ilustrados y usa exclusivamente **Tierra**, con bloques, placas, palancas, reflectores, poleas, cintas, puentes y elevadores. Los prototipos anteriores y el laboratorio de personajes se conservan.

La salida utiliza **ancient_doorway_frame** y **magical seal**. Al resolver sus requisitos, la cámara se acerca, muestra la ruptura del sello y vuelve al jugador; la física y el cronómetro se detienen durante la presentación.

**Para continuar desde otra computadora:** lee [AGENTS.md](AGENTS.md) y la [guía de desarrollo en la nube](docs/cloud-development.md). El repositorio incluye código, niveles, manifests, ilustraciones originales, animaciones y archivos de iOS. No depende de la carpeta personal donde se creó el proyecto.

## Arranque rápido

Necesitas Git, Node **22.13 o superior dentro de la rama 22.x** y npm **10 o superior**. `.nvmrc` selecciona Node 22; `package.json` también admite Node 24 y 26+. Usa las versiones fijadas por `package-lock.json`.

```sh
git clone --branch Dev https://github.com/franxis12/veylith.git
cd veylith
# Si usas nvm:
nvm install
nvm use
npm ci
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Abre `http://127.0.0.1:5187`. El editor está en `http://127.0.0.1:5187/editor`. Si no usas nvm, instala una versión compatible de Node y omite las dos líneas de nvm. No se necesitan variables secretas, cuenta de usuario ni servicios externos para ejecutar el juego web.

Los assets están incluidos en Git; **no hace falta Git LFS ni copiar archivos desde otro equipo**. La primera descarga es considerable por las ilustraciones, spritesheets y originales conservados.

## Estado real de esta entrega

La comprobación del 31 de octubre de 2026 pasó typecheck, lint, build, formato y ambas auditorías de assets. La suite tiene **574 pruebas correctas y 3 fallos pendientes**:

- Una prueba de integridad de `forest-1`: hay colliders fuera del mundo, inicio intersectando terreno y salida sin soporte válido.
- Dos pruebas de evidencia histórica: los hashes del personaje/código y de `forest-1` ya no coinciden con la versión de las diez rutas grabadas.

La nueva puerta tiene pruebas de apertura, cámara, pausa, reinicio y victoria. Hay una **victoria de campaña reciente en `forest-2`** y **10/10 ciclos de guardar, cargar, playtest y reiniciar en el editor**. Las diez victorias anteriores corresponden a otra revisión: no se certifican diez soluciones actuales ni dificultad humana. No hay validación en iPhone físico. Consulta [la validación de salida](docs/exit-door.md) y [el trabajo pendiente](docs/cloud-development.md#prioridad-al-retomar-la-campaña).

Estos fallos se mantienen visibles; no se han omitido tests ni actualizado hashes para simular un resultado correcto.

## Ramas y trabajo diario

- **`main`**: base publicada del proyecto. Esta importación incluye las limitaciones indicadas arriba.
- **`Dev`**: desarrollo activo, con mayúscula inicial. El clon del arranque rápido queda siguiendo `origin/Dev`.
- Para tareas simultáneas, crea una rama de trabajo desde `Dev` y propone integrar los cambios en `Dev`. La publicación o promoción a `main` se decide por separado.

```sh
git switch Dev
git pull --ff-only origin Dev
# Desarrollar, revisar cambios y ejecutar las comprobaciones.
git add <archivos-revisados>
git commit -m "Describe el cambio y su motivo"
git push origin Dev
```

No uses force push para resolver divergencias. Conserva el trabajo de otros agentes y los archivos originales. Las credenciales de GitHub se configuran en el entorno de cada agente, nunca en el repositorio.

## Comandos

Ejecuta todos desde la raíz del clon.

| Comando                               | Uso                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                         | Servidor Vite de desarrollo; por defecto escucha en la red local       |
| `npm run typecheck`                   | Comprobar TypeScript                                                   |
| `npm run lint`                        | ESLint, sin advertencias permitidas                                    |
| `npm test`                            | Suite completa de Vitest; ver los tres fallos conocidos                |
| `npm run test:watch`                  | Pruebas en modo observación                                            |
| `npm run build`                       | Typecheck y compilación web a `dist/`                                  |
| `npm run preview -- --host 127.0.0.1` | Servir el build; no incluye el editor                                  |
| `npm run format:check`                | Verificar formato                                                      |
| `npm run format`                      | Aplicar formato, respetando originales y archivos históricos excluidos |
| `npm run audit:assets`                | Auditar assets y regenerar los informes `docs/asset-coverage.*`        |
| `npm run audit:illustrated`           | Validar manifests, capas y animaciones ilustradas sin reescribirlos    |
| `npm run test:exit:browser`           | Probar la puerta y su presentación en navegador                        |
| `npm run test:illustrated:browser`    | Repetir las rutas reales de solución guardadas                         |
| `npm run test:illustrated:negative`   | Intentar las dos estrategias ingenuas por nivel                        |
| `npm run test:illustrated:editor`     | Guardar/cargar/probar/reiniciar los diez niveles                       |
| `npm run cap:sync`                    | Compilar web y sincronizar el proyecto iOS                             |
| `npm run ios:open`                    | Abrir iOS en Xcode, en macOS                                           |

Los scripts de navegador necesitan Playwright y un navegador instalado. La [guía de nube](docs/cloud-development.md#pruebas-de-navegador) contiene la instalación aislada y las variables para Linux, sin añadir dependencias al juego. Los scripts históricos de otras etapas pueden usar rutas o supuestos antiguos; empieza por los cuatro comandos de navegador de esta tabla.

## Juego, progreso y editor

- **A/D o ←/→:** mover. **Espacio/W/↑:** saltar. **E/Shift:** acción o poder. **R:** reiniciar. **Escape:** pausar.
- Los controles táctiles admiten gestos o botones, configurables en Opciones. También se puede cambiar entre inglés y español.
- Los diez niveles de Ancient Forest empiezan en Tierra, sin gemas de transformación ni selección manual de elemento. Cada puzzle tiene pistas opcionales y requisitos de salida.
- Una partida nueva comienza con el primer nivel desbloqueado. Ganar habilita el siguiente, conserva el mejor tiempo y otorga estrellas y monedas según los datos del nivel. Las monedas recogidas se acreditan una sola vez al ganar; reiniciar o usar el editor no paga recompensas.
- El progreso vive en el navegador bajo `veylith.progress` (versión 1). No hay guardado espacial de un intento ni sincronización en la nube. Clonar el repo no copia ni modifica partidas personales.
- `/editor` usa los mismos JSON que el juego. **Guardar** escribe explícitamente; **Probar** ejecuta el borrador aislado del progreso. Revisa geometría, conexiones y victoria real después de editar.
- El servicio de archivos del editor solo acepta conexiones de localhost y del mismo origen. En la nube, abre el navegador dentro del mismo entorno o usa un túnel local que preserve esas condiciones. Un enlace público de vista previa puede mostrar el juego y rechazar el guardado del editor; no desactives sus protecciones.

El orden visible conserva IDs históricos: **`forest-1`, `forest-2`, `forest-6`, `forest-7`, `forest-8`, `forest-9`, `forest-10`, `forest-3`, `forest-4`, `forest-5`**. No renombres esos IDs para igualar la numeración visible: rompería saves y evidencia.

## Organización del proyecto

| Ruta                                         | Responsabilidad                                                  |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `src/app/`, `src/components/`, `src/stores/` | Interfaz React y estado de aplicación                            |
| `src/game/`                                  | Escenas Phaser, personajes, física, mecanismos y sesión de juego |
| `src/game/levels/data/`                      | JSON canónicos de campaña y laboratorios                         |
| `src/game/levels/schema/`                    | Esquema, compilación y renderer compartido                       |
| `src/game/assets/`                           | Catálogos y carga de recursos reales                             |
| `src/editor/`, `server/`                     | Editor visual y guardado local validado                          |
| `src/services/`                              | Progreso, traducciones, audio e integración de plataforma        |
| `src/tests/`                                 | Pruebas unitarias, integración e integridad                      |
| `public/assets/`                             | Originales y exports del juego, incluidos escenarios y puerta    |
| `scripts/`                                   | Auditorías, harness y recorridos de navegador                    |
| `docs/`                                      | Diseño, mecánicas, validaciones y copias históricas de niveles   |
| `ios/`                                       | Proyecto nativo Capacitor; necesita macOS/Xcode para compilar    |

React controla la interfaz; Phaser controla el mundo. No traslades física por frame a React/Zustand. El editor y sus herramientas de escritura quedan fuera de producción. `node_modules/`, `dist/`, resultados temporales y datos personales de Xcode se excluyen de Git.

## Documentación de desarrollo

1. [Reglas para agentes](AGENTS.md) y [desarrollo en la nube](docs/cloud-development.md).
2. [Arquitectura](docs/architecture.md) y [Level Editor](docs/level-editor.md).
3. [Campaña ilustrada: inventario, conexiones, soluciones y pistas](docs/illustrated-campaign.md). Distingue la evidencia histórica del estado actual.
4. [Puzzles y contratos](docs/forest-puzzles.md), [mecanismos iniciales](docs/stage-one-mechanics.md) y [mecanismos avanzados](docs/advanced-mechanics.md).
5. [Nueva salida y cámara](docs/exit-door.md), [assets](docs/asset-guidelines.md) y [auditoría](docs/asset-coverage.md).
6. [Opciones y controles](docs/options-controls.md), [UI/progreso](docs/veylith-ui.md), [poderes](docs/elemental-powers.md) y [audio](docs/audio-integration.md).

Para iOS, instala las dependencias con npm y ejecuta `npm run cap:sync` antes de abrir Xcode. Linux sirve para web, editor y pruebas; no compila el destino iOS. Los requisitos nativos de Capacitor y los pasos específicos están en la [guía de nube](docs/cloud-development.md#ios-y-límites-del-entorno).
