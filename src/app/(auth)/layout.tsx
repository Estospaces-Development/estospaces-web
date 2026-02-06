import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - EstoSpaces',
  description: 'Sign in to your EstoSpaces account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
