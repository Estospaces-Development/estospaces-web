'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getRedirectPath } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, getRole } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        const role = getRole();
        router.replace(getRedirectPath(role));
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, getRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading EstoSpaces...</p>
      </div>
    </div>
  );
}
