#!/usr/bin/env bash
set -euo pipefail

if [ ! -f /app/artisan ]; then
  echo "[init] /app/artisan no existe. Se omite migrate/seed."
else
  echo "[init] Ejecutando migraciones y seed inicial..."

  for attempt in $(seq 1 30); do
    if php /app/artisan migrate --force && php /app/artisan db:seed --force; then
      echo "[init] Migraciones y seed completados."
      break
    fi

    echo "[init] Intento ${attempt}/30 fallo. Reintentando en 2s..."
    sleep 2
  done
fi