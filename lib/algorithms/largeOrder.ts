// 特大单识别算法实现
import { IntentionType, IntentionSignal } from './orderIntention';

export interface OrderItem {
  tradeTime: string;
  tradePrice: number; // 成交价格（分）
  tradeVolume: number; // 成交股数
  tradeAmount: number; // 成交金额（分）
  tradeDirection: 'buy' | 'sell'; // 买卖方向
  orderType?: 'limit' | 'market' | 'iceberg'; // 订单类型
}

export interface DynamicThreshold {
  mean: number;
  std: number;
  threshold: number;
  n: number; // 标准差倍数
  upperThreshold: number; // 超大型订单阈值（3倍标准差）
  timeWindow: number; // 计算阈值的时间窗口（毫秒）
  orderCount: number; // 用于计算的订单数量
}

export interface LargeOrderEvent {
  order: OrderItem;
  isLargeOrder: boolean;
  isExtraLargeOrder: boolean;
  amountRatio: number; // 相对于阈值的比例
  timestamp: number;
  windowId: string;
}

export interface LargeOrderAnomaly {
  event: LargeOrderEvent;
  anomalyType: 'volume_spike' | 'price_jump' | 'directional_flow' | 'frequency_spike';
  confidence: number;
  intention: IntentionType;
  description: string;
}

// 计算动态阈值（均值 + N倍标准差）
export interface EnhancedDynamicThreshold extends DynamicThreshold {
  median: number; // 中位数（鲁棒性更好）
  mode: number; // 众数
  q1: number; // 第一四分位数
  q3: number; // 第三四分位数
  iqr: number; // 四分位距
  outlierCount: number; // 异常值数量
}

// 计算中位数
export function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 计算众数
export function calculateMode(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const frequencyMap = new Map<number, number>();
  for (const num of numbers) {
    frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
  }
  
  let maxFrequency = 0;
  let mode = numbers[0];
  for (const [num, freq] of frequencyMap) {
    if (freq > maxFrequency) {
      maxFrequency = freq;
      mode = num;
    }
  }
  
  return mode;
}

// 计算动态阈值（增强版，包含鲁棒性指标）
export function calculateEnhancedDynamicThreshold(orders: OrderItem[], n: number = 2): EnhancedDynamicThreshold {
  if (orders.length === 0) {
    return { mean: 0, std: 0, threshold: 0, n, median: 0, mode: 0, q1: 0, q3: 0, iqr: 0, outlierCount: 0, upperThreshold: 0, timeWindow: 0, orderCount: 0 };
  }
  
  // 提取所有订单金额
  const amounts = orders.map(order => order.tradeAmount);
  
  // 计算均值
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
  const mean = totalAmount / amounts.length;
  
  // 计算标准差
  const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
  const std = Math.sqrt(variance);
  
  // 计算阈值：均值 + N倍标准差
  const threshold = mean + n * std;
  
  // 计算中位数
  const median = calculateMedian(amounts);
  
  // 计算众数
  const mode = calculateMode(amounts);
  
  // 计算四分位数
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const q1Index = Math.floor(amounts.length * 0.25);
  const q3Index = Math.floor(amounts.length * 0.75);
  const q1 = sortedAmounts[q1Index];
  const q3 = sortedAmounts[q3Index];
  const iqr = q3 - q1;
  
  // 计算异常值数量（基于IQR）
  const outlierLowerBound = q1 - 1.5 * iqr;
  const outlierUpperBound = q3 + 1.5 * iqr;
  const outlierCount = amounts.filter(amount => amount < outlierLowerBound || amount > outlierUpperBound).length;
  
  // 计算超大型订单阈值（3倍标准差）
  const upperThreshold = mean + 3 * std;
  
  return { 
    mean, 
    std, 
    threshold, 
    n, 
    median, 
    mode, 
    q1, 
    q3, 
    iqr, 
    outlierCount,
    upperThreshold,
    timeWindow: 60000, // 默认60秒时间窗口
    orderCount: amounts.length
  };
}

// 计算动态阈值（高效版，适用于实时流处理）
export function calculateEfficientDynamicThreshold(
  orders: OrderItem[], 
  n: number = 2,
  useRobustStats: boolean = false, // 是否使用鲁棒统计（基于中位数）
  timeWindow: number = 60000 // 60秒时间窗口
): DynamicThreshold {
  if (orders.length === 0) {
    return { 
      mean: 0, 
      std: 0, 
      threshold: 0, 
      n, 
      upperThreshold: 0, 
      timeWindow: 0, 
      orderCount: 0 
    };
  }
  
  // 使用滑动窗口或最近订单计算阈值，提高实时性
  const recentOrders = orders.length > 1000 ? orders.slice(-1000) : orders;
  const orderCount = recentOrders.length;
  
  if (useRobustStats) {
    // 基于中位数的鲁棒阈值计算
    const amounts = recentOrders.map(order => order.tradeAmount);
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const median = calculateMedian(amounts);
    
    // 计算中位数绝对偏差（MAD）作为鲁棒性标准差估计
    const mad = calculateMedian(amounts.map(amount => Math.abs(amount - median)));
    const robustStd = mad * 1.4826; // 转换为标准差估计
    
    const threshold = median + n * robustStd;
    const upperThreshold = median + 3 * robustStd;
    
    return {
      mean: median, // 使用中位数作为中心趋势估计
      std: robustStd,
      threshold,
      n,
      upperThreshold,
      timeWindow,
      orderCount
    };
  } else {
    // 快速计算均值和标准差
    let sum = 0;
    let sumSquared = 0;
    for (const order of recentOrders) {
      sum += order.tradeAmount;
      sumSquared += order.tradeAmount * order.tradeAmount;
    }
    
    const count = recentOrders.length;
    const mean = sum / count;
    const variance = (sumSquared / count) - (mean * mean);
    const std = Math.sqrt(Math.max(0, variance)); // 确保方差非负
    
    const threshold = mean + n * std;
    const upperThreshold = mean + 3 * std;
    
    return {
      mean,
      std,
      threshold,
      n,
      upperThreshold,
      timeWindow,
      orderCount
    };
  }
}

