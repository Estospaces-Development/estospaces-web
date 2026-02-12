import { headers } from 'next/headers';
import ManagerLayoutClient from '../../components/layout/ManagerLayoutClient';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

export default async function ManagerLayout({ children }: ManagerLayoutProps) {
  const headersList = await headers();
  const domain = headersList.get('host') || '';
  const isSubdomain = domain.includes('manager.'); // Simple check for manager subdomain

  return (
    <ManagerLayoutClient isSubdomain={isSubdomain}>
      {children}
    </ManagerLayoutClient>
  );
}
