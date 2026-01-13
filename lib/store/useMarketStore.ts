// 市场数据状态管理 - 负责自选股和实时行情数据
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { MarketService, StockQuote, MarketIndices } from '../api/marketService';

// 自选股列表项
export interface WatchlistItem {
  symbol: string; // 股票代码
  name: string; // 股票名称
  addedAt: number; // 添加时间
  notes?: string; // 备注
  priceAlerts?: {
    above?: number; // 价格提醒上限
    below?: number; // 价格提醒下限
  };
}

// 市场数据类型定义
export interface MarketData {
  quotes: Record<string, StockQuote>; // symbol -> StockQuote
  indices: MarketIndices | null; // 市场指数
  lastUpdated: number; // 最后更新时间
  isLoading: boolean; // 加载状态
  error: string | null; // 错误信息
}

// 实时数据更新状态
export interface RealtimeStatus {
  isConnected: boolean; // 是否连接
  lastUpdate: number; // 最后更新时间
  updateInterval: number; // 更新间隔（毫秒）
  isSubscribed: boolean; // 是否已订阅
}

// 警报状态
export interface AlertState {
  activeAlerts: Alert[];
  maxAlerts: number;
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'changePercent' | 'volume';
  condition: 'above' | 'below';
  value: number;
  isTriggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}

// 策略模块同步状态
export interface StrategySyncState {
  subscribedStocks: string[]; // 策略模块订阅的股票列表
  lastSyncTime: Record<string, number>; // 股票代码 -> 最后同步时间
  syncInterval: number; // 同步间隔（毫秒）
}

// 持久化状态接口 - 仅包含需要持久化的状态
export interface PersistedMarketState {
  watchlist: WatchlistItem[];
  alertState: AlertState;
  strategySyncState: StrategySyncState;
}

// 市场状态接口
export interface MarketState extends PersistedMarketState {
  // 核心数据
  watchlist: WatchlistItem[]; // 自选股列表
  marketData: MarketData; // 市场数据
  realtimeStatus: RealtimeStatus; // 实时数据状态
  alertState: AlertState; // 警报状态
  strategySyncState: StrategySyncState; // 策略模块同步状态
  
  // 操作方法
  // 自选股管理
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => void;
  clearWatchlist: () => void;
  getWatchlistItem: (symbol: string) => WatchlistItem | undefined;
  
  // 市场数据操作
  fetchQuote: (symbol: string) => Promise<StockQuote | null>;
  fetchQuotes: (symbols: string[]) => Promise<StockQuote[]>;
  fetchIndices: () => Promise<MarketIndices | null>;
  updateQuote: (quote: StockQuote) => void;
  updateQuotes: (quotes: StockQuote[]) => void;
  
  // 实时数据操作
  startRealtimeUpdates: (symbols: string[]) => void;
  stopRealtimeUpdates: () => void;
  setUpdateInterval: (interval: number) => void;
  
  // 警报管理
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'isTriggered'>) => void;
  removeAlert: (alertId: string) => void;
  markAlertTriggered: (alertId: string) => void;
  checkAlerts: () => void;
  clearTriggeredAlerts: () => void;
  
  // 策略模块同步
  subscribeStocksForStrategy: (stockCodes: string[]) => void;
  unsubscribeStocksFromStrategy: (stockCodes: string[]) => void;
  syncMarketDataWithStrategy: () => void;
  getStrategySyncStatus: (stockCode: string) => boolean;
  
  // 状态管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 订阅方法 - 允许外部组件监听状态变化
  subscribeToMarketData: (callback: (data: MarketData) => void) => () => void;
  subscribeToWatchlist: (callback: (watchlist: WatchlistItem[]) => void) => () => void;
  subscribeToAlerts: (callback: (alerts: Alert[]) => void) => () => void;
}

// 订阅者数组 - 用于通知状态变化
const subscribers = {
  marketData: [] as Array<(data: MarketData) => void>,
  watchlist: [] as Array<(watchlist: WatchlistItem[]) => void>,
  alerts: [] as Array<(alerts: Alert[]) => void>,
};

