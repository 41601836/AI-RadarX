// StrategyBacktester 策略回测引擎
import { getTushareDailyData, convertTushareDailyToOHLCV } from '../api/common/tushare';
import { calculateCumulativeWAD, generateWADSignals } from './wad';
import { calculateEnhancedChipDistribution } from './chipDistribution';

// K线数据结构
export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

// 回测参数接口
export interface BacktestParams {
  stockCode: string;
  startDate: string;
  endDate?: string;
  initialCapital: number;
  transactionFeeRate: number;
  wadThreshold: number;
}

// 交易信号接口
export interface TradingSignal {
  timestamp: number;
  signal: 'buy' | 'sell' | 'hold';
  price: number;
  wadValue: number;
  chipDistribution: any;
}

// 交易记录接口
export interface TradeRecord {
  timestamp: number;
  action: 'buy' | 'sell';
  price: number;
  shares: number;
  amount: number;
  fee: number;
  balance: number;
  position: number;
}

// 回测结果接口
export interface BacktestResult {
  stockCode: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  tradeRecords: TradeRecord[];
  performanceData: Array<{ timestamp: number; date: string; capital: number; return: number }>;
  signals: TradingSignal[];
}

// StrategyBacktester 类
export class StrategyBacktester {
  private params: BacktestParams;
  private klineData: KLineData[] = [];
  private signals: TradingSignal[] = [];
  private tradeRecords: TradeRecord[] = [];
  private performanceData: Array<{ timestamp: number; date: string; capital: number; return: number }> = [];

  constructor(params: BacktestParams) {
    this.params = params;
  }

  // 运行回测
  async run(): Promise<BacktestResult> {
    try {
      // 1. 获取历史K线数据
      await this.fetchHistoricalData();
      
      // 2. 计算WAD指标和生成交易信号
      this.generateSignals();
      
      // 3. 模拟交易执行
      this.simulateTrading();
      
      // 4. 计算绩效指标
      return this.calculatePerformance();
    } catch (error) {
      console.error('Backtest failed:', error);
      throw error;
    }
  }

  // 获取历史K线数据
  private async fetchHistoricalData(): Promise<void> {
    const { stockCode, startDate, endDate } = this.params;
    
    // 调用Tushare API获取数据
    const dailyData = await getTushareDailyData(stockCode, startDate, endDate);
    
    // 转换为系统内部格式
    this.klineData = convertTushareDailyToOHLCV(dailyData);
    
    // 按时间排序（确保数据是顺序的）
    this.klineData.sort((a, b) => a.timestamp - b.timestamp);
    
    // 确保至少有30天的数据
    if (this.klineData.length < 30) {
      throw new Error('Insufficient historical data: need at least 30 days');
    }
  }

  // 生成交易信号
  private generateSignals(): void {
    if (this.klineData.length === 0) {
      return;
    }

    // 1. 计算累积WAD指标
    const wadItems = this.klineData.map(item => ({
      timestamp: item.timestamp,
      high: item.high,
      low: item.low,
      close: item.close
    }));

    const wadData = calculateCumulativeWAD(wadItems, { decayRate: 0.1, useExponentialDecay: true });

    // 2. 生成WAD信号
    const rawSignals = generateWADSignals({
      wadData,
      threshold: this.params.wadThreshold
    });

    // 3. 计算筹码分布
    const enhancedChipResult = calculateEnhancedChipDistribution(this.klineData);

    // 4. 合并信号和筹码分布
    this.signals = rawSignals.map((signal, index) => {
      const kline = this.klineData[index];
      const wad = wadData[index];
      
      return {
        timestamp: signal.timestamp,
        signal: signal.signal,
        price: kline.close,
        wadValue: wad.weightedWad,
        chipDistribution: enhancedChipResult.chipDistribution[index] || null
      };
    });
  }

