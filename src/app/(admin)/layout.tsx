import type { Metadata } from 'next';
import { headers } from 'next/headers';
import AdminLayoutClient from '@/components/layout/AdminLayoutClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard - EstoSpaces',
  description: 'EstoSpaces Admin Dashboard for platform management',
};

import { PropertyProvider } from '@/contexts/PropertyContext';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const domain = headersList.get('host') || '';
  const isSubdomain = domain.includes('admin.'); // Simple check for admin subdomain

  return (
    <PropertyProvider>
      <AdminLayoutClient isSubdomain={isSubdomain}>
        {children}
      </AdminLayoutClient>
    </PropertyProvider>
  );
}
