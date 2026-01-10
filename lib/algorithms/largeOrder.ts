// 特大单识别算法实现

export interface OrderItem {
  tradeTime: string;
  tradePrice: number; // 成交价格（分）
  tradeVolume: number; // 成交股数
  tradeAmount: number; // 成交金额（分）
  tradeDirection: 'buy' | 'sell'; // 买卖方向
}

export interface DynamicThreshold {
  mean: number;
  std: number;
  threshold: number;
  n: number; // 标准差倍数
}

// 计算动态阈值（均值 + N倍标准差）
export function calculateDynamicThreshold(orders: OrderItem[], n: number = 2): DynamicThreshold {
  if (orders.length === 0) {
    return { mean: 0, std: 0, threshold: 0, n };
  }
  
  // 计算所有订单的金额均值
  const totalAmount = orders.reduce((sum, order) => sum + order.tradeAmount, 0);
  const mean = totalAmount / orders.length;
  
  // 计算标准差
  const variance = orders.reduce((sum, order) => sum + Math.pow(order.tradeAmount - mean, 2), 0) / orders.length;
  const std = Math.sqrt(variance);
  
  // 计算阈值：均值 + N倍标准差
  const threshold = mean + n * std;
  
  return { mean, std, threshold, n };
}

// 识别特大单
export interface LargeOrderResult {
  order: OrderItem;
  isLargeOrder: boolean;
  isExtraLargeOrder: boolean;
  amountRatio: number; // 相对于阈值的比例
}

export function identifyLargeOrders(orders: OrderItem[], dynamicThreshold: DynamicThreshold): LargeOrderResult[] {
  // 特大单阈值：1.5倍动态阈值
  const extraLargeThreshold = dynamicThreshold.threshold * 1.5;
  
  return orders.map(order => {
    const amountRatio = order.tradeAmount / dynamicThreshold.mean;
    
    return {
      order,
      isLargeOrder: order.tradeAmount > dynamicThreshold.threshold,
      isExtraLargeOrder: order.tradeAmount > extraLargeThreshold,
      amountRatio
    };
  });
}

// 买卖单力量对比接口
export interface OrderPowerComparison {
  buyAmount: number; // 买单总金额（分）
  sellAmount: number; // 卖单总金额（分）
  buyRatio: number; // 买单占比（0-1）
  sellRatio: number; // 卖单占比（0-1）
}

// 计算大单统计信息
export interface LargeOrderStatistics {
  totalOrders: number;
  largeOrders: number;
  extraLargeOrders: number;
  totalAmount: number;
  largeOrderAmount: number;
  largeOrderRatio: number; // 大单金额占总金额比例
  netInflow: number; // 净流入（买入金额 - 卖出金额）
  orderPower: OrderPowerComparison; // 买卖单力量对比
}

export function calculateLargeOrderStats(largeOrderResults: LargeOrderResult[]): LargeOrderStatistics {
  const totalOrders = largeOrderResults.length;
  const largeOrders = largeOrderResults.filter(result => result.isLargeOrder).length;
  const extraLargeOrders = largeOrderResults.filter(result => result.isExtraLargeOrder).length;
  
  const totalAmount = largeOrderResults.reduce((sum, result) => sum + result.order.tradeAmount, 0);
  const largeOrderAmount = largeOrderResults
    .filter(result => result.isLargeOrder)
    .reduce((sum, result) => sum + result.order.tradeAmount, 0);
  
  // 计算总买卖单金额
  const buyAmount = largeOrderResults
    .filter(result => result.order.tradeDirection === 'buy')
    .reduce((sum, result) => sum + result.order.tradeAmount, 0);
  
  const sellAmount = largeOrderResults
    .filter(result => result.order.tradeDirection === 'sell')
    .reduce((sum, result) => sum + result.order.tradeAmount, 0);
  
  // 计算买卖单力量对比
  const buyRatio = totalAmount > 0 ? buyAmount / totalAmount : 0;
  const sellRatio = totalAmount > 0 ? sellAmount / totalAmount : 0;
  
  const largeOrderRatio = totalAmount > 0 ? largeOrderAmount / totalAmount : 0;
  const netInflow = buyAmount - sellAmount;
  
  return {
    totalOrders,
    largeOrders,
    extraLargeOrders,
    totalAmount,
    largeOrderAmount,
    largeOrderRatio,
    netInflow,
    orderPower: {
      buyAmount,
      sellAmount,
      buyRatio,
      sellRatio
    }
  };
}

// 窗口类型定义
export type WindowType = 'tumbling' | 'sliding' | 'session';

export interface WindowConfig {
  type: WindowType;
  size: number; // 窗口大小（数量窗口为订单数，时间窗口为毫秒）
  slide?: number; // 滑动窗口的滑动步长
  gap?: number; // Session窗口的间隙
}

