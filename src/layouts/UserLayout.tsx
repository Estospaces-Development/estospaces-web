import UserLayoutClient from '@/components/layout/UserLayoutClient';
import { Outlet } from 'react-router-dom';

export default function UserLayout() {
  const domain = window.location.hostname;
  const isSubdomain = domain.startsWith('user.');

  return (
    <UserLayoutClient isSubdomain={isSubdomain}>
      <Outlet />
    </UserLayoutClient>
  );
}
