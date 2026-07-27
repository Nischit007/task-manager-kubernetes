FROM nginx:alpine

# Set default backend URL environment variable
ENV BACKEND_URL=http://backend-service:3000

# Copy static files to Nginx html directory
COPY public/ /usr/share/nginx/html/

# Copy nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy entrypoint script and make it executable
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
