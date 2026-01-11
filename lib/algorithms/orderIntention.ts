// 特大单交易意图识别算法实现

import { LargeOrderResult, LargeOrderStatistics, EnhancedOrderStreamProcessor, WindowType } from './largeOrder';
import { SupportResistanceLevels, ChipDistributionItem, calculateCompositeChipStrength, EnhancedChipDistributionResult } from './chipDistribution';

export type IntentionType = 'accumulation' | 'distribution' | 'pullUp' | 'suppress' | 'shock' | 'unknown';

export interface IntentionSignal {
  timestamp: string;
  intention: IntentionType;
  confidence: number; // 置信度（0-1）
  description: string;
  strength: number; // 信号强度（0-1）
  evidence: {
    largeOrderRatio: number;
    netInflowRatio: number;
    pricePosition: number; // 价格位置：0-1，0表示支撑位，1表示压力位
    orderFrequency: number;
    windowStats: Record<string, any>; // 不同窗口的统计信息
    chipStrength?: {
      strength: number;
      factors: {
        concentration: number;
        wad: number;
        supportResistance: number;
      };
    };
  };
}

// 意图监控配置
export interface IntentionMonitorConfig {
  windowTypes?: WindowType[];
  confidenceThreshold?: number; // 告警置信度阈值
  strengthThreshold?: number; // 告警强度阈值
  lookbackPeriod?: number; // 回溯期数
}

// 意图监控器
export class IntentionMonitor {
  private processor: EnhancedOrderStreamProcessor;
  private config: IntentionMonitorConfig;
  private historicalSignals: IntentionSignal[] = [];
  private maxHistorySize: number = 1000;
  private enhancedChipData?: EnhancedChipDistributionResult;
  
  constructor(processor: EnhancedOrderStreamProcessor, config: IntentionMonitorConfig = {}) {
    this.processor = processor;
    this.config = {
      windowTypes: ['tumbling', 'sliding'],
      confidenceThreshold: 0.7,
      strengthThreshold: 0.5,
      lookbackPeriod: 5,
      ...config
    };
  }
  
  setEnhancedChipData(data: EnhancedChipDistributionResult): void {
    this.enhancedChipData = data;
  }
  
