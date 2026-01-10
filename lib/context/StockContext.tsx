'use client';
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { StockBasicInfo } from '../api/market';

interface StockContextType {
  currentTicker: StockBasicInfo | null;
  setCurrentTicker: (ticker: StockBasicInfo | null) => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTicker, setCurrentTicker] = useState<StockBasicInfo | null>(null);

  return (
    <StockContext.Provider value={{ currentTicker, setCurrentTicker }}>
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
