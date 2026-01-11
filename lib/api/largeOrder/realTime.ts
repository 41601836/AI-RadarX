// 实时大单API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { stockCodeFormatError, invalidLargeOrderThresholdError } from '../common/errors';
import { calculateEnhancedDynamicThreshold, identifyLargeOrders, EnhancedRealTimeLargeOrderProcessor, OrderItem, LargeOrderResult } from '@/lib/algorithms/largeOrder';
import { identifyOrderIntention, IntentionSignal } from '@/lib/algorithms/orderIntention';
import { calculateSupportResistance } from '@/lib/algorithms/chipDistribution';
import { formatDateTime, isValidStockCode, yuanToFen } from '../common/utils'; // 导入通用工具函数

export interface LargeOrderRealTimeParams {
  stockCode: string;
  largeOrderThreshold?: number; // 大单阈值（分），默认 5000000（50万）
}

export interface RealTimeLargeOrderItem {
  tradeTime: string;
  tradePrice: number; // 成交价格（分）
  tradeVolume: number; // 成交股数
  tradeAmount: number; // 成交金额（分）
  tradeDirection: 'buy' | 'sell'; // 买卖方向
}

export interface AbnormalSignalItem {
  signalType: string;
  signalTime: string;
  signalDesc: string;
}

// 买卖单力量对比接口
export interface OrderPowerComparison {
  buyAmount: number; // 买单总金额（分）
  sellAmount: number; // 卖单总金额（分）
  buyRatio: number; // 买单占比（0-1）
  sellRatio: number; // 卖单占比（0-1）
}

export interface LargeOrderRealTimeData {
  stockCode: string;
  stockName: string;
  currentPrice: number; // 当前股价（分）
  totalLargeOrderAmount: number; // 当日大单总成交金额（分）
  largeOrderNetInflow: number; // 当日大单净流入（分）
  largeOrderRatio: number; // 大单成交占总成交比例（0-1）
  realTimeLargeOrders: RealTimeLargeOrderItem[];
  abnormalSignal: AbnormalSignalItem[];
  orderPower: OrderPowerComparison; // 买卖单力量对比
}

// Mock数据生成器
export const generateLargeOrderRealTimeMock: MockDataGenerator<LargeOrderRealTimeData> = async (params: LargeOrderRealTimeParams) => {
  const { stockCode = 'SH600000', largeOrderThreshold = 5000000 } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  // 确保当前股价有合理默认值
  const currentPrice = Math.max(5000, Math.floor((Math.random() || 0.5) * 10000) + 5000); // 当前股价（50-150元）
  
  // 生成实时订单数据
  const orderProcessor = new EnhancedRealTimeLargeOrderProcessor(100, 2);
  const orders: OrderItem[] = [];
  
  // 生成最近30分钟的订单数据
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const tradeTime = formatDateTime(new Date(now.getTime() - i * 60 * 1000));
    // 确保成交价格有合理默认值，波动在±1元之间
    const priceOffset = Math.floor((Math.random() - 0.5) * 100);
    const tradePrice = Math.max(100, currentPrice + priceOffset);
    // 确保成交股数有合理默认值，避免过小或过大
    const tradeVolume = Math.max(1000, Math.floor((Math.random() || 0.5) * 100000) + 1000);
    // 确保成交金额有合理默认值，避免NaN
    const tradeAmount = Math.max(0, tradePrice * tradeVolume);
    const tradeDirection = Math.random() > 0.5 ? 'buy' : 'sell';
    
    const order: OrderItem = {
      tradeTime,
      tradePrice,
      tradeVolume,
      tradeAmount,
      tradeDirection
    };
    
    orders.push(order);
    orderProcessor.processOrder(order);
  }
  
  // 使用动态阈值识别特大单
  const dynamicThreshold = orderProcessor.getCurrentThreshold() || largeOrderThreshold;
  const largeOrderResults = identifyLargeOrders(orders, dynamicThreshold);
  
  // 过滤出大单
  const realTimeLargeOrders = largeOrderResults
    .filter(result => result && result.isLargeOrder)
    .map(result => result?.order || {}) // 确保order存在
    .filter(order => order && order.tradeTime) // 过滤掉无效订单
    .sort((a, b) => new Date(b.tradeTime).getTime() - new Date(a.tradeTime).getTime()) // 按时间倒序
    .slice(0, 50); // 只返回最近50笔大单
  
  // 计算大单统计数据
  const stats = orderProcessor.getStatistics();
  
  // 生成模拟的筹码分布数据用于支撑/压力位计算
  const mockChipData = Array.from({ length: 20 }, (_, i) => {
    const price = Math.max(100, currentPrice + (i - 10) * 50);
    const volumeMultiplier = Math.max(0, 1 - Math.abs(i - 10) / 15);
    const volume = Math.max(500000, (Math.random() || 0.5) * 2000000 * volumeMultiplier);
    return {
      price,
      volume,
      percentage: Math.max(0, volume / 10000000) // 确保百分比不为负数
    };
  });
  
  // 计算支撑/压力位
  const supportResistance = calculateSupportResistance(mockChipData, currentPrice);
  
  // 识别交易意图
  const intentionSignal = identifyOrderIntention(largeOrderResults, stats, supportResistance, currentPrice);
  
  // 生成异常信号
  const abnormalSignal: AbnormalSignalItem[] = [];
  if (intentionSignal && intentionSignal.confidence > 0.7) {
    const intentionMap: Record<string, string> = {
      'accumulation': '吸筹',
      'distribution': '出货',
      'pullUp': '拉升',
      'suppress': '打压',
      'shock': '震荡',
      'unknown': '中性'
    };
    
    abnormalSignal.push({
      signalType: intentionSignal.intention || 'unknown',
      signalTime: intentionSignal.timestamp || new Date().toISOString(),
      signalDesc: `${intentionMap[intentionSignal.intention || 'unknown']}信号，置信度：${(intentionSignal.confidence * 100 || 0).toFixed(1)}%`
    });
  }
  
  // 确保返回的统计数据都有合理默认值
  const safeStats = stats || {};
  
  return {
    stockCode,
    stockName,
    currentPrice,
    totalLargeOrderAmount: safeStats.largeOrderAmount || 0,
    largeOrderNetInflow: safeStats.netInflow || 0,
    largeOrderRatio: safeStats.largeOrderRatio || 0,
    realTimeLargeOrders,
    abnormalSignal,
    orderPower: safeStats.orderPower || { buyAmount: 0, sellAmount: 0, buyRatio: 0, sellRatio: 0 }
  };
};

export async function fetchLargeOrderRealTime(
  params: LargeOrderRealTimeParams
): Promise<ApiResponse<LargeOrderRealTimeData>> {
  try {
    // 验证股票代码格式
    if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
      throw stockCodeFormatError();
    }

    // 验证大单阈值
    if (params.largeOrderThreshold && params.largeOrderThreshold <= 0) {
      throw invalidLargeOrderThresholdError('大单阈值必须大于0');
    }

    // 使用统一的 apiGet 函数
    return await apiGet<LargeOrderRealTimeData>('/order/large/real-time', params, {
      requiresAuth: false
    }, generateLargeOrderRealTimeMock);
  } catch (error) {
    console.error('Error fetching large order real-time data:', error);
    throw error;
  }
}
