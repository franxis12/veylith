# Game Center para Veylith

## Implementado en el proyecto, no publicado en Apple

La app usa un plugin local de Capacitor 8 con GameKit, sin backend ni dependencia nativa adicional. `GameViewController` registra `VeylithGameCenterPlugin`; tanto SceneDelegate como el storyboard usan esa clase. Xcode incluye los tres archivos Swift y firma Debug/Release con `App/App.entitlements` (Game Center). El bundle ID es `com.francismartinez.veylith`.

Esto **no** crea registros en Apple, no configura un equipo de desarrollo y no acredita compilación/firma nativa. El mínimo del proyecto sigue siendo iOS 15, compatible con Capacitor 8; construir y enviar exige Xcode 26 o posterior y el SDK requerido por Apple. En Linux solo se verifican configuración, web y pruebas disponibles; falta ejecutar Xcode y probar en iPhone.

## Contrato del puente

Nombre JavaScript: `VeylithGameCenter`.

| Método              | Entrada                                                               | Resultado                                      |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| `getStatus`         | Ninguna                                                               | Estado actual                                  |
| `authenticate`      | Ninguna                                                               | Estado tras inicialización/cancelación         |
| `showDashboard`     | `view: 'leaderboards' \| 'achievements'`                              | Resuelve al cerrar el panel                    |
| `submitScore`       | `leaderboardId`, `score` en milisegundos enteros, `playerId` esperado | Resuelve si GameKit acepta; rechaza ante error |
| `reportAchievement` | `achievementId`, `percentComplete`, `playerId` esperado               | Resuelve si GameKit acepta; rechaza ante error |

Estado: `{ available: true, authenticated: boolean, playerId?: string, displayName?: string }`. Los campos de jugador solo aparecen autenticado. Eventos: `authStateChanged` (estado) y `uiStateChanged` (`{ active: boolean }`). El frontend debe escuchar antes de inicializar; al abrir una pantalla nativa se suspende el juego, sin reanudar automáticamente una pausa explícita al cerrarla.

`authenticateHandler` se instala una vez por instancia. GameKit decide cuándo ofrecer su interfaz; una cancelación permite continuar sin cuenta y no inicia un bucle de prompts. Si iOS no vuelve a ofrecerla, el jugador puede iniciar sesión desde Ajustes > Game Center y volver a la app. Se actualiza el estado al regresar a primer plano. Un watchdog resuelve una inicialización pendiente a los 60 segundos con el estado real del momento, sin forzar el cierre de la interfaz de Apple. Mientras esa interfaz esté visible, conserva `uiStateChanged.active`; si desaparece sin el callback de cancelación, libera la pausa y la llamada pendiente. Esto no garantiza que una petición a Apple termine en 60 segundos ni representa autenticación exitosa. La app no usa Game Center como SSO de una cuenta propia.

Códigos estables de rechazo: `BUSY`, `UI_UNAVAILABLE`, `NOT_AUTHENTICATED`, `INVALID_ARGUMENT`, `PLAYER_CHANGED`, `SUBMISSION_FAILED`. No se devuelven mensajes nativos que puedan contener detalles de cuenta. Errores de red o de configuración nunca deben bloquear guardado o progreso local.

Las solicitudes se validan en el puente: IDs permitidos, tiempos finitos enteros de 1 a 86.400.000 ms y progreso de 0 a 100. Se compara `playerId` con `GKLocalPlayer.local.gamePlayerID` justo antes de enviar y al finalizar. No existe cola nativa de resultados ni se transfieren resultados pendientes entre cuentas. La identidad se mantiene solo el tiempo necesario; no se registran cuentas o tokens en logs. Un resultado ya aceptado por Apple no puede deshacerse cambiando de cuenta después.

## Configuración pendiente en App Store Connect

1. Registrar/verificar el App ID explícito `com.francismartinez.veylith`, habilitar Game Center en él y en la versión de App Store Connect. Seleccionar el equipo correcto en Xcode y regenerar el perfil cuando corresponda. No guardar certificados/perfiles/credenciales en Git.
2. Crear diez clasificaciones clásicas (no recurrentes), **menor puntuación primero**, conservando el mejor tiempo. Enviar enteros de milisegundos; usar formato **Integer** y sufijo localizado ` ms` para evitar que un formateador de segundos interprete otra unidad. Límite compatible con el puente: 1–86.400.000. Si se elige otro formato en Apple, verificar explícitamente su escala antes de cambiar código.
3. Usar los IDs exactos de la tabla. La numeración visible actual difiere del sufijo interno; no renombrar IDs automáticamente si cambia el orden de los niveles.
4. Crear ambos logros, añadir nombres/descripciones localizados, puntos e imágenes válidas, y asociarlos a la versión enviada. Son registros propuestos en el código, **no** registros existentes/verificados en Apple.
5. Enviar los componentes iniciales a revisión con la app. Verificar que el usuario puede jugar aunque estén pendientes de aprobación o no disponibles.

