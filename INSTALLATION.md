# Instalación limpia — Sistema ENTEL FTTH

## Requisitos

- Node.js 20 o superior.
- Python 3.11 o superior.
- PostgreSQL 15 o superior, con `psql`, `pg_dump` y `pg_restore` disponibles.

## Instalación

1. Copiar el proyecto en la computadora o servidor destino.
2. Ejecutar `npm ci` en `Backend` y `Frontend`.
3. Ejecutar `pip install -r requirements.txt` dentro de `Backend`.
4. Copiar `Backend/.env.example` a `Backend/.env` y completar base de datos, JWT, SMTP y administrador.
5. Copiar `Frontend/.env.example` a `Frontend/.env`. `VITE_API_URL` es opcional; si se omite, el frontend usa automáticamente la IP o el dominio desde el que fue abierto.
6. Crear una base PostgreSQL vacía con codificación UTF-8.
7. En `Backend`, ejecutar `npm run db.migrate` y `npm run db.seed-admin`.
8. Iniciar el backend con `npm start` y el frontend con `npm run dev`.
9. Comprobar `http://localhost:3001/api/health` y `http://localhost:5173`.
10. Para ingresar desde un celular conectado a la misma red, abrir `http://IP-DE-LA-LAPTOP:5173`.

## Respaldo y restauración

Crear respaldo:

```powershell
.\scripts\backup-db.ps1
```

Restaurar únicamente en una base preparada para la prueba:

```powershell
.\scripts\restore-db.ps1 -BackupPath .\backups\archivo.backup -ConfirmDatabaseName nombre_exacto_base
```

La restauración usa `--clean`; reemplaza los objetos existentes de la base confirmada. Nunca debe probarse directamente sobre producción sin conservar otro respaldo verificado.
