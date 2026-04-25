import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <PublicHeader />
      <main className="pt-[72px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
