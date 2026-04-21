#!/usr/bin/env bash
set -euo pipefail

if [ ! -f /app/artisan ]; then
  echo "[init] /app/artisan no existe. Se omite migrate/seed."
  exit 0
fi

if [ ! -f /app/vendor/autoload.php ]; then
  echo "[init] Falta /app/vendor/autoload.php. Ejecutando composer install..."

  if ! command -v composer >/dev/null 2>&1; then
    echo "[init] ERROR: composer no está disponible en el contenedor."
    exit 1
  fi

  for attempt in $(seq 1 10); do
    if composer install --working-dir=/app --no-interaction --prefer-dist --optimize-autoloader; then
      echo "[init] Dependencias PHP instaladas."
      break
    fi

    if [ "$attempt" -eq 10 ]; then
      echo "[init] No se pudo completar composer install tras 10 intentos."
      exit 1
    fi

    echo "[init] composer install intento ${attempt}/10 falló. Reintentando en 2s..."
    sleep 2
  done
fi

echo "[init] Ejecutando migraciones y seed inicial..."

for attempt in $(seq 1 30); do
  if php /app/artisan migrate --force && php /app/artisan db:seed --force; then
    echo "[init] Migraciones y seed completados."
    exit 0
  fi

  echo "[init] Intento ${attempt}/30 falló. Reintentando en 2s..."
  sleep 2
done

echo "[init] No se pudieron ejecutar migrate/seed tras 30 intentos."
exit 1
