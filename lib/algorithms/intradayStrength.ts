// 分时强度和承接力度计算实现
import { calculateWAD, calculateCumulativeWAD, WADItem, WADCalculationOptions } from './wad';
import { OrderItem, EnhancedRealTimeLargeOrderProcessor, LargeOrderResult } from './largeOrder';
import { calculateBollingerBands } from './technicalIndicators';

export interface IntradayStrengthParams {
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  orderData?: OrderItem[];
  windowSize?: number; // 计算窗口大小（分钟）
  useVolumeWeight?: boolean; // 是否使用成交量加权
  useWAD?: boolean; // 是否结合WAD指标
}

export interface IntradayStrengthResult {
  timestamp: number;
  strength: number; // 分时强度 (-1 到 1，正值表示强势)
  volumeFactor: number; // 成交量因子 (0 到 1)
  priceFactor: number; // 价格因子 (-1 到 1)
  wadFactor?: number; // WAD因子 (0 到 1)
  compositeScore: number; // 综合得分 (0 到 100)
}

// 计算分时强度
export function calculateIntradayStrength(params: IntradayStrengthParams): IntradayStrengthResult[] {
  const { 
    priceData, 
    orderData = [],
    windowSize = 5,
    useVolumeWeight = true,
    useWAD = true
  } = params;
  
  if (priceData.length === 0) {
    return [];
  }
  
  const results: IntradayStrengthResult[] = [];
  const windowMs = windowSize * 60 * 1000; // 转换为毫秒
  
  // 计算Bollinger Bands用于价格因子
  const closePrices = priceData.map(p => p.close);
  const bb = calculateBollingerBands({ close: closePrices, period: 20, standardDeviations: 2 });
  
  // 计算WAD数据
  const wadOptions: WADCalculationOptions = { 
    decayRate: 0.1, 
    weightType: 'volume',
    useExponentialDecay: true
  };
  const wadData = calculateCumulativeWAD(priceData as WADItem[], wadOptions);
  
  // 为每个时间点计算分时强度
  for (let i = 0; i < priceData.length; i++) {
    const current = priceData[i];
    const currentTime = current.timestamp;
    
    // 找出窗口内的数据
    const windowData = priceData.filter(p => currentTime - p.timestamp <= windowMs);
    
    if (windowData.length < 2) {
      // 数据不足，跳过
      continue;
    }
    
    // 1. 计算价格因子（基于价格变化和布林带）
    let priceFactor = 0;
    if (windowData.length >= 2) {
      // 窗口内的价格变化率
      const firstPrice = windowData[0].close;
      const lastPrice = windowData[windowData.length - 1].close;
      const priceChangeRate = (lastPrice - firstPrice) / firstPrice;
      
      // 结合布林带位置的标准化
      if (bb.middle[i] > 0 && bb.upper[i] > bb.lower[i]) {
        const bbRange = bb.upper[i] - bb.lower[i];
        const pricePosition = (current.close - bb.lower[i]) / bbRange;
        // 标准化到-1到1范围
        priceFactor = (pricePosition - 0.5) * 2;
      } else {
        // 简单使用价格变化率，限制在-1到1
        priceFactor = Math.max(-1, Math.min(1, priceChangeRate * 100));
      }
    }
    
    // 2. 计算成交量因子（基于相对成交量）
    let volumeFactor = 0;
    if (windowData.length > 0) {
      // 计算窗口内的平均成交量
      const avgVolume = windowData.reduce((sum, p) => sum + p.volume, 0) / windowData.length;
      // 计算当前成交量相对于平均成交量的比例
      volumeFactor = Math.min(1, current.volume / avgVolume);
    }
    
    // 3. 计算WAD因子（如果启用）
    let wadFactor = 1.0;
    if (useWAD && wadData.length > i) {
      const currentWAD = wadData[i].weightedWad;
      // 找出WAD的范围
      const wadValues = wadData.map(w => w.weightedWad);
      const maxWAD = Math.max(...wadValues);
      const minWAD = Math.min(...wadValues);
      const wadRange = maxWAD - minWAD;
      
      if (wadRange > 0) {
        wadFactor = (currentWAD - minWAD) / wadRange;
      }
    }
    
    // 4. 计算综合分时强度
    let strength = 0;
    if (useVolumeWeight) {
      // 成交量加权的强度计算
      strength = priceFactor * (0.6 + volumeFactor * 0.4) * wadFactor;
    } else {
      // 简单的价格和WAD结合
      strength = priceFactor * wadFactor;
    }
    
    // 5. 计算综合得分（0-100）
    const compositeScore = ((strength + 1) / 2) * 100;
    
    results.push({
      timestamp: current.timestamp,
      strength,
      volumeFactor,
      priceFactor,
      ...(useWAD && { wadFactor }),
      compositeScore
    });
  }
  
  return results;
}

