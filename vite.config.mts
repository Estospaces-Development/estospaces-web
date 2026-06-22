import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*",
    "connect-src 'self' http: https: ws: wss:",
    "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com https://cdn.pannellum.org",
    "form-action 'self'",
  ].join('; '),
};

const DEV_PROXY_PATHS = {
  core: {
    keys: ['VITE_CORE_SERVICE_URL', 'VITE_CORE_API'],
    prefix: '/__dev_proxy/core',
  },
  booking: {
    keys: ['VITE_BOOKING_SERVICE_URL', 'VITE_BOOKING_API'],
    prefix: '/__dev_proxy/booking',
  },
  notification: {
    keys: ['VITE_NOTIFICATION_SERVICE_URL', 'VITE_NOTIFICATION_API'],
    prefix: '/__dev_proxy/notification',
  },
  payment: {
    keys: ['VITE_PAYMENT_SERVICE_URL', 'VITE_PAYMENT_API'],
    prefix: '/__dev_proxy/payment',
  },
  search: {
    keys: ['VITE_SEARCH_SERVICE_URL', 'VITE_SEARCH_API'],
    prefix: '/__dev_proxy/search',
  },
  media: {
    keys: ['VITE_MEDIA_SERVICE_URL', 'VITE_MEDIA_API'],
    prefix: '/__dev_proxy/media',
  },
  messaging: {
    keys: ['VITE_MESSAGING_SERVICE_URL', 'VITE_MESSAGING_API'],
    prefix: '/__dev_proxy/messaging',
  },
} as const;

const buildServiceProxy = (env: Record<string, string>) => {
  return Object.values(DEV_PROXY_PATHS).reduce<Record<string, string | ProxyOptions>>((proxy, service) => {
    const target = service.keys.map((envKey) => env[envKey]?.trim()).find(Boolean);
    if (!target) {
      return proxy;
    }

    proxy[service.prefix] = {
      target,
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(service.prefix, ''),
      configure: (proxyServer) => {
        proxyServer.on('proxyReq', (proxyRequest, request) => {
          if (request.headers.origin) {
            proxyRequest.removeHeader('origin');
          }

          if (request.headers.referer) {
            proxyRequest.removeHeader('referer');
          }
        });
      },
    };

    return proxy;
  }, {});
};

const validateBuildServiceEnv = (mode: string, env: Record<string, string>) => {
  if (mode !== 'production' && mode !== 'staging') {
    return;
  }

  const missing = Object.values(DEV_PROXY_PATHS)
    .filter((service) => !service.keys.some((envKey) => env[envKey]?.trim()))
    .map((service) => service.keys.join(' or '));
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Missing required frontend service environment variables for ${mode}: ${missing.join(', ')}`,
  );
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  validateBuildServiceEnv(mode, env);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      port: 3000,
      headers: SECURITY_HEADERS,
      fs: {
        allow: [path.resolve(rootDir, '..')],
      },
      proxy: buildServiceProxy(env),
    },
    preview: {
      headers: SECURITY_HEADERS,
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production' && mode !== 'staging',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('/react-router/')
            ) {
              return 'react-core';
            }

            if (
              id.includes('/react-hook-form/') ||
              id.includes('/@hookform/resolvers/') ||
              id.includes('/zod/')
            ) {
              return 'forms';
            }

            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'maps';
            }

            if (id.includes('framer-motion')) {
              return 'motion';
            }

            if (id.includes('/three/')) {
              return 'three';
            }

            if (id.includes('/react-markdown/') || id.includes('/remark-gfm/')) {
              return 'markdown';
            }

            if (id.includes('pdf-lib') || id.includes('exceljs')) {
              return 'documents';
            }

            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }

            if (id.includes('/lucide-react/')) {
              return 'icons';
            }
          },
        },
      },
    },
  };
});
