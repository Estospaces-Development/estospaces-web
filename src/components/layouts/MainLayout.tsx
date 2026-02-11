import { useState, ReactNode } from 'react';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
// import DashboardFooter from '../components/Dashboard/DashboardFooter';
// import LakshmiAssistant from '../components/Dashboard/LakshmiAssistant';
// import { PropertiesProvider } from '../contexts/PropertiesContext';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    // <PropertiesProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-black font-manager transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 font-manager bg-gray-50 dark:bg-black transition-colors duration-300">
          <div className="mx-auto max-w-[1600px] w-full h-full animate-fadeIn">
            {children}
          </div>
        </main>
        {/* <DashboardFooter /> */}
        <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Estospaces. All rights reserved.
        </footer>
      </div>
      {/* <LakshmiAssistant /> */}
    </div>
    // </PropertiesProvider>
  );
};

export default MainLayout;
