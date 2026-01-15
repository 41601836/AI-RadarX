// 用户组合持久化存储 - 使用 Zustand 配合 persist 中间件
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';


// 模拟持仓接口
export interface PortfolioPosition {
  stockCode: string;
  stockName: string;
  shares: number;
  availableShares: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossRate: number;
}

// 自选股接口
export interface WatchlistItem {
  stockCode: string;
  stockName: string;
  addTime: number;
}

// 风险偏好接口
export interface RiskPreference {
  level: 'low' | 'medium' | 'high';
  maxSingleStockPosition: number; // 最大单票持仓比例
  maxDrawdown: number; // 最大回撤容忍度
  stopLossRatio: number; // 默认止损比例
  stopProfitRatio: number; // 默认止盈比例
}

// 定义活动标签类型
export type ActiveTab = 'dashboard' | 'market' | 'trade' | 'strategy' | 'assets' | 'settings';

// 看板布局接口
export interface DashboardLayout {
  isSidebarCollapsed: boolean;
  cardLayout: Record<string, any>; // 存储卡片布局配置
  // 可以添加更多布局相关的字段
}

// 用户组合状态接口
export interface UserPortfolioState {
  // 模拟持仓
  positions: PortfolioPosition[];
  availableCash: number;
  totalMarketValue: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  
  // 自选股列表
  watchlist: WatchlistItem[];
  
  // 风险偏好设置
  riskPreference: RiskPreference;
  
  // 当前活动标签
  activeTab: ActiveTab;
  
  // 看板布局
  dashboardLayout: DashboardLayout;
  
  // 操作方法
  // 持仓操作
  addPosition: (position: PortfolioPosition) => void;
  updatePosition: (stockCode: string, updates: Partial<PortfolioPosition>) => void;
  removePosition: (stockCode: string) => void;
  clearPositions: () => void;
  
  // 自选股操作
  addToWatchlist: (stockCode: string, stockName: string) => void;
  removeFromWatchlist: (stockCode: string) => void;
  clearWatchlist: () => void;
  
  // 风险偏好操作
  updateRiskPreference: (preference: Partial<RiskPreference>) => void;
  
  // 现金操作
  updateAvailableCash: (amount: number) => void;
  
  // 标签操作
  setActiveTab: (tab: ActiveTab) => void;
  
  // 看板布局操作
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateCardLayout: (cardId: string, layout: any) => void;
}

// 默认状态
const defaultState: Omit<UserPortfolioState, keyof { [K in keyof UserPortfolioState as UserPortfolioState[K] extends Function ? K : never]: any }> = {
  positions: [],
  availableCash: 1000000, // 默认10万元现金
  totalMarketValue: 0,
  totalProfitLoss: 0,
  totalProfitLossRate: 0,
  
  watchlist: [],
  
  riskPreference: {
    level: 'medium',
    maxSingleStockPosition: 0.3,
    maxDrawdown: 0.15,
    stopLossRatio: 0.05,
    stopProfitRatio: 0.1
  },
  
  activeTab: 'dashboard', // 默认显示仪表盘
  
  // 看板布局默认值
  dashboardLayout: {
    isSidebarCollapsed: false,
    cardLayout: {}
  }
};

// 静态计算衍生状态的辅助函数
function calculatePortfolioStats(positions: PortfolioPosition[]): {
  totalMarketValue: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
} {
  // 使用静态计算，避免不必要的实时计算
  // 安全处理：确保positions是有效的数组
  if (!Array.isArray(positions)) {
    return {
      totalMarketValue: 0,
      totalProfitLoss: 0,
      totalProfitLossRate: 0
    };
  }
  
  const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalCost = positions.reduce((sum, pos) => sum + pos.shares * pos.averagePrice, 0);
  const totalProfitLoss = totalMarketValue - totalCost;
  const totalProfitLossRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  
  return {
    totalMarketValue,
    totalProfitLoss,
    totalProfitLossRate
  };
}

// 数据备份常量
const BACKUP_KEY = 'ai-trading-terminal-backup';
const MAX_BACKUPS = 5;

