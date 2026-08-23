# ---------- Stage 1: build React SPA ----------
FROM node:22-alpine AS spa

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM php:8.2-fpm-alpine AS app

RUN apk add --no-cache \
        nginx \
        supervisor \
        libpq \
        icu-libs \
        libzip \
        oniguruma \
        libpng \
        libjpeg-turbo \
        freetype \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        libpq-dev \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        zip \
        intl \
        mbstring \
        bcmath \
        opcache \
        pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Nginx runs in foreground as non-root, needs a writable pid/cache dir
RUN mkdir -p /run/nginx /var/cache/nginx \
    && chown -R www-data:www-data /run/nginx /var/cache/nginx

WORKDIR /var/www/html

# Composer binary from the official image; dependencies are installed
# here so that platform requirements match the runtime extensions exactly
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY backend/ ./

# Built SPA is served from the same origin (no CORS)
COPY --from=spa /app/web/dist ./public/spa

# Runtime config
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/app.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache \
    && mkdir -p storage/logs storage/framework/{cache/data,sessions,testing,views} \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=8000 \
    NGINX_CLIENT_BODY_TEMP_PATH=/var/cache/nginx/client_temp \
    NGINX_PROXY_TEMP_PATH=/var/cache/nginx/proxy_temp \
    NGINX_FASTCGI_TEMP_PATH=/var/cache/nginx/fastcgi_temp \
    NGINX_UGC_TEMP_PATH=/var/cache/nginx/uwsgi_temp \
    NGINX_SCGI_TEMP_PATH=/var/cache/nginx/scgi_temp

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
