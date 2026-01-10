// 模拟持仓与风险监控引擎
import { getTushareDailyData } from '../common/tushare';
import { fetchChipDistribution } from '../chip/distribution';
import { PositionRiskItem } from './assessment';

// 模拟持仓接口
export interface SimulatedPosition {
  stockCode: string;
  stockName: string;
  shares: number; // 持仓股数
  avgCostPrice: number; // 平均成本价（分）
  currentPrice: number; // 当前价（分）
  marketValue: number; // 市值（分）
  profitLoss: number; // 盈亏（分）
  profitLossRatio: number; // 盈亏比例（0-1）
  chipSupportPrice: number; // 筹码支撑价（分）
  stopLossWarning: boolean; // 是否触发止损预警
}

// 模拟账户接口
export interface SimulatedAccount {
  accountId: string;
  totalMarketValue: number; // 账户总市值（分）
  totalAvailableFunds: number; // 可用资金（分）
  totalProfitLoss: number; // 总盈亏（分）
  totalProfitLossRatio: number; // 总盈亏比例（0-1）
  positions: SimulatedPosition[]; // 持仓列表
  activeWarnings: string[]; // 当前活跃的风险预警
}

// 模拟持仓存储（内存模拟，实际项目中可使用持久化存储）
class SimulatedPositionStore {
  private static instance: SimulatedPositionStore;
  private positions: Map<string, SimulatedPosition> = new Map();
  private accountData: SimulatedAccount = {
    accountId: 'sim-acc-001',
    totalMarketValue: 0,
    totalAvailableFunds: 50000000, // 初始可用资金500万（分）
    totalProfitLoss: 0,
    totalProfitLossRatio: 0,
    positions: [],
    activeWarnings: []
  };

  private constructor() {}

  public static getInstance(): SimulatedPositionStore {
    if (!SimulatedPositionStore.instance) {
      SimulatedPositionStore.instance = new SimulatedPositionStore();
    }
    return SimulatedPositionStore.instance;
  }

  /**
   * 模拟买入股票
   * @param stockCode 股票代码
   * @param shares 买入股数
   * @param price 买入价格（分）
   */
  public async buyStock(stockCode: string, shares: number, price: number): Promise<SimulatedPosition> {
    const marketValue = shares * price;
    
    // 检查资金是否充足
    if (marketValue > this.accountData.totalAvailableFunds) {
      throw new Error('可用资金不足');
    }

    try {
      // 获取股票名称和筹码数据
      const [chipData, stockData] = await Promise.all([
        fetchChipDistribution({ stockCode }),
        getTushareDailyData(stockCode, undefined, undefined)
      ]);

      const stockName = chipData.data.stockName;
      const currentPrice = stockData[0]?.close || price;

      // 更新可用资金
      this.accountData.totalAvailableFunds -= marketValue;

      // 如果已持有该股票，更新持仓
      if (this.positions.has(stockCode)) {
        const existingPos = this.positions.get(stockCode)!;
        const totalShares = existingPos.shares + shares;
        const totalCost = existingPos.shares * existingPos.avgCostPrice + shares * price;
        const newAvgCost = Math.round(totalCost / totalShares);
        
        const updatedPos: SimulatedPosition = {
          ...existingPos,
          shares: totalShares,
          avgCostPrice: newAvgCost,
          currentPrice,
          marketValue: totalShares * currentPrice,
          profitLoss: totalShares * (currentPrice - newAvgCost),
          profitLossRatio: (currentPrice - newAvgCost) / newAvgCost,
          chipSupportPrice: chipData.data.supportPrice,
          stopLossWarning: this.checkStopLossWarning(currentPrice, chipData.data.supportPrice)
        };
        
        this.positions.set(stockCode, updatedPos);
        this.updateAccountStats();
        return updatedPos;
      } 
      // 否则创建新持仓
      else {
        const newPos: SimulatedPosition = {
          stockCode,
          stockName,
          shares,
          avgCostPrice: price,
          currentPrice,
          marketValue: shares * currentPrice,
          profitLoss: shares * (currentPrice - price),
          profitLossRatio: (currentPrice - price) / price,
          chipSupportPrice: chipData.data.supportPrice,
          stopLossWarning: this.checkStopLossWarning(currentPrice, chipData.data.supportPrice)
        };
        
        this.positions.set(stockCode, newPos);
        this.updateAccountStats();
        return newPos;
      }
    } catch (error) {
      console.error('买入股票失败:', error);
      throw new Error('买入股票失败');
    }
  }

