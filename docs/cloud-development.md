# Desarrollo de Veylith desde otra computadora

Esta guía permite que un agente continúe el proyecto desde un clon independiente, sin acceso al Mac original. Lee primero `AGENTS.md`. El nombre histórico de la carpeta es `Elements`; el producto es Veylith y el checkout puede estar en cualquier ruta.

## Preparar el entorno

1. Clona `https://github.com/franxis12/veylith.git` seleccionando la rama **`Dev`**.
2. Usa Node 22 (mínimo 22.13) y npm 10 o superior. `.nvmrc`, `package.json` y `package-lock.json` son las referencias de versiones; no reinstales con Yarn/pnpm ni regeneres el lockfile por rutina.
3. Desde la raíz del clon, ejecuta `npm ci`. Instala tanto dependencias de ejecución como de desarrollo; no uses `--omit=dev` para construir o validar.
4. Ejecuta `npm run dev -- --host 127.0.0.1 --port 5187 --strictPort` y abre `http://127.0.0.1:5187`.

```sh
git clone --branch Dev https://github.com/franxis12/veylith.git
cd veylith
nvm install
nvm use
npm ci
git status --short --branch
```

Omite nvm si Node ya está instalado con una versión compatible. El acceso de red es necesario para clonar, descargar dependencias y, si procede, instalar el navegador. Después el juego web usa recursos locales. No necesita `.env`, backend, base de datos ni claves de API.

Los assets están versionados como archivos completos, sin Git LFS, submódulos ni enlaces simbólicos. Conserva varios GB libres para el clon, dependencias, navegador y builds. No busques carpetas externas como `Assets for game`; las rutas absolutas de los informes antiguos identifican el equipo donde se tomaron esas evidencias.

## Ramas y entrega de cambios

`main` contiene la base publicada; `Dev` es la rama compartida de desarrollo. El clon con `--branch Dev` configura su seguimiento de `origin/Dev`.

Antes de editar, revisa `git status`, `git branch -vv` y `git log -5 --oneline`. Conserva cambios ajenos. Con un árbol limpio, actualiza con `git pull --ff-only origin Dev`. Si la rama divergió, inspecciona los commits y resuelve la integración; no uses reset destructivo ni force push.

Para una tarea aislada o agentes trabajando simultáneamente:

```sh
git switch Dev
git pull --ff-only origin Dev
git switch -c feature/descripcion-corta
# Implementar y validar.
git add <archivos-revisados>
git commit -m "Explica el cambio"
git push -u origin feature/descripcion-corta
```

Integra esa rama en `Dev` mediante revisión. Si la tarea autoriza trabajar directamente sobre `Dev`, conserva su upstream y usa `git push origin Dev`. Publicar/promover a `main` requiere la instrucción correspondiente. Las credenciales de escritura pertenecen al entorno del agente: configúralas mediante su integración de GitHub o gestor de credenciales, nunca en archivos, URLs ni logs del proyecto.

## Qué leer y dónde cambiar

- **Arquitectura y ciclo de vida:** `docs/architecture.md`. React es interfaz; Phaser es mundo; Zustand guarda estado de aplicación. Mantén la cancelación/limpieza de `GameCanvas` y del editor bajo StrictMode.
- **Edición de mapas:** `docs/level-editor.md`, `src/game/levels/schema/` y `server/levelRepository.ts`. Editor y runtime consumen el mismo documento; no construyas una segunda geometría en TypeScript.
- **Campaña:** `docs/illustrated-campaign.md`, `src/game/levels/data/forest-*.json`, `src/game/levels/campaignOrder.ts`. Las descripciones de victoria del 27 de octubre son históricas; revisa la actualización de salida y los fallos actuales.
- **Mecanismos:** `docs/forest-puzzles.md`, `docs/stage-one-mechanics.md`, `docs/advanced-mechanics.md` y `src/game/levels/forestPuzzles/`.
- **Puerta:** `docs/exit-door.md`, `src/game/assets/exitAssets.ts`, `src/game/levels/schema/renderExit.ts` y `src/game/systems/exit/ExitReveal.ts`.
- **Progreso y moneda:** `src/services/progress/progress.ts`. Preserva save v1, IDs, récords, pago por victoria y ausencia de recompensas en playtest.
- **Assets:** `public/assets/`, catálogos en `src/game/assets/`, `docs/asset-guidelines.md`. Inspecciona manifests y dimensiones antes de registrar recursos; no inventes frames ni deformes originales.

La campaña es exclusivamente Tierra: sin selección manual ni gemas. Los otros elementos siguen existiendo en prototipos/laboratorios. No los retires al modificar Ancient Forest.

## Editar y comprobar un nivel