export interface AbsorptionStrengthParams {
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  orderData: OrderItem[];
  priceRange?: number; // 价格区间百分比
  timeWindow?: number; // 时间窗口（分钟）
  useLargeOrders?: boolean; // 是否考虑特大单
}

export interface AbsorptionStrengthResult {
  timestamp: number;
  strength: number; // 承接力度 (0 到 1，值越大表示承接越强)
  volumeAbsorption: number; // 成交量承接因子 (0 到 1)
  priceStability: number; // 价格稳定性因子 (0 到 1)
  buySellRatio: number; // 买卖盘比例
  largeOrderFactor?: number; // 特大单因子 (0 到 1)
  absorptionLevel: 'weak' | 'moderate' | 'strong' | 'veryStrong'; // 承接力度等级
}

// 计算承接力度
export function calculateAbsorptionStrength(params: AbsorptionStrengthParams): AbsorptionStrengthResult[] {
  const { 
    priceData, 
    orderData,
    priceRange = 3, // 默认3%的价格区间
    timeWindow = 10, // 默认10分钟窗口
    useLargeOrders = true
  } = params;
  
  if (priceData.length === 0 || orderData.length === 0) {
    return [];
  }
  
  const results: AbsorptionStrengthResult[] = [];
  const windowMs = timeWindow * 60 * 1000; // 转换为毫秒
  
  // 初始化特大单处理器（如果启用）
  let largeOrderProcessor: EnhancedRealTimeLargeOrderProcessor | null = null;
  let largeOrderResults: Map<string, LargeOrderResult> = new Map();
  
  if (useLargeOrders) {
    largeOrderProcessor = new EnhancedRealTimeLargeOrderProcessor(10000, 2);
    // 处理所有订单
    for (const order of orderData) {
      const result = largeOrderProcessor.processOrder(order);
      largeOrderResults.set(`${order.tradeTime}-${order.tradePrice}-${order.tradeVolume}`, result);
    }
  }
  
  // 为每个时间点计算承接力度
  for (let i = 0; i < priceData.length; i++) {
    const current = priceData[i];
    const currentTime = current.timestamp;
    const currentPrice = current.close;
    
    // 价格区间计算
    const priceLowerBound = currentPrice * (1 - priceRange / 100);
    const priceUpperBound = currentPrice * (1 + priceRange / 100);
    
    // 找出窗口内的数据
    const windowPriceData = priceData.filter(p => currentTime - p.timestamp <= windowMs);
    const windowOrderData = orderData.filter(o => {
      const orderTime = new Date(o.tradeTime).getTime();
      return currentTime - orderTime <= windowMs && 
             o.tradePrice >= priceLowerBound && 
             o.tradePrice <= priceUpperBound;
    });
    
    if (windowOrderData.length < 10) { // 至少需要10个订单
      continue;
    }
    
    // 1. 计算价格稳定性因子
    let priceStability = 0;
    if (windowPriceData.length > 1) {
      // 计算窗口内的价格波动范围
      const maxPrice = Math.max(...windowPriceData.map(p => p.high));
      const minPrice = Math.min(...windowPriceData.map(p => p.low));
      const priceRangeInWindow = maxPrice - minPrice;
      
      // 价格波动越小，稳定性越高
      if (priceRangeInWindow > 0) {
        // 归一化到0-1范围，波动2%以内视为稳定
        priceStability = Math.max(0, 1 - (priceRangeInWindow / currentPrice * 100) / 2);
      } else {
        priceStability = 1;
      }
    }
    
    // 2. 计算成交量承接因子
    let volumeAbsorption = 0;
    if (windowOrderData.length > 0) {
      // 计算买入和卖出的成交量
      const buyVolume = windowOrderData
        .filter(o => o.tradeDirection === 'buy')
        .reduce((sum, o) => sum + o.tradeVolume, 0);
      const sellVolume = windowOrderData
        .filter(o => o.tradeDirection === 'sell')
        .reduce((sum, o) => sum + o.tradeVolume, 0);
      const totalVolume = buyVolume + sellVolume;
      
      if (totalVolume > 0) {
        // 买入成交量比例越高，承接力度越强
        volumeAbsorption = buyVolume / totalVolume;
      }
    }
    
    // 3. 计算买卖盘比例
    let buySellRatio = 0;
    if (windowOrderData.length > 0) {
      const buyOrders = windowOrderData.filter(o => o.tradeDirection === 'buy').length;
      const sellOrders = windowOrderData.filter(o => o.tradeDirection === 'sell').length;
      
      if (sellOrders > 0) {
        buySellRatio = buyOrders / sellOrders;
      } else if (buyOrders > 0) {
        buySellRatio = 5; // 卖出订单为0时，设置一个较高值
      }
      
      // 限制在0-5范围内
      buySellRatio = Math.min(5, buySellRatio);
    }
    
    // 4. 计算特大单因子（如果启用）
    let largeOrderFactor = 1.0;
    if (useLargeOrders) {
      let largeBuyVolume = 0;
      let largeSellVolume = 0;
      
      for (const order of windowOrderData) {
        const orderKey = `${order.tradeTime}-${order.tradePrice}-${order.tradeVolume}`;
        const largeOrderResult = largeOrderResults.get(orderKey);
        
        if (largeOrderResult?.isLargeOrder) {
          if (order.tradeDirection === 'buy') {
            largeBuyVolume += order.tradeVolume;
          } else {
            largeSellVolume += order.tradeVolume;
          }
        }
      }
      
      const totalLargeVolume = largeBuyVolume + largeSellVolume;
      if (totalLargeVolume > 0) {
        largeOrderFactor = largeBuyVolume / totalLargeVolume;
      }
    }
    
    // 5. 计算综合承接力度
    const strength = (volumeAbsorption * 0.4 + priceStability * 0.3 + (buySellRatio / 5) * 0.3) * largeOrderFactor;
    
    // 6. 确定承接力度等级
    let absorptionLevel: 'weak' | 'moderate' | 'strong' | 'veryStrong' = 'weak';
    if (strength >= 0.8) {
      absorptionLevel = 'veryStrong';
    } else if (strength >= 0.6) {
      absorptionLevel = 'strong';
    } else if (strength >= 0.4) {
      absorptionLevel = 'moderate';
    }
    
    results.push({
      timestamp: current.timestamp,
      strength,
      volumeAbsorption,
      priceStability,
      buySellRatio,
      ...(useLargeOrders && { largeOrderFactor }),
      absorptionLevel
    });
  }
  
  return results;
}

