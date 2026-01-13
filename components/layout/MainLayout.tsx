'use client';
import React from 'react';
import dynamic from 'next/dynamic';

// 使用动态导入解决水合错误
const WatchlistSidebar = dynamic(() => import('../WatchlistSidebar'), {
  loading: () => <div className="w-64 h-screen bg-gray-900 border-r border-gray-800"></div>,
  ssr: false
});

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar - 250px */}
      <WatchlistSidebar />
      
      {/* Main Content - Flex-1 */}
      <main className="flex-1 overflow-y-auto bg-gray-900 text-gray-100">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;