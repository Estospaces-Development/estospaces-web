import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SavedPropertiesProvider } from "@/contexts/SavedPropertiesContext";
import { ApplicationsProvider } from "@/contexts/ApplicationsContext";
import { UserProfileSummaryProvider } from "@/contexts/UserProfileSummaryContext";
import { WorkspaceSyncProvider } from "@/contexts/WorkspaceSyncContext";
import { BrowserRouter, ScrollRestoration } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollRestoration />
      <AuthProvider>
        <WorkspaceSyncProvider>
          <UserProfileSummaryProvider>
            <SavedPropertiesProvider>
              <ApplicationsProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </ApplicationsProvider>
            </SavedPropertiesProvider>
          </UserProfileSummaryProvider>
        </WorkspaceSyncProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
