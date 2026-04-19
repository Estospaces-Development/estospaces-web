import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const DEV_PROXY_PATHS = {
  VITE_CORE_SERVICE_URL: '/__dev_proxy/core',
  VITE_BOOKING_SERVICE_URL: '/__dev_proxy/booking',
  VITE_NOTIFICATION_SERVICE_URL: '/__dev_proxy/notification',
  VITE_PAYMENT_SERVICE_URL: '/__dev_proxy/payment',
  VITE_SEARCH_SERVICE_URL: '/__dev_proxy/search',
  VITE_MEDIA_SERVICE_URL: '/__dev_proxy/media',
  VITE_MESSAGING_SERVICE_URL: '/__dev_proxy/messaging',
} as const;

const REQUIRED_SERVICE_ENV_KEYS = Object.keys(DEV_PROXY_PATHS) as Array<keyof typeof DEV_PROXY_PATHS>;

const buildServiceProxy = (env: Record<string, string>) => {
  return Object.entries(DEV_PROXY_PATHS).reduce<Record<string, string | ProxyOptions>>((proxy, [envKey, prefix]) => {
    const target = env[envKey];
    if (!target) {
      return proxy;
    }

    proxy[prefix] = {
      target,
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(prefix, ''),
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

  const missing = REQUIRED_SERVICE_ENV_KEYS.filter((envKey) => !env[envKey]?.trim());
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
      fs: {
        allow: [path.resolve(rootDir, '..')],
      },
      proxy: buildServiceProxy(env),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'maps';
            }

            if (id.includes('framer-motion')) {
              return 'motion';
            }

            if (id.includes('pdf-lib') || id.includes('exceljs')) {
              return 'documents';
            }

            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
          },
        },
      },
    },
  };
});
