import AdminLayoutClient from '@/components/layout/AdminLayoutClient';
import { PropertyProvider } from '@/contexts/PropertyContext';
import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  // In a pure React app, subdomain detection might be done differently
  const domain = window.location.hostname;
  const isSubdomain = domain.startsWith('admin.');

  return (
    <PropertyProvider>
      <AdminLayoutClient isSubdomain={isSubdomain}>
        <Outlet />
      </AdminLayoutClient>
    </PropertyProvider>
  );
}
