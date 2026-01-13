'use client';
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { StockBasicInfo } from '../api/market';

// 扩展股票基本信息，包含实时价格和涨跌幅
export interface WatchlistStock extends StockBasicInfo {
  currentPrice?: number;
  changePercent?: number;
}

interface StockContextType {
  currentTicker: StockBasicInfo | null;
  setCurrentTicker: (ticker: StockBasicInfo | null) => void;
  watchlist: WatchlistStock[];
  addToWatchlist: (stock: WatchlistStock) => void;
  removeFromWatchlist: (stockCode: string) => void;
  isInWatchlist: (stockCode: string) => boolean;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const WATCHLIST_STORAGE_KEY = 'stock_watchlist';

export const StockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTicker, setCurrentTicker] = useState<StockBasicInfo | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 从localStorage加载自选股 - 只在客户端执行
  useEffect(() => {
    if (!isClient) return;
    
    const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (storedWatchlist) {
      try {
        setWatchlist(JSON.parse(storedWatchlist));
      } catch (error) {
        console.error('Failed to parse watchlist from localStorage:', error);
      }
    }
  }, [isClient]);

  // 保存自选股到localStorage - 只在客户端执行
  useEffect(() => {
    if (!isClient) return;
    
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist, isClient]);

  // 添加股票到自选股
  const addToWatchlist = (stock: WatchlistStock) => {
    if (!isInWatchlist(stock.ts_code)) {
      setWatchlist(prev => [...prev, stock]);
    }
  };

  // 从自选股移除股票
  const removeFromWatchlist = (stockCode: string) => {
    setWatchlist(prev => prev.filter(stock => stock.ts_code !== stockCode));
  };

  // 检查股票是否在自选股中
  const isInWatchlist = (stockCode: string): boolean => {
    return watchlist.some(stock => stock.ts_code === stockCode);
  };

  return (
    <StockContext.Provider 
      value={{ 
        currentTicker, 
        setCurrentTicker, 
        watchlist, 
        addToWatchlist, 
        removeFromWatchlist, 
        isInWatchlist 
      }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStockContext = () => {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStockContext must be used within a StockProvider');
  }
  return context;
};