export interface EnhancedIntradayAnalysisParams {
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  orderData: OrderItem[];
  strengthWindow?: number;
  absorptionWindow?: number;
  useWAD?: boolean;
  useLargeOrders?: boolean;
}

export interface EnhancedIntradayAnalysisResult {
  timestamp: number;
  intradayStrength: IntradayStrengthResult;
  absorptionStrength: AbsorptionStrengthResult;
  combinedScore: number; // 综合得分 (0 到 100)
  signal: 'bullish' | 'bearish' | 'neutral' | 'strongBullish' | 'strongBearish';
}

// 增强的分时分析，结合分时强度和承接力度
export function calculateEnhancedIntradayAnalysis(params: EnhancedIntradayAnalysisParams): EnhancedIntradayAnalysisResult[] {
  const { 
    priceData, 
    orderData,
    strengthWindow = 5,
    absorptionWindow = 10,
    useWAD = true,
    useLargeOrders = true
  } = params;
  
  // 计算分时强度
  const strengthResults = calculateIntradayStrength({
    priceData,
    orderData,
    windowSize: strengthWindow,
    useVolumeWeight: true,
    useWAD
  });
  
  // 计算承接力度
  const absorptionResults = calculateAbsorptionStrength({
    priceData,
    orderData,
    timeWindow: absorptionWindow,
    useLargeOrders
  });
  
  // 合并结果
  const combinedResults: EnhancedIntradayAnalysisResult[] = [];
  
  // 创建时间戳索引
  const strengthMap = new Map<number, IntradayStrengthResult>();
  for (const result of strengthResults) {
    strengthMap.set(result.timestamp, result);
  }
  
  for (const absorptionResult of absorptionResults) {
    const strengthResult = strengthMap.get(absorptionResult.timestamp);
    
    if (strengthResult) {
      // 计算综合得分
      const strengthScore = strengthResult.compositeScore;
      const absorptionScore = absorptionResult.strength * 100;
      const combinedScore = (strengthScore * 0.6 + absorptionScore * 0.4);
      
      // 生成信号
      let signal: 'bullish' | 'bearish' | 'neutral' | 'strongBullish' | 'strongBearish' = 'neutral';
      if (combinedScore >= 80) {
        signal = 'strongBullish';
      } else if (combinedScore >= 65) {
        signal = 'bullish';
      } else if (combinedScore <= 20) {
        signal = 'strongBearish';
      } else if (combinedScore <= 35) {
        signal = 'bearish';
      }
      
      combinedResults.push({
        timestamp: absorptionResult.timestamp,
        intradayStrength: strengthResult,
        absorptionStrength: absorptionResult,
        combinedScore,
        signal
      });
    }
  }
  
  return combinedResults;
}

