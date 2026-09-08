# Panel de cumpleaños de LOE

El sitio público existente permanece en `index.html`. El panel se compila por separado para publicar en `cumpleanos/`.

La carpeta `_birthday-app` conserva el código fuente. GitHub Pages con Jekyll omite por defecto las carpetas que empiezan con guion bajo. No añadas `.nojekyll` ni publiques esta carpeta como archivos web; publica solamente el build del panel. Nunca agregues `.env` o `.env.backend` a Git.

## Preparación

1. Configurar Supabase y Meta según README.
2. Configurar `.env` local con la URL y clave pública del proyecto.
3. En esta carpeta ejecutar `npm ci` y `npm run build`.
4. Copiar el contenido de `dist/` a `../cumpleanos/`.
5. Publicar esos archivos en la rama que GitHub Pages utiliza, conservando `index.html`, las fotografías y la configuración del dominio.

El build usa rutas relativas y funciona tanto en un dominio propio como bajo la ruta de proyecto de GitHub Pages. La descarga del CSV también usa una ruta relativa.

El repositorio tiene GitHub Pages activado. La URL estándar redirige al dominio `loeinsurancebroker.com`. Verificar en Settings → Pages la rama/carpeta de publicación y HTTPS antes de desplegar.

La URL prevista es `https://loeinsurancebroker.com/cumpleanos/`. El origen permitido del backend será `https://loeinsurancebroker.com` (sin `/cumpleanos/`). No añadir un enlace al menú público: el administrador puede guardar directamente la dirección del panel. Supabase Auth y RLS protegen los datos; conocer la dirección no otorga acceso.

Estado actual: preparado localmente; falta iniciar sesión en Supabase/GitHub, configurar los servicios y realizar la aceptación real. No se ha publicado el panel.
