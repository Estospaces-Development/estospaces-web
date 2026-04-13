import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SavedPropertiesProvider } from "@/contexts/SavedPropertiesContext";
import { ApplicationsProvider } from "@/contexts/ApplicationsContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { WorkspaceSyncProvider } from "@/contexts/WorkspaceSyncContext";
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SavedPropertiesProvider>
          <PropertyProvider>
            <ApplicationsProvider>
              <WorkspaceSyncProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </WorkspaceSyncProvider>
            </ApplicationsProvider>
          </PropertyProvider>
        </SavedPropertiesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
