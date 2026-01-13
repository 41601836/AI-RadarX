import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 数据类型定义
export interface ChipDistributionData {
  price: number;
  chipRatio: number;
  holderCount: number;
}

export interface WADIndicatorData {
  wad: number;
  price: number;
  volume: number;
  timestamp: string;
}

export interface LargeOrderSummary {
  totalNetBuy: number;
  totalNetSell: number;
  largeOrderCount: number;
  averageOrderSize: number;
}

export interface TacticalState {
  chipData: ChipDistributionData[];
  wadData: WADIndicatorData[];
  largeOrderSummary: LargeOrderSummary | null;
  supportPrice: number | null;
  resistancePrice: number | null;
  suggestedStopLoss: number | null;
  lastPrice: number | null;
  priceBlink: 'up' | 'down' | 'none';
}

export interface DisclosureData {
  date: string;
  type: string;
  title: string;
  content: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface RiskMetrics {
  var: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export interface PriceAlert {
  id: string;
  price: number;
  type: 'above' | 'below';
  triggered: boolean;
  timestamp: string;
}

// Store 状态接口
interface ChipState {
  // 核心数据
  tacticalState: TacticalState;
  disclosureData: DisclosureData[];
  riskMetrics: RiskMetrics | null;
  largeOrderData: any[];
  priceAlerts: PriceAlert[];
  
  // 控制状态
  loading: boolean;
  lastUpdate: string;
  isVisible: boolean;
  
  // 轮询配置
  pollInterval: number;
  isPolling: boolean;
  
  // 当前股票
  currentStockCode: string | null;
  
  // Actions
  setStockCode: (stockCode: string) => void;
  updateTacticalState: (state: Partial<TacticalState>) => void;
  updateDisclosureData: (data: DisclosureData[]) => void;
  updateRiskMetrics: (metrics: RiskMetrics) => void;
  updateLargeOrderData: (data: any[]) => void;
  addPriceAlert: (alert: PriceAlert) => void;
  removePriceAlert: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setVisible: (visible: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  fetchData: () => Promise<void>;
  clearData: () => void;
}

// 默认状态
const defaultTacticalState: TacticalState = {
  chipData: [],
  wadData: [],
  largeOrderSummary: null,
  supportPrice: null,
  resistancePrice: null,
  suggestedStopLoss: null,
  lastPrice: null,
  priceBlink: 'none'
};

const defaultState: Omit<ChipState, keyof { [K in keyof ChipState as ChipState[K] extends Function ? K : never]: any }> = {
  tacticalState: defaultTacticalState,
  disclosureData: [],
  riskMetrics: null,
  largeOrderData: [],
  priceAlerts: [],
  loading: false,
  lastUpdate: '',
  isVisible: true,
  pollInterval: 30000, // 30秒
  isPolling: false,
  currentStockCode: null,
};

// 计算建议止损位
function calculateStopLoss(
  supportPrice: number | null,
  resistancePrice: number | null,
  wadData: WADIndicatorData[]
): number | null {
  if (!supportPrice || !resistancePrice) return null;
  
  const priceRange = resistancePrice - supportPrice;
  const stopLossLevel = supportPrice - (priceRange * 0.1); // 支撑位下方10%
  
  return Math.round(stopLossLevel);
}

// 生成价格提醒
function generatePriceAlerts(
  supportPrice: number | null,
  resistancePrice: number | null,
  currentPrice: number | null
): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  
  if (supportPrice && currentPrice) {
    alerts.push({
      id: `support_${supportPrice}`,
      price: supportPrice,
      type: 'below',
      triggered: currentPrice <= supportPrice,
      timestamp: new Date().toISOString(),
    });
  }
  
  if (resistancePrice && currentPrice) {
    alerts.push({
      id: `resistance_${resistancePrice}`,
      price: resistancePrice,
      type: 'above',
      triggered: currentPrice >= resistancePrice,
      timestamp: new Date().toISOString(),
    });
  }
  
  return alerts;
}

// 计算平均成本
export function calculateAverageCost(data: ChipDistributionData[]): number {
  if (data.length === 0) return 0;
  
  let totalValue = 0;
  let totalVolume = 0;
  
  for (const item of data) {
    // 使用chipRatio作为权重计算
    const volume = item.price * item.chipRatio;
    totalValue += item.price * volume;
    totalVolume += volume;
  }
  
  return totalVolume > 0 ? totalValue / totalVolume : 0;
}

// 计算筹码集中度
export function calculateConcentration(data: ChipDistributionData[]): number {
  if (data.length === 0) return 0;
  
  // 使用HHI指数计算集中度
  let hhi = 0.0;
  for (const item of data) {
    const percentage = parseFloat(item.chipRatio.toFixed(10)); // 提高精度
    hhi += percentage * percentage;
  }
  
  return hhi;
}

// 模拟API调用函数
async function fetchChipDistributionData(stockCode: string): Promise<ChipDistributionData[]> {
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 生成模拟数据
  const basePrice = 850;
  const data: ChipDistributionData[] = [];
  
  for (let i = 0; i < 20; i++) {
    const price = basePrice + (Math.random() - 0.5) * 100;
    data.push({
      price: Math.round(price),
      chipRatio: Math.random() * 0.1,
      holderCount: Math.floor(Math.random() * 50000),
    });
  }
  
  return data.sort((a, b) => b.chipRatio - a.chipRatio);
}

async function fetchWADData(stockCode: string): Promise<WADIndicatorData[]> {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const data: WADIndicatorData[] = [];
  let wad = 0;
  let price = 850;
  
  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.5) * 20;
    price += change;
    
    // 简化的WAD计算
    wad += Math.max(0, change) * Math.random();
    
    data.push({
      wad: Math.round(wad),
      price: Math.round(price),
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return data;
}

async function fetchDisclosureData(stockCode: string): Promise<DisclosureData[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return [
    {
      date: '2026-01-10',
      type: '公告',
      title: '公司发布2025年度业绩预告',
      content: '预计净利润同比增长15%',
      impact: 'positive'
    },
    {
      date: '2026-01-08',
      type: '公告',
      title: '股份回购计划启动',
      content: '计划回购不超过2%股份',
      impact: 'positive'
    }
  ];
}

async function fetchRiskMetrics(stockCode: string): Promise<RiskMetrics> {
  await new Promise(resolve => setTimeout(resolve, 120));
  
  return {
    var: Math.random() * 10000,
    sharpeRatio: 1.2 + Math.random(),
    maxDrawdown: Math.random() * 0.2,
    volatility: 0.15 + Math.random() * 0.1,
  };
}

async function fetchLargeOrderData(stockCode: string): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 180));
  
