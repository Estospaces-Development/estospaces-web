import { headers } from 'next/headers';
import UserLayoutClient from '../../components/layout/UserLayoutClient';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default async function UserLayout({ children }: UserLayoutProps) {
  const headersList = await headers();
  const domain = headersList.get('host') || '';
  const isSubdomain = domain.includes('user.'); // Simple check for user subdomain

  return (
    <UserLayoutClient isSubdomain={isSubdomain}>
      {children}
    </UserLayoutClient>
  );
}
