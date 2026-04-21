#!/bin/sh
set -eu

if [ ! -f /app/artisan ]; then
  echo "[init] /app/artisan no existe. Se omite migrate/seed."
else
  echo "[init] Ejecutando migraciones y seed inicial..."

  if [ ! -f /app/vendor/autoload.php ]; then
    echo "[init] Falta /app/vendor/autoload.php. Ejecutando composer install..."

    if ! command -v composer >/dev/null 2>&1; then
      echo "[init] ERROR: composer no está disponible en el contenedor."
      exit 1
    fi

    attempt=1
    while [ "$attempt" -le 10 ]; do
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
      attempt=$((attempt + 1))
    done
  fi

  echo "[init] Ejecutando migraciones y seed inicial..."

  success=0
  attempt=1
  while [ "$attempt" -le 30 ]; do
    if php /app/artisan migrate --force && php /app/artisan db:seed --force; then
      echo "[init] Migraciones y seed completados."
      success=1
      break
    fi

    echo "[init] Intento ${attempt}/30 falló. Reintentando en 2s..."
    sleep 2
    attempt=$((attempt + 1))
  done

  if [ "$success" -ne 1 ]; then
    echo "[init] No se pudo completar migrate/seed."
    exit 1
  fi
fi