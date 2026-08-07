import React, { Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';

// Minimal error boundary for page-level crashes
class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
    state = { hasError: false, error: '' };
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[PageErrorBoundary]', error, info.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center py-20 min-h-[400px] text-center">
                    <p className="text-gray-400 text-4xl mb-4">⚠️</p>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Page failed to load</h2>
                    <p className="text-sm text-gray-500 mt-2 max-w-sm">{this.state.error}</p>
                    <button onClick={() => this.setState({ hasError: false, error: '' })} className="mt-4 text-orange-500 underline text-sm">Try again</button>
                </div>
            );
        }
        return this.props.children;
    }
}
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

const CHUNK_RELOAD_KEY = 'estospaces:lazy-route-reload';

const isChunkLoadError = (error: unknown) => {
    if (!(error instanceof Error)) {
        return false;
    }

    return [
        'Failed to fetch dynamically imported module',
        'Importing a module script failed',
        'ChunkLoadError',
        'error loading dynamically imported module',
    ].some((message) => error.message.includes(message));
};

function lazyPage<T extends React.ComponentType<any>>(importer: () => Promise<{ default: T }>) {
    return lazy(async () => {
        try {
            return await importer();
        } catch (error) {
            if (typeof window !== 'undefined' && isChunkLoadError(error)) {
                const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const lastReloadLocation = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);

                if (lastReloadLocation !== currentLocation) {
                    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, currentLocation);
                    window.location.reload();
                    return new Promise<{ default: T }>(() => {});
                }

                window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            }

            throw error;
        }
    });
}

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout'; // Need to create/check this
import AdminLayout from './layouts/AdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import UserLayout from './layouts/UserLayout';
import ContactPage from './pages/public/contact/page';
import LoginPage from './pages/auth/login/page';
import RegisterPage from './pages/auth/register/page';
import ForgotPasswordPage from './pages/auth/forgot-password/page';
import ResetPasswordPage from './pages/auth/reset-password/page';
import VerifyEmailPage from './pages/auth/verify-email/page';

// Loading component
const Loading = () => <div className="flex items-center justify-center h-screen">Loading...</div>;

// Lazy loaded pages - Public
const HomePage = lazyPage(() => import('./pages/public/home/page'));
const AboutPage = lazyPage(() => import('./pages/public/about/page'));
const CookiesPage = lazyPage(() => import('./pages/public/cookies/page'));
const FAQPage = lazyPage(() => import('./pages/public/faq/page'));
const PrivacyPage = lazyPage(() => import('./pages/public/privacy/page'));
const PublicSearchPage = lazyPage(() => import('./pages/user/search/page'));
const TermsPage = lazyPage(() => import('./pages/public/terms/page'));
const PublicVirtualTourPage = lazyPage(() => import('./pages/public/virtual-tours/[id]/page'));

// Lazy loaded pages - Admin
const AdminDashboard = lazyPage(() => import('./pages/admin/dashboard/page'));
const AdminAnalytics = lazyPage(() => import('./pages/admin/analytics/page'));
const AdminChat = lazyPage(() => import('./pages/admin/chat/page'));
const AdminHelp = lazyPage(() => import('./pages/admin/help/page'));
const AdminFastTrack = lazyPage(() => import('./pages/admin/fast-track/page'));
const AdminNotifications = lazyPage(() => import('./pages/admin/notifications/page'));
const AdminProperties = lazyPage(() => import('./pages/admin/properties/page'));
const AdminPropertyDetail = lazyPage(() => import('./pages/admin/properties/[id]/page'));
const AdminResearch = lazyPage(() => import('./pages/admin/research/page'));
const AdminSettings = lazyPage(() => import('./pages/admin/settings/page'));
const AdminUsers = lazyPage(() => import('./pages/admin/users/page'));
const AdminVerifications = lazyPage(() => import('./pages/admin/verifications/page'));
const AdminReviews = lazyPage(() => import('./pages/admin/reviews/page'));
const AdminProfile = lazyPage(() => import('./pages/admin/profile/page'));

