import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import AppProviders from '@/components/providers/AppProviders';
import { BrowserRouter } from 'react-router-dom';

if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        if (event.target instanceof HTMLImageElement && !event.target.hasAttribute('data-error-handled')) {
            event.target.setAttribute('data-error-handled', 'true');
            event.target.style.visibility = 'hidden';
        }
    }, true);
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
