# Sistema FTTH ENTEL

React/Vite, API Node/Express, PostgreSQL y asistente Python/spaCy.
La persistencia de usuarios, conversaciones, tickets y evidencias pertenece a la API Node.

## Preparación

En `Backend`: instalar con `npm ci` y `python -m pip install -r requirements.txt`.
Opcionalmente instalar el modelo con `python -m spacy download es_core_news_md`.
Copiar `.env.example` a `.env`, configurar las credenciales y crear una base PostgreSQL vacía.
Ejecutar `npm run db.migrate` y `npm run db.seed-admin`; iniciar con `npm start`.

En `Frontend`: ejecutar `npm ci`, copiar `.env.example` a `.env` y configurar la URL de la API.
Para desarrollo usar `npm run dev`; para generar la interfaz de producción usar `npm run build`.

## Datos locales y despliegue

Los `.env`, respaldos, logs y `Backend/uploads` quedan fuera de Git.
Conservar las evidencias y fotos en almacenamiento persistente del servidor.
Las variables `VITE_*` se incorporan al navegador: usar únicamente valores públicos.
Servir solo `Frontend/dist` como contenido estático; ejecutar la API por separado.
No configurar la raíz del repositorio como directorio público del servidor.
Configurar el dominio HTTPS, CORS y las variables de producción antes del despliegue.
El `.gitignore` controla Git; el `.dockerignore` controla el contexto de un build Docker iniciado desde esta raíz.
Ninguno sustituye los permisos ni la configuración del servidor.

## Mantenimiento

Conservar `Backend/sql` para instalar y actualizar el esquema.
Las carpetas de pruebas verifican regresiones y no forman parte de la interfaz compilada.
`scripts/backup-db.ps1` crea respaldos y `scripts/restore-db.ps1` los restaura.
La restauración reemplaza objetos de la base confirmada; usarla con un respaldo verificado.
`Backend/scripts/check-notifications.cjs` y `check-portal-metrics.cjs` son diagnósticos manuales.

## Producción en servicioftth.com

Frontend/.env contiene VITE_API_URL=https://servicioftth.com/api.
Ejecutar npm run build en Frontend y publicar el contenido de Frontend/dist.
El proxy debe enviar /api/* a Node conservando el prefijo y devolver index.html
para las rutas del navegador. Ver deploy/nginx-locations.conf si se utiliza Nginx.

Backend/.env contiene la configuración SMTP y las URL del dominio.
Transferirlo de forma privada al backend del servidor; está excluido de Git.
Antes de iniciar, ajustar PostgreSQL, JWT y Python a los valores reales del servidor.
No utilizar en Linux la ruta de Python de Windows.
Reiniciar el backend después de cambiar .env. Las variables ya configuradas en el
entorno del proceso tienen prioridad sobre .env; actualizarlas si conservan valores antiguos.
Backend/.env se carga desde la carpeta Backend, independientemente de dónde se ejecute Node.

Gmail requiere una contraseña de aplicación válida para SMTP. La contraseña guardada
no ha sido autenticada contra Gmail. Si Gmail la rechaza, sustituir SMTP_PASSWORD
y EMAIL_PASS por la contraseña de aplicación válida y reiniciar el backend.
Comprobar /api/health, iniciar sesión y probar recuperación tras desplegar.
## Diagnóstico del asistente en el servidor

PYTHON_PATH queda vacío en Backend/.env para detectar un entorno virtual de Backend
(.venv312, .venv o venv), usando Scripts/python.exe en Windows o bin/python en Linux.
Si no existe, utiliza python en Windows o python3 en Linux. También admite una ruta
explícita al Python del servidor en PYTHON_PATH. No copiar entornos virtuales de Windows a Linux.
Desde Backend ejecutar `node scripts/check-assistant.cjs`; prueba el motor sin crear
usuarios, conversaciones ni tickets en PostgreSQL e imprime el error interno si falla.
En Linux se puede crear el entorno con `python3 -m venv .venv` e instalar dependencias
con `.venv/bin/python -m pip install -r requirements.txt`.
El proxy debe permitir los tiempos del asistente (ver deploy/nginx-locations.conf).
Después de aplicar cambios, comprobar la configuración del proxy y reiniciar el backend.

## SMTP y pruebas locales

La interfaz iniciada con npm run dev utiliza el backend local en el puerto 3001.
La compilación de producción utiliza VITE_API_URL del único Frontend/.env.
SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASSWORD se toman del único Backend/.env,
con prioridad sobre variables SMTP antiguas del proceso. EMAIL_USER/EMAIL_PASS son alternativas.
Para Gmail: SMTP_HOST=smtp.gmail.com y SMTP_PORT=587 (STARTTLS), o 465 (TLS).
Actualizar SMTP_PASSWORD con la nueva contraseña de aplicación y reiniciar Node.
Desde Backend ejecutar `node scripts/check-smtp.cjs` para verificar conexión y autenticación
sin enviar correos. ETIMEDOUT indica conexión bloqueada/lenta; EAUTH indica credenciales rechazadas.
Los enlaces de recuperación siguen FRONTEND_RESET_URL: cambiarlo a
http://localhost:5173/reset-password para probar todo en local; en el servidor usar
https://servicioftth.com/reset-password. El backend que emite el token debe ser el mismo
que valida el enlace (incluyendo base de datos y JWT_SECRET).
