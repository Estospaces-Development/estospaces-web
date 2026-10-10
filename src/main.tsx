import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import AppProviders from '@/components/providers/AppProviders';
import { BrowserRouter } from 'react-router-dom';
import { reloadOnceForMissingChunk } from '@/lib/chunkReload';

if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        if (event.target instanceof HTMLImageElement && !event.target.hasAttribute('data-error-handled')) {
            event.target.setAttribute('data-error-handled', 'true');
            event.target.style.visibility = 'hidden';
        }
    }, true);

    // Vite fires this for every failed lazy import, including nested lazy() components that lazyPage
    // does not wrap (e.g. SatelliteMap on the manager dashboard after a deploy).
    window.addEventListener('vite:preloadError', () => {
        reloadOnceForMissingChunk();
    });

    // The entry bundle loaded, so stop public/asset-recovery-v1.js from reloading and let a later deploy retry.
    (window as Window & { __estospacesBooted?: boolean }).__estospacesBooted = true;
    try {
        window.sessionStorage.removeItem('estospaces:asset-reload');
    } catch {
        // Storage can be unavailable in private modes.
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProviders>
          <App />
        </AppProviders>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