// 自定义 localStorage 存储
const safeLocalStorage: PersistStorage<PersistedMarketState> = {
  getItem: (name: string): StorageValue<PersistedMarketState> | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const item = localStorage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item) as StorageValue<PersistedMarketState>;
        // 验证数据结构
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
          // 确保必要的数组和对象存在
          const state = parsed.state;
          state.watchlist = Array.isArray(state.watchlist) ? state.watchlist : [];
          state.alertState = state.alertState || {
            activeAlerts: [],
            maxAlerts: 50,
          };
          state.strategySyncState = state.strategySyncState || {
            subscribedStocks: [],
            lastSyncTime: {},
            syncInterval: 10000,
          };
          
          return parsed;
        }
      }
      return null;
    } catch (error) {
      console.error('读取市场数据失败:', error);
      return null;
    }
  },
  
  setItem: (name: string, value: StorageValue<PersistedMarketState>) => {
    try {
      if (typeof window === 'undefined') return;
      
      // 在存储前清理过期数据
      if (value && typeof value === 'object' && 'state' in value) {
        const state = value.state;
        
        // 清理过期的警报（超过24小时）
        const oneDayAgo = Date.now() - 86400000;
        if (state.alertState.activeAlerts.length > 0) {
          state.alertState.activeAlerts = state.alertState.activeAlerts.filter(
            alert => alert.isTriggered ? alert.triggeredAt && alert.triggeredAt > oneDayAgo : true
          );
        }
        
        // 限制警报数量
        if (state.alertState.activeAlerts.length > state.alertState.maxAlerts) {
          state.alertState.activeAlerts = state.alertState.activeAlerts
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, state.alertState.maxAlerts);
        }
      }
      
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error('存储市场数据失败:', error);
    }
  },
  
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  }
};