  analyzeCurrentIntention(
    supportResistance: SupportResistanceLevels,
    currentPrice: number
  ): IntentionSignal {
    const largeOrderStats = this.processor.getStatistics();
    const activeWindows = this.processor.getActiveWindows();
    
    // 收集所有窗口的统计信息
    const windowStats: Record<string, any> = {};
    for (const windowId of activeWindows) {
      windowStats[windowId] = this.processor.getWindowStatistics(windowId);
    }
    
    // 获取最近的特大单结果
    const recentResults: LargeOrderResult[] = [];
    
    // 计算相关指标
    const largeOrderRatio = largeOrderStats.largeOrderRatio;
    const totalAmount = largeOrderStats.totalAmount;
    const netInflow = largeOrderStats.netInflow;
    const netInflowRatio = totalAmount > 0 ? Math.abs(netInflow) / totalAmount : 0;
    
    // 计算价格位置（相对于最近的支撑位和压力位）
    let pricePosition = 0.5; // 默认中间位置
    
    if (supportResistance.supportLevels.length > 0 && supportResistance.resistanceLevels.length > 0) {
      const nearestSupport = supportResistance.supportLevels[0];
      const nearestResistance = supportResistance.resistanceLevels[0];
      
      const priceRange = nearestResistance.price - nearestSupport.price;
      if (priceRange > 0) {
        pricePosition = (currentPrice - nearestSupport.price) / priceRange;
      }
    } else if (supportResistance.supportLevels.length > 0) {
      // 只有支撑位，价格位置较高
      pricePosition = 0.8;
    } else if (supportResistance.resistanceLevels.length > 0) {
      // 只有压力位，价格位置较低
      pricePosition = 0.2;
    }
    
    // 计算特大单频率
    const orderFrequency = recentResults.length;
    
    // 计算综合筹码强度
    let chipStrength = undefined;
    if (this.enhancedChipData) {
      chipStrength = calculateCompositeChipStrength(this.enhancedChipData);
    }
    
    // 基于指标识别意图
    let intention: IntentionType = 'unknown';
    let confidence = 0.0;
    let strength = 0.0;
    let description = '';
    
    // 计算窗口统计的加权平均值
    const windowKeys = Object.keys(windowStats);
    const weightedNetInflow = windowKeys.reduce((sum, key) => sum + windowStats[key].netInflow, 0) / windowKeys.length;
    const weightedLargeOrderRatio = windowKeys.reduce((sum, key) => sum + windowStats[key].largeOrderRatio, 0) / windowKeys.length;
    
    // 吸筹：低位大量买入
    if (netInflow > 0 && pricePosition < 0.3 && largeOrderRatio > 0.6) {
      intention = 'accumulation';
      confidence = Math.min(1.0, (netInflowRatio * 0.6 + (1 - pricePosition) * 0.3 + largeOrderRatio * 0.1));
      strength = Math.min(1.0, (weightedNetInflow > 0 ? 0.5 : 0) + (chipStrength?.strength || 0) * 0.3 + confidence * 0.2);
      description = '主力低位吸筹迹象明显，大量资金流入';
    }
    // 出货：高位大量卖出
    else if (netInflow < 0 && pricePosition > 0.7 && largeOrderRatio > 0.6) {
      intention = 'distribution';
      confidence = Math.min(1.0, (netInflowRatio * 0.6 + pricePosition * 0.3 + largeOrderRatio * 0.1));
      strength = Math.min(1.0, (weightedNetInflow < 0 ? 0.5 : 0) + (chipStrength?.strength || 0) * 0.3 + confidence * 0.2);
      description = '主力高位出货迹象明显，大量资金流出';
    }
    // 拉升：快速买入，价格快速上涨
    else if (netInflow > 0 && largeOrderRatio > 0.7 && orderFrequency > 20) {
      intention = 'pullUp';
      confidence = Math.min(1.0, (netInflowRatio * 0.5 + largeOrderRatio * 0.3 + (orderFrequency / 50) * 0.2));
      strength = Math.min(1.0, (weightedNetInflow > 0 ? 0.5 : 0) + (chipStrength?.strength || 0) * 0.3 + confidence * 0.2);
      description = '主力快速拉升股价，大量买单涌入';
    }
    // 打压：快速卖出，价格快速下跌
    else if (netInflow < 0 && largeOrderRatio > 0.7 && orderFrequency > 20) {
      intention = 'suppress';
      confidence = Math.min(1.0, (netInflowRatio * 0.5 + largeOrderRatio * 0.3 + (orderFrequency / 50) * 0.2));
      strength = Math.min(1.0, (weightedNetInflow < 0 ? 0.5 : 0) + (chipStrength?.strength || 0) * 0.3 + confidence * 0.2);
      description = '主力快速打压股价，大量卖单涌出';
    }
    // 震荡：买卖均衡，价格在区间内波动
    else if (Math.abs(netInflowRatio) < 0.3 && largeOrderRatio > 0.5) {
      intention = 'shock';
      confidence = Math.min(1.0, ((1 - Math.abs(netInflowRatio)) * 0.6 + largeOrderRatio * 0.4));
      strength = Math.min(1.0, (Math.abs(weightedNetInflow) < 0.1 ? 0.5 : 0) + (chipStrength?.strength || 0) * 0.3 + confidence * 0.2);
      description = '主力震荡洗盘，买卖单相对均衡';
    }
    // 未知意图
    else {
      intention = 'unknown';
      confidence = 0.0;
      strength = 0.0;
      description = '无法明确判断主力意图';
    }
    
    const signal: IntentionSignal = {
      timestamp: new Date().toISOString(),
      intention,
      confidence,
      strength,
      description,
      evidence: {
        largeOrderRatio,
        netInflowRatio,
        pricePosition,
        orderFrequency,
        windowStats,
        chipStrength
      }
    };
    
    // 添加到历史信号
    this.historicalSignals.push(signal);
    if (this.historicalSignals.length > this.maxHistorySize) {
      this.historicalSignals.shift();
    }
    
    return signal;
  }
}

