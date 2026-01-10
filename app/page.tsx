'use client';

// 主页面 - 动态标签页渲染
import React from 'react';
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

const Home: React.FC = () => {
  // 从用户存储中获取当前活动标签和切换方法
  const { activeTab, setActiveTab } = useUserStore();

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
        return <Dashboard />;
      case 'market':
        return <Market />;
      case 'trade':
        return <Trade />;
      case 'strategy':
        return <Strategy />;
      case 'assets':
        return <Assets />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dashboard">
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
            {tabs.map(tab => (
              <li key={tab.key}>
                <button
                  className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
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

      <style jsx>{`
        .dashboard {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #11111b;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }

        /* 顶部导航栏 */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #1e1e2e;
          border-bottom: 1px solid #313244;
          gap: 24px;
        }

        .logo h1 {
          margin: 0;
          font-size: 24px;
          color: #89dceb;
          font-weight: 600;
        }

        .search-section {
          flex: 1;
          max-width: 400px;
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
          border: none;
          color: #cdd6f4;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-link:hover {
          color: #89dceb;
          background-color: rgba(137, 220, 235, 0.1);
        }

        .nav-link.active {
          color: #89dceb;
          background-color: rgba(137, 220, 235, 0.2);
          border: 1px solid #89dceb;
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