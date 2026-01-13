'use client';

// 主页面 - 动态标签页渲染
import React, { useEffect, memo, useState } from 'react';
import SearchComponent from '../components/SearchComponent';
import ErrorBoundary from '../components/ErrorBoundary';
import DataHealth from '../components/DataHealth';
import EnvironmentControl, { resetZustandStores, EnvironmentMode } from '../lib/components/EnvironmentControl';
import { useUserStore, ActiveTab } from '../lib/store/user-portfolio';

// 导入所有页面组件
import Dashboard from '../components/pages/Dashboard';
import Market from '../components/pages/Market';
import Trade from '../components/pages/Trade';
import Strategy from '../components/pages/Strategy';
import Assets from '../components/pages/Assets';
import Settings from '../components/pages/Settings';

// 使用memo包装页面组件，避免不必要的重新渲染
const MemoizedDashboard = memo(Dashboard);
const MemoizedMarket = memo(Market);
const MemoizedTrade = memo(Trade);
const MemoizedStrategy = memo(Strategy);
const MemoizedAssets = memo(Assets);
const MemoizedSettings = memo(Settings);

const Home: React.FC = () => {
  // 从用户存储中获取当前活动标签和切换方法
  const { activeTab, setActiveTab } = useUserStore();
  // 客户端挂载保护，解决Hydration白屏问题
  const [isHydrated, setIsHydrated] = useState(false);

  // 应用初始化完成后打印版本信息
  useEffect(() => {
    console.log('[System] V4.2 Integrated: Algorithms Online, UI Stabilized.');
    // 标记组件已在客户端挂载（完成Hydration）
    setIsHydrated(true);
  }, []);

  // 处理全局键盘事件
  useEffect(() => {
    // 只有在客户端完成Hydration后才添加事件监听器
    if (isHydrated) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // F键映射功能
        if (e.key.startsWith('F')) {
          const fKeyNumber = parseInt(e.key.substring(1));
          switch (fKeyNumber) {
            case 1:
              setActiveTab('dashboard');
              break;
            case 2:
              setActiveTab('market');
              break;
            case 3:
              setActiveTab('trade');
              break;
            case 4:
              setActiveTab('strategy');
              break;
            case 5:
              setActiveTab('assets');
              break;
            case 6:
              setActiveTab('settings');
              break;
          }
        }
        // CLI激活功能 - 捕获回车键
        else if (e.key === 'Enter') {
          // 检查当前焦点元素是否是输入框或搜索框
          const isFocusInInput = document.activeElement?.tagName === 'INPUT' || 
                                 document.activeElement?.tagName === 'TEXTAREA' ||
                                 document.activeElement?.classList.contains('search-input');
          
          if (!isFocusInInput) {
            // 激活搜索框
            const searchInput = document.querySelector('.search-input');
            if (searchInput instanceof HTMLInputElement) {
              searchInput.focus();
              searchInput.select();
            }
          }
        }
      };

      // 添加事件监听器
      document.addEventListener('keydown', handleKeyDown);
      
      // 清理事件监听器
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [setActiveTab, isHydrated]);

  // 在客户端未完成Hydration时返回null，避免Hydration不匹配
  if (!isHydrated) {
    return null;
  }

  // 定义标签页配置
  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'dashboard', label: '仪表盘' },
    { key: 'market', label: '行情' },
    { key: 'trade', label: '交易' },
    { key: 'strategy', label: '策略' },
    { key: 'assets', label: '资产' },
    { key: 'settings', label: '设置' }
  ];

  // 根据当前活动标签渲染对应的组件
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MemoizedDashboard />;
      case 'market':
        return <MemoizedMarket />;
      case 'trade':
        return <MemoizedTrade />;
      case 'strategy':
        return <MemoizedStrategy />;
      case 'assets':
        return <MemoizedAssets />;
      case 'settings':
        return <MemoizedSettings />;
      default:
        return <MemoizedDashboard />;
    }
  };

  return (
    <ErrorBoundary moduleName="整个应用">
      <div className="h-screen overflow-hidden flex flex-col bg-black text-white font-mono">
        {/* 顶部导航栏 */}
        <header className="flex justify-between items-center p-4 border-b border-green-500 gap-6 z-2000 relative">
          <div>
            <h1 className="text-green-500 font-bold text-lg m-0">老板的 AI 交易终端</h1>
          </div>
          <div className="flex-1">
            <SearchComponent />
          </div>
          <div className="header-controls flex items-center gap-3">
            <EnvironmentControl 
              onChange={(mode) => {
                // 当环境模式改变时，清理Zustand缓存并重新初始化Store
                resetZustandStores();
              }}
            />
            <DataHealth />
          </div>
          <nav>
            <ul className="flex list-none m-0 p-0 gap-6">
              {tabs.map((tab, index) => (
                <li key={tab.key}>
                  <button
                    className={`border border-green-500 text-green-500 text-sm px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-green-500 hover:text-black ${activeTab === tab.key ? 'bg-green-500 text-black animate-pulse' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    <span className="text-xs text-white ml-1 opacity-80">{`(F${index + 1})`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {/* 动态渲染内容区域 */}
        <main className="flex-1 overflow-hidden">
          {renderActiveTab()}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Home;