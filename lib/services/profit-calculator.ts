// 盈亏计算服务
import { useState, useEffect } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { useUserStore } from '../store/user-portfolio';
import { PortfolioPosition } from '../store/user-portfolio';
import { StockQuote } from '../api/marketService';

// 实时盈亏数据接口
export interface RealTimeProfitData {
  symbol: string;
  currentPrice: number;
  averagePrice: number;
  shares: number;
  marketValue: number;
  cost: number;
  profitLoss: number;
  profitLossRate: number;
  updateTime: number;
}

// 组合盈亏数据接口
export interface PortfolioProfitData {
  positions: RealTimeProfitData[];
  totalMarketValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  availableCash: number;
  netAsset: number;
  updateTime: number;
}

// 盈亏计算器类
export class ProfitCalculator {
  private updateInterval: number = 100; // 默认更新间隔（毫秒）
  private calculationTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: PortfolioProfitData) => void> = new Set();
  
  // 计算单个持仓的实时盈亏
  calculatePositionProfit(position: PortfolioPosition, currentPrice: number): RealTimeProfitData {
    const cost = position.averagePrice * position.shares;
    const marketValue = currentPrice * position.shares;
    const profitLoss = marketValue - cost;
    const profitLossRate = cost > 0 ? (profitLoss / cost) * 100 : 0;
    
    return {
      symbol: position.stockCode,
      currentPrice,
      averagePrice: position.averagePrice,
      shares: position.shares,
      marketValue,
      cost,
      profitLoss,
      profitLossRate,
      updateTime: Date.now()
    };
  }
  
  // 计算整个组合的实时盈亏
  calculatePortfolioProfit(): PortfolioProfitData {
    const userStore = useUserStore.getState();
    const marketStore = useMarketStore.getState();
    
    const { positions, availableCash } = userStore;
    const { quotes } = marketStore.marketData;
    
    // 计算每个持仓的实时盈亏
    const positionProfits = positions.map(position => {
      // 获取实时价格，如果没有则使用持仓的当前价格
      const quote = quotes[position.stockCode];
      const currentPrice = quote ? quote.price : position.currentPrice;
      
      return this.calculatePositionProfit(position, currentPrice);
    });
    
    // 计算组合总盈亏
    const totalMarketValue = positionProfits.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalCost = positionProfits.reduce((sum, pos) => sum + pos.cost, 0);
    const totalProfitLoss = positionProfits.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const totalProfitLossRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
    const netAsset = totalMarketValue + availableCash;
    
    return {
      positions: positionProfits,
      totalMarketValue,
      totalCost,
      totalProfitLoss,
      totalProfitLossRate,
      availableCash,
      netAsset,
      updateTime: Date.now()
    };
  }
  
  // 实时更新单个股票的盈亏数据
  updateSingleStockProfit(stockCode: string, quote: StockQuote): RealTimeProfitData | null {
    const userStore = useUserStore.getState();
    const position = userStore.positions.find(pos => pos.stockCode === stockCode);
    
    if (!position) return null;
    
    return this.calculatePositionProfit(position, quote.price);
  }
  
  // 开始实时计算
  startRealTimeCalculation(interval: number = 100): void {
    // 清除之前的定时器
    if (this.calculationTimer) {
      clearInterval(this.calculationTimer);
    }
    
    this.updateInterval = interval;
    
    // 设置新的定时器
    this.calculationTimer = setInterval(() => {
      const profitData = this.calculatePortfolioProfit();
      this.notifySubscribers(profitData);
    }, this.updateInterval);
    
    console.log(`盈亏实时计算已启动，更新间隔: ${this.updateInterval}ms`);
  }
  
  // 停止实时计算
  stopRealTimeCalculation(): void {
    if (this.calculationTimer) {
      clearInterval(this.calculationTimer);
      this.calculationTimer = null;
      console.log('盈亏实时计算已停止');
    }
  }
  
  // 订阅盈亏更新
  subscribe(callback: (data: PortfolioProfitData) => void): () => void {
    this.subscribers.add(callback);
    
    // 立即发送当前盈亏数据
    callback(this.calculatePortfolioProfit());
    
    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  // 通知所有订阅者
  private notifySubscribers(data: PortfolioProfitData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('盈亏计算订阅者回调错误:', error);
      }
    });
  }
  
  // 获取当前盈亏数据（单次计算）
  getCurrentProfitData(): PortfolioProfitData {
    return this.calculatePortfolioProfit();
  }
  
  // 检查是否正在运行
  isRunning(): boolean {
    return this.calculationTimer !== null;
  }
}

// 导出单例实例
export const profitCalculator = new ProfitCalculator();

// 导出便捷函数
export function useRealTimeProfit() {
  const [profitData, setProfitData] = useState<PortfolioProfitData | null>(null);
  
  useEffect(() => {
    // 订阅盈亏数据
    const unsubscribe = profitCalculator.subscribe(setProfitData);
    
    // 确保实时计算已启动
    if (!profitCalculator.isRunning()) {
      profitCalculator.startRealTimeCalculation();
    }
    
    // 清理函数
    return () => {
      unsubscribe();
    };
  }, []);
  
  return profitData;
}