  /**
   * 模拟卖出股票
   * @param stockCode 股票代码
   * @param shares 卖出股数（全部卖出传0）
   */
  public async sellStock(stockCode: string, shares: number = 0): Promise<void> {
    if (!this.positions.has(stockCode)) {
      throw new Error('未持有该股票');
    }

    const position = this.positions.get(stockCode)!;
    const sellShares = shares === 0 ? position.shares : Math.min(shares, position.shares);
    
    // 获取当前价格
    const stockData = await getTushareDailyData(stockCode);
    const currentPrice = stockData[0]?.close || position.currentPrice;
    const sellAmount = sellShares * currentPrice;

    // 更新可用资金
    this.accountData.totalAvailableFunds += sellAmount;

    // 如果是全部卖出，移除持仓
    if (sellShares === position.shares) {
      this.positions.delete(stockCode);
    } 
    // 否则更新持仓
    else {
      const updatedPos: SimulatedPosition = {
        ...position,
        shares: position.shares - sellShares,
        currentPrice,
        marketValue: (position.shares - sellShares) * currentPrice,
        profitLoss: (position.shares - sellShares) * (currentPrice - position.avgCostPrice),
        profitLossRatio: (currentPrice - position.avgCostPrice) / position.avgCostPrice,
        stopLossWarning: this.checkStopLossWarning(currentPrice, position.chipSupportPrice)
      };
      this.positions.set(stockCode, updatedPos);
    }

    this.updateAccountStats();
  }

  /**
   * 获取模拟账户数据
   */
  public async getAccountData(): Promise<SimulatedAccount> {
    // 更新所有持仓的当前价格和风险状态
    await this.updateAllPositions();
    return this.accountData;
  }

  /**
   * 检查是否触发止损预警
   * @param currentPrice 当前价格（分）
   * @param chipSupportPrice 筹码支撑价（分）
   * @returns 是否触发预警
   */
  private checkStopLossWarning(currentPrice: number, chipSupportPrice: number): boolean {
    // 当股价跌破筹码密集区下沿5%时触发预警
    const threshold = chipSupportPrice * 0.95;
    return currentPrice < threshold;
  }

  /**
   * 更新所有持仓的当前价格和风险状态
   */
  private async updateAllPositions(): Promise<void> {
    const warnings: string[] = [];
    
    for (const [stockCode, position] of this.positions.entries()) {
      try {
        // 获取最新价格和筹码数据
        const [stockData, chipData] = await Promise.all([
          getTushareDailyData(stockCode),
          fetchChipDistribution({ stockCode })
        ]);

        const currentPrice = stockData[0]?.close || position.currentPrice;
        const chipSupportPrice = chipData.data.supportPrice;
        const stopLossWarning = this.checkStopLossWarning(currentPrice, chipSupportPrice);

        // 更新持仓数据
        const updatedPos: SimulatedPosition = {
          ...position,
          currentPrice,
          marketValue: position.shares * currentPrice,
          profitLoss: position.shares * (currentPrice - position.avgCostPrice),
          profitLossRatio: (currentPrice - position.avgCostPrice) / position.avgCostPrice,
          chipSupportPrice,
          stopLossWarning
        };

        this.positions.set(stockCode, updatedPos);

        // 收集风险预警
        if (stopLossWarning) {
          warnings.push(`${position.stockName}(${stockCode})股价已跌破筹码密集区下沿5%，触发高危止损预警`);
        }
      } catch (error) {
        console.error(`更新持仓${stockCode}失败:`, error);
      }
    }

    // 更新风险预警
    this.accountData.activeWarnings = warnings;
    this.updateAccountStats();
  }

  /**
   * 更新账户统计数据
   */
  private updateAccountStats(): void {
    const positions = Array.from(this.positions.values());
    const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalProfitLoss = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.shares * pos.avgCostPrice, 0);
    const totalProfitLossRatio = totalCost > 0 ? totalProfitLoss / totalCost : 0;

    this.accountData = {
      ...this.accountData,
      totalMarketValue,
      totalProfitLoss,
      totalProfitLossRatio,
      positions
    };
  }

  /**
   * 一键清仓所有持仓
   */
  public async clearAllPositions(): Promise<void> {
    const stockCodes = Array.from(this.positions.keys());
    
    for (const stockCode of stockCodes) {
      await this.sellStock(stockCode, 0); // 0表示全部卖出
    }

    this.accountData.activeWarnings = [];
    this.updateAccountStats();
  }
}

// 导出模拟持仓存储实例
export const simulatedPositionStore = SimulatedPositionStore.getInstance();

/**
 * 获取模拟账户数据
 */
export async function getSimulatedAccount(): Promise<SimulatedAccount> {
  return simulatedPositionStore.getAccountData();
}

/**
 * 模拟买入股票
 * @param stockCode 股票代码
 * @param shares 买入股数
 * @param price 买入价格（分）
 */
export async function simulateBuyStock(stockCode: string, shares: number, price: number): Promise<SimulatedPosition> {
  return simulatedPositionStore.buyStock(stockCode, shares, price);
}

/**
 * 模拟卖出股票
 * @param stockCode 股票代码
 * @param shares 卖出股数（全部卖出传0）
 */
export async function simulateSellStock(stockCode: string, shares: number = 0): Promise<void> {
  return simulatedPositionStore.sellStock(stockCode, shares);
}

/**
 * 一键清仓所有持仓
 */
export async function clearAllPositions(): Promise<void> {
  return simulatedPositionStore.clearAllPositions();
}

/**
 * 获取风险预警
 */
export async function getRiskWarnings(): Promise<string[]> {
  const account = await simulatedPositionStore.getAccountData();
  return account.activeWarnings;
}