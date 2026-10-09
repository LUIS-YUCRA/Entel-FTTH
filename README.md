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
