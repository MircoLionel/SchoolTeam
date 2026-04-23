# syntax=docker/dockerfile:1.7

FROM composer:2.8 AS composer_deps
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts

FROM node:20-alpine AS frontend_assets
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM php:8.3-cli-alpine AS runtime

RUN apk add --no-cache \
    bash \
    curl \
    fcgi \
    git \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    shadow \
    zip \
    unzip \
    && docker-php-ext-install -j"$(nproc)" bcmath intl pdo pdo_pgsql \
    && rm -rf /tmp/*

WORKDIR /var/www/backend

COPY --from=composer_deps /app/vendor ./vendor
COPY backend/ ./
COPY --from=frontend_assets /app/public/build ./public/build
COPY docker/entrypoint.production.sh /usr/local/bin/entrypoint.production.sh

RUN chmod +x /usr/local/bin/entrypoint.production.sh \
    && mkdir -p storage/framework/{cache,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data /var/www/backend \
    && chmod -R ug+rwx storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_STACK=stderr \
    PORT=8080

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.production.sh"]