  return [
    {
      time: '14:30:00',
      price: 850,
      volume: 100000,
      direction: 'buy',
      amount: 8500000
    },
    {
      time: '14:25:00',
      price: 848,
      volume: 80000,
      direction: 'sell',
      amount: 6784000
    }
  ];
}

// 主Store实现
export const useChipStore = create<ChipState>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,
    
    // 设置股票代码
    setStockCode: (stockCode: string) => {
      set((state) => ({
        ...state,
        currentStockCode: stockCode,
      }));
      
      // 设置新股票后立即获取数据
      get().fetchData();
    },
    
    // 更新战术状态
    updateTacticalState: (newState: Partial<TacticalState>) => {
      set((state) => ({
        ...state,
        tacticalState: {
          ...state.tacticalState,
          ...newState,
        },
      }));
    },
    
    // 更新信息披露数据
    updateDisclosureData: (data: DisclosureData[]) => {
      set((state) => ({
        ...state,
        disclosureData: data,
        lastUpdate: new Date().toLocaleString(),
      }));
    },
    
    // 更新风险指标
    updateRiskMetrics: (metrics: RiskMetrics) => {
      set((state) => ({
        ...state,
        riskMetrics: metrics,
      }));
    },
    
    // 更新大单数据
    updateLargeOrderData: (data: any[]) => {
      set((state) => ({
        ...state,
        largeOrderData: data,
      }));
    },
    
    // 添加价格提醒
    addPriceAlert: (alert: PriceAlert) => {
      set((state) => ({
        ...state,
        priceAlerts: [...state.priceAlerts, alert],
      }));
    },
    
    // 移除价格提醒
    removePriceAlert: (id: string) => {
      set((state) => ({
        ...state,
        priceAlerts: state.priceAlerts.filter(alert => alert.id !== id),
      }));
    },
    
    // 设置加载状态
    setLoading: (loading: boolean) => {
      set((state) => ({
        ...state,
        loading,
      }));
    },
    
    // 设置可见性
    setVisible: (visible: boolean) => {
      set((state) => ({
        ...state,
        isVisible: visible,
      }));
      
      // 当组件变为可见时，立即刷新数据
      if (visible) {
        get().fetchData();
      }
    },
    
    // 开始轮询
    startPolling: () => {
      set((state) => ({
        ...state,
        isPolling: true,
      }));
    },
    
    // 停止轮询
    stopPolling: () => {
      set((state) => ({
        ...state,
        isPolling: false,
      }));
    },
    
    // 获取数据
    fetchData: async () => {
      const state = get();
      if (!state.currentStockCode || state.loading) return;
      
      try {
        state.setLoading(true);
        
        // 并行获取所有数据
        const [
          chipData,
          wadData,
          disclosureData,
          riskMetrics,
          largeOrderData
        ] = await Promise.all([
          fetchChipDistributionData(state.currentStockCode),
          fetchWADData(state.currentStockCode),
          fetchDisclosureData(state.currentStockCode),
          fetchRiskMetrics(state.currentStockCode),
          fetchLargeOrderData(state.currentStockCode)
        ]);
        
        // 计算支撑阻力位
        const sortedChipData = chipData.sort((a, b) => a.price - b.price);
        const supportPrice = sortedChipData[0]?.price || null;
        const resistancePrice = sortedChipData[sortedChipData.length - 1]?.price || null;
        
        // 计算建议止损位
        const suggestedStopLoss = calculateStopLoss(supportPrice, resistancePrice, wadData);
        
        // 生成价格提醒
        const currentPrice = wadData[wadData.length - 1]?.price || null;
        const priceAlerts = generatePriceAlerts(supportPrice, resistancePrice, currentPrice);
        
        // 更新状态
        state.updateTacticalState({
          chipData,
          wadData,
          largeOrderSummary: {
            totalNetBuy: Math.random() * 10000000,
            totalNetSell: Math.random() * 8000000,
            largeOrderCount: Math.floor(Math.random() * 50) + 10,
            averageOrderSize: Math.random() * 5000000,
          },
          supportPrice,
          resistancePrice,
          suggestedStopLoss,
          lastPrice: currentPrice,
          priceBlink: Math.random() > 0.5 ? 'up' : 'down',
        });
        
        state.updateDisclosureData(disclosureData);
        state.updateRiskMetrics(riskMetrics);
        state.updateLargeOrderData(largeOrderData);
        
        // 清除旧的价格提醒，添加新的
        state.priceAlerts.forEach(alert => state.removePriceAlert(alert.id));
        priceAlerts.forEach(alert => state.addPriceAlert(alert));
        
      } catch (error) {
        console.error('获取筹码分布数据失败:', error);
      } finally {
        state.setLoading(false);
      }
    },
    
    // 清除数据
    clearData: () => {
      set((state) => ({
        ...state,
        tacticalState: defaultTacticalState,
        disclosureData: [],
        riskMetrics: null,
        largeOrderData: [],
        priceAlerts: [],
        lastUpdate: '',
      }));
    },
  }))
);

// 轮询管理
let pollTimer: NodeJS.Timeout | null = null;

export const startChipPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  
  pollTimer = setInterval(() => {
    const state = useChipStore.getState();
    if (state.isPolling && state.isVisible && state.currentStockCode) {
      state.fetchData();
    }
  }, 30000); // 30秒轮询
};

export const stopChipPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

// 页面可见性管理
export const initChipVisibilityManager = () => {
  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    useChipStore.getState().setVisible(isVisible);
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  handleVisibilityChange(); // 初始化时调用一次
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};