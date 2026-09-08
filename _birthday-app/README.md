# Celebrar — cumpleaños por WhatsApp

Aplicación para un negocio y un administrador. Frontend HTML/CSS/JavaScript sin frameworks, Supabase Auth/PostgreSQL/Storage, dos Edge Functions Deno, Cron y Meta WhatsApp Cloud API oficial. El retrato es siempre el del propietario. El nombre del cliente personaliza la tarjeta.

## Estado de entrega

Código implementado y validado localmente. Las pruebas incluyen PostgreSQL real embebido (PGlite), RLS, reservas anuales y PNG real mediante resvg WebAssembly. La prueba integrada ejecuta el pipeline de producción con Storage y Meta simulados. **Supabase y el panel ya están desplegados.** El acceso por PIN, Storage, la generación PNG real y Cron fueron verificados. No se ha enviado ningún WhatsApp real: faltan acceso a Meta, plantilla aprobada y teléfono de prueba autorizado. No considerar verificada la integración real hasta completar la lista de aceptación al final.

## Archivos

- `src/`: panel responsive, clientes, importación CSV, historial, diseño y configuración.
- `schema.sql`: tablas, índices, RLS, permisos y funciones PostgreSQL. Ejecutar una vez en un proyecto nuevo.
- `supabase/functions/birthday-cron`: comprobación automática, generación y envío, limpieza de tarjetas.
- `supabase/functions/admin-action`: pruebas, simulaciones y reintentos autenticados.
- `supabase/functions/_shared`: renderizado WASM, composición SVG y pipeline de envío compartido.
- `supabase/cron.sql`: llamada programada con secretos guardados en Vault.
- `.env.example`, `.env.backend.example`: configuración pública y privada separadas.
- `tests/`: validación de calendario, teléfono, seguridad, PNG y pipeline.
- `public/clients-example.csv`: formato de importación.

## 1. Supabase: proyecto, SQL y administrador