// 创建数据备份
const createBackup = (data: any) => {
  try {
    // 确保在浏览器环境中
    if (typeof window === 'undefined') return;
    
    // 获取现有备份
    const backupsStr = localStorage.getItem(BACKUP_KEY);
    const backups = backupsStr ? JSON.parse(backupsStr) : [];
    
    // 添加新备份，包含时间戳
    const newBackup = {
      timestamp: Date.now(),
      data: data.state.watchlist // 只备份关键的watchlist数据
    };
    
    // 保持备份数量不超过最大值
    const updatedBackups = [newBackup, ...backups].slice(0, MAX_BACKUPS);
    
    // 保存备份
    localStorage.setItem(BACKUP_KEY, JSON.stringify(updatedBackups));
    console.log('数据备份创建成功');
  } catch (error) {
    console.error('创建数据备份失败:', error);
  }
};

// 自定义 localStorage 存储实现，增强数据验证、错误处理和备份功能
const safeLocalStorage: PersistStorage<UserPortfolioState> = {
  getItem: (name: string): StorageValue<UserPortfolioState> | null => {
    try {
      // 确保在浏览器环境中
      if (typeof window === 'undefined') return null;
      
      const item = localStorage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item) as StorageValue<UserPortfolioState>;
        // 验证数据结构
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
          // 验证watchlist数据结构
          if (Array.isArray(parsed.state.watchlist)) {
            const validWatchlist = parsed.state.watchlist.filter((item: WatchlistItem) => 
              item && typeof item === 'object' && 
              typeof item.stockCode === 'string' && 
              typeof item.stockName === 'string' && 
              typeof item.addTime === 'number'
            );
            // 如果watchlist数据有损坏，修复它
            if (validWatchlist.length !== parsed.state.watchlist.length) {
              parsed.state.watchlist = validWatchlist;
              localStorage.setItem(name, JSON.stringify(parsed));
            }
          } else {
            // 如果watchlist不是数组，尝试从备份恢复
            const backupsStr = localStorage.getItem(BACKUP_KEY);
            if (backupsStr) {
              const backups = JSON.parse(backupsStr);
              if (backups.length > 0) {
                // 使用最新的备份数据
                parsed.state.watchlist = backups[0].data;
                localStorage.setItem(name, JSON.stringify(parsed));
              } else {
                // 没有备份，重置为默认值
                parsed.state.watchlist = defaultState.watchlist;
                localStorage.setItem(name, JSON.stringify(parsed));
              }
            } else {
              // 没有备份，重置为默认值
              parsed.state.watchlist = defaultState.watchlist;
              localStorage.setItem(name, JSON.stringify(parsed));
            }
          }
          return parsed;
        }
      }
      return null;
    } catch (error) {
      console.error('读取localStorage数据失败:', error);
      // 数据损坏，尝试从备份恢复
      if (typeof window !== 'undefined') {
        const backupsStr = localStorage.getItem(BACKUP_KEY);
        if (backupsStr) {
          try {
            const backups = JSON.parse(backupsStr);
            if (backups.length > 0) {
              // 使用最新的备份数据
              const latestBackup = backups[0];
              const restoredState = {
                ...defaultState,
                watchlist: latestBackup.data
              };
              const restoredData = {
                state: restoredState,
                version: 1
              };
              localStorage.setItem(name, JSON.stringify(restoredData));
              console.log('数据从备份恢复成功');
              return restoredData as StorageValue<UserPortfolioState>;
            }
          } catch (backupError) {
            console.error('从备份恢复数据失败:', backupError);
          }
        }
        // 恢复失败，删除损坏的数据
        localStorage.removeItem(name);
      }
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<UserPortfolioState>) => {
    try {
      // 确保在浏览器环境中
      if (typeof window === 'undefined') return;
      
      const stringValue = JSON.stringify(value);
      localStorage.setItem(name, stringValue);
      
      // 数据更新后创建备份
      if (value && typeof value === 'object' && 'state' in value) {
        createBackup(value);
      }
    } catch (error) {
      console.error('写入localStorage数据失败:', error);
      // 可以在这里添加备选存储方案
    }
  },
  removeItem: (name: string) => {
    // 确保在浏览器环境中
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  }
};