| Nivel visible actual | ID canónico | ID de clasificación                       |
| -------------------- | ----------- | ----------------------------------------- |
| 1                    | forest-1    | com.francismartinez.veylith.forest1.time  |
| 2                    | forest-2    | com.francismartinez.veylith.forest2.time  |
| 3                    | forest-6    | com.francismartinez.veylith.forest6.time  |
| 4                    | forest-7    | com.francismartinez.veylith.forest7.time  |
| 5                    | forest-8    | com.francismartinez.veylith.forest8.time  |
| 6                    | forest-9    | com.francismartinez.veylith.forest9.time  |
| 7                    | forest-10   | com.francismartinez.veylith.forest10.time |
| 8                    | forest-3    | com.francismartinez.veylith.forest3.time  |
| 9                    | forest-4    | com.francismartinez.veylith.forest4.time  |
| 10                   | forest-5    | com.francismartinez.veylith.forest5.time  |

Logros:

- `com.francismartinez.veylith.first_win`: primera victoria válida del jugador autenticado, 100 % al conseguirla.
- `com.francismartinez.veylith.earth_complete`: completar los diez niveles distintos, 10 % por nivel válido; repetir un nivel no aumenta el porcentaje.

No se publican tiempos antiguos desde el save compartido del dispositivo. Solo las victorias que la capa frontend vincule al mismo jugador durante el intento son elegibles. El progreso local del juego sigue siendo independiente de los logros y **no se convierte en cloud save** por activar Game Center. Esta primera integración no aporta anti-cheat de servidor ni verificación remota de recorridos; no debe anunciarse como clasificación resistente a manipulación de clientes.

## Verificación nativa pendiente

En un Mac autorizado, ejecutar `npm run cap:sync`, abrir Xcode, resolver paquetes y compilar/archivar con el SDK requerido. Inspeccionar entitlements efectivos del archivo firmado, no solo el archivo fuente. No desactivar firma o controles de seguridad para resolver errores de configuración.

Comprobar en iPhone:

- Inicio autenticado, sin cuenta, cuenta restringida, cancelación, red ausente y retorno a la app.
- Una sola interfaz de autenticación; tocar botones repetidamente no presenta paneles superpuestos.
- Apertura/cierre interactivo de clasificaciones/logros, pausa del juego y reinicio correcto de controles/audio.
- Intento completo con una misma cuenta, cambio de cuenta durante el intento y entre envíos; ningún resultado de A acaba en B.
- Puntajes de prueba controlados (por ejemplo 12.345 ms), orden ascendente y conservación del mejor resultado en el registro correcto.
- Primera victoria y diez niveles únicos; repetir niveles no inventa progreso; verificar aislamiento del editor/laboratorio.
- Sin conexión o error de Apple: el juego sigue funcionando y guarda localmente, sin afirmar envío exitoso.
- Perfiles/debug frente a distribución/TestFlight, metadatos localizados y privacy report del archivo final.

No sustituir pruebas de dispositivo por tests web o inspecciones de texto. La revisión de niveles y sus victorias corresponde a Francis; esta integración no certifica su solvencia.

## Fuentes oficiales

- [Plugin nativo local de Capacitor](https://capacitorjs.com/docs/ios/custom-code)
- [Requisitos de Capacitor 8](https://capacitorjs.com/docs/updating/8-0)
- [Inicializar y configurar Game Center](https://developer.apple.com/documentation/gamekit/initializing-and-configuring-game-center)
- [Enviar puntuaciones](<https://developer.apple.com/documentation/gamekit/gkleaderboard/submitscore(_:context:player:leaderboardids:completionhandler:)>)
- [Reportar logros](<https://developer.apple.com/documentation/gamekit/gkachievement/report(_:withcompletionhandler:)>)
- [Activar Game Center para una versión](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-an-app-version-for-game-center/)
