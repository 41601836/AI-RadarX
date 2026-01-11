'use client';

// 主页面 - 动态标签页渲染
import React, { useEffect, memo } from 'react';
import SearchComponent from '../components/SearchComponent';
import ErrorBoundary from '../components/ErrorBoundary';
import DataHealth from '../components/DataHealth';
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

  // 应用初始化完成后打印版本信息
  useEffect(() => {
    console.log('[System] V4.2 Integrated: Algorithms Online, UI Stabilized.');
  }, []);

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
  // 处理全局键盘事件
  useEffect(() => {
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
  }, [setActiveTab]);

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
    <div className="dashboard h-screen overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="dashboard-header">
        <div className="logo">
          <h1>老板的 AI 交易终端</h1>
        </div>
        <div className="search-section">
          <SearchComponent />
        </div>
        <div className="header-controls">
          <DataHealth />
        </div>
        <nav className="nav-menu">
          <ul>
            {tabs.map((tab, index) => (
              <li key={tab.key}>
                <button
                  className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="shortcut">{`(F${index + 1})`}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* 动态渲染内容区域 */}
      <main className="main-content">
        <ErrorBoundary moduleName="主内容区域">
          {renderActiveTab()}
        </ErrorBoundary>
      </main>

      <style jsx global>{`
        body {
          background: #000 !important;
          color: #fff !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
        }
      `}</style>

      <style jsx>{`
        .dashboard {
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #000;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* 顶部导航栏 */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #000;
          border-bottom: 1px solid #00FF00;
          gap: 24px;
          z-index: 2000;
          position: relative;
        }

        .logo h1 {
          margin: 0;
          font-size: 20px;
          color: #00FF00;
          font-weight: bold;
        }

        .search-section {
          flex: 1;
        }

        .nav-menu ul {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 24px;
        }

        .nav-link {
          background: none;
          border: 1px solid #00FF00;
          color: #00FF00;
          text-decoration: none;
          font-size: 13px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-link:hover {
          color: #000;
          background-color: #00FF00;
        }

        .nav-link.active {
          color: #000;
          background-color: #00FF00;
          border: 1px solid #00FF00;
          animation: borderFlash 0.5s ease-in-out;
        }

        .shortcut {
          font-size: 10px;
          color: #FFFFFF;
          margin-left: 4px;
          opacity: 0.8;
        }

        @keyframes borderFlash {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
          50% { box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.5); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
        }

        /* 主内容区域 */
        .main-content {
          flex: 1;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Home;