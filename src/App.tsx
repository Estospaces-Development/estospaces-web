import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout'; // Need to create/check this
import AdminLayout from './layouts/AdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import UserLayout from './layouts/UserLayout';

// Loading component
const Loading = () => <div className="flex items-center justify-center h-screen">Loading...</div>;

// Lazy loaded pages - Public
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const ContactPage = lazy(() => import('./pages/public/contact/page'));
const CookiesPage = lazy(() => import('./pages/public/cookies/page'));
const FAQPage = lazy(() => import('./pages/public/faq/page'));
const PrivacyPage = lazy(() => import('./pages/public/privacy/page'));
const TermsPage = lazy(() => import('./pages/public/terms/page'));

// Lazy loaded pages - Auth
const LoginPage = lazy(() => import('./pages/auth/login/page'));
const RegisterPage = lazy(() => import('./pages/auth/register/page'));

// Lazy loaded pages - Admin
const AdminDashboard = lazy(() => import('./pages/admin/dashboard/page'));
const AdminAnalytics = lazy(() => import('./pages/admin/analytics/page'));
const AdminChat = lazy(() => import('./pages/admin/chat/page'));
const AdminFastTrack = lazy(() => import('./pages/admin/fast-track/page'));
const AdminProperties = lazy(() => import('./pages/admin/properties/page'));
const AdminSettings = lazy(() => import('./pages/admin/settings/page'));
const AdminUsers = lazy(() => import('./pages/admin/users/page'));
const AdminVerifications = lazy(() => import('./pages/admin/verifications/page'));

// Lazy loaded pages - Manager
const ManagerDashboard = lazy(() => import('./pages/manager/dashboard/page'));
const ManagerProperties = lazy(() => import('./pages/manager/dashboard/properties/page'));
const ManagerAddProperty = lazy(() => import('./pages/manager/dashboard/properties/add/page'));
const ManagerEditProperty = lazy(() => import('./pages/manager/dashboard/properties/edit/[id]/page'));
const ManagerPropertyDetail = lazy(() => import('./pages/manager/dashboard/properties/[id]/page'));
const ManagerAnalytics = lazy(() => import('./pages/manager/analytics/page'));
const ManagerApplications = lazy(() => import('./pages/manager/applications/page'));
const ManagerAppointments = lazy(() => import('./pages/manager/appointments/page'));
const ManagerBilling = lazy(() => import('./pages/manager/billing/page'));
const ManagerClients = lazy(() => import('./pages/manager/clients/page'));
const ManagerCommunity = lazy(() => import('./pages/manager/community/page'));
const ManagerFastTrack = lazy(() => import('./pages/manager/fast-track/page'));
const ManagerHelp = lazy(() => import('./pages/manager/help/page'));
const ManagerLeads = lazy(() => import('./pages/manager/leads/page'));
const ManagerMessages = lazy(() => import('./pages/manager/messages/page'));
const ManagerNotifications = lazy(() => import('./pages/manager/notifications/page'));
const ManagerProfile = lazy(() => import('./pages/manager/profile/page'));
const ManagerVerification = lazy(() => import('./pages/manager/verification/page'));

// Lazy loaded pages - User
const UserDashboard = lazy(() => import('./pages/user/dashboard/page'));
const UserApplications = lazy(() => import('./pages/user/applications/page'));
const UserBookings = lazy(() => import('./pages/user/bookings/page'));
const UserFavorites = lazy(() => import('./pages/user/favorites/page'));
const UserProfile = lazy(() => import('./pages/user/profile/page'));
const UserSaved = lazy(() => import('./pages/user/saved/page'));
const UserSearch = lazy(() => import('./pages/user/search/page'));
const UserSettings = lazy(() => import('./pages/user/settings/page'));

// Nested User Dashboard pages
const UserContracts = lazy(() => import('./pages/user/dashboard/contracts/page'));
const UserDiscover = lazy(() => import('./pages/user/dashboard/discover/page'));
const UserHelp = lazy(() => import('./pages/user/dashboard/help/page'));
const UserMessages = lazy(() => import('./pages/user/dashboard/messages/page'));
const UserNotifications = lazy(() => import('./pages/user/dashboard/notifications/page'));
const UserOverseas = lazy(() => import('./pages/user/dashboard/overseas/page'));
const UserPayments = lazy(() => import('./pages/user/dashboard/payments/page'));
const UserProfileDash = lazy(() => import('./pages/user/dashboard/profile/page'));
const UserReviews = lazy(() => import('./pages/user/dashboard/reviews/page'));
const UserSettingsDash = lazy(() => import('./pages/user/dashboard/settings/page'));
const UserViewings = lazy(() => import('./pages/user/dashboard/viewings/page'));

const App: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="fast-track" element={<AdminFastTrack />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="verifications" element={<AdminVerifications />} />
        </Route>

        {/* Manager Routes */}
        <Route path="/manager" element={<ManagerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="dashboard/properties" element={<ManagerProperties />} />
          <Route path="dashboard/properties/add" element={<ManagerAddProperty />} />
          <Route path="dashboard/properties/edit/:id" element={<ManagerEditProperty />} />
          <Route path="dashboard/properties/:id" element={<ManagerPropertyDetail />} />
          <Route path="analytics" element={<ManagerAnalytics />} />
          <Route path="applications" element={<ManagerApplications />} />
          <Route path="appointments" element={<ManagerAppointments />} />
          <Route path="billing" element={<ManagerBilling />} />
          <Route path="clients" element={<ManagerClients />} />
          <Route path="community" element={<ManagerCommunity />} />
          <Route path="fast-track" element={<ManagerFastTrack />} />
          <Route path="help" element={<ManagerHelp />} />
          <Route path="leads" element={<ManagerLeads />} />
          <Route path="messages" element={<ManagerMessages />} />
          <Route path="notifications" element={<ManagerNotifications />} />
          <Route path="profile" element={<ManagerProfile />} />
          <Route path="verification" element={<ManagerVerification />} />
        </Route>

        {/* User Routes */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="dashboard/contracts" element={<UserContracts />} />
          <Route path="dashboard/discover" element={<UserDiscover />} />
          <Route path="dashboard/help" element={<UserHelp />} />
          <Route path="dashboard/messages" element={<UserMessages />} />
          <Route path="dashboard/notifications" element={<UserNotifications />} />
          <Route path="dashboard/overseas" element={<UserOverseas />} />
          <Route path="dashboard/payments" element={<UserPayments />} />
          <Route path="dashboard/profile" element={<UserProfileDash />} />
          <Route path="dashboard/reviews" element={<UserReviews />} />
          <Route path="dashboard/settings" element={<UserSettingsDash />} />
          <Route path="dashboard/viewings" element={<UserViewings />} />
          <Route path="applications" element={<UserApplications />} />
          <Route path="bookings" element={<UserViewings />} />
          <Route path="favorites" element={<UserSaved />} />
          <Route path="profile" element={<UserProfileDash />} />
          <Route path="saved" element={<UserSaved />} />
          <Route path="search" element={<UserDiscover />} />
          <Route path="settings" element={<UserSettingsDash />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
