#!/bin/sh
set -e

# Default backend URL if not provided
export BACKEND_URL="${BACKEND_URL:-http://backend-service:3000}"

# Substitute BACKEND_URL in config.js so the frontend JS knows where to call
sed -i "s|window.API_BASE_URL = .*|window.API_BASE_URL = '/api';|" /usr/share/nginx/html/config.js

# Substitute BACKEND_URL in the nginx config template
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in the foreground
exec nginx -g 'daemon off;'
