# Frontend Dockerfile
FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Create custom nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ =404; \
    } \
    \
    # Enable CORS for API calls \
    location ~* \.(js|css|html)$ { \
        add_header Access-Control-Allow-Origin "*"; \
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS"; \
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]