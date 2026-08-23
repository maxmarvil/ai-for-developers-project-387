#!/bin/sh
set -e

: "${PORT:=8000}"
export PORT

# Generate APP_KEY when not provided by the environment.
# Note: recreating the container without APP_KEY set invalidates
# encrypted cookies (Redis sessions survive).
if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set, generating a new one..."
    APP_KEY="base64:$(head -c 32 /dev/urandom | base64 | tr -d '\n')"
    export APP_KEY
fi

# Warm config/route/view caches: env vars arrive at container start,
# so caching must happen at runtime, not build time.
php artisan config:cache || echo "WARN: config:cache failed" >&2
php artisan route:cache || echo "WARN: route:cache failed" >&2
php artisan view:cache || echo "WARN: view:cache failed" >&2

# Render nginx config with the actual PORT.
# Alpine nginx loads server blocks from /etc/nginx/http.d/.
mkdir -p /run/nginx /var/cache/nginx /etc/nginx/http.d
sed -e "s/\${PORT}/$PORT/g" \
    /etc/nginx/templates/default.conf.template \
    > /etc/nginx/http.d/default.conf

exec "$@"
