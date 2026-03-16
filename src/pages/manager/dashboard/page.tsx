"use client";

import { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as propertyService from '@/services/propertyService';
import * as analyticsService from '@/services/analyticsService';
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
  const [analytics, setAnalytics] = useState<analyticsService.AnalyticsData | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [analyticsRes, propsRes] = await Promise.all([
          analyticsService.getManagerAnalytics(),
          propertyService.getProperties({ limit: 3 })
        ]);

        if (analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
        if (propsRes.data) {
          setProperties(propsRes.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = {
    monthlyRevenue: analytics?.total_revenue?.toLocaleString() || '0.00',
    monthlyRevenueChange: analytics?.revenue_growth || '0%',
    activeProperties: analytics?.total_properties?.toString() || analytics?.leadAnalytics?.totalProperties?.toString() || '0',
    activeListingsChange: analytics?.property_growth || '+0',
    totalViews: analytics?.total_views?.toString() || analytics?.propertyPerformance?.reduce((acc, p) => acc + (p.views || 0), 0) || '0',
    totalViewsChange: analytics?.views_growth || '0%',
    conversionRate: (analytics?.leadAnalytics?.conversionRate ? analytics.leadAnalytics.conversionRate.toFixed(1) : (analytics?.conversion_rate || 0).toFixed(1)) + '%',
    conversionRateChange: analytics?.conversion_growth || '+0%',
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    const tabRoutes: Record<string, string> = {
      overview: '/manager/dashboard',
      properties: '/manager/dashboard/properties',
      leads: '/manager/leads',
      application: '/manager/applications',
      analytics: '/manager/analytics',
    };

    const nextRoute = tabRoutes[tab];
    if (nextRoute) {
      navigate(nextRoute);
    }
  };

  const handleEditProperty = (id: string) => {
    navigate(`/manager/dashboard/properties/edit/${id}`);
  };

  const handleViewProperty = (id: string) => {
    navigate(`/manager/dashboard/properties/${id}`);
  };

  return (
    <div className="space-y-6 relative min-h-screen pb-20 font-outfit">
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
          value={stats.totalViews.toString()}
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
          <div className="bg-white dark:bg-black rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <Home className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-outfit">Your Properties</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold">
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => navigate('/manager/dashboard/properties/add')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Property</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[350px] bg-gray-50 dark:bg-gray-900 animate-pulse rounded-2xl border border-gray-100 dark:border-gray-800" />
                  ))
                ) : properties.length > 0 ? (
                  properties.map(prop => (
                    <ManagerPropertyCard
                      key={prop.id}
                      property={prop}
                      onEdit={handleEditProperty}
                      onView={handleViewProperty}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                      <Home className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No properties found</h4>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">Start by adding your first property to see it here on your dashboard.</p>
                    <button
                        onClick={() => navigate('/manager/dashboard/properties/add')}
                        className="text-orange-500 font-bold hover:underline flex items-center gap-1"
                    >
                        Click here to add property
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Floating Button (Visual Only for now) */}
      <button className="fixed bottom-8 right-8 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl flex items-center gap-3 px-5 py-4 z-50 transition-all duration-300 hover:scale-105 group active:scale-95">
        <div className="relative">
            <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-orange-600"></span>
        </div>
        <span className="font-bold tracking-tight">Ask Lakshmi</span>
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
