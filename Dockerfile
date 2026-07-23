# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build-time env vars (baked into the Vite bundle)
ARG VITE_CORE_SERVICE_URL
ARG VITE_BOOKING_SERVICE_URL
ARG VITE_PAYMENT_SERVICE_URL
ARG VITE_NOTIFICATION_SERVICE_URL
ARG VITE_SEARCH_SERVICE_URL
ARG VITE_MEDIA_SERVICE_URL
ARG VITE_MESSAGING_SERVICE_URL

# Export build args so Vite can read them from process.env during the build.
ENV VITE_CORE_SERVICE_URL=$VITE_CORE_SERVICE_URL
ENV VITE_BOOKING_SERVICE_URL=$VITE_BOOKING_SERVICE_URL
ENV VITE_PAYMENT_SERVICE_URL=$VITE_PAYMENT_SERVICE_URL
ENV VITE_NOTIFICATION_SERVICE_URL=$VITE_NOTIFICATION_SERVICE_URL
ENV VITE_SEARCH_SERVICE_URL=$VITE_SEARCH_SERVICE_URL
ENV VITE_MEDIA_SERVICE_URL=$VITE_MEDIA_SERVICE_URL
ENV VITE_MESSAGING_SERVICE_URL=$VITE_MESSAGING_SERVICE_URL

# Build the Vite app
RUN npm run build

# Production stage — serve static files with Nginx
FROM nginx:alpine

RUN mkdir -p /etc/nginx/snippets /var/cache/nginx /var/run /var/log/nginx
RUN sed -i -E 's#pid[[:space:]]+[^;]+;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

ARG NGINX_CONF=nginx.gcp-dev.conf.v3

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — serve index.html for all routes
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

# Cache-bust: login-route-fix-v3-1784799728
RUN echo "login-route-fix-v3-1784799728" > /etc/nginx/version.txt

RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/snippets

USER nginx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