// 创建市场状态 store
export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      // 初始状态
      watchlist: [],
      marketData: {
        quotes: {},
        indices: null,
        lastUpdated: 0,
        isLoading: false,
        error: null,
      },
      realtimeStatus: {
        isConnected: false,
        lastUpdate: 0,
        updateInterval: 5000, // 默认5秒更新一次
        isSubscribed: false,
      },
      alertState: {
        activeAlerts: [],
        maxAlerts: 50,
      },
      strategySyncState: {
        subscribedStocks: [],
        lastSyncTime: {},
        syncInterval: 10000, // 默认10秒同步一次
      },
      
      // 自选股管理
      addToWatchlist: (item: WatchlistItem) => {
        const state = get();
        
        // 检查是否已存在（安全处理：确保watchlist是数组）
        if (Array.isArray(state.watchlist) && state.watchlist.some(w => w.symbol === item.symbol)) {
          console.warn(`股票 ${item.symbol} 已在自选股列表中`);
          return;
        }
        
        set((prevState) => ({
          ...prevState,
          watchlist: Array.isArray(prevState.watchlist) ? [...prevState.watchlist, item] : [item],
        }));
        
        // 通知订阅者
        subscribers.watchlist.forEach(callback => {
          callback(get().watchlist);
        });
        
        // 添加后立即获取行情数据
        get().fetchQuote(item.symbol);
      },
      
      removeFromWatchlist: (symbol: string) => {
        set((prevState) => ({
          ...prevState,
          watchlist: Array.isArray(prevState.watchlist) ? prevState.watchlist.filter(item => item.symbol !== symbol) : [],
          // 同时清理相关的行情数据
          marketData: {
            ...prevState.marketData,
            quotes: Object.fromEntries(
              Object.entries(prevState.marketData.quotes).filter(([key]) => key !== symbol)
            ),
          },
          // 清理相关的警报（安全处理：确保activeAlerts是数组）
          alertState: {
            ...prevState.alertState,
            activeAlerts: Array.isArray(prevState.alertState.activeAlerts) ? prevState.alertState.activeAlerts.filter(alert => alert.symbol !== symbol) : [],
          },
        }));
        
        // 通知订阅者
        subscribers.watchlist.forEach(callback => {
          callback(get().watchlist);
        });
        
        subscribers.marketData.forEach(callback => {
          callback(get().marketData);
        });
        
        // 从策略模块订阅列表中移除
        get().unsubscribeStocksFromStrategy([symbol]);
      },
      
      updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => {
        set((prevState) => ({
          ...prevState,
          // 安全处理：确保watchlist是数组
          watchlist: Array.isArray(prevState.watchlist) ? prevState.watchlist.map(item => 
            item.symbol === symbol ? { ...item, ...updates } : item
          ) : [],
        }));
        
        // 通知订阅者
        subscribers.watchlist.forEach(callback => {
          callback(get().watchlist);
        });
      },
      
      clearWatchlist: () => {
        set((prevState) => ({
          ...prevState,
          watchlist: [],
          marketData: {
            ...prevState.marketData,
            quotes: {},
          },
          alertState: {
            ...prevState.alertState,
            activeAlerts: [],
          },
        }));
        
        // 通知订阅者
        subscribers.watchlist.forEach(callback => {
          callback(get().watchlist);
        });
        
        subscribers.marketData.forEach(callback => {
          callback(get().marketData);
        });
        
        // 清除策略模块订阅
        get().unsubscribeStocksFromStrategy(get().strategySyncState.subscribedStocks);
      },
      
      getWatchlistItem: (symbol: string) => {
        const state = get();
        return Array.isArray(state.watchlist) ? state.watchlist.find(item => item.symbol === symbol) : undefined;
      },
      
      // 市场数据操作
      fetchQuote: async (symbol: string) => {
        try {
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: true,
              error: null,
            },
          }));
          
          const quote = await MarketService.getStockQuote(symbol);
          
          if (quote) {
            set((prevState) => ({
              ...prevState,
              marketData: {
                ...prevState.marketData,
                quotes: {
                  ...prevState.marketData.quotes,
                  [symbol]: quote,
                },
                lastUpdated: Date.now(),
                isLoading: false,
              },
            }));
            
            // 通知订阅者
            subscribers.marketData.forEach(callback => {
              callback(get().marketData);
            });
            
            // 检查警报
            get().checkAlerts();
            
            return quote;
          } else {
            throw new Error(`获取股票 ${symbol} 行情失败`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          console.error(`获取股票 ${symbol} 行情失败:`, errorMessage);
          
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: false,
              error: errorMessage,
            },
          }));
          
          return null;
        }
      },
      
      fetchQuotes: async (symbols: string[]) => {
        try {
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: true,
              error: null,
            },
          }));
          
          const quotesMap = await MarketService.getBatchStockQuotes(symbols);
          
          if (quotesMap && Object.keys(quotesMap).length > 0) {
            set((prevState) => ({
              ...prevState,
              marketData: {
                ...prevState.marketData,
                quotes: {
                  ...prevState.marketData.quotes,
                  ...quotesMap,
                },
                lastUpdated: Date.now(),
                isLoading: false,
              },
            }));
            
            // 通知订阅者
            subscribers.marketData.forEach(callback => {
              callback(get().marketData);
            });
            
            // 检查警报
            get().checkAlerts();
            
            return Object.values(quotesMap);
          } else {
            throw new Error('获取股票行情数据失败');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          console.error(`批量获取股票行情失败:`, errorMessage);
          
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: false,
              error: errorMessage,
            },
          }));
          
          return [];
        }
      },
      
      fetchIndices: async () => {
        try {
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: true,
              error: null,
            },
          }));
          
          const indices = await MarketService.getMarketIndices();
          
          if (indices) {
            set((prevState) => ({
              ...prevState,
              marketData: {
                ...prevState.marketData,
                indices,
                lastUpdated: Date.now(),
                isLoading: false,
              },
            }));
            
            // 通知订阅者
            subscribers.marketData.forEach(callback => {
              callback(get().marketData);
            });
            
            return indices;
          } else {
            throw new Error('获取市场指数失败');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          console.error(`获取市场指数失败:`, errorMessage);
          
          set((prevState) => ({
            ...prevState,
            marketData: {
              ...prevState.marketData,
              isLoading: false,
              error: errorMessage,
            },
          }));
          
          return null;
        }
      },
      
      updateQuote: (quote: StockQuote) => {
        set((prevState) => ({
          ...prevState,
          marketData: {
            ...prevState.marketData,
            quotes: {
              ...prevState.marketData.quotes,
              [quote.symbol]: quote,
            },
            lastUpdated: Date.now(),
          },
        }));
        
        // 通知订阅者
        subscribers.marketData.forEach(callback => {
          callback(get().marketData);
        });
        
        // 检查警报
        get().checkAlerts();
      },
      
      updateQuotes: (quotes: StockQuote[]) => {
        // 安全处理：确保quotes是有效的数组
        if (!Array.isArray(quotes) || quotes.length === 0) return;
        
        const quotesMap = quotes.reduce((acc, quote) => {
          acc[quote.symbol] = quote;
          return acc;
        }, {} as Record<string, StockQuote>);
        
        set((prevState) => ({
          ...prevState,
          marketData: {
            ...prevState.marketData,
            quotes: {
              ...prevState.marketData.quotes,
              ...quotesMap,
            },
            lastUpdated: Date.now(),
          },
        }));
        
        // 通知订阅者
        subscribers.marketData.forEach(callback => {
          callback(get().marketData);
        });
        
        // 检查警报
        get().checkAlerts();
      },
      
      // 实时数据操作
      startRealtimeUpdates: (symbols: string[]) => {
        const state = get();
        
        // 检查是否已在更新
        if (state.realtimeStatus.isSubscribed) {
          console.log('实时更新已在运行中');
          return;
        }
        
        // 设置连接状态
        set((prevState) => ({
          ...prevState,
          realtimeStatus: {
            ...prevState.realtimeStatus,
            isConnected: true,
            isSubscribed: true,
            lastUpdate: Date.now(),
          },
        }));
        
        console.log(`开始实时更新 ${symbols.length} 只股票`);
        
        // 立即获取一次数据
        get().fetchQuotes(symbols);
        
        // 设置定时更新
        const intervalId = setInterval(() => {
          const currentState = get();
          
          // 如果没有订阅状态或已被取消，则清除定时器
          if (!currentState.realtimeStatus.isSubscribed) {
            clearInterval(intervalId);
            return;
          }
          
          // 批量获取行情数据
          currentState.realtimeStatus.isSubscribed && get().fetchQuotes(symbols);
          
          // 同步到策略模块
          get().syncMarketDataWithStrategy();
        }, state.realtimeStatus.updateInterval);
        
        // 保存定时器ID到全局，以便在页面卸载时清理
        if (typeof window !== 'undefined') {
          window.__marketDataInterval = intervalId;
        }
      },
      
      stopRealtimeUpdates: () => {
        const state = get();
        
        if (!state.realtimeStatus.isSubscribed) {
          console.log('实时更新未在运行');
          return;
        }
        
        // 清除定时器
        if (typeof window !== 'undefined' && window.__marketDataInterval) {
          clearInterval(window.__marketDataInterval);
          window.__marketDataInterval = undefined;
        }
        
        // 更新状态
        set((prevState) => ({
          ...prevState,
          realtimeStatus: {
            ...prevState.realtimeStatus,
            isConnected: false,
            isSubscribed: false,
          },
        }));
        
        console.log('已停止实时更新');
      },
      
      setUpdateInterval: (interval: number) => {
        // 限制最小更新间隔为1秒
        const safeInterval = Math.max(1000, interval);
        
        set((prevState) => ({
          ...prevState,
          realtimeStatus: {
            ...prevState.realtimeStatus,
            updateInterval: safeInterval,
          },
        }));
        
        // 如果正在运行实时更新，则重启以应用新的间隔
        const state = get();
        if (state.realtimeStatus.isSubscribed) {
          // 获取当前订阅的股票列表
          const subscribedStocks = Object.keys(state.marketData.quotes);
          
          // 停止并重启更新
          get().stopRealtimeUpdates();
          get().startRealtimeUpdates(subscribedStocks);
        }
      },
      
      // 警报管理
      addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'isTriggered'>) => {
        const state = get();
        
        // 检查警报数量限制（安全处理：确保activeAlerts是数组）
        if (Array.isArray(state.alertState.activeAlerts) && state.alertState.activeAlerts.length >= state.alertState.maxAlerts) {
          console.warn(`警报数量已达上限 (${state.alertState.maxAlerts})`);
          return;
        }
        
        // 生成新警报
        const newAlert: Alert = {
          ...alert,
          id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: Date.now(),
          isTriggered: false,
        };
        
        set((prevState) => ({
          ...prevState,
          alertState: {
            ...prevState.alertState,
            activeAlerts: Array.isArray(prevState.alertState.activeAlerts) ? [...prevState.alertState.activeAlerts, newAlert] : [newAlert],
          },
        }));
        
        // 通知订阅者
        subscribers.alerts.forEach(callback => {
          callback(get().alertState.activeAlerts);
        });
      },
      
      removeAlert: (alertId: string) => {
        set((prevState) => ({
          ...prevState,
          alertState: {
            ...prevState.alertState,
            activeAlerts: Array.isArray(prevState.alertState.activeAlerts) ? prevState.alertState.activeAlerts.filter(alert => alert.id !== alertId) : [],
          },
        }));
        
        // 通知订阅者
        subscribers.alerts.forEach(callback => {
          callback(get().alertState.activeAlerts);
        });
      },
      
      markAlertTriggered: (alertId: string) => {
        set((prevState) => ({
          ...prevState,
          alertState: {
            ...prevState.alertState,
            activeAlerts: Array.isArray(prevState.alertState.activeAlerts) ? prevState.alertState.activeAlerts.map(alert =>
              alert.id === alertId ? { ...alert, isTriggered: true, triggeredAt: Date.now() } : alert
            ) : [],
          },
        }));
        
        // 通知订阅者
        subscribers.alerts.forEach(callback => {
          callback(get().alertState.activeAlerts);
        });
      },
      
      checkAlerts: () => {
        const state = get();
        // 安全处理：确保activeAlerts是数组
        const alerts = Array.isArray(state.alertState.activeAlerts) ? state.alertState.activeAlerts : [];
        
        if (alerts.length === 0) return;
        
        const quotes = state.marketData.quotes;
        
        alerts.forEach(alert => {
          // 跳过已触发的警报
          if (alert.isTriggered) return;
          
          const quote = quotes[alert.symbol];
          if (!quote) return;
          
          let shouldTrigger = false;
          
          switch (alert.type) {
            case 'price':
              if (alert.condition === 'above' && quote.price > alert.value) {
                shouldTrigger = true;
              } else if (alert.condition === 'below' && quote.price < alert.value) {
                shouldTrigger = true;
              }
              break;
              
            case 'changePercent':
              if (alert.condition === 'above' && quote.changePercent > alert.value) {
                shouldTrigger = true;
              } else if (alert.condition === 'below' && quote.changePercent < alert.value) {
                shouldTrigger = true;
              }
              break;
              
            case 'volume':
              if (alert.condition === 'above' && quote.volume > alert.value) {
                shouldTrigger = true;
              } else if (alert.condition === 'below' && quote.volume < alert.value) {
                shouldTrigger = true;
              }
              break;
          }
          
          if (shouldTrigger) {
            get().markAlertTriggered(alert.id);
            
            // 发送通知（如果浏览器支持）
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(`股票警报: ${alert.symbol}`, {
                  body: `${alert.symbol} 价格${alert.condition === 'above' ? '超过' : '跌破'} ${alert.value}`,
                  icon: '/favicon.ico',
                });
              }
            }
            
            // 播放提示音（可选）
            try {
              const audio = new Audio('/alert-sound.mp3');
              audio.play().catch(() => {
                // 忽略音频播放错误
              });
            } catch (e) {
              // 忽略音频错误
            }
          }
        });
      },
      
      clearTriggeredAlerts: () => {
        set((prevState) => ({
          ...prevState,
          alertState: {
            ...prevState.alertState,
            activeAlerts: Array.isArray(prevState.alertState.activeAlerts) ? prevState.alertState.activeAlerts.filter(alert => !alert.isTriggered) : [],
          },
        }));
        
        // 通知订阅者
        subscribers.alerts.forEach(callback => {
          callback(get().alertState.activeAlerts);
        });
      },
      
      // 策略模块同步
      subscribeStocksForStrategy: (stockCodes: string[]) => {
        set((prevState) => {
          // 合并订阅列表，避免重复
          const existingStocks = new Set(prevState.strategySyncState.subscribedStocks);
          stockCodes.forEach(code => existingStocks.add(code));
          
          return {
            ...prevState,
            strategySyncState: {
              ...prevState.strategySyncState,
              subscribedStocks: Array.from(existingStocks),
            },
          };
        });
        
        console.log(`策略模块已订阅 ${stockCodes.length} 只股票:`, stockCodes.join(', '));
        
        // 启动实时更新
        const subscribedStocks = get().strategySyncState.subscribedStocks;
        if (subscribedStocks.length > 0) {
          get().startRealtimeUpdates(subscribedStocks);
        }
      },
      
      unsubscribeStocksFromStrategy: (stockCodes: string[]) => {
        const symbolsToRemove = new Set(stockCodes);
        
        set((prevState) => ({
          ...prevState,
          strategySyncState: {
            ...prevState.strategySyncState,
            subscribedStocks: prevState.strategySyncState.subscribedStocks.filter(
              code => !symbolsToRemove.has(code)
            ),
          },
        }));
        
        console.log(`策略模块已取消订阅 ${stockCodes.length} 只股票:`, stockCodes.join(', '));
        
        // 如果没有订阅的股票，则停止实时更新
        const state = get();
        if (state.strategySyncState.subscribedStocks.length === 0 && state.realtimeStatus.isSubscribed) {
          get().stopRealtimeUpdates();
        }
      },
      
      syncMarketDataWithStrategy: () => {
        const state = get();
        const subscribedStocks = state.strategySyncState.subscribedStocks;
        
        if (subscribedStocks.length === 0) return;
        
        const now = Date.now();
        const syncInterval = state.strategySyncState.syncInterval;
        
        // 筛选需要同步的股票
        const stocksToSync = subscribedStocks.filter(stockCode => {
          const lastSync = state.strategySyncState.lastSyncTime[stockCode] || 0;
          return now - lastSync >= syncInterval;
        });
        
        if (stocksToSync.length === 0) return;
        
        console.log(`同步 ${stocksToSync.length} 只股票的市场数据到策略模块`);
        
        // 更新最后同步时间
        set((prevState) => ({
          ...prevState,
          strategySyncState: {
            ...prevState.strategySyncState,
            lastSyncTime: {
              ...prevState.strategySyncState.lastSyncTime,
              ...stocksToSync.reduce((acc, stockCode) => {
                acc[stockCode] = now;
                return acc;
              }, {} as Record<string, number>),
            },
          },
        }));
        
        // 在实际应用中，这里会触发策略模块的更新
        // 例如通过事件系统或直接调用策略模块的方法
        
        // 模拟事件通知
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('marketDataSync', {
            detail: {
              symbols: stocksToSync,
              quotes: stocksToSync.reduce((acc, symbol) => {
                if (state.marketData.quotes[symbol]) {
                  acc[symbol] = state.marketData.quotes[symbol];
                }
                return acc;
              }, {} as Record<string, StockQuote>),
              timestamp: now,
            },
          });
          
          window.dispatchEvent(event);
        }
      },
      
      getStrategySyncStatus: (stockCode: string) => {
        const state = get();
        return state.strategySyncState.subscribedStocks.includes(stockCode);
      },
      
      // 状态管理
      setLoading: (isLoading: boolean) => {
        set((prevState) => ({
          ...prevState,
          marketData: {
            ...prevState.marketData,
            isLoading,
          },
        }));
      },
      
      setError: (error: string | null) => {
        set((prevState) => ({
          ...prevState,
          marketData: {
            ...prevState.marketData,
            error,
          },
        }));
      },
      
      clearError: () => {
        get().setError(null);
      },
      
      // 订阅方法
      subscribeToMarketData: (callback: (data: MarketData) => void) => {
        // 添加回调到订阅者数组
        subscribers.marketData.push(callback);
        
        // 立即调用一次以获取当前数据
        callback(get().marketData);
        
        // 返回取消订阅函数
        return () => {
          const index = subscribers.marketData.indexOf(callback);
          if (index !== -1) {
            subscribers.marketData.splice(index, 1);
          }
        };
      },
      
      subscribeToWatchlist: (callback: (watchlist: WatchlistItem[]) => void) => {
        // 添加回调到订阅者数组
        subscribers.watchlist.push(callback);
        
        // 立即调用一次以获取当前数据
        callback(get().watchlist);
        
        // 返回取消订阅函数
        return () => {
          const index = subscribers.watchlist.indexOf(callback);
          if (index !== -1) {
            subscribers.watchlist.splice(index, 1);
          }
        };
      },
      
      subscribeToAlerts: (callback: (alerts: Alert[]) => void) => {
        // 添加回调到订阅者数组
        subscribers.alerts.push(callback);
        
        // 立即调用一次以获取当前数据
        callback(get().alertState.activeAlerts);
        
        // 返回取消订阅函数
        return () => {
          const index = subscribers.alerts.indexOf(callback);
          if (index !== -1) {
            subscribers.alerts.splice(index, 1);
          }
        };
      },
    }),
    {
      name: 'market-store', // 本地存储的键名
      storage: safeLocalStorage,
      partialize: (state) => ({
        // 只持久化需要保存的状态部分
        watchlist: state.watchlist,
        alertState: state.alertState,
        strategySyncState: state.strategySyncState,
      }),
    }
  )
);

// 导出定时器ID的类型声明
declare global {
  interface Window {
    __marketDataInterval?: NodeJS.Timeout;
  }
}