// 识别交易意图（兼容旧接口）
export function identifyOrderIntention(
  largeOrderResults: LargeOrderResult[],
  largeOrderStats: LargeOrderStatistics,
  supportResistance: SupportResistanceLevels,
  currentPrice: number
): IntentionSignal {
  // 防御性编程：确保所有必要参数都存在
  if (!largeOrderResults || !Array.isArray(largeOrderResults)) {
    largeOrderResults = [];
  }
  
  if (!largeOrderStats || typeof largeOrderStats !== 'object') {
    largeOrderStats = {
      totalOrders: 0,
      largeOrders: 0,
      extraLargeOrders: 0,
      totalAmount: 0,
      largeOrderAmount: 0,
      largeOrderRatio: 0,
      netInflow: 0,
      orderPower: { buyAmount: 0, sellAmount: 0, buyRatio: 0, sellRatio: 0 }
    } as LargeOrderStatistics;
  }
  
  if (!supportResistance || typeof supportResistance !== 'object') {
    supportResistance = {
      supportLevels: [],
      resistanceLevels: [],
      strongestSupport: null,
      strongestResistance: null,
      supportResistanceRatio: 0
    } as SupportResistanceLevels;
  }
  
  // 确保当前价格有效
  if (isNaN(currentPrice) || !isFinite(currentPrice)) {
    currentPrice = 0;
  }
  
  // 计算相关指标（确保所有指标都有合理默认值）
  const largeOrderRatio = largeOrderStats.largeOrderRatio || 0;
  const totalAmount = largeOrderStats.totalAmount || 0;
  const netInflow = largeOrderStats.netInflow || 0;
  const netInflowRatio = totalAmount > 0 ? Math.abs(netInflow) / totalAmount : 0;
  
  // 计算价格位置（相对于最近的支撑位和压力位）
  let pricePosition = 0.5; // 默认中间位置
  
  try {
    if (supportResistance.supportLevels && supportResistance.supportLevels.length > 0 && 
        supportResistance.resistanceLevels && supportResistance.resistanceLevels.length > 0) {
      const nearestSupport = supportResistance.supportLevels[0];
      const nearestResistance = supportResistance.resistanceLevels[0];
      
      if (nearestSupport && nearestResistance && nearestSupport.price && nearestResistance.price) {
        const priceRange = nearestResistance.price - nearestSupport.price;
        if (priceRange > 0 && currentPrice > 0) {
          pricePosition = (currentPrice - nearestSupport.price) / priceRange;
          // 确保价格位置在合理范围内（0-1）
          pricePosition = Math.max(0, Math.min(1, pricePosition));
        }
      }
    } else if (supportResistance.supportLevels && supportResistance.supportLevels.length > 0) {
      // 只有支撑位，价格位置较高
      pricePosition = 0.8;
    } else if (supportResistance.resistanceLevels && supportResistance.resistanceLevels.length > 0) {
      // 只有压力位，价格位置较低
      pricePosition = 0.2;
    }
  } catch (error) {
    // 如果计算价格位置出错，保持默认值
    console.warn('计算价格位置时出错:', error);
    pricePosition = 0.5;
  }
  
  // 计算特大单频率
  const orderFrequency = largeOrderResults.length;
  
  // 基于指标识别意图
  let intention: IntentionType = 'unknown';
  let confidence = 0.0;
  let strength = 0.0;
  let description = '';
  
  // 数据量不足时直接返回中性信号
  if (orderFrequency < 3 || largeOrderRatio < 0.1) {
    intention = 'unknown';
    confidence = 0.0;
    strength = 0.0;
    description = '[NEUTRAL] 信号扫描中，数据量不足';
  } 
  // 吸筹：低位大量买入
  else if (netInflow > 0 && pricePosition < 0.3 && largeOrderRatio > 0.6) {
    intention = 'accumulation';
    confidence = Math.min(1.0, (netInflowRatio * 0.6 + (1 - pricePosition) * 0.3 + largeOrderRatio * 0.1));
    strength = Math.min(1.0, confidence * 0.7 + (netInflow > 0 ? 0.3 : 0));
    description = '主力低位吸筹迹象明显，大量资金流入';
  }
  // 出货：高位大量卖出
  else if (netInflow < 0 && pricePosition > 0.7 && largeOrderRatio > 0.6) {
    intention = 'distribution';
    confidence = Math.min(1.0, (netInflowRatio * 0.6 + pricePosition * 0.3 + largeOrderRatio * 0.1));
    strength = Math.min(1.0, confidence * 0.7 + (netInflow < 0 ? 0.3 : 0));
    description = '主力高位出货迹象明显，大量资金流出';
  }
  // 拉升：快速买入，价格快速上涨
  else if (netInflow > 0 && largeOrderRatio > 0.7 && orderFrequency > 20) {
    intention = 'pullUp';
    confidence = Math.min(1.0, (netInflowRatio * 0.5 + largeOrderRatio * 0.3 + (orderFrequency / 50) * 0.2));
    strength = Math.min(1.0, confidence * 0.7 + (orderFrequency > 30 ? 0.3 : 0));
    description = '主力快速拉升股价，大量买单涌入';
  }
  // 打压：快速卖出，价格快速下跌
  else if (netInflow < 0 && largeOrderRatio > 0.7 && orderFrequency > 20) {
    intention = 'suppress';
    confidence = Math.min(1.0, (netInflowRatio * 0.5 + largeOrderRatio * 0.3 + (orderFrequency / 50) * 0.2));
    strength = Math.min(1.0, confidence * 0.7 + (orderFrequency > 30 ? 0.3 : 0));
    description = '主力快速打压股价，大量卖单涌出';
  }
  // 震荡：买卖均衡，价格在区间内波动
  else if (Math.abs(netInflowRatio) < 0.3 && largeOrderRatio > 0.5) {
    intention = 'shock';
    confidence = Math.min(1.0, ((1 - Math.abs(netInflowRatio)) * 0.6 + largeOrderRatio * 0.4));
    strength = Math.min(1.0, confidence * 0.7 + (Math.abs(netInflowRatio) < 0.1 ? 0.3 : 0));
    description = '主力震荡洗盘，买卖单相对均衡';
  }
  // 未知意图
  else {
    intention = 'unknown';
    confidence = 0.0;
    strength = 0.0;
    description = '[NEUTRAL] 信号扫描中，无法明确判断主力意图';
  }
  
  return {
    timestamp: new Date().toISOString(),
    intention,
    confidence,
    strength,
    description,
    evidence: {
      largeOrderRatio,
      netInflowRatio,
      pricePosition,
      orderFrequency,
      windowStats: {},
      chipStrength: undefined
    }
  };
}

