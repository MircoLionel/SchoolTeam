FROM php:8.3-fpm

RUN apt-get update \
    && apt-get install -y libpq-dev zip unzip git \
    && docker-php-ext-install pdo pdo_pgsql

WORKDIR /var/www/html

COPY . /var/www/html

RUN chown -R www-data:www-data /var/www/html

CMD ["php-fpm"]
