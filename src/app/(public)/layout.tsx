import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'EstoSpaces - Modern Property Management Platform',
  description: 'Find, manage, and rent properties with ease',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
