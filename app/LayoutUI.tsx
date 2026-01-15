'use client';
// 客户端布局UI组件
import { ReactNode, useState } from 'react'
import SearchComponent from '../components/SearchComponent'
import Ticker from '../components/Ticker'
import RiskNotification from '../components/RiskNotification'
import { useUserStore } from '../lib/store/user-portfolio'

// 定义菜单项类型
interface MenuItem {
  id: string;
  name: string;
  icon: string;
  isImplemented: boolean;
}

const LayoutUI = ({ children }: { children: ReactNode }) => {
  // 左侧菜单数据
  const menuItems: MenuItem[] = [
    { id: 'chip', name: '筹码', icon: '📊', isImplemented: true },
    { id: 'publicOpinion', name: '舆情', icon: '💬', isImplemented: true },
    { id: 'techIndicator', name: '技术', icon: '📈', isImplemented: false },
    { id: 'largeOrder', name: '大单', icon: '💰', isImplemented: false },
    { id: 'heatFlow', name: '热钱', icon: '🔥', isImplemented: false },
    { id: 'risk', name: '风险', icon: '⚠️', isImplemented: false },
  ];

  // 从用户存储获取布局状态
  const { dashboardLayout, setSidebarCollapsed } = useUserStore();
  // 选中的菜单项
  const [selectedMenuItem, setSelectedMenuItem] = useState('chip');

  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    setSidebarCollapsed(!dashboardLayout.isSidebarCollapsed);
  };

  // 处理菜单项点击
  const handleMenuItemClick = (menuItem: MenuItem) => {
    if (menuItem.isImplemented) {
      setSelectedMenuItem(menuItem.id);
    } else {
      alert('该功能即将上线');
    }
  };

  return (
    // 整体容器
    <div className="flex flex-col h-screen">
      {/* 全局风险通知组件 */}
      <RiskNotification />
      {/* 顶部导航栏 (8vh) */}
      <header className="h-[8vh] bg-black shadow-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-[#165DFF]">AI-RadarX</div>
        </div>
        <div className="flex items-center gap-6 flex-1 justify-center">
          {/* 搜索框 */}
          <div className="w-1/3">
            <SearchComponent />
          </div>
          {/* 市场速览 */}
          <div>
            <Ticker />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">老板</div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600">B</span>
          </div>
        </div>
      </header>

      {/* 主内容区域（包含侧边栏和主内容） */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧功能栏 (20vw 或 60px) */}
        <aside 
          className={`transition-all duration-300 ease-in-out bg-black shadow-md overflow-y-auto ${dashboardLayout.isSidebarCollapsed ? 'w-[60px]' : 'w-[20vw]' }`}
        >
          {/* 侧边栏顶部（包含折叠按钮） */}
          <div className="flex items-center justify-between p-4 border-b">
            {!dashboardLayout.isSidebarCollapsed && <div className="text-lg font-semibold text-gray-800">功能菜单</div>}
            <button 
              onClick={toggleSidebar} 
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              {dashboardLayout.isSidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          {/* 侧边栏菜单 */}
          <nav className="p-2">
            {menuItems.map((menuItem) => (
              <button
                key={menuItem.id}
                onClick={() => handleMenuItemClick(menuItem)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 mb-1 ${
                  selectedMenuItem === menuItem.id
                    ? 'bg-[#E8F3FF] border-l-4 border-[#165DFF] font-semibold'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                } ${
                  menuItem.isImplemented
                    ? 'text-[#165DFF]'
                    : 'text-[#999999]'
                }`}
              >
                <span className="text-xl">{menuItem.icon}</span>
                {!dashboardLayout.isSidebarCollapsed && <span>{menuItem.name}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* 底部信息区 (10vh) */}
      <footer className="h-[10vh] bg-black border-t flex items-center justify-between px-6 text-sm">
        {/* 左侧合规声明 */}
        <div className="text-gray-600">
          © 2026 AI-RadarX. 合规交易，风险自负。
        </div>
        
        {/* 中间版本信息 */}
        <div className="text-gray-600">
          版本 V3.2 | 更新于 2026-01-15
        </div>
        
        {/* 右侧帮助反馈 */}
        <div className="flex items-center gap-4">
          <a href="#" className="text-[#165DFF] hover:underline">帮助中心</a>
          <a href="#" className="text-[#165DFF] hover:underline">反馈建议</a>
        </div>
      </footer>
    </div>
  );
};

export default LayoutUI;
