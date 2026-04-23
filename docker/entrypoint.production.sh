#!/usr/bin/env sh
set -eu

cd /var/www/backend

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R ug+rwx storage bootstrap/cache || true

if [ "${APP_KEY:-}" = "" ]; then
  echo "[entrypoint] ERROR: APP_KEY no está definido. Configuralo en Railway." >&2
  exit 1
fi

# Limpieza segura previa (si existen caches viejas o incompatibles)
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan event:clear || true

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Ejecutando migraciones..."
  php artisan migrate --force
fi

# Regenera caches de producción; si algo falla, no bloquea el arranque
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

PORT="${PORT:-8080}"
echo "[entrypoint] Iniciando Laravel en 0.0.0.0:${PORT}"
exec php artisan serve --host=0.0.0.0 --port="${PORT}"