1. Revisa el JSON actual y el diff. Usa Git y las copias de `docs/level-archive/` como historial; no reescribas los archivos históricos ni sus hashes.
2. Abre `http://127.0.0.1:5187/editor`. Inspecciona capas, escala, superficies, huecos, spawn, salida y conexiones reales. Los Box Colliders son independientes del dibujo.
3. Ajusta objetos editables y mecanismos; conserva el arte. Describe cualquier diferencia entre la geometría pintada y la solución jugable.
4. Guarda explícitamente, recarga el documento y ejecuta **Probar**. Si hay conflicto de revisión, recupera el cambio concurrente antes de volver a guardar. No fuerces el guardado eliminando la comprobación.
5. Recorre una solución con controles normales; comprueba victoria efectiva, reinicio desde varios estados, pistas, monedas y estrellas. Una referencia registrada, JSON válido o editor visible no demuestra que se pueda ganar.
6. Repite las estrategias ingenuas, comprueba que no ganen, y documenta qué se probó. La automatización no certifica dificultad humana.
7. Actualiza la documentación y, solo tras recorridos válidos, la evidencia. Revisa `git diff` para confirmar que no quedaron copias temporales ni cambios ajenos.

El orden visible/ID es: 1=`forest-1`, 2=`forest-2`, 3=`forest-6`, 4=`forest-7`, 5=`forest-8`, 6=`forest-9`, 7=`forest-10`, 8=`forest-3`, 9=`forest-4`, 10=`forest-5`. No renumeres saves ni monedas existentes.

## Comprobaciones de código y assets

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npm run audit:illustrated
npm run audit:assets
```

Ejecuta cada comprobación y registra su resultado, aunque otra falle. `build` incluye typecheck y genera `dist/`; no lo subas a Git. `audit:assets` regenera `docs/asset-coverage.json`, `.csv` y `.md`: revisa sus cambios. Una evidencia antigua puede quedar invalidada cuando cambia el código; no alteres sus hashes manualmente para aprobar la auditoría. El aviso de chunk grande de Phaser es conocido y no equivale a error de compilación.

Usa `npm exec prettier -- --write <archivos>` para cambios acotados. El formato excluye los assets y las copias preservadas por bytes. `work/`, `playwright-report/` y `test-results/` son temporales ignorados; conserva únicamente evidencia final deliberada en `docs/`.

## Pruebas de navegador

Los recorridos usan Playwright externo. Esta instalación opcional queda dentro de `work/`, fuera de las dependencias del juego y de Git:

```sh
npm install --prefix "$PWD/work/browser-tools" --no-save --package-lock=false playwright@1.62.1
node work/browser-tools/node_modules/playwright/cli.js install chromium
export PLAYWRIGHT_MODULE="$PWD/work/browser-tools/node_modules/playwright"
export BROWSER_CHANNEL=chromium
export VEYLITH_URL=http://127.0.0.1:5187
```

En Linux, si faltan bibliotecas del sistema, usa `node work/browser-tools/node_modules/playwright/cli.js install --with-deps chromium` con los permisos que permita el entorno, o una imagen que ya incluya esas bibliotecas. La instalación del navegador y sus librerías es independiente de `npm ci`. Si el entorno ya proporciona Playwright, apunta `PLAYWRIGHT_MODULE` a su paquete; usa `BROWSER_CHANNEL=chrome` para Google Chrome instalado. Sin esa variable, los scripts usan Chrome.

Mantén Vite ejecutándose en otra terminal, en el mismo entorno que el navegador:

```sh
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Termina antes las comprobaciones de Vitest/build; evita ejecutarlas mientras arranca ese mismo servidor. Si el primer arranque devuelve `504 (Outdated Optimize Dep)`, detén Vite y vuelve a iniciarlo con el mismo comando añadiendo `--force`, y repite la prueba en un contexto nuevo. No aceptes un recorrido con errores de carga.

Después ejecuta los recorridos **de uno en uno**:

```sh
SMOKE_OUTPUT=work/exit-door npm run test:exit:browser
LEVELS=forest-2 SMOKE_OUTPUT=work/illustrated/level-2 npm run test:illustrated:browser
SMOKE_OUTPUT=work/illustrated/editor npm run test:illustrated:editor
```

La primera prueba usa una escena de prueba con palanca y controles reales: comprueba puerta, cámara, congelación del reloj/física, pausa, reinicio, victoria y remontaje. La segunda reproduce una victoria del nivel 2. La tercera prueba guardar/reabrir/playtest/reiniciar/resize de los diez y compara progreso; crea copias temporales en la carpeta de niveles y las elimina. Si se interrumpe, revisa los archivos no versionados antes de limpiar únicamente las copias creadas por la prueba.

Para volver a certificar toda la campaña, primero resuelve la geometría y las rutas pendientes. Ejecuta luego:

```sh
SMOKE_OUTPUT=work/illustrated/solutions npm run test:illustrated:browser
SMOKE_OUTPUT=work/illustrated/negative npm run test:illustrated:negative
SMOKE_OUTPUT=work/illustrated/editor npm run test:illustrated:editor
node scripts/collect-illustrated-evidence.js work/illustrated/solutions/results.json work/illustrated/negative/results.json work/illustrated/editor/results.json
npm test
```

