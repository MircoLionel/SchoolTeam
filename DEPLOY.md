# Deploy a Railway (Laravel + PostgreSQL administrado)

Este proyecto queda preparado para correr **backend Laravel** en Railway usando Docker y **PostgreSQL administrado de Railway**.

## 1) Crear servicios en Railway

1. Crear proyecto en Railway.
2. Crear servicio **PostgreSQL** (plugin Railway).
3. Crear servicio **backend** apuntando a este repo (usa `Dockerfile` de raíz).
4. (Opcional recomendado) Crear servicio **frontend** separado y configurarlo con `VITE_API_URL`.

## 2) Variables de entorno backend (obligatorias)

Configurar en el servicio backend:

- `APP_NAME=School Team Turismo`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY=base64:...` (generar una vez)
- `APP_URL=https://<backend>.up.railway.app`
- `LOG_CHANNEL=stderr`
- `LOG_STACK=stderr`
- `FORCE_HTTPS=true`
- `TRUSTED_PROXIES=*`

DB (Railway Postgres):

- `DB_CONNECTION=pgsql`
- `DATABASE_URL=<railway postgres url>`
- o alternativamente `DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD`
- `DB_SSLMODE=require` (recomendado en producción)

Sesión/seguridad:

- `SESSION_DRIVER=database`
- `SESSION_SECURE_COOKIE=true`
- `SESSION_HTTP_ONLY=true`
- `SESSION_SAME_SITE=lax`
- `SANCTUM_STATEFUL_DOMAINS=<frontend-domain>,localhost:5173`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

Seeds:

- `SEED_DEFAULT_USERS=false` (evita usuarios demo en producción)

## 3) Primer arranque

El entrypoint valida APP_KEY, limpia caches viejas y regenera caches nuevas.

### Migraciones

Dos opciones:

- Opción A (automática): `RUN_MIGRATIONS=true` (solo primer deploy / cambios de schema)
- Opción B (manual recomendado): usar consola Railway y ejecutar:

```bash
php artisan migrate --force
```

## 4) Healthchecks

- Railway: `/up`
- Health extendido con DB: `/health`

Si `/health` devuelve `503`, revisar conexión a DB/variables.

## 5) Frontend

Configurar en el frontend:

- `VITE_API_URL=https://<backend>.up.railway.app/api`

## 6) Archivos y persistencia

La app genera/usa rutas en `backend/storage`:

- `storage/app/checkbooks` (PDFs de chequera)
- `storage/app/checkbooks/tmp`
- `storage/app/templates` (plantillas de chequera)
- `storage/logs`

**No depender de FS efímero** para datos importantes:

- Recomendado: usar bucket S3 para plantillas/archivos permanentes (`FILESYSTEM_DISK=s3`).
- Alternativa: montar volumen persistente y setear:
  - `CHECKBOOK_TEMPLATE_PATH`
  - `CHECKBOOK_OUTPUT_DIR`
  - `CHECKBOOK_TMP_DIR`

## 7) Restaurar dump PostgreSQL local -> Railway

Ejemplo (desde tu máquina):

```bash
pg_restore --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" backup.dump
```

Si el dump es SQL plano:

```bash
psql "$DATABASE_URL" < backup.sql
```

Luego:

```bash
php artisan migrate --force
```

## 8) Logs y diagnóstico

Logs salen a stderr/stdout (`LOG_CHANNEL=stderr`).
Revisar en Railway -> Deploy logs.

Comandos útiles en shell Railway:

```bash
php artisan about
php artisan migrate:status
php artisan config:clear
php artisan config:cache
```

## 9) Rollback básico

1. Re-deploy de un commit/tag anterior estable.
2. (Si hubo migración conflictiva) ejecutar rollback controlado:

```bash
php artisan migrate:rollback --step=1 --force
```

3. Limpiar y regenerar cache:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```