1. Crea un proyecto en [Supabase Dashboard](https://supabase.com/dashboard). Conserva la contraseña de la base de datos en tu gestor de contraseñas.
2. En **SQL Editor → New query**, pega y ejecuta `schema.sql` completo. No ejecutarlo repetidamente ni sobre tablas ya existentes del mismo nombre.
3. En **Authentication → Users → Add user**, crea el usuario administrador con correo y contraseña, confirmando el correo. Copia su UUID.
4. En **Authentication → Sign In / Providers**, desactiva el registro de usuarios nuevos. Configura la URL de tu panel en **URL Configuration**. El acceso no depende solo de desactivar registros: RLS verifica la tabla del administrador.
5. En SQL Editor ejecuta, reemplazando el UUID:

```sql
insert into public.admin_user(user_id)
values ('UUID_DEL_USUARIO_AUTH');
```

Solo cabe un administrador. No uses una Service Role Key en el navegador. Supabase proporciona automáticamente `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a las funciones desplegadas; no tienes que entregarlas al frontend.

## 2. Abrir el panel

Requisitos: Node.js 22.12+ o 24 y npm. Desde esta carpeta:

```powershell
npm ci
Copy-Item .env.example .env
```

Edita `.env`: en Supabase, **Project Settings → API / API Keys**, copia la URL del proyecto y la clave pública `anon` (JWT legacy). También puedes usar una clave pública publishable compatible con tu proyecto; nunca una secret/service_role. El cliente incluye el JWT de sesión al llamar a las funciones.

```powershell
npm run dev
```

Abre la dirección que imprime Vite, normalmente `http://127.0.0.1:5173`. Entra con el PIN configurado en el backend. En **Configuración**, establece negocio, propietario, zona horaria, país para teléfonos locales y horario. En **Diseño de felicitación**, sube foto y logo PNG/JPG (hasta 5 MB). Guarda los cambios. La automatización comienza pausada.

## 3. WhatsApp Business y plantilla

Usa una aplicación de Meta conectada a tu negocio con el producto WhatsApp. En **Meta for Developers → tu app → WhatsApp → API Setup**, identifica el **Phone Number ID** y el **WhatsApp Business Account ID (WABA)**. Registra/verifica el número emisor y configura la facturación y los requisitos que Meta solicite. Los números de prueba de Meta solo permiten destinatarios autorizados en su pantalla de configuración.

Para producción, en **Business Settings → Users → System users**, crea o utiliza un usuario del sistema, asígnale la app y la cuenta WhatsApp con los permisos necesarios y genera un token para esa app con `whatsapp_business_messaging`. La administración de plantillas por API requeriría `whatsapp_business_management`; esta app no crea plantillas por API. Conserva el token únicamente en los secretos del backend. Su vigencia depende de la configuración de Meta.

En **WhatsApp Manager → Message templates → Create template**:

1. Selecciona la cuenta WhatsApp correspondiente.
2. Elige categoría **Marketing**, tipo estándar. Una felicitación promocional o de relación con clientes no debe disfrazarse de Utility.
3. Nombre: `birthday_greeting` (o el que prefieras, minúsculas y guiones bajos).
4. Idioma: **English (US)** para el ejemplo (`en_US`). El panel debe tener exactamente el idioma y nombre aprobados.
5. Header: **Media → Image**. Sube una tarjeta PNG de muestra; puedes usar `tests/output/card-preview.png` tras ejecutar los tests o una tarjeta propia con tu marca.
6. Body, con una sola variable posicional:

```text
Happy Birthday, {{1}}! Wishing you an amazing day filled with happiness. Thank you for trusting us.
```

7. Ejemplo para `{{1}}`: `Michael`. No añadas variables extra, botones ni un segundo componente obligatorio; este cliente envía IMAGE y una variable en el body.
8. Envía a revisión y espera estado **Approved**. Si Meta reclasifica/rechaza el contenido, resuelve la revisión antes de activar la aplicación.
9. En el panel configura el nombre y el idioma. En el campo de mensaje documenta exactamente el body aprobado, sustituyendo `{{1}}` por `{{name}}`.

**Editar el mensaje en el panel no cambia una plantilla aprobada.** Meta es la fuente del texto entregado. Para cambiar frases, modifica/crea la plantilla en WhatsApp Manager, espera aprobación y actualiza la configuración. El nombre no está hardcodeado: es el parámetro dinámico. La imagen del header cambia en cada envío mediante URL firmada. No se envían mensajes de texto libre fuera de la ventana de conversación.

Referencias oficiales: [colección Cloud API de Meta](https://www.postman.com/meta/whatsapp-business-platform/overview), [plantillas de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates). Las etiquetas de los menús pueden variar con el idioma y los cambios de Meta.

## 4. Secretos y Edge Functions

Instala Supabase CLI siguiendo su [guía oficial](https://supabase.com/docs/guides/local-development/cli/getting-started) El binario WASM y la fuente Inter, con su licencia OFL, están incluidos en `assets/` y se empaquetan dentro de `runtime-assets.ts` mediante `node scripts/embed-render-assets.mjs`. Esto permite desplegar con `--use-api` sin depender de Docker.

```powershell
Copy-Item .env.backend.example .env.backend
# Genera CRON_SECRET y cópialo en .env.backend y Vault:
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set --env-file .env.backend
supabase functions deploy birthday-cron --use-api
supabase functions deploy admin-action --use-api
```

`TU_PROJECT_REF` es el subdominio de la URL de Supabase. Edita antes `.env.backend`: token Meta, Phone Number ID, versión Graph habilitada para tu app y `ALLOWED_ORIGIN` igual al origen exacto del panel (sin barra final). El ejemplo usa `v23.0`; verifica su disponibilidad en tu app y actualízala al migrar versiones. Los secretos nunca entran al build Vite.

`verify_jwt=false` es intencional: `birthday-cron` valida un secreto específico en `x-cron-secret`; `admin-action` valida el JWT de sesión con `auth.getUser()` y comprueba el UUID del único administrador. No son endpoints públicos sin protección.

## 5. Supabase Cron

1. En **Integrations → Vault**, crea dos secretos:
   - `project_url`: `https://TU_PROJECT_REF.supabase.co`.
   - `birthday_cron_secret`: exactamente el valor de `CRON_SECRET`.
2. Ejecuta `supabase/cron.sql` en SQL Editor. Habilita las extensiones Cron/pg_net si tu proyecto lo solicita.
3. En **Integrations → Cron**, comprueba que aparece `birthday-every-minute`.
4. La comprobación se ejecuta cada minuto; PostgreSQL aplica fecha y hora del negocio, inicialmente `America/Phoenix`, sin depender de la zona del servidor. Envía desde la hora configurada hasta terminar ese día, en lotes de cinco. Los 29 de febrero se celebran exclusivamente en años bisiestos.
5. Realiza la prueba de aceptación y activa la automatización desde el panel.

Para revisar ejecuciones:

```sql
select * from cron.job;
select jobid,status,return_message,start_time from cron.job_run_details
order by start_time desc limit 20;
select id,status_code,error_msg,created from net._http_response
order by created desc limit 20;
```

Cron exitoso solo confirma que se programó la petición HTTP: revisa su respuesta, Edge Function Logs y el historial. Para detener envíos, desactiva la automatización en el panel. Para quitar el job: `select cron.unschedule('birthday-every-minute');`.

Referencia: [programar Edge Functions con Cron y Vault](https://supabase.com/docs/guides/functions/schedule-functions), [WASM en Supabase](https://supabase.com/docs/guides/functions/wasm).

## 6. Clientes y CSV

Se valida E.164 con `libphonenumber-js`. Para teléfonos sin prefijo se usa el país de Configuración; los prefijos internacionales tienen prioridad. El cumpleaños debe ser una fecha real YYYY-MM-DD y no futura.

Importación UTF-8: `name,phone,birthday,active,whatsapp_consent,consent_note`. Valores booleanos `true`/`false`. Si falta el consentimiento, se importa como falso. La pantalla muestra errores por fila y permite importar solo registros válidos. Duplicados por teléfono se omiten, sin sobrescribir permisos existentes. Los lotes son de 200; un error conserva los lotes ya confirmados. XLSX no está incluido; en Excel utiliza **Guardar como → CSV UTF-8**.

## 7. Duplicados, estados y reintentos

- Reserva única en PostgreSQL por teléfono/año para felicitaciones reales. Sobrevive a eliminar y recrear un cliente.
- Transición atómica `pending → sending`: dos ejecuciones no pueden enviar la misma reserva simultáneamente.
- `sent`: Meta aceptó el mensaje y devolvió un ID; el año del cliente se marca en la misma transacción que el historial. No equivale a entregado/leído. Esta versión no incluye webhook de entrega.
- `failed`: validación/Storage falló antes del envío o Meta respondió con un rechazo HTTP explícito. Se puede reintentar desde Historial; consentimiento, actividad, teléfono y fecha se vuelven a validar.
- `unknown`: timeout, respuesta 5xx, respuesta inválida o caída después de contactar Meta. **No se reintenta automáticamente ni hay botón para forzarlo.** Un `sending` interrumpido pasa a `unknown` tras diez minutos.
- Las pruebas usan `kind=test` y un UUID de petición para evitar doble clic. No consumen el año del cliente. La simulación usa un cliente autorizado y envía al teléfono de prueba que introduzcas.

Ninguna transacción local puede prometer entrega exactamente una vez a una API externa que no comparte esa transacción. Se prioriza no duplicar: un resultado ambiguo requiere conciliación en Meta y puede quedar sin reenviar. Si Meta confirma aceptación, conserva el estado/ID; si puedes demostrar que no aceptó, un operador puede cambiar `unknown` a `failed` en SQL para reintentar. No lo hagas por un simple timeout o porque el destinatario aún no lo haya visto.

Las tarjetas se almacenan en un bucket privado; Meta recibe una URL firmada por siete días. El cron elimina los archivos pasados ocho días mediante Storage API y borra sus enlaces del historial. El historial permanece. Las imágenes de marca permanecen hasta eliminarlas; cambiar de foto genera una ruta nueva para evitar caché.

## 8. Pruebas y publicación

```powershell
npm test
npm run test:deno
npm run check:edge
npm run build
npm audit
```

Publica el contenido de `dist/` en cualquier hosting estático HTTPS (Supabase sigue siendo el backend). El build toma la URL y clave pública de `.env` en ese momento; si cambian, recompila. Establece `ALLOWED_ORIGIN` al dominio final y actualiza Auth URL Configuration. No publiques `.env.backend`, `node_modules` ni la carpeta completa del proyecto como archivos web.

### Aceptación real obligatoria antes de producción

1. Mantén automatización pausada y conecta Supabase/Meta.
2. Sube foto del propietario y logo. Verifica la vista previa con un nombre corto, uno largo y caracteres como `María & José`.
3. Crea un cliente autorizado de prueba. Pulsa **Simular** y usa tu teléfono autorizado: confirma la recepción de tarjeta y body. Comprueba `kind=test`, ID Meta y `sent` en Historial; el año del cliente debe continuar vacío.
4. Para comprobar **también la selección por cumpleaños y Cron**, utiliza un cliente de prueba cuyo cumpleaños sea hoy en la zona configurada y cuyo teléfono controles. Configura la hora unos minutos antes de la actual y activa automatización. Espera el siguiente minuto.
5. Verifica: cliente seleccionado → PNG 1080 → objeto privado en Storage → header IMAGE de plantilla → WhatsApp recibido → historial `sent` con ID → `last_birthday_sent_year` igual al año local.
6. Espera dos ejecuciones adicionales del cron: no debe llegar otro mensaje. Prueba también una invocación concurrente en un entorno de ensayo.
7. Desactiva consentimiento de otro cliente de prueba con cumpleaños hoy: no debe enviarse. Repite con cliente inactivo.
8. En un proyecto de ensayo, usa un nombre de plantilla inválido: espera `failed`, restaura la configuración y pulsa Reintentar una vez. No simules timeouts en producción ni fuerces estados inciertos.
9. Devuelve horario y clientes de ensayo al estado deseado. Solo entonces deja activa la automatización para clientes reales con autorización.

## Datos pendientes para completar la conexión

1. **Supabase Project URL y clave pública anon/publishable:** Project Settings → API / API Keys.
2. **Meta Phone Number ID:** tu app → WhatsApp → API Setup.
3. **Meta Access Token de usuario del sistema:** Business Settings → Users → System users → Generate token; guardar en `.env.backend` o Supabase Secrets, no en el chat ni el navegador.
4. **Nombre exacto e idioma de la plantilla aprobada:** WhatsApp Manager → Message templates.

Además debes crear tu usuario administrador y proporcionar en el panel la foto del propietario, el logo y un teléfono de prueba autorizado. El WABA ID se usa para identificar la cuenta al configurar Meta, pero no es un secreto ni es necesario en el código de envío. No hace falta proporcionar una Service Role Key al frontend. `CRON_SECRET` se genera localmente.

## Acceso por PIN

El panel publicado utiliza un PIN de cuatro dígitos por petición expresa del propietario. El correo del administrador permanece asociado en Supabase Auth, pero no se solicita al entrar. El PIN no se almacena en el frontend ni en este repositorio. Sus secretos son PANEL_PIN_SALT y PANEL_PIN_HASH (SHA-256 de salt + dos puntos + PIN).

Ejecutar `supabase/pin.sql` y desplegar `pin-login --use-api`. El servidor permite como máximo 5 intentos por 15 minutos y 20 por día, de forma global y atómica, sin depender de la IP. Los accesos correctos también consumen un intento. La sesión de Supabase se conserva para no exigir el PIN en cada visita. Un atacante puede agotar el presupuesto y bloquear temporalmente nuevos accesos; un PIN de cuatro dígitos sigue siendo más débil que una contraseña. Se mantuvieron Auth y RLS.

Verificación remota: PIN incorrecto 401; correcto 200 con sesión; lectura autenticada 200; Storage de marca y renderizado PNG 1080×1080 correctos; Cron 200 con automatización pausada. WhatsApp no está conectado todavía.
## Envío manual (septiembre de 2026)
El panel prepara un PNG personalizado y el texto editable. En Clientes, pulsa Preparar felicitación y Generar tarjeta. Descarga la imagen y abre el chat; adjunta la imagen y completa el envío en WhatsApp Business. En dispositivos compatibles también aparece Compartir tarjeta y mensaje. La selección del destinatario y el envío final ocurren en WhatsApp. No se registra un envío al generar, descargar, compartir o abrir el chat. El historial de API anterior se conserva. Los controles de automatización y pruebas de API ya no aparecen en el panel; la automatización permanece pausada.