// Lazy loaded pages - Manager
const ManagerDashboard = lazyPage(() => import('./pages/manager/dashboard/page'));
const ManagerProperties = lazyPage(() => import('./pages/manager/dashboard/properties/page'));
const ManagerAddProperty = lazyPage(() => import('./pages/manager/dashboard/properties/add/page'));
const ManagerEditProperty = lazyPage(() => import('./pages/manager/dashboard/properties/edit/[id]/page'));
const ManagerPropertyDetail = lazyPage(() => import('./pages/manager/dashboard/properties/[id]/page'));
const ManagerAnalytics = lazyPage(() => import('./pages/manager/analytics/page'));
const ManagerApplications = lazyPage(() => import('./pages/manager/applications/page'));
const ManagerAppointments = lazyPage(() => import('./pages/manager/appointments/page'));
const ManagerCaseFiles = lazyPage(() => import('./pages/manager/case-files/page'));
const ManagerClients = lazyPage(() => import('./pages/manager/clients/page'));
const ManagerCommunity = lazyPage(() => import('./pages/manager/community/page'));
const ManagerContracts = lazyPage(() => import('./pages/manager/contracts/page'));
const ManagerDocs = lazyPage(() => import('./pages/manager/docs/page'));
const ManagerFastTrack = lazyPage(() => import('./pages/manager/fast-track/page'));
const ManagerHelp = lazyPage(() => import('./pages/manager/help/page'));
const ManagerLeads = lazyPage(() => import('./pages/manager/leads/page'));
const ManagerMessages = lazyPage(() => import('./pages/manager/messages/page'));
const ManagerNotifications = lazyPage(() => import('./pages/manager/notifications/page'));
const ManagerProfile = lazyPage(() => import('./pages/manager/profile/page'));
const ManagerUserVerifications = lazyPage(() => import('./pages/manager/user-verifications/page'));
const ManagerVerification = lazyPage(() => import('./pages/manager/verification/page'));
// Phase 2: billing and payment collection remain in source, but are not exposed in the active launch route table.
// const ManagerBilling = lazyPage(() => import('./pages/manager/billing/page'));

// Lazy loaded pages - User
const UserDashboard = lazyPage(() => import('./pages/user/dashboard/page'));
const UserApplications = lazyPage(() => import('./pages/user/applications/page'));
const UserBookings = lazyPage(() => import('./pages/user/bookings/page'));
const UserProfile = lazyPage(() => import('./pages/user/dashboard/profile/page'));
const UserSaved = lazyPage(() => import('./pages/user/saved/page'));
const UserVirtualStorage = lazyPage(() => import('./pages/user/virtual-storage/page'));
const UserSearch = lazyPage(() => import('./pages/user/search/page'));
const UserPropertyDetail = lazyPage(() => import('./pages/user/properties/[id]/page'));

// Nested User Dashboard pages
const UserContracts = lazyPage(() => import('./pages/user/dashboard/contracts/page'));
const UserDashboardDocs = lazyPage(() => import('./pages/user/dashboard/docs/page'));
const UserDiscover = lazyPage(() => import('./pages/user/dashboard/discover/page'));
const UserFastTrack = lazyPage(() => import('./pages/user/dashboard/fast-track/page'));
const UserCaseFile = lazyPage(() => import('./pages/user/dashboard/case-file/page'));
const UserHelp = lazyPage(() => import('./pages/user/dashboard/help/page'));
const UserMessages = lazyPage(() => import('./pages/user/dashboard/messages/page'));
const UserNotifications = lazyPage(() => import('./pages/user/dashboard/notifications/page'));
const UserOverseas = lazyPage(() => import('./pages/user/dashboard/overseas/page'));
// Phase 2: payments remain in source, but are not exposed in the active launch route table.
// const UserPayments = lazyPage(() => import('./pages/user/dashboard/payments/page'));
const UserReviews = lazyPage(() => import('./pages/user/dashboard/reviews/page'));
const UserSettingsDash = lazyPage(() => import('./pages/user/dashboard/settings/page'));
const UserViewings = lazyPage(() => import('./pages/user/dashboard/viewings/page'));

import SubdomainRouter from './components/routing/SubdomainRouter';
import RouteAccessBoundary from './components/routing/RouteAccessBoundary';
import StartupRedirect from './components/routing/StartupRedirect';
import { useAuth } from './contexts/AuthContext';
import { useManagerVerification } from './contexts/ManagerVerificationContext';
import { VIRTUAL_TOUR_ENABLED } from './lib/launchFlags';