  // 模拟交易执行
  private simulateTrading(): void {
    if (this.klineData.length === 0 || this.signals.length === 0) {
      return;
    }

    let cash = this.params.initialCapital;
    let shares = 0;
    let position = 0;
    let lastPrice = 0;

    // 遍历所有信号，模拟交易
    for (let i = 0; i < this.signals.length; i++) {
      const signal = this.signals[i];
      const kline = this.klineData[i];
      const price = kline.close;
      lastPrice = price;

      // 根据信号执行交易
      if (signal.signal === 'buy' && cash > 0) {
        // 计算可购买的股票数量（整手，100股为一手）
        const availableCash = cash * (1 - this.params.transactionFeeRate);
        const maxShares = Math.floor(availableCash / price / 100) * 100;
        
        if (maxShares > 0) {
          const amount = maxShares * price;
          const fee = amount * this.params.transactionFeeRate;
          
          // 执行买入
          shares += maxShares;
          cash -= (amount + fee);
          position = shares * price;
          
          // 记录交易
          this.tradeRecords.push({
            timestamp: signal.timestamp,
            action: 'buy',
            price,
            shares: maxShares,
            amount,
            fee,
            balance: cash,
            position
          });
        }
      } else if (signal.signal === 'sell' && shares > 0) {
        // 执行卖出
        const amount = shares * price;
        const fee = amount * this.params.transactionFeeRate;
        
        cash += (amount - fee);
        position = 0;
        
        // 记录交易
        this.tradeRecords.push({
          timestamp: signal.timestamp,
          action: 'sell',
          price,
          shares,
          amount,
          fee,
          balance: cash,
          position
        });
        
        shares = 0;
      }

      // 记录每日绩效
      const totalCapital = cash + (shares * price);
      const dailyReturn = i === 0 ? 0 : (totalCapital / this.params.initialCapital - 1) * 100;
      
      this.performanceData.push({
        timestamp: signal.timestamp,
        date: new Date(signal.timestamp).toISOString().split('T')[0],
        capital: totalCapital,
        return: dailyReturn
      });
    }
  }

  // 计算绩效指标
  private calculatePerformance(): BacktestResult {
    const { stockCode, startDate, initialCapital } = this.params;
    const endDate = new Date(this.klineData[this.klineData.length - 1].timestamp).toISOString().split('T')[0];
    
    // 计算最终资金
    const lastPrice = this.klineData[this.klineData.length - 1].close;
    const finalCapital = this.performanceData[this.performanceData.length - 1].capital;
    
    // 计算总收益率
    const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
    
    // 计算年化收益率
    const days = (this.klineData[this.klineData.length - 1].timestamp - this.klineData[0].timestamp) / (1000 * 60 * 60 * 24);
    const annualReturn = (Math.pow((finalCapital / initialCapital), 365 / days) - 1) * 100;
    
    // 计算最大回撤
    let maxDrawdown = 0;
    let peakCapital = initialCapital;
    
    for (const data of this.performanceData) {
      if (data.capital > peakCapital) {
        peakCapital = data.capital;
      }
      
      const drawdown = ((peakCapital - data.capital) / peakCapital) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    // 计算夏普比率（简化版，假设无风险利率为0）
    const returns = this.performanceData.map((data, index) => 
      index === 0 ? 0 : (data.capital - this.performanceData[index - 1].capital) / this.performanceData[index - 1].capital
    );
    
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    );
    
    const sharpeRatio = returnStdDev === 0 ? 0 : averageReturn / returnStdDev * Math.sqrt(252);
    
    return {
      stockCode,
      startDate,
      endDate,
      initialCapital,
      finalCapital,
      totalReturn,
      annualReturn,
      maxDrawdown,
      sharpeRatio,
      tradeRecords: this.tradeRecords,
      performanceData: this.performanceData,
      signals: this.signals
    };
  }

  // 静态方法：运行回测
  static async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    const backtester = new StrategyBacktester(params);
    return await backtester.run();
  }
}
