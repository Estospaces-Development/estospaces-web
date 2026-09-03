# Build stage
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Production build uses service-specific same-origin path prefixes.
# Nginx strips the prefix and proxies /api/* to the correct backend.
# ARG defaults match .env.production; CD pipeline overrides for dev/staging.
ARG VITE_CORE_SERVICE_URL=/__api/core
ARG VITE_BOOKING_SERVICE_URL=/__api/booking
ARG VITE_PAYMENT_SERVICE_URL=/__api/payment
ARG VITE_NOTIFICATION_SERVICE_URL=/__api/notification
ARG VITE_SEARCH_SERVICE_URL=/__api/search
ARG VITE_MEDIA_SERVICE_URL=/__api/media
ARG VITE_MESSAGING_SERVICE_URL=/__api/messaging

# Export build args so Vite can read them from process.env during the build.
ENV VITE_CORE_SERVICE_URL=$VITE_CORE_SERVICE_URL
ENV VITE_BOOKING_SERVICE_URL=$VITE_BOOKING_SERVICE_URL
ENV VITE_PAYMENT_SERVICE_URL=$VITE_PAYMENT_SERVICE_URL
ENV VITE_NOTIFICATION_SERVICE_URL=$VITE_NOTIFICATION_SERVICE_URL
ENV VITE_SEARCH_SERVICE_URL=$VITE_SEARCH_SERVICE_URL
ENV VITE_MEDIA_SERVICE_URL=$VITE_MEDIA_SERVICE_URL
ENV VITE_MESSAGING_SERVICE_URL=$VITE_MESSAGING_SERVICE_URL

# Build the Vite app (production mode reads .env.production with relative URLs)
RUN npm run build:prod

# Production stage — serve static files with Nginx
FROM nginx:alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752

RUN mkdir -p /etc/nginx/snippets /var/cache/nginx /var/run /var/log/nginx
RUN sed -i -E 's#pid[[:space:]]+[^;]+;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

ARG NGINX_CONF=nginx.gcp-dev.conf
ARG BUILD_REVISION=unknown

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — serve index.html for all routes
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

RUN sed -i "s/__BUILD_REVISION__/${BUILD_REVISION}/g" /etc/nginx/snippets/security-headers.conf

# Cache-bust: login-route-fix-v5-1784850
RUN echo "login-route-fix-v5-1784850" > /etc/nginx/version.txt

RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/snippets

USER nginx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