function RouteScrollReset() {
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function VerifiedManagerRoute({ children }: { children: ReactNode }) {
  const { isLoading, isVerified } = useManagerVerification();

  if (isLoading) {
    return <Loading />;
  }

  if (!isVerified) {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRootEntry() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return isAuthenticated ? <StartupRedirect /> : <HomePage />;
}

const App: React.FC = () => {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  }, []);

  return (
    <Suspense fallback={<Loading />}>
      <SubdomainRouter>
        <RouteScrollReset />
        <PageErrorBoundary>
          <RouteAccessBoundary>
            <Routes>
          <Route path="/virtual-tours/:id" element={VIRTUAL_TOUR_ENABLED ? <PublicVirtualTourPage /> : <Navigate to="/search" replace />} />

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<PublicRootEntry />} />
            <Route path="home" element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/search" element={<PublicSearchPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
          {/* Redirect /login to /login/ for GFE cache compatibility */}
          <Route path="/login" element={<Navigate to="/login/" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="community" element={<ManagerCommunity />} />
            <Route path="docs" element={<Navigate to="/admin/help" replace />} />
            <Route path="help" element={<AdminHelp />} />
            <Route path="fast-track" element={<AdminFastTrack />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/:id" element={<AdminPropertyDetail />} />
            <Route path="research" element={<AdminResearch />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="user-management" element={<AdminUsers />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="dashboard/properties" element={<ManagerProperties />} />
            <Route path="dashboard/properties/add" element={<ManagerAddProperty />} />
            <Route path="dashboard/properties/edit/:id" element={<ManagerEditProperty />} />
            <Route path="dashboard/properties/:id" element={<ManagerPropertyDetail />} />
            <Route path="analytics" element={<VerifiedManagerRoute><ManagerAnalytics /></VerifiedManagerRoute>} />
            <Route path="applications" element={<ManagerApplications />} />
            <Route path="appointments" element={<VerifiedManagerRoute><ManagerAppointments /></VerifiedManagerRoute>} />
            <Route path="case-files" element={<ManagerCaseFiles />} />
            <Route path="contracts" element={<VerifiedManagerRoute><ManagerContracts /></VerifiedManagerRoute>} />
            <Route path="docs" element={<ManagerDocs />} />
            <Route path="billing/*" element={<Navigate to="/manager/contracts" replace />} />
            <Route path="clients" element={<ManagerClients />} />
            <Route path="community" element={<ManagerCommunity />} />
            <Route path="fast-track" element={<VerifiedManagerRoute><ManagerFastTrack /></VerifiedManagerRoute>} />
            <Route path="help" element={<ManagerHelp />} />
            <Route path="leads" element={<ManagerLeads />} />
            <Route path="messages" element={<ManagerMessages />} />
            <Route path="notifications" element={<PageErrorBoundary><ManagerNotifications /></PageErrorBoundary>} />
            <Route path="profile" element={<ManagerProfile />} />
            <Route path="user-verifications" element={<ManagerUserVerifications />} />
            <Route path="verification" element={<ManagerVerification />} />
          </Route>

          {/* User Routes */}
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="dashboard/applications" element={<UserApplications />} />
            <Route path="dashboard/bookings" element={<UserBookings />} />
            <Route path="dashboard/contracts" element={<UserContracts />} />
            <Route path="dashboard/case-file" element={<UserCaseFile />} />
            <Route path="dashboard/docs" element={<UserDashboardDocs />} />
            <Route path="dashboard/discover" element={<UserDiscover />} />
            <Route path="dashboard/fast-track" element={<UserFastTrack />} />
            <Route path="dashboard/help" element={<UserHelp />} />
            <Route path="dashboard/messages" element={<UserMessages />} />
            <Route path="dashboard/notifications" element={<UserNotifications />} />
            <Route path="dashboard/overseas" element={<UserOverseas />} />
            <Route path="dashboard/payments/*" element={<Navigate to="/user/dashboard/contracts" replace />} />
            <Route path="dashboard/profile" element={<UserProfile />} />
            <Route path="dashboard/reviews" element={<UserReviews />} />
            <Route path="dashboard/saved" element={<UserSaved />} />
            <Route path="dashboard/settings" element={<UserSettingsDash />} />
            <Route path="dashboard/viewings" element={<UserViewings />} />
            <Route path="dashboard/virtual-storage" element={<UserVirtualStorage />} />
            <Route path="dashboard/search" element={<UserSearch />} />
            <Route path="dashboard/property/:id" element={<UserPropertyDetail />} />
            <Route path="dashboard/properties/:id" element={<UserPropertyDetail />} />
            {/* Backward-compatible top-level routes redirect to nested dashboard counterparts */}
            <Route path="applications" element={<Navigate to="/user/dashboard/applications" replace />} />
            <Route path="bookings" element={<Navigate to="/user/dashboard/bookings" replace />} />
            <Route path="docs" element={<Navigate to="/user/dashboard/docs" replace />} />
            <Route path="favorites" element={<Navigate to="/user/dashboard/saved" replace />} />
            <Route path="profile" element={<Navigate to="/user/dashboard/profile" replace />} />
            <Route path="saved" element={<Navigate to="/user/dashboard/saved" replace />} />
            <Route path="virtual-storage" element={<Navigate to="/user/dashboard/virtual-storage" replace />} />
            <Route path="search" element={<Navigate to="/user/dashboard/search" replace />} />
            <Route path="properties/:id" element={<Navigate to="/user/dashboard/properties/:id" replace />} />
            <Route path="settings" element={<Navigate to="/user/dashboard/settings" replace />} />
          </Route>

          {/* Fallback */}
            <Route path="*" element={<StartupRedirect />} />
            </Routes>
          </RouteAccessBoundary>
        </PageErrorBoundary>
      </SubdomainRouter>
    </Suspense>
  );
};

export default App;
