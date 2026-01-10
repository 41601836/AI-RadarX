// 用户组合持久化存储 - 使用 Zustand 配合 persist 中间件
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 模拟持仓接口
export interface PortfolioPosition {
  stockCode: string;
  stockName: string;
  shares: number;
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
  
  activeTab: 'dashboard' // 默认显示仪表盘
};

// 计算衍生状态
function calculateDerivedState(state: Omit<UserPortfolioState, keyof { [K in keyof UserPortfolioState as UserPortfolioState[K] extends Function ? K : never]: any }>): Omit<UserPortfolioState, keyof { [K in keyof UserPortfolioState as UserPortfolioState[K] extends Function ? K : never]: any }> {
  const totalMarketValue = state.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalCost = state.positions.reduce((sum, pos) => sum + pos.shares * pos.averagePrice, 0);
  const totalProfitLoss = totalMarketValue - totalCost;
  const totalProfitLossRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  
  return {
    ...state,
    totalMarketValue,
    totalProfitLoss,
    totalProfitLossRate
  };
}

// 创建 store
export const useUserStore = create<UserPortfolioState>()(
  persist(
    (set) => ({
      ...defaultState,
      
      // 持仓操作
      addPosition: (position) => set((state) => {
        const newState = calculateDerivedState({
          ...state,
          positions: [...state.positions, position]
        });
        return newState;
      }),
      
      updatePosition: (stockCode, updates) => set((state) => {
        const newState = calculateDerivedState({
          ...state,
          positions: state.positions.map(pos => 
            pos.stockCode === stockCode ? { ...pos, ...updates } : pos
          )
        });
        return newState;
      }),
      
      removePosition: (stockCode) => set((state) => {
        const newState = calculateDerivedState({
          ...state,
          positions: state.positions.filter(pos => pos.stockCode !== stockCode)
        });
        return newState;
      }),
      
      clearPositions: () => set((state) => {
        const newState = calculateDerivedState({
          ...state,
          positions: []
        });
        return newState;
      }),
      
      // 自选股操作
      addToWatchlist: (stockCode, stockName) => set((state) => {
        // 检查是否已存在
        if (!state.watchlist.some(item => item.stockCode === stockCode)) {
          return {
            ...state,
            watchlist: [...state.watchlist, {
              stockCode,
              stockName,
              addTime: Date.now()
            }]
          };
        }
        return state;
      }),
      
      removeFromWatchlist: (stockCode) => set((state) => ({
        ...state,
        watchlist: state.watchlist.filter(item => item.stockCode !== stockCode)
      })),
      
      clearWatchlist: () => set((state) => ({
        ...state,
        watchlist: []
      })),
      
      // 风险偏好操作
      updateRiskPreference: (preference) => set((state) => ({
        ...state,
        riskPreference: { ...state.riskPreference, ...preference }
      })),
      
      // 现金操作
      updateAvailableCash: (amount) => set((state) => {
        const newState = calculateDerivedState({
          ...state,
          availableCash: amount
        });
        return newState;
      }),
      
      // 标签操作
      setActiveTab: (tab) => set((state) => ({
        ...state,
        activeTab: tab
      }))
    }),
    {
      name: 'ai-trading-terminal-user-portfolio', // 持久化存储键名
      version: 1, // 版本号，用于迁移
      // 可以添加其他配置选项
    }
  )
);

export default useUserStore;