// 识别特大单
export interface LargeOrderResult {
  order: OrderItem;
  isLargeOrder: boolean;
  isExtraLargeOrder: boolean;
  isHugeOrder: boolean; // 超特大单（3倍阈值）
  amountRatio: number; // 相对于均值的比例
  thresholdRatio: number; // 相对于阈值的比例
  sizeLevel: 'small' | 'medium' | 'large' | 'extra' | 'huge'; // 订单大小等级
  timestamp: number; // 处理时间戳（毫秒）
}

// 识别单个特大单（高效版）
export function identifySingleLargeOrder(
  order: OrderItem, 
  threshold: DynamicThreshold | EnhancedDynamicThreshold
): LargeOrderResult {
  // 不同级别的订单阈值
  const extraLargeThreshold = threshold.threshold * 1.5;
  const hugeOrderThreshold = threshold.threshold * 3.0;
  
  const amountRatio = threshold.mean > 0 ? order.tradeAmount / threshold.mean : 0;
  const thresholdRatio = threshold.threshold > 0 ? order.tradeAmount / threshold.threshold : 0;
  
  // 确定订单大小等级
  let sizeLevel: 'small' | 'medium' | 'large' | 'extra' | 'huge' = 'small';
  if (order.tradeAmount > hugeOrderThreshold) {
    sizeLevel = 'huge';
  } else if (order.tradeAmount > extraLargeThreshold) {
    sizeLevel = 'extra';
  } else if (order.tradeAmount > threshold.threshold) {
    sizeLevel = 'large';
  } else if (order.tradeAmount > threshold.mean) {
    sizeLevel = 'medium';
  }
  
  return {
    order,
    isLargeOrder: order.tradeAmount > threshold.threshold,
    isExtraLargeOrder: order.tradeAmount > extraLargeThreshold,
    isHugeOrder: order.tradeAmount > hugeOrderThreshold,
    amountRatio,
    thresholdRatio,
    sizeLevel,
    timestamp: Date.now()
  };
}

