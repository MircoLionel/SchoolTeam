FROM php:8.3-fpm

# Instalar dependencias del sistema
RUN apt-get update \
    && apt-get install -y libpq-dev zip unzip git curl \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copiar archivos
COPY . /var/www/html

# Instalar dependencias Laravel
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Permisos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

# Variables necesarias
ENV APP_ENV=production
ENV APP_DEBUG=false

# Puerto Railway
EXPOSE 8080

# Arranque correcto
CMD php artisan serve --host=0.0.0.0 --port=${PORT}