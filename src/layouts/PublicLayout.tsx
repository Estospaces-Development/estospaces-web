import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