// 监控意图变化
export function monitorIntentionChanges(
  historicalSignals: IntentionSignal[],
  currentSignal: IntentionSignal
): { isChanged: boolean; changeType?: 'intensified' | 'weakened' | 'switched' } {
  if (historicalSignals.length === 0) {
    return { isChanged: false };
  }
  
  const previousSignal = historicalSignals[historicalSignals.length - 1];
  
  // 检查意图是否切换
  if (previousSignal.intention !== currentSignal.intention) {
    return { isChanged: true, changeType: 'switched' };
  }
  
  // 检查意图是否增强或减弱（综合考虑置信度和强度）
  const confidenceDiff = currentSignal.confidence - previousSignal.confidence;
  const strengthDiff = currentSignal.strength - previousSignal.strength;
  const combinedDiff = confidenceDiff * 0.6 + strengthDiff * 0.4;
  
  if (Math.abs(combinedDiff) > 0.15) {
    return {
      isChanged: true,
      changeType: combinedDiff > 0 ? 'intensified' : 'weakened'
    };
  }
  
  return { isChanged: false };
}

// 生成意图告警
export function generateIntentionAlert(signal: IntentionSignal): string | null {
  // 只有高置信度和高强度的信号才生成告警
  if (signal.confidence < 0.7 || signal.strength < 0.5) {
    return null;
  }
  
  const strengthText = signal.strength > 0.8 ? '【强烈】' : signal.strength > 0.6 ? '【中等】' : '';
  
  switch (signal.intention) {
    case 'accumulation':
      return `【吸筹告警】${strengthText}${signal.description}，置信度：${(signal.confidence * 100).toFixed(1)}%，强度：${(signal.strength * 100).toFixed(1)}%`;
    case 'distribution':
      return `【出货告警】${strengthText}${signal.description}，置信度：${(signal.confidence * 100).toFixed(1)}%，强度：${(signal.strength * 100).toFixed(1)}%`;
    case 'pullUp':
      return `【拉升告警】${strengthText}${signal.description}，置信度：${(signal.confidence * 100).toFixed(1)}%，强度：${(signal.strength * 100).toFixed(1)}%`;
    case 'suppress':
      return `【打压告警】${strengthText}${signal.description}，置信度：${(signal.confidence * 100).toFixed(1)}%，强度：${(signal.strength * 100).toFixed(1)}%`;
    case 'shock':
      return `【震荡告警】${strengthText}${signal.description}，置信度：${(signal.confidence * 100).toFixed(1)}%，强度：${(signal.strength * 100).toFixed(1)}%`;
    default:
      return null;
  }
}