// 增强的流处理接口
export interface EnhancedOrderStreamProcessor {
  processOrder(order: OrderItem): LargeOrderResult;
  getCurrentThreshold(): DynamicThreshold;
  getStatistics(): LargeOrderStatistics;
  getWindowStatistics(windowId: string): LargeOrderStatistics;
  getActiveWindows(): string[];
  reset(): void;
}

// 窗口处理器
export class WindowProcessor {
  private windowConfig: WindowConfig;
  private windowOrders: Map<string, OrderItem[]> = new Map();
  private windowResults: Map<string, LargeOrderResult[]> = new Map();
  private lastWindowId: string = '';
  private n: number = 2;
  
  constructor(windowConfig: WindowConfig, n: number = 2) {
    this.windowConfig = windowConfig;
    this.n = n;
  }
  
  processOrder(order: OrderItem): string {
    const windowId = this.getWindowId(order.tradeTime, order.tradeAmount);
    
    // 获取或创建窗口
    let orders = this.windowOrders.get(windowId) || [];
    orders.push(order);
    this.windowOrders.set(windowId, orders);
    
    // 清理过期窗口
    this.cleanExpiredWindows(order.tradeTime);
    
    this.lastWindowId = windowId;
    return windowId;
  }
  
  getWindowOrders(windowId: string): OrderItem[] {
    return this.windowOrders.get(windowId) || [];
  }
  
  getWindowResults(windowId: string): LargeOrderResult[] {
    return this.windowResults.get(windowId) || [];
  }
  
  setWindowResults(windowId: string, results: LargeOrderResult[]): void {
    this.windowResults.set(windowId, results);
  }
  
  getActiveWindows(): string[] {
    return Array.from(this.windowOrders.keys());
  }
  
  private getWindowId(tradeTime: string, tradeAmount: number): string {
    const timestamp = new Date(tradeTime).getTime();
    
    switch (this.windowConfig.type) {
      case 'tumbling':
        // 滚动窗口：windowId = timestamp / windowSize
        const windowNumber = Math.floor(timestamp / this.windowConfig.size);
        return `${this.windowConfig.type}-${windowNumber}`;
        
      case 'sliding':
        // 滑动窗口：windowId = (timestamp / slide) - ((timestamp % windowSize) / slide)
        const slide = this.windowConfig.slide || this.windowConfig.size;
        const baseWindow = Math.floor(timestamp / slide);
        const offset = Math.floor((timestamp % this.windowConfig.size) / slide);
        return `${this.windowConfig.type}-${baseWindow - offset}`;
        
      case 'session':
        // Session窗口：使用上一个窗口的结束时间
        return this.lastWindowId || `${this.windowConfig.type}-${timestamp}`;
        
      default:
        return `${this.windowConfig.type}-${timestamp}`;
    }
  }
  
  private cleanExpiredWindows(currentTradeTime: string): void {
    const currentTimestamp = new Date(currentTradeTime).getTime();
    
    for (const [windowId, orders] of this.windowOrders.entries()) {
      if (orders.length === 0) {
        this.windowOrders.delete(windowId);
        this.windowResults.delete(windowId);
        continue;
      }
      
      const windowStartTime = new Date(orders[0].tradeTime).getTime();
      const windowEndTime = new Date(orders[orders.length - 1].tradeTime).getTime();
      
      // 清理过期窗口
      if (currentTimestamp - windowEndTime > this.windowConfig.size * 2) {
        this.windowOrders.delete(windowId);
        this.windowResults.delete(windowId);
      }
    }
  }
}

// 增强的实时特大单处理器
export class EnhancedRealTimeLargeOrderProcessor implements EnhancedOrderStreamProcessor {
  private orderBuffer: OrderItem[] = [];
  private maxBufferSize: number = 10000; // 增大缓冲容量
  private n: number = 2; // 标准差倍数
  private results: LargeOrderResult[] = [];
  private windowProcessors: Map<string, WindowProcessor> = new Map();
  private currentThreshold: DynamicThreshold = { mean: 0, std: 0, threshold: 0, n: this.n };
  private lastProcessTime: number = Date.now();
  
  constructor(maxBufferSize: number = 10000, n: number = 2) {
    this.maxBufferSize = maxBufferSize;
    this.n = n;
    
    // 初始化不同类型的窗口处理器
    this.windowProcessors.set('5s-tumbling', new WindowProcessor({ 
      type: 'tumbling', 
      size: 5000 // 5秒滚动窗口
    }, this.n));
    
    this.windowProcessors.set('10s-sliding', new WindowProcessor({ 
      type: 'sliding', 
      size: 10000, // 10秒滑动窗口
      slide: 2000 // 2秒滑动步长
    }, this.n));
    
    this.windowProcessors.set('100-orders', new WindowProcessor({ 
      type: 'tumbling', 
      size: 100 // 100个订单的滚动窗口
    }, this.n));
  }
  