// 创建 store
export const useUserStore = create<UserPortfolioState>()(
  persist(
    (set) => ({
      ...defaultState,
      
      // 持仓操作
      addPosition: (position) => set((state) => {
        // 安全处理：确保positions是有效的数组
        const currentPositions = Array.isArray(state.positions) ? state.positions : [];
        const newPositions = [...currentPositions, position];
        const { totalMarketValue, totalProfitLoss, totalProfitLossRate } = calculatePortfolioStats(newPositions);
        
        return {
          ...state,
          positions: newPositions,
          totalMarketValue,
          totalProfitLoss,
          totalProfitLossRate
        };
      }),
      
      updatePosition: (stockCode, updates) => set((state) => {
        // 安全处理：确保positions是有效的数组
        const currentPositions = Array.isArray(state.positions) ? state.positions : [];
        const newPositions = currentPositions.map(pos => 
          pos.stockCode === stockCode ? { ...pos, ...updates } : pos
        );
        const { totalMarketValue, totalProfitLoss, totalProfitLossRate } = calculatePortfolioStats(newPositions);
        
        return {
          ...state,
          positions: newPositions,
          totalMarketValue,
          totalProfitLoss,
          totalProfitLossRate
        };
      }),
      
      removePosition: (stockCode) => set((state) => {
        // 安全处理：确保positions是有效的数组
        const currentPositions = Array.isArray(state.positions) ? state.positions : [];
        const newPositions = currentPositions.filter(pos => pos.stockCode !== stockCode);
        const { totalMarketValue, totalProfitLoss, totalProfitLossRate } = calculatePortfolioStats(newPositions);
        
        return {
          ...state,
          positions: newPositions,
          totalMarketValue,
          totalProfitLoss,
          totalProfitLossRate
        };
      }),
      
      clearPositions: () => set((state) => {
        const { totalMarketValue, totalProfitLoss, totalProfitLossRate } = calculatePortfolioStats([]);
        
        return {
          ...state,
          positions: [],
          totalMarketValue,
          totalProfitLoss,
          totalProfitLossRate
        };
      }),
      
      // 更新可用现金时，不再重新计算持仓统计
      updateAvailableCash: (amount) => set((state) => ({
        ...state,
        availableCash: amount
      })),
      
      // 自选股操作
      addToWatchlist: (stockCode, stockName) => set((state) => {
        // 安全处理：确保watchlist是有效的数组
        const currentWatchlist = Array.isArray(state.watchlist) ? state.watchlist : [];
        
        // 检查是否已存在
        if (currentWatchlist.some(item => item.stockCode === stockCode)) {
          return state;
        }
        
        return {
          ...state,
          watchlist: [...currentWatchlist, {
            stockCode,
            stockName,
            addTime: Date.now()
          }]
        };
      }),
      
      removeFromWatchlist: (stockCode) => set((state) => {
        // 安全处理：确保watchlist是有效的数组
        const currentWatchlist = Array.isArray(state.watchlist) ? state.watchlist : [];
        
        return {
          ...state,
          watchlist: currentWatchlist.filter(item => item.stockCode !== stockCode)
        };
      }),
      
      clearWatchlist: () => set((state) => ({
        ...state,
        watchlist: []
      })),
      
      // 风险偏好操作
      updateRiskPreference: (preference) => set((state) => ({
        ...state,
        riskPreference: { ...state.riskPreference, ...preference }
      })),
      
      // 标签操作
      setActiveTab: (tab) => set((state) => ({
        ...state,
        activeTab: tab
      })),
      
      // 看板布局操作
      updateDashboardLayout: (layout) => set((state) => ({
        ...state,
        dashboardLayout: {
          ...state.dashboardLayout,
          ...layout
        }
      })),
      
      setSidebarCollapsed: (collapsed) => set((state) => ({
        ...state,
        dashboardLayout: {
          ...state.dashboardLayout,
          isSidebarCollapsed: collapsed
        }
      })),
      
      updateCardLayout: (cardId, layout) => set((state) => ({
        ...state,
        dashboardLayout: {
          ...state.dashboardLayout,
          cardLayout: {
            ...state.dashboardLayout.cardLayout,
            [cardId]: layout
          }
        }
      }))
    }),
    {
      name: 'ai-trading-terminal-user-portfolio', // 持久化存储键名
      version: 1, // 版本号，用于迁移
      storage: safeLocalStorage, // 使用自定义安全存储
      // 数据迁移函数
      migrate: (persistedState: any) => {
        if (!persistedState) {
          return defaultState;
        }
        
        // 确保watchlist存在且是数组
        if (!Array.isArray(persistedState.watchlist)) {
          persistedState.watchlist = defaultState.watchlist;
        }
        
        // 验证和修复watchlist数据
        persistedState.watchlist = persistedState.watchlist.filter((item: any) => 
          item && typeof item === 'object' && 
          typeof item.stockCode === 'string' && 
          typeof item.stockName === 'string' && 
          typeof item.addTime === 'number'
        );
        
        return persistedState;
      }
    }
  )
);

export default useUserStore;