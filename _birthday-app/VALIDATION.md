# Validación local

Fecha: 7 de septiembre de 2026.

- 11 pruebas Node aprobadas: teléfonos, calendario, zona horaria, XML seguro, renderizado WASM, PostgreSQL/RLS, reserva anual, ejecución concurrente del pipeline, consentimiento revocado, rechazo explícito de Meta, timeout sin reenvío, fallo de Storage y automatización pausada (varias comprobaciones están agrupadas en un test).
- 1 prueba Deno aprobada: ejecución de `renderCard` real, lectura del WASM y fuente incluidos, descarga simulada de fotografía y logo, rasterización a PNG 1080 × 1080. Sin permisos de red y sin recursos/timers filtrados.
- `npm run check:edge`: ambas funciones pasan el chequeo de tipos Deno.
- `npm run build`: build de producción del panel correcto.
- `npm audit`: cero vulnerabilidades reportadas en las dependencias instaladas.

La base de datos de pruebas es PostgreSQL embebido PGlite, con esquemas auxiliares Auth/Storage de ensayo; se ejecuta el `schema.sql` del proyecto. Storage y Meta son dobles de prueba para el pipeline, y no prueban credenciales, políticas reales del servicio Storage, disponibilidad de Meta ni entrega en un teléfono. La concurrencia del pipeline se prueba localmente y la reserva única se comprueba en PostgreSQL; no se ha hecho una prueba distribuida contra un Supabase desplegado.

No hay credenciales configuradas, tablas remotas creadas, funciones remotas desplegadas ni mensajes reales enviados. La aceptación real completa y los pasos para ejecutarla están en README. No se realizó una prueba de interfaz en navegador contra Supabase autenticado.

## Actualización de despliegue

13 pruebas locales aprobadas (12 Node + 1 Deno). PIN con presupuesto global verificado. En Supabase real: PIN erróneo 401, PIN correcto con sesión 200, lectura autenticada 200, foto/logo guardados en Storage, PNG 1080×1080 generado por admin-action y Cron 200. Panel alojado en https://loeinsurancebroker.com/cumpleanos/. La verificación de WhatsApp real sigue pendiente.