  processOrder(order: OrderItem): LargeOrderResult {
    const startTime = Date.now();
    
    // 添加到全局缓冲
    this.orderBuffer.push(order);
    
    // 如果缓冲超过最大大小，移除最早的订单
    if (this.orderBuffer.length > this.maxBufferSize) {
      this.orderBuffer.shift();
    }
    
    // 更新所有窗口处理器
    for (const [name, processor] of this.windowProcessors.entries()) {
      const windowId = processor.processOrder(order);
      const windowOrders = processor.getWindowOrders(windowId);
      
      // 计算窗口阈值和识别特大单
      const windowThreshold = calculateDynamicThreshold(windowOrders, this.n);
      const windowResults = windowOrders.map(ord => this.identifySingleOrder(ord, windowThreshold));
      
      processor.setWindowResults(windowId, windowResults);
    }
    
    // 定期更新全局阈值（每100个订单或1秒）
    if (this.orderBuffer.length % 100 === 0 || Date.now() - this.lastProcessTime > 1000) {
      this.currentThreshold = this.calculateOptimizedThreshold();
      this.lastProcessTime = Date.now();
    }
    
    // 识别当前订单
    const result = this.identifySingleOrder(order, this.currentThreshold);
    
    // 添加到结果历史（限制结果数量）
    this.results.push(result);
    if (this.results.length > this.maxBufferSize) {
      this.results.shift();
    }
    
    const processingTime = Date.now() - startTime;
    if (processingTime > 10) { // 监控处理延迟
      console.warn(`Large order processing time high: ${processingTime}ms`);
    }
    
    return result;
  }
  
  getCurrentThreshold(): DynamicThreshold {
    return this.currentThreshold;
  }
  
  getStatistics(): LargeOrderStatistics {
    return calculateLargeOrderStats(this.results);
  }
  
  getWindowStatistics(windowId: string): LargeOrderStatistics {
    for (const [name, processor] of this.windowProcessors.entries()) {
      if (processor.getActiveWindows().includes(windowId)) {
        const windowResults = processor.getWindowResults(windowId);
        return calculateLargeOrderStats(windowResults);
      }
    }
    return {
      totalOrders: 0,
      largeOrders: 0,
      extraLargeOrders: 0,
      totalAmount: 0,
      largeOrderAmount: 0,
      largeOrderRatio: 0,
      netInflow: 0,
      orderPower: { buyAmount: 0, sellAmount: 0, buyRatio: 0, sellRatio: 0 }
    };
  }
  
  getActiveWindows(): string[] {
    const windows: string[] = [];
    for (const [name, processor] of this.windowProcessors.entries()) {
      windows.push(...processor.getActiveWindows());
    }
    return windows;
  }
  
  reset(): void {
    this.orderBuffer = [];
    this.results = [];
    this.windowProcessors.clear();
    this.currentThreshold = { mean: 0, std: 0, threshold: 0, n: this.n };
  }
  
  private identifySingleOrder(order: OrderItem, threshold: DynamicThreshold): LargeOrderResult {
    const extraLargeThreshold = threshold.threshold * 1.5;
    const amountRatio = threshold.mean > 0 ? order.tradeAmount / threshold.mean : 0;
    
    return {
      order,
      isLargeOrder: order.tradeAmount > threshold.threshold,
      isExtraLargeOrder: order.tradeAmount > extraLargeThreshold,
      amountRatio
    };
  }
  
  private calculateOptimizedThreshold(): DynamicThreshold {
    if (this.orderBuffer.length === 0) {
      return { mean: 0, std: 0, threshold: 0, n: this.n };
    }
    
    // 使用最近的1000个订单计算阈值，提高实时性
    const recentOrders = this.orderBuffer.slice(-1000);
    return calculateDynamicThreshold(recentOrders, this.n);
  }
}

// 批量处理订单（模拟Flink的批量处理）
export function batchProcessOrders(
  orders: OrderItem[],
  windowConfig: WindowConfig,
  n: number = 2
): Map<string, LargeOrderResult[]> {
  const processor = new WindowProcessor(windowConfig, n);
  const resultsMap = new Map<string, LargeOrderResult[]>();
  
  // 按时间排序订单
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.tradeTime).getTime() - new Date(b.tradeTime).getTime()
  );
  
  // 处理所有订单
  for (const order of sortedOrders) {
    const windowId = processor.processOrder(order);
  }
  
  // 计算每个窗口的结果
  for (const windowId of processor.getActiveWindows()) {
    const windowOrders = processor.getWindowOrders(windowId);
    const windowThreshold = calculateDynamicThreshold(windowOrders, n);
    const windowResults = windowOrders.map(order => {
      const extraLargeThreshold = windowThreshold.threshold * 1.5;
      const amountRatio = windowThreshold.mean > 0 ? order.tradeAmount / windowThreshold.mean : 0;
      
      return {
        order,
        isLargeOrder: order.tradeAmount > windowThreshold.threshold,
        isExtraLargeOrder: order.tradeAmount > extraLargeThreshold,
        amountRatio
      };
    });
    
    resultsMap.set(windowId, windowResults);
  }
  
  return resultsMap;
}
