"use client";

import { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as propertyService from '@/services/propertyService';
import { DollarSign, Building2, Eye, UserCheck, Plus, Filter, Download, Home, Bot } from 'lucide-react';

// Components
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopProperties from '@/components/dashboard/TopProperties';
import TabBar from '@/components/dashboard/TabBar';
import BrokerResponseWidget from '@/components/dashboard/BrokerResponseWidget';
import ManagerPropertyCard from '@/components/dashboard/ManagerPropertyCard';

function DashboardContent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Stats (Mocks for now, can be replaced with real data fetch)
  const stats = {
    monthlyRevenue: '45,250.00',
    monthlyRevenueChange: '+12.5%',
    activeProperties: '12',
    activeListingsChange: '+2',
    totalViews: '3,450',
    totalViewsChange: '+18.2%',
    conversionRate: '2.8%',
    conversionRateChange: '+0.4%',
  };

  // Fetch properties for "Your Properties" section
  // We can use a service directly or a hook. Let's use fetch logic inline or custom hook logic if available.
  // For simplicity and stability, we'll fetch using the service pattern or mock if service fails.
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);

  useEffect(() => {
    // Mock user properties or fetch
    // Use UsePropertiesService.getProperties() if compatible, or just mock for UI parity
    const fetchProps = async () => {
      // Mock data to ensure "No features misses" - at least show something
      // In real app we call API.
      setProperties([
        {
          id: '1', title: 'Luxury Apartment in Downtown', address: '123 Main St, Mumbai',
          bedrooms: 3, bathrooms: 2, area: 1500, status: 'active',
          price: 25000000,
          image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          view_count: 124
        },
        {
          id: '2', title: 'Cozy Studio near Beach', address: '45 Ocean Dr, Goa',
          bedrooms: 1, bathrooms: 1, area: 600, status: 'draft',
          price: 8000000,
          image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          view_count: 45
        },
        {
          id: '3', title: 'Modern Office Space', address: 'Tech Park, Bangalore',
          bedrooms: 0, bathrooms: 2, area: 2400, status: 'under_offer',
          price: 45000000,
          image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          view_count: 890
        }
      ]);
    };
    fetchProps();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'leads') {
      navigate('/manager/leads');
    } else if (tab === 'application') {
      navigate('/manager/applications');
    } else if (tab === 'analytics') {
      // Navigate or keep inline if we implement Analytics page
      navigate('/manager/analytics'); // Assuming it exists or will handle 404 gracefully
    } else if (tab === 'properties') {
      // Navigate to full properties list
      navigate('/manager/dashboard/properties');
    }
  };

  const handleEditProperty = (id: string) => {
    // navigate(`/manager/dashboard/properties/edit/${id}`);
    console.log('Edit', id);
  };

  const handleViewProperty = (id: string) => {
    // navigate(`/manager/dashboard/properties/${id}`);
    console.log('View', id);
  };

  return (
    <div className="space-y-6 relative min-h-screen pb-20">
      <WelcomeBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue}`}
          change={stats.monthlyRevenueChange}
          icon={DollarSign}
          iconColor="bg-green-500"
          trendColor="text-green-600"
        />
        <StatCard
          title="Active Listings"
          value={stats.activeProperties}
          change={stats.activeListingsChange}
          icon={Building2}
          iconColor="bg-blue-500"
          trendColor="text-blue-600"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews}
          change={stats.totalViewsChange}
          icon={Eye}
          iconColor="bg-purple-500"
          trendColor="text-purple-600"
        />
        <StatCard
          title="Conversion Rate"
          value={stats.conversionRate}
          change={stats.conversionRateChange}
          icon={UserCheck}
          iconColor="bg-orange-500"
          trendColor="text-orange-600"
        />
      </div>

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Broker Response Widget (USP) */}
          <BrokerResponseWidget />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>

            {/* Top Properties */}
            <div>
              <TopProperties />
            </div>
          </div>

          {/* Your Properties Section */}
          <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Your Properties</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => navigate('/manager/dashboard/properties/add')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-lg shadow-orange-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Property</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.length > 0 ? (
                  properties.map(prop => (
                    <ManagerPropertyCard
                      key={prop.id}
                      property={prop}
                      onEdit={handleEditProperty}
                      onView={handleViewProperty}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-gray-500">
                    No properties found. Start by adding one!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Floating Button (Visual Only for now) */}
      <button className="fixed bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-xl flex items-center gap-2 px-4 py-3 z-50 transition-all duration-300 hover:scale-105 group">
        <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="font-medium">Ask Lakshmi</span>
      </button>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

