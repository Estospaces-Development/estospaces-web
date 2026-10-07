import UserLayoutClient from '@/components/layout/UserLayoutClient';
import WelcomeVideoModal from '@/components/onboarding/WelcomeVideoModal';
import { Outlet } from 'react-router-dom';

export default function UserLayout() {
  const domain = window.location.hostname;
  const isSubdomain = domain.startsWith('app.') || domain.startsWith('user.');

  return (
    <>
      <UserLayoutClient isSubdomain={isSubdomain}>
        <Outlet />
      </UserLayoutClient>
      <WelcomeVideoModal role="user" />
    </>
  );
}
