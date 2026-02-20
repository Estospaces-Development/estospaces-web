import ManagerLayoutClient from '@/components/layout/ManagerLayoutClient';
import { Outlet } from 'react-router-dom';

export default function ManagerLayout() {
  const domain = window.location.hostname;
  const isSubdomain = domain.startsWith('manager.');

  return (
    <ManagerLayoutClient isSubdomain={isSubdomain}>
      <Outlet />
    </ManagerLayoutClient>
  );
}