Solo ejecuta el colector después de verificar que **los tres informes corresponden al mismo código/datos**, contienen diez resultados correctos y no tienen errores. El colector comprueba resultados y documentos y registra las huellas actuales; no demuestra por sí mismo cuándo se ejecutaron los recorridos. Una prueba parcial con `LEVELS=forest-2` no sirve para reemplazar evidencia de diez niveles. Conserva pruebas negativas y de reinicio; no omitas fallos para conseguir un reporte verde.

Los contextos de navegador son nuevos y aislados. Los saves personales del usuario no forman parte del repo. Mantén el aislamiento del playtest y no borres `localStorage` en el navegador habitual del usuario.

### Editor en entornos remotos

El servicio de archivos exige una conexión loopback, Host localhost y mismo origen. Playwright ejecutado dentro del contenedor y dirigido a `127.0.0.1` cumple esas condiciones. Una URL de preview pública o un proxy que cambie Host puede dar 403 en `/__veylith_editor`; no debilites la validación ni expongas ese servicio para resolverlo. Usa el navegador dentro del entorno o un túnel SSH local que preserve el Host.

`npm run preview` sirve el build de producción y no ofrece editor ni harness. Para las pruebas anteriores usa siempre el servidor de desarrollo.

## Prioridad al retomar la campaña

Estado registrado el 31 de octubre de 2026: **574 tests correctos y 3 fallos**, sin ocultarlos ni marcarlos como esperados.

| Fallo                          | Evidencia y siguiente trabajo                                                                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integridad de `forest-1`       | `src/tests/campaignIntegrity.test.ts`: colliders de `exit-bank`, `rock-medium-a` y un Box Collider exceden el mundo; spawn intersecta terreno y la salida carece de apoyo permanente. Revisar JSON y dibujo antes de cambiar coordenadas. |
| Huellas de código de las rutas | `src/tests/illustratedBrowserEvidence.test.ts`: personaje y código posterior difieren de la grabación. Volver a recorrer; no sustituir hashes sin pruebas nuevas.                                                                         |
| Documento del primer nivel     | La misma prueba de evidencia detecta cambios de `forest-1`. Rehacer su solución tras reparar/validar el mapa y después repetir el conjunto.                                                                                               |

La entrega de la puerta comprobó una victoria canónica reciente (`forest-2`), la presentación completa y diez ciclos de editor. No acredita diez victorias con la física actual. Los datos de diseño, pistas y soluciones previstas están en `docs/illustrated-campaign.md`, con evidencia anterior en `docs/illustrated-campaign-validation.json` y evidencia de salida en `docs/exit-door-validation.json`.

Al terminar una tarea, informa archivos cambiados, validaciones aprobadas/fallidas, niveles con victoria real y límites pendientes. Distingue resultados automatizados, revisión visual y pruebas con personas.

## iOS y límites del entorno

Linux puede instalar dependencias, desarrollar web, editar mapas, ejecutar Vitest y probar Chromium. La compilación, simulador, firma y pruebas de iPhone requieren un Mac con Xcode compatible con Capacitor 8. Consulta los requisitos del entorno nativo instalado antes de actualizar Xcode o Capacitor.

El identificador de la app es `com.francismartinez.veylith`, basado en el dominio personal `francismartinez.com`. Está definido en `src/app/config.ts` (usado por Capacitor) y en las configuraciones Debug/Release de Xcode. Mantén ambos alineados. El subdominio web `veylith.francismartinez.com` no cambia este identificador. Este ajuste local no registra el App ID en Apple ni configura firma o App Store Connect; esos pasos siguen pendientes de verificación.

En un Mac preparado:

```sh
npm ci
npm run cap:sync
npm run ios:open
```

`cap:sync` genera la copia web y la configuración nativa ignoradas por Git. El proyecto usa Swift Package Manager; no sustituyas su estructura por otra ni ejecutes `cap add ios` sobre el proyecto existente. Configura firma en el entorno autorizado sin guardar certificados, perfiles, claves ni estado personal de Xcode en el repo.

El entorno original tenía la licencia de Xcode pendiente. Eso no impide construir la web y no demuestra un problema del juego. Las pruebas web no certifican memoria GPU, rendimiento térmico ni manejo táctil en dispositivo físico.

## Verificación de este arranque

La guía se comprobó desde un clon nuevo e independiente, con `npm ci` y Playwright 1.62.1/Chromium instalados desde cero, en macOS. Pasaron typecheck, lint, build, formato y ambas auditorías; Vitest reprodujo exactamente los 574 aciertos y tres fallos descritos. En ese clon también pasaron la presentación de la puerta, una victoria y reinicio en `forest-2`, y guardar/cargar/playtest/reinicio del editor en `forest-1`, sin errores de navegador. Este último recorrido comprueba el editor, no una solución del nivel 1. Los pasos específicos de Linux y la compilación nativa no se ejecutaron en esta comprobación.
