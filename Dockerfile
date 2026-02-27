# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json only (skip lock file to resolve native deps for Linux)
COPY package.json ./

# Install dependencies fresh for Linux/Alpine platform
RUN npm install

# Copy source code
COPY . .

# Build-time env vars (baked into the Vite bundle)
ARG VITE_CORE_SERVICE_URL=http://localhost:8080
ARG VITE_BOOKING_SERVICE_URL=http://localhost:8081
ARG VITE_PAYMENT_SERVICE_URL=http://localhost:8082
ARG VITE_NOTIFICATION_SERVICE_URL=http://localhost:8083
ARG VITE_SEARCH_SERVICE_URL=http://localhost:8084
ARG VITE_MEDIA_SERVICE_URL=http://localhost:8085

# Build the Vite app
RUN npm run build

# Production stage — serve static files with Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — serve index.html for all routes
RUN echo 'server { \
  listen 3000; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
  try_files $uri $uri/ /index.html; \
  } \
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
  expires 1y; \
  add_header Cache-Control "public, immutable"; \
  } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
