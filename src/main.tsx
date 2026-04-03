import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SavedPropertiesProvider } from "@/contexts/SavedPropertiesContext";
import { ApplicationsProvider } from "@/contexts/ApplicationsContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { UserProfileSummaryProvider } from "@/contexts/UserProfileSummaryContext";
import { WorkspaceSyncProvider } from "@/contexts/WorkspaceSyncContext";
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceSyncProvider>
          <UserProfileSummaryProvider>
            <SavedPropertiesProvider>
              <PropertyProvider>
                <ApplicationsProvider>
                  <ToastProvider>
                    <App />
                  </ToastProvider>
                </ApplicationsProvider>
              </PropertyProvider>
            </SavedPropertiesProvider>
          </UserProfileSummaryProvider>
        </WorkspaceSyncProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