// 批量识别特大单
export function identifyLargeOrders(
  orders: OrderItem[], 
  dynamicThreshold: DynamicThreshold | EnhancedDynamicThreshold
): LargeOrderResult[] {
  const results = new Array(orders.length);
  
  for (let i = 0; i < orders.length; i++) {
    results[i] = identifySingleLargeOrder(orders[i], dynamicThreshold);
  }
  
  return results;
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
export type WindowType = 
  | 'tumbling' // 滚动窗口
  | 'sliding' // 滑动窗口
  | 'session' // 会话窗口
  | 'count'; // 计数窗口

// 时间语义
export type TimeCharacteristic = 
  | 'processing_time' // 处理时间
  | 'event_time' // 事件时间
  | 'ingestion_time'; // 摄入时间

// 水位线策略
export type WatermarkStrategy = 
  | 'fixed_delay' // 固定延迟
  | 'bounded_out_of_orderness' // 有界乱序
  | 'monotonous'; // 单调递增

// 窗口配置
export interface WindowConfig {
  type: WindowType;
  size: number; // 窗口大小（数量窗口为订单数，时间窗口为毫秒）
  slide?: number; // 滑动窗口的滑动步长
  gap?: number; // Session窗口的间隙
  timeCharacteristic?: TimeCharacteristic; // 时间语义
  watermarkStrategy?: WatermarkStrategy; // 水位线策略
  watermarkDelay?: number; // 水位线延迟（毫秒）
}

// 水位线
export interface Watermark {
  timestamp: number; // 水位线时间戳
  ingestionTime: number; // 摄入时间
  eventTime: number; // 事件时间
}

// 窗口状态
export interface WindowState<T> {
  windowId: string;
  startTime: number;
  endTime: number;
  elements: T[];
  isClosed: boolean;
  triggerCount: number;
  lastTriggerTime: number;
}

// 触发策略
export type TriggerStrategy = 
  | 'time' // 时间触发
  | 'count' // 计数触发
  | 'event_time' // 事件时间触发
  | 'processing_time'; // 处理时间触发

// 窗口触发条件
export interface TriggerCondition {
  type: TriggerStrategy;
  count?: number; // 计数触发阈值
  interval?: number; // 时间触发间隔
}

// 状态后端
export interface StateBackend {
  get(key: string): any;
  put(key: string, value: any): void;
  delete(key: string): void;
  clear(): void;
}

// 内存状态后端（简单实现）
export class MemoryStateBackend implements StateBackend {
  private state: Map<string, any> = new Map();

  get(key: string): any {
    return this.state.get(key);
  }

  put(key: string, value: any): void {
    this.state.set(key, value);
  }

  delete(key: string): void {
    this.state.delete(key);
  }

  clear(): void {
    this.state.clear();
  }
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

// EnhancedOrderStreamProcessor的具体实现（基于Flink流处理逻辑）
export class FlinkStyleOrderStreamProcessor implements EnhancedOrderStreamProcessor {
  private windowProcessors: Map<string, WindowProcessor<OrderItem>> = new Map();
  private largeOrderResults: LargeOrderResult[] = [];
  private currentThreshold: DynamicThreshold = { 
    mean: 0, 
    std: 0, 
    threshold: 0, 
    n: 2, 
    upperThreshold: 0, 
    timeWindow: 60000, 
    orderCount: 0 
  };
  private maxHistorySize: number = 1000;
  private n: number = 2;
  
  constructor(windowConfigs: WindowConfig[], n: number = 2) {
    this.n = n;
    // 创建不同类型的窗口处理器
    windowConfigs.forEach((config, index) => {
      this.windowProcessors.set(`window-${index}-${config.type}`, new WindowProcessor(config, n));
    });
  }
  
  processOrder(order: OrderItem): LargeOrderResult {
    // 更新动态阈值
    this.updateDynamicThreshold(order);
    
    // 识别单个特大单
    const result = identifySingleLargeOrder(order, this.currentThreshold);
    
    // 将结果添加到历史记录
    this.largeOrderResults.push(result);
    if (this.largeOrderResults.length > this.maxHistorySize) {
      this.largeOrderResults.shift();
    }
    
    // 将订单分发到所有窗口处理器
    for (const [windowId, processor] of this.windowProcessors.entries()) {
      processor.processOrder(order);
    }
    
    return result;
  }
  
  private updateDynamicThreshold(order: OrderItem): void {
    // 使用高效版动态阈值计算
    const recentOrders = this.largeOrderResults.slice(-1000).map(result => result.order);
    recentOrders.push(order);
    
    this.currentThreshold = calculateEfficientDynamicThreshold(recentOrders, this.n);
  }
  
  getCurrentThreshold(): DynamicThreshold {
    return this.currentThreshold;
  }
  
  getStatistics(): LargeOrderStatistics {
    return calculateLargeOrderStats(this.largeOrderResults);
  }
  
  getWindowStatistics(windowId: string): LargeOrderStatistics {
    // 这个方法需要更复杂的实现，需要访问窗口内部的元素
    // 目前返回一个空的统计结果
    return {
      totalOrders: 0,
      largeOrders: 0,
      extraLargeOrders: 0,
      totalAmount: 0,
      largeOrderAmount: 0,
      largeOrderRatio: 0,
      netInflow: 0,
      orderPower: {
        buyAmount: 0,
        sellAmount: 0,
        buyRatio: 0,
        sellRatio: 0
      }
    };
  }
  
  getActiveWindows(): string[] {
    return Array.from(this.windowProcessors.keys());
  }
  
  reset(): void {
    this.largeOrderResults = [];
    this.windowProcessors.clear();
    this.currentThreshold = { 
      mean: 0, 
      std: 0, 
      threshold: 0, 
      n: 2, 
      upperThreshold: 0, 
      timeWindow: 60000, 
      orderCount: 0 
    };
  }
}

// 窗口处理器（增强版，支持Flink式的窗口管理）
export class WindowProcessor<T extends { tradeTime: string }> {
  private windowConfig: WindowConfig;
  private windowStates: Map<string, WindowState<T>> = new Map();
  private watermark: Watermark = { timestamp: 0, ingestionTime: 0, eventTime: 0 };
  private stateBackend: StateBackend;
  private n: number = 2;
  private currentCount: number = 0;
  private lastWatermarkUpdate: number = Date.now();
  
  constructor(windowConfig: WindowConfig, n: number = 2, stateBackend?: StateBackend) {
    this.windowConfig = windowConfig;
    this.n = n;
    this.stateBackend = stateBackend || new MemoryStateBackend();
  }
  
  // 处理单个事件
  processOrder(order: T): string[] {
    // 获取事件时间（根据配置选择时间语义）
    const eventTime = this.getEventTime(order);
    const currentTime = Date.now();
    
    // 更新水位线
    this.updateWatermark(eventTime, currentTime);
    
    // 根据窗口类型计算窗口ID
    const windowIds = this.getWindowIds(order, eventTime);
    
    // 将事件添加到对应的窗口
    for (const windowId of windowIds) {
      this.addToWindow(windowId, order, eventTime);
    }
    
    // 检查窗口触发条件
    this.checkWindowTriggers();
    
    // 清理过期窗口
    this.cleanExpiredWindows();
    
    return windowIds;
  }
  
  // 获取事件时间
  private getEventTime(order: T): number {
    const { timeCharacteristic } = this.windowConfig;
    const eventTime = new Date(order.tradeTime).getTime();
    const processingTime = Date.now();
    
    switch (timeCharacteristic) {
      case 'event_time':
        return eventTime;
      case 'processing_time':
        return processingTime;
      case 'ingestion_time':
      default:
        return processingTime; // 默认为摄入时间
    }
  }
  
  // 更新水位线
  private updateWatermark(eventTime: number, ingestionTime: number): void {
    const { watermarkStrategy, watermarkDelay = 0 } = this.windowConfig;
    
    let newWatermark: Watermark;
    
    switch (watermarkStrategy) {
      case 'fixed_delay':
        newWatermark = {
          timestamp: eventTime - watermarkDelay,
          ingestionTime,
          eventTime
        };
        break;
      case 'bounded_out_of_orderness':
        newWatermark = {
          timestamp: eventTime - watermarkDelay,
          ingestionTime,
          eventTime
        };
        break;
      case 'monotonous':
      default:
        newWatermark = {
          timestamp: Math.max(eventTime, this.watermark.timestamp),
          ingestionTime,
          eventTime
        };
    }
    
    // 只有当新水位线大于当前水位线时才更新
    if (newWatermark.timestamp > this.watermark.timestamp) {
      this.watermark = newWatermark;
      this.lastWatermarkUpdate = ingestionTime;
    }
  }
  
  // 获取窗口ID（支持多种窗口类型）
  private getWindowIds(order: T, eventTime: number): string[] {
    const { type, size, slide = size } = this.windowConfig;
    const windowIds: string[] = [];
    
    switch (type) {
      case 'tumbling':
        // 滚动窗口
        const windowNumber = Math.floor(eventTime / size);
        windowIds.push(`${type}-${windowNumber}`);
        break;
        
      case 'sliding':
        // 滑动窗口
        const firstWindow = Math.floor((eventTime - size + 1) / slide);
        const lastWindow = Math.floor(eventTime / slide);
        
        for (let i = firstWindow; i <= lastWindow; i++) {
          windowIds.push(`${type}-${i}`);
        }
        break;
        
      case 'session':
        // 会话窗口
        const gap = this.windowConfig.gap || size;
        let sessionWindowId = '';
        
        // 查找是否有符合条件的会话窗口
        for (const [windowId, state] of this.windowStates.entries()) {
          if (windowId.startsWith('session-') && !state.isClosed) {
            if (eventTime - state.endTime <= gap) {
              sessionWindowId = windowId;
              break;
            }
          }
        }
        
        // 如果没有找到，创建新的会话窗口
        if (!sessionWindowId) {
          sessionWindowId = `session-${eventTime}`;
        }
        
        windowIds.push(sessionWindowId);
        break;
        
      case 'count':
        // 计数窗口
        const countWindowNumber = Math.floor(this.currentCount / size);
        windowIds.push(`count-${countWindowNumber}`);
        this.currentCount++;
        break;
        
      default:
        windowIds.push(`${type}-${eventTime}`);
    }
    
    return windowIds;
  }
  
  // 将事件添加到窗口
  private addToWindow(windowId: string, order: T, eventTime: number): void {
    let state = this.windowStates.get(windowId);
    
    if (!state) {
      // 创建新窗口状态
      const { size, slide = size } = this.windowConfig;
      let startTime: number;
      let endTime: number;
      
      switch (this.windowConfig.type) {
        case 'tumbling':
          startTime = Math.floor(eventTime / size) * size;
          endTime = startTime + size;
          break;
        case 'sliding':
          const windowNumber = parseInt(windowId.split('-')[1]);
          startTime = windowNumber * slide;
          endTime = startTime + size;
          break;
        case 'session':
          startTime = eventTime;
          endTime = eventTime;
          break;
        case 'count':
          startTime = eventTime;
          endTime = eventTime; // 计数窗口的时间范围动态更新
          break;
        default:
          startTime = eventTime;
          endTime = eventTime + size;
      }
      
      state = {
        windowId,
        startTime,
        endTime,
        elements: [],
        isClosed: false,
        triggerCount: 0,
        lastTriggerTime: Date.now()
      } as unknown as WindowState<T>;
      
      this.windowStates.set(windowId, state);
    }
    
    // 更新窗口结束时间（适用于会话窗口和计数窗口）
    if (this.windowConfig.type === 'session' || this.windowConfig.type === 'count') {
      state.endTime = Math.max(state.endTime, eventTime);
    }
    
    // 添加事件到窗口
    state.elements.push(order);
  }
  
  // 检查窗口触发条件
  private checkWindowTriggers(): void {
    const currentTime = Date.now();
    
    for (const [windowId, state] of this.windowStates.entries()) {
      if (state.isClosed) continue;
      
      // 检查窗口是否应该触发
      const shouldTrigger = this.shouldTriggerWindow(state, currentTime);
      
      if (shouldTrigger) {
        this.triggerWindow(windowId);
      }
      
      // 检查窗口是否应该关闭
      const shouldClose = this.shouldCloseWindow(state, currentTime);
      
      if (shouldClose) {
        this.closeWindow(windowId);
      }
    }
  }
  
  // 判断窗口是否应该触发
  private shouldTriggerWindow(state: WindowState<T>, currentTime: number): boolean {
    const { type, size } = this.windowConfig;
    
    switch (type) {
      case 'tumbling':
      case 'sliding':
        // 基于时间的触发
        return this.watermark.timestamp >= state.endTime;
      case 'count':
        // 基于计数的触发
        return state.elements.length >= size;
      case 'session':
        // 会话窗口在会话结束时触发
        const gap = this.windowConfig.gap || size;
        return currentTime - state.endTime > gap;
      default:
        return false;
    }
  }
  
  // 判断窗口是否应该关闭
  private shouldCloseWindow(state: WindowState<T>, currentTime: number): boolean {
    const { size } = this.windowConfig;
    
    switch (this.windowConfig.type) {
      case 'tumbling':
      case 'sliding':
        // 时间窗口在水位线超过窗口结束时间后关闭
        return this.watermark.timestamp >= state.endTime + size;
      case 'count':
        // 计数窗口在触发后关闭
        return state.triggerCount > 0;
      case 'session':
        // 会话窗口在会话结束且触发后关闭
        const gap = this.windowConfig.gap || size;
        return currentTime - state.endTime > gap && state.triggerCount > 0;
      default:
        return false;
    }
  }
  
  // 触发窗口计算
  private triggerWindow(windowId: string): void {
    const state = this.windowStates.get(windowId);
    if (!state || state.isClosed) return;
    
    // 这里可以添加窗口计算逻辑
    state.triggerCount++;
    state.lastTriggerTime = Date.now();
    
    // 保存窗口状态到状态后端
    this.stateBackend.put(`window-${windowId}`, state);
  }
  
  // 关闭窗口
  private closeWindow(windowId: string): void {
    const state = this.windowStates.get(windowId);
    if (!state) return;
    
    state.isClosed = true;
    
    // 保存窗口状态到状态后端
    this.stateBackend.put(`window-${windowId}-closed`, state);
    
    // 从内存中清理窗口状态
    // 注意：在实际应用中，可能需要保留一定时间的窗口状态用于查询
    // this.windowStates.delete(windowId);
  }
  
  // 清理过期窗口
  private cleanExpiredWindows(): void {
    const currentTime = Date.now();
    
    for (const [windowId, state] of this.windowStates.entries()) {
      if (state.isClosed) {
        // 清理已经关闭的窗口
        const { type, size } = this.windowConfig;
        let expirationTime: number;
        
        switch (type) {
          case 'tumbling':
          case 'sliding':
            expirationTime = state.endTime + size;
            break;
          case 'session':
            const gap = this.windowConfig.gap || size;
            expirationTime = state.endTime + gap;
            break;
          case 'count':
            expirationTime = state.endTime + 3600000; // 默认保留1小时
            break;
          default:
            expirationTime = state.endTime + size;
        }
        
        if (currentTime > expirationTime) {
          this.windowStates.delete(windowId);
          this.stateBackend.delete(`window-${windowId}`);
        }
      }
    }
  }
  
  // 获取窗口状态
  getWindowState(windowId: string): WindowState<T> | undefined {
    return this.windowStates.get(windowId);
  }
  
  // 获取所有活跃窗口
  getActiveWindows(): string[] {
    return Array.from(this.windowStates.keys())
      .filter(windowId => {
        const state = this.windowStates.get(windowId);
        return state && !state.isClosed;
      });
  }
  
  // 获取所有关闭的窗口
  getClosedWindows(): string[] {
    return Array.from(this.windowStates.keys())
      .filter(windowId => {
        const state = this.windowStates.get(windowId);
        return state && state.isClosed;
      });
  }
  
  // 获取当前水位线
  getCurrentWatermark(): Watermark {
    return this.watermark;
  }
  
  // 重置处理器
  reset(): void {
    this.windowStates.clear();
    this.currentCount = 0;
    this.watermark = { timestamp: 0, ingestionTime: 0, eventTime: 0 };
    this.stateBackend.clear();
  }
}

// 增强的实时特大单处理器（支持Flink式批流处理）
export class EnhancedRealTimeLargeOrderProcessor implements EnhancedOrderStreamProcessor {
  private orderBuffer: OrderItem[] = [];
  private maxBufferSize: number = 10000; // 增大缓冲容量
  private n: number = 2; // 标准差倍数
  private results: LargeOrderResult[] = [];
  private windowProcessors: Map<string, WindowProcessor<OrderItem>> = new Map();
  private currentThreshold: EnhancedDynamicThreshold = {
    mean: 0, 
    std: 0, 
    threshold: 0, 
    n: this.n,
    median: 0,
    mode: 0,
    q1: 0,
    q3: 0,
    iqr: 0,
    outlierCount: 0,
    upperThreshold: 0,
    timeWindow: 0,
    orderCount: 0
  };
  private lastProcessTime: number = Date.now();
  private stateBackend: StateBackend;
  private parallelism: number = 4; // 并行度
  private operatorChain: Array<(order: OrderItem) => OrderItem> = []; // 操作符链
  private checkpointInterval: number = 30000; // 检查点间隔（30秒）
  private lastCheckpointTime: number = Date.now();
  
  constructor(maxBufferSize: number = 10000, n: number = 2, stateBackend?: StateBackend, parallelism: number = 4) {
    this.maxBufferSize = maxBufferSize;
    this.n = n;
    this.stateBackend = stateBackend || new MemoryStateBackend();
    this.parallelism = parallelism;
    
    // 初始化不同类型的窗口处理器（支持事件时间和水位线）
    this.windowProcessors.set('5s-event-time-tumbling', new WindowProcessor<OrderItem>({
      type: 'tumbling', 
      size: 5000, // 5秒滚动窗口
      timeCharacteristic: 'event_time',
      watermarkStrategy: 'bounded_out_of_orderness',
      watermarkDelay: 1000 // 1秒水位线延迟
    }, this.n, this.stateBackend));
    
    this.windowProcessors.set('10s-processing-time-sliding', new WindowProcessor<OrderItem>({
      type: 'sliding', 
      size: 10000, // 10秒滑动窗口
      slide: 2000, // 2秒滑动步长
      timeCharacteristic: 'processing_time',
      watermarkStrategy: 'monotonous'
    }, this.n, this.stateBackend));
    
    this.windowProcessors.set('100-count-window', new WindowProcessor<OrderItem>({
      type: 'count', 
      size: 100, // 100个订单的滚动窗口
      timeCharacteristic: 'processing_time'
    }, this.n, this.stateBackend));
    
    this.windowProcessors.set('session-window', new WindowProcessor<OrderItem>({
      type: 'session', 
      size: 5000, // 5秒会话间隙
      gap: 5000,
      timeCharacteristic: 'event_time',
      watermarkStrategy: 'fixed_delay',
      watermarkDelay: 1000
    }, this.n, this.stateBackend));
    
    // 初始化检查点定时器
    this.initCheckpointTimer();
  }
  
  // 初始化检查点定时器
  private initCheckpointTimer(): void {
    setInterval(() => {
      this.createCheckpoint();
    }, this.checkpointInterval);
  }
  
  // 创建检查点（模拟Flink的检查点机制）
  private createCheckpoint(): void {
    const checkpointId = `checkpoint-${Date.now()}`;
    
    // 保存当前状态到状态后端
    this.stateBackend.put(`${checkpointId}-orderBuffer`, this.orderBuffer);
    this.stateBackend.put(`${checkpointId}-results`, this.results);
    this.stateBackend.put(`${checkpointId}-currentThreshold`, this.currentThreshold);
    this.stateBackend.put(`${checkpointId}-lastProcessTime`, this.lastProcessTime);
    
    // 保存窗口处理器状态
    for (const [name, processor] of this.windowProcessors.entries()) {
      this.stateBackend.put(`${checkpointId}-windowProcessor-${name}`, {
        activeWindows: processor.getActiveWindows(),
        closedWindows: processor.getClosedWindows(),
        watermark: processor.getCurrentWatermark()
      });
    }
    
    console.log(`Checkpoint created: ${checkpointId}`);
    this.lastCheckpointTime = Date.now();
  }
  
  // 从检查点恢复（模拟Flink的状态恢复）
  public restoreFromCheckpoint(checkpointId: string): boolean {
    try {
      // 恢复基本状态
      const orderBuffer = this.stateBackend.get(`${checkpointId}-orderBuffer`);
      const results = this.stateBackend.get(`${checkpointId}-results`);
      const currentThreshold = this.stateBackend.get(`${checkpointId}-currentThreshold`);
      const lastProcessTime = this.stateBackend.get(`${checkpointId}-lastProcessTime`);
      
      if (orderBuffer && results && currentThreshold && lastProcessTime) {
        this.orderBuffer = orderBuffer;
        this.results = results;
        this.currentThreshold = currentThreshold;
        this.lastProcessTime = lastProcessTime;
        
        // 恢复窗口处理器状态（简化实现）
        for (const [name, processor] of this.windowProcessors.entries()) {
          const windowState = this.stateBackend.get(`${checkpointId}-windowProcessor-${name}`);
          if (windowState) {
            console.log(`Restored window processor ${name} from checkpoint`);
          }
        }
        
        console.log(`Successfully restored from checkpoint: ${checkpointId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to restore from checkpoint: ${checkpointId}`, error);
      return false;
    }
  }
  
  // 添加操作符到操作符链
  public addOperator(operator: (order: OrderItem) => OrderItem): void {
    this.operatorChain.push(operator);
  }
  
  // 处理单个订单（支持操作符链）
  processOrder(order: OrderItem): LargeOrderResult {
    const startTime = Date.now();
    
    // 应用操作符链（类似Flink的操作符链）
    let processedOrder = { ...order };
    for (const operator of this.operatorChain) {
      processedOrder = operator(processedOrder);
    }
    
    // 添加到全局缓冲
    this.orderBuffer.push(processedOrder);
    
    // 如果缓冲超过最大大小，移除最早的订单
    if (this.orderBuffer.length > this.maxBufferSize) {
      this.orderBuffer.shift();
    }
    
    // 更新所有窗口处理器
    for (const [name, processor] of this.windowProcessors.entries()) {
      const windowIds = processor.processOrder(processedOrder);
      
      // 计算窗口阈值和识别特大单
      for (const windowId of windowIds) {
        const windowState = processor.getWindowState(windowId);
        if (windowState && windowState.elements.length > 0) {
          const windowOrders = windowState.elements;
          const windowThreshold = calculateEnhancedDynamicThreshold(windowOrders, this.n);
          
          // 识别特大单
          const windowResults = windowOrders.map(ord => identifySingleLargeOrder(ord, windowThreshold));
          
          // 这里可以添加窗口结果的保存逻辑
          this.stateBackend.put(`window-results-${windowId}`, windowResults);
        }
      }
    }
    
    // 定期更新全局阈值（每100个订单或1秒）
    if (this.orderBuffer.length % 100 === 0 || Date.now() - this.lastProcessTime > 1000) {
      this.currentThreshold = this.calculateOptimizedThreshold();
      this.lastProcessTime = Date.now();
      
      // 保存阈值到状态后端
      this.stateBackend.put('current-threshold', this.currentThreshold);
    }
    
    // 识别当前订单
    const result = identifySingleLargeOrder(processedOrder, this.currentThreshold);
    
    // 添加到结果历史（限制结果数量）
    this.results.push(result);
    if (this.results.length > this.maxBufferSize) {
      this.results.shift();
    }
    
    // 保存结果到状态后端
    this.stateBackend.put(`result-${result.timestamp}`, result);
    
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
    // 从状态后端获取窗口结果
    const windowResults = this.stateBackend.get(`window-results-${windowId}`) as LargeOrderResult[];
    if (windowResults && windowResults.length > 0) {
      return calculateLargeOrderStats(windowResults);
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
  
  getClosedWindows(): string[] {
    const windows: string[] = [];
    for (const [name, processor] of this.windowProcessors.entries()) {
      // 注意：这里需要WindowProcessor公开getClosedWindows方法
      // windows.push(...processor.getClosedWindows());
    }
    return windows;
  }
  
  reset(): void {
    this.orderBuffer = [];
    this.results = [];
    this.windowProcessors.clear();
    this.currentThreshold = {
      mean: 0, 
      std: 0, 
      threshold: 0, 
      n: this.n,
      median: 0,
      mode: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      outlierCount: 0,
      upperThreshold: 0,
      timeWindow: 0,
      orderCount: 0
    };
    
    // 清空状态后端
    this.stateBackend.clear();
  }
  
  // 批量处理（模拟Flink的批量处理）
  public batchProcess(orders: OrderItem[]): Promise<LargeOrderResult[]> {
    return new Promise((resolve) => {
      // 并行处理订单（使用工作线程池模拟Flink的并行执行）
      const chunkSize = Math.ceil(orders.length / this.parallelism);
      const chunks: OrderItem[][] = [];
      
      // 将订单分成多个批次
      for (let i = 0; i < orders.length; i += chunkSize) {
        chunks.push(orders.slice(i, i + chunkSize));
      }
      
      // 并行处理每个批次
      const promises = chunks.map(chunk => {
        return new Promise<LargeOrderResult[]>((chunkResolve) => {
          const chunkResults: LargeOrderResult[] = [];
          
          // 处理批次中的每个订单
          for (const order of chunk) {
            // 应用操作符链
            let processedOrder = { ...order };
            for (const operator of this.operatorChain) {
              processedOrder = operator(processedOrder);
            }
            
            // 识别特大单
            const result = identifySingleLargeOrder(processedOrder, this.currentThreshold);
            chunkResults.push(result);
          }
          
          chunkResolve(chunkResults);
        });
      });
      
      // 合并结果
      Promise.all(promises).then(chunkResults => {
        const allResults = chunkResults.flat();
        
        // 更新全局状态
        this.results.push(...allResults);
        this.orderBuffer.push(...orders);
        
        // 保存批量处理结果
        this.stateBackend.put(`batch-result-${Date.now()}`, allResults);
        
        resolve(allResults);
      });
    });
  }
  
  private calculateOptimizedThreshold(): EnhancedDynamicThreshold {
    if (this.orderBuffer.length === 0) {
      return {
        mean: 0, 
        std: 0, 
        threshold: 0, 
        n: this.n,
        median: 0,
        mode: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        outlierCount: 0,
        upperThreshold: 0,
        timeWindow: 0,
        orderCount: 0
      };
    }
    
    // 使用最近的1000个订单计算阈值，提高实时性
    const recentOrders = this.orderBuffer.slice(-1000);
    return calculateEnhancedDynamicThreshold(recentOrders, this.n);
  }
  
  // 获取当前并行度
  public getParallelism(): number {
    return this.parallelism;
  }
  
  // 设置并行度
  public setParallelism(parallelism: number): void {
    if (parallelism > 0) {
      this.parallelism = parallelism;
    }
  }
  
  // 获取检查点间隔
  public getCheckpointInterval(): number {
    return this.checkpointInterval;
  }
  
  // 设置检查点间隔
  public setCheckpointInterval(interval: number): void {
    if (interval > 0) {
      this.checkpointInterval = interval;
    }
  };
}

// 识别大单异常事件
export function detectLargeOrderAnomalies(
  orders: OrderItem[],
  dynamicThreshold: DynamicThreshold
): LargeOrderAnomaly[] {
  const anomalies: LargeOrderAnomaly[] = [];
  
  if (orders.length === 0) return anomalies;
  
  // 排序订单
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.tradeTime).getTime() - new Date(b.tradeTime).getTime()
  );
  
  // 计算订单频率（每秒订单数）
  const timeWindow = 10000; // 10秒窗口
  const orderFrequencies: { [key: string]: number } = {};
  
  // 计算最近10秒的订单频率
  for (let i = 0; i < sortedOrders.length; i++) {
    const order = sortedOrders[i];
    const orderTime = new Date(order.tradeTime).getTime();
    const windowKey = Math.floor(orderTime / timeWindow).toString();
    
    orderFrequencies[windowKey] = (orderFrequencies[windowKey] || 0) + 1;
  }
  
  const avgFrequency = Object.values(orderFrequencies).reduce((sum, count) => sum + count, 0) / Object.keys(orderFrequencies).length;
  const freqThreshold = avgFrequency * 2; // 频率超过平均值2倍视为异常
  
  // 检测买单和卖单的方向性流动
  let buyAmount = 0;
  let sellAmount = 0;
  for (const order of sortedOrders) {
    if (order.tradeDirection === 'buy') {
      buyAmount += order.tradeAmount;
    } else {
      sellAmount += order.tradeAmount;
    }
  }
  const totalAmount = buyAmount + sellAmount;
  const directionalRatio = totalAmount > 0 ? Math.abs(buyAmount - sellAmount) / totalAmount : 0;
  
  // 检测每个订单的异常
  for (const order of sortedOrders) {
    const orderTime = new Date(order.tradeTime).getTime();
    const windowKey = Math.floor(orderTime / timeWindow).toString();
    const currentFreq = orderFrequencies[windowKey] || 0;
    
    // 判断是否为大单
    const isLargeOrder = order.tradeAmount > dynamicThreshold.threshold;
    const isExtraLargeOrder = order.tradeAmount > dynamicThreshold.upperThreshold;
    const amountRatio = order.tradeAmount / dynamicThreshold.mean;
    
    // 只处理大单
    if (!isLargeOrder) continue;
    
    let anomalyType: LargeOrderAnomaly['anomalyType'] = 'volume_spike';
    let confidence = 0.0;
    let intention: IntentionType = 'unknown';
    let description = '';
    
    // 检测成交量异常
    if (amountRatio > 3) {
      anomalyType = 'volume_spike';
      confidence = Math.min(1.0, (amountRatio - 3) / 5);
    }
    
    // 检测价格跳变（需要结合价格数据）
    // 这里简化处理，假设大订单可能导致价格跳变
    if (order.orderType === 'market' && amountRatio > 2) {
      anomalyType = 'price_jump';
      confidence = Math.min(1.0, (amountRatio - 2) / 4);
    }
    
    // 检测方向性流动
    if (directionalRatio > 0.7 && amountRatio > 2) {
      anomalyType = 'directional_flow';
      confidence = Math.min(1.0, (directionalRatio - 0.7) / 0.3 + (amountRatio - 2) / 5);
    }
    
    // 检测频率异常
    if (currentFreq > freqThreshold && amountRatio > 2) {
      anomalyType = 'frequency_spike';
      confidence = Math.min(1.0, (currentFreq / freqThreshold - 1) + (amountRatio - 2) / 5);
    }
    
    // 确定意图
    if (order.tradeDirection === 'buy' && amountRatio > 2) {
      if (directionalRatio > 0.7) {
        intention = 'accumulation';
        description = '主力低位吸筹迹象明显，大量资金流入';
      } else if (currentFreq > freqThreshold) {
        intention = 'pullUp';
        description = '主力快速拉升股价，大量买单涌入';
      }
    } else if (order.tradeDirection === 'sell' && amountRatio > 2) {
      if (directionalRatio > 0.7) {
        intention = 'distribution';
        description = '主力高位出货迹象明显，大量资金流出';
      } else if (currentFreq > freqThreshold) {
        intention = 'suppress';
        description = '主力快速打压股价，大量卖单涌出';
      }
    }
    
    if (confidence > 0.3) {
      anomalies.push({
        event: {
          order,
          isLargeOrder,
          isExtraLargeOrder,
          amountRatio,
          timestamp: orderTime,
          windowId: windowKey
        },
        anomalyType,
        confidence,
        intention,
        description
      });
    }
  }
  
  // 按置信度排序
  return anomalies.sort((a, b) => b.confidence - a.confidence);
}

// 生成大单异动告警
export function generateLargeOrderAlert(anomaly: LargeOrderAnomaly): string | null {
  if (anomaly.confidence < 0.5) return null;
  
  const strength = anomaly.confidence > 0.8 ? '强烈' : anomaly.confidence > 0.6 ? '中等' : '轻微';
  const direction = anomaly.event.order.tradeDirection === 'buy' ? '买入' : '卖出';
  
  const descriptions = {
    'volume_spike': `${strength}${direction}量异常放大`,
    'price_jump': `${strength}价格跳变，${direction}大单推动`,
    'directional_flow': `${strength}${direction}方向资金流集中`,
    'frequency_spike': `${strength}${direction}大单频率异常`
  };
  
  const baseDescription = descriptions[anomaly.anomalyType] || '大单异动';
  
  return `${baseDescription}：${anomaly.description}（置信度：${(anomaly.confidence * 100).toFixed(1)}%）`;
}

// 批量处理订单（模拟Flink的批量处理）
export function batchProcessOrders(
  orders: OrderItem[],
  windowConfig: WindowConfig,
  n: number = 2
): Map<string, LargeOrderResult[]> {
  const processor = new WindowProcessor<OrderItem>(windowConfig, n);
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
    const windowState = processor.getWindowState(windowId);
    const windowOrders = windowState ? windowState.elements : [];
    const windowThreshold = calculateEnhancedDynamicThreshold(windowOrders, n);
    const windowResults = windowOrders.map(order => {
      const extraLargeThreshold = windowThreshold.threshold * 1.5;
      const hugeOrderThreshold = windowThreshold.threshold * 3.0;
      const amountRatio = windowThreshold.mean > 0 ? order.tradeAmount / windowThreshold.mean : 0;
      const thresholdRatio = windowThreshold.threshold > 0 ? order.tradeAmount / windowThreshold.threshold : 0;
      
      // 确定订单大小等级
      let sizeLevel: 'small' | 'medium' | 'large' | 'extra' | 'huge' = 'small';
      if (order.tradeAmount > hugeOrderThreshold) {
        sizeLevel = 'huge';
      } else if (order.tradeAmount > extraLargeThreshold) {
        sizeLevel = 'extra';
      } else if (order.tradeAmount > windowThreshold.threshold) {
        sizeLevel = 'large';
      } else if (order.tradeAmount > windowThreshold.mean) {
        sizeLevel = 'medium';
      }
      
      return {
        order,
        isLargeOrder: order.tradeAmount > windowThreshold.threshold,
        isExtraLargeOrder: order.tradeAmount > extraLargeThreshold,
        isHugeOrder: order.tradeAmount > hugeOrderThreshold,
        amountRatio,
        thresholdRatio,
        sizeLevel,
        timestamp: Date.now()
      };
    });
    
    resultsMap.set(windowId, windowResults);
  }
  
  return resultsMap;
}

// 订单意图分析
export type OrderIntention = 
  | 'accumulation' // 吸筹
  | 'distribution' // 出货
  | 'supportBuy' // 支撑位买入
  | 'resistanceSell' // 压力位卖出
  | 'panicSell' // 恐慌性卖出
  | 'panicBuy' // 恐慌性买入
  | 'normalTrade' // 正常交易
  | 'unknown'; // 未知

// 订单意图分析参数
export interface OrderIntentionAnalysisParams {
  largeOrderResult: LargeOrderResult;
  currentPrice: number; // 当前市场价格
  supportLevels?: Array<{ price: number; strength: number }>; // 支撑位
  resistanceLevels?: Array<{ price: number; strength: number }>; // 压力位
  recentPriceTrend: 'up' | 'down' | 'sideways'; // 近期价格趋势
  volumeTrend: 'up' | 'down' | 'stable'; // 成交量趋势
  priceImpact?: number; // 价格冲击（订单成交前后的价格变化）
}

// 订单意图分析结果
export interface OrderIntentionAnalysisResult {
  order: OrderItem;
  intention: OrderIntention;
  confidence: number; // 意图识别置信度（0-1）
  factors: {
    sizeFactor: number; // 订单大小因子（0-1）
    priceFactor: number; // 价格因子（0-1）
    trendFactor: number; // 趋势因子（0-1）
    volumeFactor: number; // 成交量因子（0-1）
  };
  analysisTime: number; // 分析时间戳（毫秒）
}

// 单个订单意图分析
export function analyzeOrderIntention(
  params: OrderIntentionAnalysisParams
): OrderIntentionAnalysisResult {
  const { 
    largeOrderResult, 
    currentPrice, 
    supportLevels = [], 
    resistanceLevels = [], 
    recentPriceTrend = 'sideways',
    volumeTrend = 'stable',
    priceImpact = 0
  } = params;
  
  const order = largeOrderResult.order;
  const isBuyOrder = order.tradeDirection === 'buy';
  const isLargeOrder = largeOrderResult.isLargeOrder;
  const priceDiff = order.tradePrice - currentPrice;
  const priceDiffRatio = currentPrice > 0 ? Math.abs(priceDiff) / currentPrice : 0;
  
  // 计算各个因子
  const sizeFactor = Math.min(1, largeOrderResult.thresholdRatio / 3); // 订单大小因子
  const priceFactor = priceImpact !== undefined ? Math.min(1, Math.abs(priceImpact) / 10) : 0; // 价格冲击因子
  
  // 趋势因子（根据趋势和订单方向的一致性）
  let trendFactor = 0;
  if (recentPriceTrend === 'up' && isBuyOrder) {
    trendFactor = 0.5;
  } else if (recentPriceTrend === 'down' && !isBuyOrder) {
    trendFactor = 0.5;
  } else if (recentPriceTrend === 'up' && !isBuyOrder) {
    trendFactor = -0.5;
  } else if (recentPriceTrend === 'down' && isBuyOrder) {
    trendFactor = -0.5;
  }
  
  // 成交量因子
  const volumeFactor = volumeTrend === 'up' ? 0.3 : (volumeTrend === 'down' ? -0.3 : 0);
  
  // 检查支撑位/压力位
  let isNearSupport = false;
  let isNearResistance = false;
  let supportStrength = 0;
  let resistanceStrength = 0;
  
  // 检查是否接近支撑位
  for (const support of supportLevels) {
    const priceDistance = Math.abs(order.tradePrice - support.price);
    const priceRatio = support.price > 0 ? priceDistance / support.price : 0;
    if (priceRatio < 0.02) { // 在支撑位2%范围内
      isNearSupport = true;
      supportStrength = support.strength;
      break;
    }
  }
  
  // 检查是否接近压力位
  for (const resistance of resistanceLevels) {
    const priceDistance = Math.abs(order.tradePrice - resistance.price);
    const priceRatio = resistance.price > 0 ? priceDistance / resistance.price : 0;
    if (priceRatio < 0.02) { // 在压力位2%范围内
      isNearResistance = true;
      resistanceStrength = resistance.strength;
      break;
    }
  }
  
  // 确定订单意图
  let intention: OrderIntention = 'normalTrade';
  let confidence = 0.5;
  
  // 基于支撑位/压力位的意图判断
  if (isBuyOrder && isNearSupport && supportStrength > 0.5) {
    intention = 'supportBuy';
    confidence = 0.7 + supportStrength * 0.2 + sizeFactor * 0.1;
  } else if (!isBuyOrder && isNearResistance && resistanceStrength > 0.5) {
    intention = 'resistanceSell';
    confidence = 0.7 + resistanceStrength * 0.2 + sizeFactor * 0.1;
  }
  // 基于订单大小和方向的意图判断
  else if (isBuyOrder && isLargeOrder && sizeFactor > 0.5 && recentPriceTrend === 'down') {
    intention = 'accumulation';
    confidence = 0.6 + sizeFactor * 0.3 + volumeFactor * 0.1;
  } else if (!isBuyOrder && isLargeOrder && sizeFactor > 0.5 && recentPriceTrend === 'up') {
    intention = 'distribution';
    confidence = 0.6 + sizeFactor * 0.3 + volumeFactor * 0.1;
  }
  // 基于价格冲击的意图判断
  else if (priceImpact !== undefined) {
    if (priceImpact > 3 && isBuyOrder) { // 买入造成价格大幅上涨
      intention = 'panicBuy';
      confidence = 0.7 + priceFactor * 0.3;
    } else if (priceImpact < -3 && !isBuyOrder) { // 卖出造成价格大幅下跌
      intention = 'panicSell';
      confidence = 0.7 + priceFactor * 0.3;
    }
  }
  
  // 确保置信度在0-1之间
  confidence = Math.max(0, Math.min(1, confidence));
  
  return {
    order,
    intention,
    confidence,
    factors: {
      sizeFactor,
      priceFactor,
      trendFactor,
      volumeFactor
    },
    analysisTime: Date.now()
  };
}

// 批量订单意图分析
export function batchAnalyzeOrderIntentions(
  largeOrderResults: LargeOrderResult[],
  analysisParams: Omit<OrderIntentionAnalysisParams, 'largeOrderResult'>
): OrderIntentionAnalysisResult[] {
  return largeOrderResults.map(result => {
    return analyzeOrderIntention({
      ...analysisParams,
      largeOrderResult: result
    });
  });
}