// 实时更新的分时强度计算器
export class RealTimeIntradayStrengthCalculator {
  private priceBuffer: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }> = [];
  private orderBuffer: OrderItem[] = [];
  private maxBufferSize: number = 1000; // 最大缓冲大小
  private windowSize: number;
  private useWAD: boolean;
  private useLargeOrders: boolean;
  
  constructor(windowSize: number = 5, useWAD: boolean = true, useLargeOrders: boolean = true) {
    this.windowSize = windowSize;
    this.useWAD = useWAD;
    this.useLargeOrders = useLargeOrders;
  }
  
  // 添加价格数据
  addPriceData(data: { timestamp: number; high: number; low: number; close: number; volume: number }): void {
    this.priceBuffer.push(data);
    if (this.priceBuffer.length > this.maxBufferSize) {
      this.priceBuffer.shift();
    }
  }
  
  // 添加订单数据
  addOrderData(data: OrderItem): void {
    this.orderBuffer.push(data);
    if (this.orderBuffer.length > this.maxBufferSize * 10) { // 订单数据可以多保存一些
      this.orderBuffer.shift();
    }
  }
  
  // 获取当前分时强度
  getCurrentStrength(): EnhancedIntradayAnalysisResult | null {
    if (this.priceBuffer.length < 20) { // 需要足够的数据
      return null;
    }
    
    const results = calculateEnhancedIntradayAnalysis({
      priceData: this.priceBuffer,
      orderData: this.orderBuffer,
      strengthWindow: this.windowSize,
      useWAD: this.useWAD,
      useLargeOrders: this.useLargeOrders
    });
    
    return results.length > 0 ? results[results.length - 1] : null;
  }
  
  // 获取强度历史
  getStrengthHistory(): EnhancedIntradayAnalysisResult[] {
    if (this.priceBuffer.length < 20) {
      return [];
    }
    
    return calculateEnhancedIntradayAnalysis({
      priceData: this.priceBuffer,
      orderData: this.orderBuffer,
      strengthWindow: this.windowSize,
      useWAD: this.useWAD,
      useLargeOrders: this.useLargeOrders
    });
  }
  
  // 清空缓冲
  clearBuffer(): void {
    this.priceBuffer = [];
    this.orderBuffer = [];
  }
}
