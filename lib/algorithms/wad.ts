// WAD（加权平均分布）模型算法实现
import { ChipDistributionItem, ChipPeak, ChipPeakInfo, SupportResistanceLevel, SupportResistanceLevels } from './chipDistribution';
import { logger } from '../utils/logger';

// 预计算的时间常数
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_VOLUME = 10000000; // 1000万手
const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;
const MILLISECONDS_PER_MINUTE = 1000 * 60;
const MILLISECONDS_PER_SECOND = 1000;

// 预计算的衰减常数
const DECAY_CONSTANTS = {
  // 不同时间单位的衰减因子
  DAY_FACTOR: 1 / MILLISECONDS_PER_DAY,
  HOUR_FACTOR: 1 / MILLISECONDS_PER_HOUR,
  MINUTE_FACTOR: 1 / MILLISECONDS_PER_MINUTE,
  SECOND_FACTOR: 1 / MILLISECONDS_PER_SECOND,
  
  // 预计算的常用衰减率
  COMMON_DECAY_RATES: {
    LOW: 0.05,   // 5% 每日衰减
    MEDIUM: 0.1, // 10% 每日衰减
    HIGH: 0.25,  // 25% 每日衰减
  },
  
  // 高频数据的衰减率
  HIGH_FREQ_DECAY_RATES: {
    LOW: 0.001,  // 0.1% 每分钟衰减
    MEDIUM: 0.01, // 1% 每分钟衰减
    HIGH: 0.05,  // 5% 每分钟衰减
  },
  
  // 预计算的指数衰减系数（用于快速计算）
  PRECOMPUTED_DECAY_COEFFICIENTS: {
    DAILY: { 
      0.01: Math.exp(-0.01),
      0.05: Math.exp(-0.05),
      0.1: Math.exp(-0.1),
      0.15: Math.exp(-0.15),
      0.2: Math.exp(-0.2),
      0.25: Math.exp(-0.25),
      0.3: Math.exp(-0.3)
    },
    HOURLY: {
      0.001: Math.exp(-0.001),
      0.005: Math.exp(-0.005),
      0.01: Math.exp(-0.01),
      0.02: Math.exp(-0.02)
    },
    MINUTELY: {
      0.0001: Math.exp(-0.0001),
      0.0005: Math.exp(-0.0005),
      0.001: Math.exp(-0.001),
      0.005: Math.exp(-0.005)
    }
  },
  
  // 预计算的批量衰减权重查找表（用于快速批量计算）
  BATCH_DECAY_LOOKUP_TABLES: {
    // 每日衰减，时间差从0到30天
    DAILY_30DAYS: Array.from({ length: 31 }, (_, day) => Math.exp(-0.1 * day))
  }
};

// 快速指数计算函数（使用泰勒级数近似，适用于小参数）
export function fastExp(x: number): number {
  // 对于小的x值，使用泰勒级数近似：e^x ≈ 1 + x + x²/2! + x³/6! + x⁴/24! + x⁵/120 + x⁶/720 + x⁷/5040 + x⁸/40320
  // 误差在x ∈ [-1, 1]时小于0.0001
  if (x < -1 || x > 1) {
    return Math.exp(x); // 超出近似范围，使用标准计算
  }
  
  // 优化：使用高精度泰勒级数展开（增加到x⁸项）
  // 预计算所有幂次，减少乘法运算
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x2 * x2;
  const x5 = x3 * x2;
  const x6 = x4 * x2;
  const x7 = x5 * x2;
  const x8 = x4 * x4;
  
  return 1 + x + x2/2 + x3/6 + x4/24 + x5/120 + x6/720 + x7/5040 + x8/40320;
}

// 快速批量指数计算（SIMD-like优化）
function fastBatchExp(values: Float64Array): Float64Array {
  const result = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = fastExp(values[i]);
  }
  return result;
}

// 快速批量指数计算（普通数组版本）
function fastBatchExpArray(values: number[]): number[] {
  const result = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = fastExp(values[i]);
  }
  return result;
}

// 快速指数衰减权重计算（使用预计算常数）
export function calculateDecayWeight(timestamp: number, currentTime: number, decayRate: number = 0.1): number {
  const timeDiff = currentTime - timestamp;
  const daysDiff = timeDiff * DECAY_CONSTANTS.DAY_FACTOR;
  return Math.exp(-decayRate * daysDiff);
}

// 高频数据专用的时间衰减权重计算（使用预计算常数）
export function calculateHighFrequencyDecayWeight(
  timestamp: number, 
  currentTime: number, 
  decayRate: number = 0.01 // 每分钟衰减率
): number {
  const timeDiff = currentTime - timestamp;
  const minutesDiff = timeDiff * DECAY_CONSTANTS.MINUTE_FACTOR;
  return Math.exp(-decayRate * minutesDiff);
}

// 批量衰减权重计算（高性能优化版）
export function calculateBatchDecayWeights(
  timestamps: number[], 
  currentTime: number, 
  decayRate: number = 0.1,
  timeUnit: 'day' | 'hour' | 'minute' | 'second' = 'day'
): number[] {
  const result = new Array(timestamps.length);
  let factor: number;
  
  // 使用对象查找替代switch语句，提高性能
  const timeFactorMap = {
    day: DECAY_CONSTANTS.DAY_FACTOR,
    hour: DECAY_CONSTANTS.HOUR_FACTOR,
    minute: DECAY_CONSTANTS.MINUTE_FACTOR,
    second: DECAY_CONSTANTS.SECOND_FACTOR
  };
  
  factor = timeFactorMap[timeUnit] || DECAY_CONSTANTS.DAY_FACTOR;
  
  // 预计算衰减因子
  const decayFactor = -decayRate;
  
  // 检查是否有预计算的衰减系数可用
  const coefficientMap = {
    day: DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.DAILY as Record<number, number>,
    hour: DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.HOURLY as Record<number, number>,
    minute: DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.MINUTELY as Record<number, number>
  };
  
  // 只对支持的timeUnit使用预计算系数
  const precomputedCoefficients = coefficientMap[timeUnit as keyof typeof coefficientMap];
  // 检查衰减率是否有预计算值
  const usePrecomputed = precomputedCoefficients && precomputedCoefficients[decayRate] !== undefined;
  
  // 对于大批量计算，使用Float64Array提高性能
  const useFastBatchExp = timestamps.length > 100 && timestamps.length < 10000;
  
  if (usePrecomputed && timeUnit === 'day') {
    // 使用预计算的查找表（每日衰减，30天内）
    for (let i = 0; i < timestamps.length; i++) {
      const timeDiff = currentTime - timestamps[i];
      const timeUnitDiff = timeDiff * factor;
      if (timeUnitDiff < 31) {
        const dayIndex = Math.floor(timeUnitDiff);
        result[i] = DECAY_CONSTANTS.BATCH_DECAY_LOOKUP_TABLES.DAILY_30DAYS[dayIndex];
      } else {
        // 超出预计算范围，使用指数计算
        const exponent = decayFactor * timeUnitDiff;
        result[i] = Math.exp(exponent);
      }
    }
  } else if (useFastBatchExp) {
    // 大批量使用快速批量指数计算
    const exponents = new Float64Array(timestamps.length);
    for (let i = 0; i < timestamps.length; i++) {
      const timeDiff = currentTime - timestamps[i];
      const timeUnitDiff = timeDiff * factor;
      exponents[i] = decayFactor * timeUnitDiff;
    }
    const weights = fastBatchExp(exponents);
    // 转换为普通数组
    for (let i = 0; i < weights.length; i++) {
      result[i] = weights[i];
    }
  } else {
    // 小批量或超大批量使用普通指数计算
    for (let i = 0; i < timestamps.length; i++) {
      const timeDiff = currentTime - timestamps[i];
      const timeUnitDiff = timeDiff * factor;
      const exponent = decayFactor * timeUnitDiff;
      result[i] = timestamps.length < 1000 ? fastExp(exponent) : Math.exp(exponent);
    }
  }
  
  return result;
}

// 基于成交量的时间衰减权重计算（适用于高频数据，内联优化）
export function calculateVolumeDecayWeight(
  timestamp: number, 
  currentTime: number, 
  volume: number, 
  decayRate: number = 0.1
): number {
  // 使用预计算常数提高性能
  const timeDiff = currentTime - timestamp;
  const daysDiff = timeDiff * DECAY_CONSTANTS.DAY_FACTOR;
  const timeWeight = Math.exp(-decayRate * daysDiff);
  // 成交量标准化权重（使用预计算的最大成交量）
  const volumeWeight = volume / MAX_VOLUME;
  const normalizedVolumeWeight = Math.min(1, volumeWeight);
  // 综合时间和成交量的权重
  return timeWeight * normalizedVolumeWeight;
}

// 批量成交量衰减权重计算（高性能优化版）
export function calculateBatchVolumeDecayWeights(
  timestamps: number[], 
  currentTime: number, 
  volumes: number[],
  decayRate: number = 0.1,
  timeUnit: 'day' | 'hour' | 'minute' | 'second' = 'day'
): number[] {
  const result = new Array(timestamps.length);
  let factor: number;
  switch (timeUnit) {
    case 'day':
      factor = DECAY_CONSTANTS.DAY_FACTOR;
      break;
    case 'hour':
      factor = DECAY_CONSTANTS.HOUR_FACTOR;
      break;
    case 'minute':
      factor = DECAY_CONSTANTS.MINUTE_FACTOR;
      break;
    case 'second':
      factor = DECAY_CONSTANTS.SECOND_FACTOR;
      break;
    default:
      factor = DECAY_CONSTANTS.DAY_FACTOR;
  }
  
  // 预计算衰减因子
  const decayFactor = -decayRate;
  
  // 检查批量大小，选择合适的计算方法
  const useFastExp = timestamps.length < 1000; // 小批量使用快速指数近似
  
  // 预计算最大成交量的倒数，避免重复除法
  const maxVolumeReciprocal = 1 / MAX_VOLUME;
  
  // 批量计算权重
  for (let i = 0; i < timestamps.length; i++) {
    const timeDiff = currentTime - timestamps[i];
    const timeUnitDiff = timeDiff * factor;
    const exponent = decayFactor * timeUnitDiff;
    
    // 计算时间权重
    const timeWeight = useFastExp ? fastExp(exponent) : Math.exp(exponent);
    
    // 计算成交量权重（避免重复除法和Math.min调用）
    const volume = volumes[i];
    const volumeWeight = volume * maxVolumeReciprocal;
    const normalizedVolumeWeight = volumeWeight > 1 ? 1 : volumeWeight;
    
    // 计算最终权重
    result[i] = timeWeight * normalizedVolumeWeight;
  }
  
  return result;
}



// WAD指标计算
export interface WADCalculationParams {
  high: number;
  low: number;
  close: number;
  previousClose: number;
}

export function calculateWAD(params: WADCalculationParams): number {
  const { high, low, close, previousClose } = params;
  
  // 计算当日的真实波幅
  const TR = Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  
  // 计算资金流向
  let MF = 0;
  if (TR > 0) {
    MF = (close - low) - (high - close) / TR;
  }
  
  // 计算当日WAD增量
  const WADIncrement = MF * TR;
  
  return WADIncrement;
}

// 累积WAD指标计算
export interface WADItem {
  timestamp: number;
  high: number;
  low: number;
  close: number;
  volume?: number; // 可选成交量
}

export interface WADCalculationOptions {
  decayRate?: number; // 时间衰减率
  weightType?: 'time' | 'volume'; // 权重类型
  useExponentialDecay?: boolean; // 是否使用指数衰减
  windowSize?: number; // 滑动窗口大小（用于高频数据）
}

// 累积WAD指标计算（高性能优化版）
export function calculateCumulativeWAD(
  data: WADItem[], 
  options: WADCalculationOptions = {}
): Array<{ 
  timestamp: number; 
  wad: number; 
  weightedWad: number;
  rawIncrement: number;
  weight: number;
}> {
  const timerLabel = 'calculateCumulativeWAD';
  logger.time(timerLabel);
  
  const { 
    decayRate = 0.1, 
    weightType = 'time',
    useExponentialDecay = true,
    windowSize = 0 // 0表示不使用滑动窗口
  } = options;
  
  const dataLength = data.length;
  if (dataLength === 0) {
    logger.timeEnd(timerLabel);
    return [];
  }
  
  // 预计算衰减因子
  const decayFactor = -decayRate;
  const currentTime = Date.now();
  
  // 性能优化：预分配结果数组
  const result = new Array(dataLength);
  let cumulativeWAD = 0;
  let cumulativeWeightedWAD = 0;
  
  // 直接在原数组上排序，避免创建新数组（如果允许的话）
  // 或者使用TypedArray提高性能
  const sortedData = [...data];
  sortedData.sort((a, b) => a.timestamp - b.timestamp);
  
  // 批量预计算权重（如果可能）
  let weights: number[] | undefined;
  if (useExponentialDecay) {
    const timestamps = sortedData.map(item => item.timestamp);
    
    if (weightType === 'time') {
      weights = calculateBatchDecayWeights(timestamps, currentTime, decayRate);
    } else if (weightType === 'volume') {
      const volumes = sortedData.map(item => item.volume || 0);
      weights = calculateBatchVolumeDecayWeights(timestamps, currentTime, volumes, decayRate);
    }
  }
  
  // 使用局部变量缓存提高访问速度
  let previousClose = sortedData[0].close;
  
  // 对于大批量数据，使用循环展开优化
  const unrollFactor = 4;
  let i = 0;
  
  // 循环展开处理
  for (; i < dataLength - unrollFactor + 1; i += unrollFactor) {
    for (let j = 0; j < unrollFactor; j++) {
      const index = i + j;
      const item = sortedData[index];
      processSingleItem(item, index);
    }
  }
  
  // 处理剩余项
  for (; i < dataLength; i++) {
    processSingleItem(sortedData[i], i);
  }
  
  function processSingleItem(item: WADItem, index: number) {
    const high = item.high;
    const low = item.low;
    const close = item.close;
    const timestamp = item.timestamp;
    
    // 计算当日的真实波幅（优化的TR计算）
    const tr1 = high - low;
    const tr2 = Math.abs(high - previousClose);
    const tr3 = Math.abs(low - previousClose);
    const TR = tr1 > tr2 ? (tr1 > tr3 ? tr1 : tr3) : (tr2 > tr3 ? tr2 : tr3);
    
    // 计算资金流向
    const MF = TR > 0 ? ((close - low) - (high - close)) / TR : 0;
    
    // 计算当日WAD增量
    const wadIncrement = MF * TR;
    
    // 计算权重
    let weight = 1.0;
    if (useExponentialDecay) {
      if (weightType === 'volume' && item.volume) {
        // 内联计算成交量加权衰减权重
        const timeDiff = currentTime - timestamp;
        const daysDiff = timeDiff / MILLISECONDS_PER_DAY;
        const timeWeight = Math.exp(decayFactor * daysDiff);
        const volumeWeight = item.volume / MAX_VOLUME;
        const normalizedVolumeWeight = volumeWeight > 1 ? 1 : volumeWeight;
        weight = timeWeight * normalizedVolumeWeight;
      } else if (weights) {
        // 使用批量预计算的权重
        weight = weights[index];
      } else {
        // 内联计算时间衰减权重
        const timeDiff = currentTime - timestamp;
        const daysDiff = timeDiff / MILLISECONDS_PER_DAY;
        weight = Math.exp(decayFactor * daysDiff);
      }
    }
    
    // 累积WAD
    cumulativeWAD += wadIncrement;
    cumulativeWeightedWAD += wadIncrement * weight;
    
    // 直接设置数组元素
    result[index] = {
      timestamp,
      wad: cumulativeWAD,
      weightedWad: cumulativeWeightedWAD,
      rawIncrement: wadIncrement,
      weight
    };
    
    // 更新前收盘价
    previousClose = close;
  }
  
  return result;
}

// 滑动窗口WAD计算（适用于高频数据）
export function calculateWindowedWAD(
  data: WADItem[], 
  windowSize: number,
  options: WADCalculationOptions = {}
): Array<{ 
  timestamp: number; 
  windowStart: number;
  windowEnd: number;
  wad: number;
  weightedWad: number;
  windowVolume?: number;
}> {
  if (data.length < windowSize) return [];
  
  // 排序数据
  const sortedData = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    sortedData[i] = data[i];
  }
  sortedData.sort((a, b) => a.timestamp - b.timestamp);
  
  const resultLength = sortedData.length - windowSize + 1;
  const result = new Array(resultLength);
  
  // 预计算WAD增量数组，避免重复计算
  const wadIncrements = new Array(sortedData.length);
  const weights = new Array(sortedData.length);
  const { decayRate = 0.1, weightType = 'time', useExponentialDecay = true } = options;
  const currentTime = Date.now();
  
  // 批量计算权重，提高性能
  if (useExponentialDecay) {
    if (weightType === 'time') {
      const timestamps = sortedData.map(item => item.timestamp);
      const calculatedWeights = calculateBatchDecayWeights(timestamps, currentTime, decayRate);
      for (let i = 0; i < sortedData.length; i++) {
        weights[i] = calculatedWeights[i];
      }
    } else if (weightType === 'volume') {
      const timestamps = sortedData.map(item => item.timestamp);
      const volumes = sortedData.map(item => item.volume || 0);
      const calculatedWeights = calculateBatchVolumeDecayWeights(timestamps, currentTime, volumes, decayRate);
      for (let i = 0; i < sortedData.length; i++) {
        weights[i] = calculatedWeights[i];
      }
    }
  } else {
    // 如果不使用指数衰减，权重都设为1.0
    for (let i = 0; i < sortedData.length; i++) {
      weights[i] = 1.0;
    }
  }
  
  // 计算WAD增量
  let previousClose = sortedData[0].close;
  for (let i = 0; i < sortedData.length; i++) {
    const item = sortedData[i];
    const high = item.high;
    const low = item.low;
    const close = item.close;
    
    // 计算当日的真实波幅
    const tr1 = high - low;
    const tr2 = Math.abs(high - previousClose);
    const tr3 = Math.abs(low - previousClose);
    const TR = Math.max(tr1, tr2, tr3);
    
    // 计算资金流向
    let MF = 0;
    if (TR > 0) {
      MF = ((close - low) - (high - close)) / TR;
    }
    
    // 计算当日WAD增量
    const wadIncrement = MF * TR;
    wadIncrements[i] = wadIncrement;
    
    previousClose = close;
  }
  
  // 使用滑动窗口计算累积WAD
  for (let i = 0; i < resultLength; i++) {
    let cumulativeWAD = 0;
    let cumulativeWeightedWAD = 0;
    let windowVolume = 0;
    
    for (let j = i; j < i + windowSize; j++) {
      cumulativeWAD += wadIncrements[j];
      cumulativeWeightedWAD += wadIncrements[j] * weights[j];
      if (sortedData[j].volume) {
        windowVolume += sortedData[j].volume;
      }
    }
    
    const windowData = sortedData.slice(i, i + windowSize);
    result[i] = {
      timestamp: windowData[windowData.length - 1].timestamp,
      windowStart: windowData[0].timestamp,
      windowEnd: windowData[windowData.length - 1].timestamp,
      wad: cumulativeWAD,
      weightedWad: cumulativeWeightedWAD,
      windowVolume: windowVolume > 0 ? windowVolume : undefined
    };
  }
  
  return result;
}

// 基于WAD的信号生成
export interface WADSignalParams {
  wadData: Array<{ timestamp: number; wad: number; weightedWad: number }>;
  threshold: number;
  lookbackPeriod?: number; // 回溯期数
  useWeighted?: boolean; // 是否使用加权WAD
}

export interface WADSignal {
  timestamp: number; 
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 信号强度（0-1）
  change: number; // WAD变化量
  confidence: number; // 信号置信度（0-1）
}

export function generateWADSignals(params: WADSignalParams): WADSignal[] {
  const { 
    wadData, 
    threshold, 
    lookbackPeriod = 1, 
    useWeighted = true
  } = params;
  
  if (wadData.length < lookbackPeriod + 1) return [];
  
  return wadData.map((item, index) => {
    if (index < lookbackPeriod) {
      return {
        timestamp: item.timestamp, 
        signal: 'hold',
        strength: 0,
        change: 0,
        confidence: 0
      };
    }
    
    const previous = wadData[index - lookbackPeriod];
    
    // 基于WAD的变化生成信号
    const wadChange = useWeighted 
      ? item.weightedWad - previous.weightedWad 
      : item.wad - previous.wad;
    
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let strength = 0;
    let confidence = 0;
    
    if (Math.abs(wadChange) > threshold) {
      signal = wadChange > 0 ? 'buy' : 'sell';
      // 计算信号强度（基于变化量超过阈值的比例）
      strength = Math.min(1, Math.abs(wadChange) / (threshold * 2));
      // 计算置信度（基于回溯期内的一致性）
      let consistentChanges = 0;
      for (let i = 1; i <= lookbackPeriod; i++) {
        const change = useWeighted 
          ? wadData[index - i + 1].weightedWad - wadData[index - i].weightedWad
          : wadData[index - i + 1].wad - wadData[index - i].wad;
        if (Math.sign(change) === Math.sign(wadChange)) {
          consistentChanges++;
        }
      }
      confidence = consistentChanges / lookbackPeriod;
    }
    
    return {
      timestamp: item.timestamp, 
      signal,
      strength,
      change: wadChange,
      confidence
    };
  });
}

// 高级WAD信号生成（结合价格趋势）
export interface AdvancedWADSignalParams {
  wadData: Array<{ timestamp: number; wad: number; weightedWad: number }>;
  priceData: Array<{ timestamp: number; price: number }>;
  threshold: number;
  trendThreshold?: number;
}

export function generateAdvancedWADSignals(params: AdvancedWADSignalParams): WADSignal[] {
  const { 
    wadData, 
    priceData, 
    threshold, 
    trendThreshold = 0.01 // 1%价格变化阈值
  } = params;
  
  if (wadData.length < 2 || priceData.length < 2) return [];
  
  // 确保数据按时间排序
  const sortedWAD = [...wadData].sort((a, b) => a.timestamp - b.timestamp);
  const sortedPrice = [...priceData].sort((a, b) => a.timestamp - b.timestamp);
  
  const signals: WADSignal[] = [];
  
  // 匹配时间戳
  let priceIndex = 0;
  for (let i = 1; i < sortedWAD.length; i++) {
    const currentWAD = sortedWAD[i];
    const previousWAD = sortedWAD[i - 1];
    
    // 找到对应的价格数据
    while (priceIndex < sortedPrice.length && sortedPrice[priceIndex].timestamp < currentWAD.timestamp) {
      priceIndex++;
    }
    
    if (priceIndex >= sortedPrice.length) break;
    
    const currentPrice = sortedPrice[priceIndex];
    const previousPrice = sortedPrice[priceIndex - 1];
    
    // 计算WAD和价格变化
    const wadChange = currentWAD.weightedWad - previousWAD.weightedWad;
    const priceChange = (currentPrice.price - previousPrice.price) / previousPrice.price;
    
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let strength = 0;
    let confidence = 0;
    
    // 正向背离：WAD上升，价格下跌
    if (wadChange > threshold && priceChange < -trendThreshold) {
      signal = 'buy';
      strength = Math.min(1, (Math.abs(wadChange) / (threshold * 2) + Math.abs(priceChange) / (trendThreshold * 2)) / 2);
      confidence = 0.8; // 正向背离信号置信度较高
    }
    // 负向背离：WAD下降，价格上升
    else if (wadChange < -threshold && priceChange > trendThreshold) {
      signal = 'sell';
      strength = Math.min(1, (Math.abs(wadChange) / (threshold * 2) + Math.abs(priceChange) / (trendThreshold * 2)) / 2);
      confidence = 0.8; // 负向背离信号置信度较高
    }
    // 同步变化：WAD和价格同向变化
    else if (Math.abs(wadChange) > threshold) {
      signal = wadChange > 0 ? 'buy' : 'sell';
      strength = Math.min(1, Math.abs(wadChange) / (threshold * 2));
      // 如果价格也同向变化，增加置信度
      confidence = Math.sign(wadChange) === Math.sign(priceChange) ? 0.6 : 0.4;
    }
    
    signals.push({
      timestamp: currentWAD.timestamp, 
      signal,
      strength,
      change: wadChange,
      confidence
    });
  }
  
  return signals;
}

// WAD增强的筹码分布计算接口
export interface WADEnhancedChipParams {
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  currentPrice: number;
  decayRate?: number;
  useHighFrequency?: boolean;
  priceBucketCount?: number; // 价格分桶数量
}

// WAD增强的筹码分布结果
export interface WADEnhancedChipResult {
  chipDistribution: ChipDistributionItem[];
  concentration: number; // 筹码集中度（0-1）
  mainPeak: ChipPeakInfo;
  supportResistance: SupportResistanceLevels;
  wadFactor: number; // WAD对筹码分布的影响因子
  timeDecayApplied: boolean;
}

// 计算WAD增强的筹码分布
export function calculateWADEnhancedChipDistribution(
  params: WADEnhancedChipParams
): WADEnhancedChipResult {
  const { 
    priceData, 
    currentPrice, 
    decayRate = 0.1, 
    useHighFrequency = false, 
    priceBucketCount = 100
  } = params;
  
  if (priceData.length === 0) {
    const emptyPeak: ChipPeak = {
      price: 0,
      ratio: 0,
      volume: 0,
      width: 0,
      dominance: 0,
      strength: 0,
      reliability: 0,
      centerPrice: 0,
      volumeWeightedPrice: 0
    };
    return {
      chipDistribution: [],
      concentration: 0,
      mainPeak: { peakPrice: 0, peakRatio: 0, isSinglePeak: true, peaks: [], dominantPeak: emptyPeak, secondaryPeaks: [], peakDensity: 0, peakQualityScore: 0, priceRange: 0 },
      supportResistance: { supportLevels: [], resistanceLevels: [], strongestSupport: null, strongestResistance: null, supportResistanceRatio: 0 },
      wadFactor: 0,
      timeDecayApplied: false
    };
  }
  
  // 排序价格数据
  const sortedData = [...priceData].sort((a, b) => a.timestamp - b.timestamp);
  const currentTime = Date.now();
  
  // 计算价格范围
  const prices = sortedData.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const priceStep = priceRange / (priceBucketCount - 1);
  
  // 初始化价格桶
  const priceBuckets: { [key: number]: { volume: number; weightedVolume: number; count: number } } = {};
  for (let i = 0; i < priceBucketCount; i++) {
    const price = minPrice + i * priceStep;
    priceBuckets[Math.round(price)] = { volume: 0, weightedVolume: 0, count: 0 };
  }
  
  // 计算累积WAD和WAD权重
  let cumulativeWAD = 0;
  let totalWeightedVolume = 0;
  
  // 批量计算时间权重，提高性能
  const timestamps = sortedData.map(d => d.timestamp);
  const volumes = sortedData.map(d => d.volume);
  const weights = useHighFrequency 
    ? calculateBatchDecayWeights(timestamps, currentTime, decayRate, 'minute')
    : calculateBatchDecayWeights(timestamps, currentTime, decayRate, 'day');
  
  // 预计算WAD增量数组
  const wadIncrements = new Array(sortedData.length);
  let previousClose = sortedData[0].close;
  
  // 计算所有WAD增量
  for (let i = 0; i < sortedData.length; i++) {
    const data = sortedData[i];
    const { high, low, close } = data;
    
    const TR = Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
    const MF = TR > 0 ? ((close - low) - (high - close)) / TR : 0;
    const wadIncrement = MF * TR;
    
    wadIncrements[i] = wadIncrement;
    previousClose = close;
  }
  
  // 填充价格桶，应用时间衰减
  for (let i = 0; i < sortedData.length; i++) {
    const data = sortedData[i];
    const { close, volume } = data;
    const weight = weights[i];
    
    // 更新累积WAD
    cumulativeWAD += wadIncrements[i];
    
    // 找到价格所在的桶
    const bucketPrice = Math.round(close);
    const nearestBucketPrice = Math.round(minPrice + Math.round((close - minPrice) / priceStep) * priceStep);
    
    if (priceBuckets[nearestBucketPrice]) {
      priceBuckets[nearestBucketPrice].volume += volume;
      priceBuckets[nearestBucketPrice].weightedVolume += volume * weight * (1 + Math.abs(cumulativeWAD) * 0.001);
      priceBuckets[nearestBucketPrice].count++;
      totalWeightedVolume += volume * weight;
    }
  }
  
  // 转换为筹码分布格式
  const chipDistribution: ChipDistributionItem[] = Object.entries(priceBuckets)
    .filter(([_, bucket]) => bucket.volume > 0)
    .map(([priceStr, bucket]) => {
      const price = parseFloat(priceStr);
      const percentage = totalWeightedVolume > 0 ? bucket.weightedVolume / totalWeightedVolume : 0;
      return {
        price,
        volume: bucket.volume,
        percentage
      };
    })
    .sort((a, b) => a.price - b.price);
  
  // 计算筹码集中度（赫芬达尔-赫希曼指数）
  const concentration = calculateHHI(chipDistribution);
  
  // 识别主筹峰值
  const mainPeak = identifyChipPeaks(chipDistribution, true);
  
  // 计算支撑/压力位
  const supportResistance = calculateSupportResistance(chipDistribution, currentPrice, true);
  
  // 计算WAD影响因子
  const wadFactor = Math.min(1, Math.abs(cumulativeWAD) * 0.001);
  
  return {
    chipDistribution,
    concentration,
    mainPeak,
    supportResistance,
    wadFactor,
    timeDecayApplied: true
  };
}

// 计算筹码集中度指标（包括HHI、基尼系数和集中度比率）
export interface ChipConcentrationMetrics {
  hhi: number; // 赫芬达尔-赫希曼指数（0-1）
  gini: number; // 基尼系数（0-1）
  concentrationRatio: number; // 前N个最大筹码的集中度比率（0-1）
  concentrationLevel: 'low' | 'medium' | 'high'; // 集中度等级
}

// 计算基尼系数
export function calculateGini(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 确保数据按百分比排序
  const sortedData = [...chipData].sort((a, b) => a.percentage - b.percentage);
  const n = sortedData.length;
  let gini = 0;
  let cumulativePercentage = 0;
  
  for (let i = 0; i < n; i++) {
    cumulativePercentage += sortedData[i].percentage;
    gini += (2 * (i + 1) - n - 1) * sortedData[i].percentage;
  }
  
  gini = gini / (n * cumulativePercentage);
  return Math.min(1, Math.max(0, gini));
}

// 计算赫芬达尔-赫希曼指数（HHI）
export function calculateHHI(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 计算赫芬达尔-赫希曼指数：HHI = Σ(percentage^2)
  let hhi = 0.0;
  const length = chipData.length;
  
  // 使用普通for循环和类型断言，避免隐式转换
  for (let i = 0; i < length; i++) {
    const percentage = chipData[i].percentage;
    hhi += percentage * percentage;
  }
  
  // 确保HHI在合理范围内（0-1）
  return Math.min(1, Math.max(0, hhi));
}

// 计算集中度比率（前N个最大筹码的集中度比率）
export function calculateConcentrationRatio(chipData: ChipDistributionItem[], topN: number = 10): number {
  if (chipData.length === 0) return 0;
  
  // 按百分比降序排序
  const sortedData = [...chipData].sort((a, b) => b.percentage - a.percentage);
  const actualN = Math.min(topN, sortedData.length);
  
  let totalTopPercentage = 0;
  let totalPercentage = 0;
  
  for (let i = 0; i < sortedData.length; i++) {
    const percentage = sortedData[i].percentage;
    totalPercentage += percentage;
    
    if (i < actualN) {
      totalTopPercentage += percentage;
    }
  }
  
  return totalPercentage > 0 ? totalTopPercentage / totalPercentage : 0;
}

// 综合计算筹码集中度
export function calculateChipConcentration(chipData: ChipDistributionItem[]): ChipConcentrationMetrics {
  if (chipData.length === 0) {
    return {
      hhi: 0,
      gini: 0,
      concentrationRatio: 0,
      concentrationLevel: 'low'
    };
  }
  
  const hhi = calculateHHI(chipData);
  const gini = calculateGini(chipData);
  const concentrationRatio = calculateConcentrationRatio(chipData, 10);
  
  // 综合评估集中度等级
  let concentrationLevel: 'low' | 'medium' | 'high' = 'low';
  const avgConcentration = (hhi + gini + concentrationRatio) / 3;
  
  if (avgConcentration > 0.6) {
    concentrationLevel = 'high';
  } else if (avgConcentration > 0.3) {
    concentrationLevel = 'medium';
  }
  
  return {
    hhi,
    gini,
    concentrationRatio,
    concentrationLevel
  };
}

// 增强的筹码峰值分析
export interface EnhancedChipPeak extends ChipPeak {
  continuity: number; // 峰值的连续性（0-1）
  isolation: number; // 峰值的孤立性（0-1）
  priceDistanceToVWAP: number; // 距离VWAP的价格距离
  trendAlignment: number; // 与价格趋势的一致性（0-1）
  supportResistancePotential: number; // 成为支撑/阻力位的潜力（0-1）
}

export interface EnhancedChipPeakInfo extends ChipPeakInfo {
  enhancedPeaks: EnhancedChipPeak[];
  peakDistribution: 'single' | 'double' | 'multiple' | 'scattered'; // 峰值分布类型
  totalPeakVolume: number; // 所有峰值的总成交量
  peakVolumeRatio: number; // 峰值成交量占总成交量的比例
}

// 识别筹码峰值（增强版）
export function identifyChipPeaks(chipData: ChipDistributionItem[], isSorted: boolean = false): EnhancedChipPeakInfo {
  if (chipData.length === 0) {
    const emptyPeak: EnhancedChipPeak = {
      price: 0,
      ratio: 0,
      volume: 0,
      width: 0,
      dominance: 0,
      strength: 0,
      reliability: 0,
      centerPrice: 0,
      volumeWeightedPrice: 0,
      continuity: 0,
      isolation: 0,
      priceDistanceToVWAP: 0,
      trendAlignment: 0,
      supportResistancePotential: 0
    };
    return {
      peakPrice: 0,
      peakRatio: 0,
      isSinglePeak: true,
      peaks: [],
      dominantPeak: emptyPeak as unknown as ChipPeak,
      secondaryPeaks: [],
      peakDensity: 0,
      peakQualityScore: 0,
      priceRange: 0,
      enhancedPeaks: [],
      peakDistribution: 'scattered',
      totalPeakVolume: 0,
      peakVolumeRatio: 0
    };
  }
  
  // 只在需要时排序，优化排序性能
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  const length = sortedData.length;
  
  // 预计算总成交量和价格统计
  let totalVolume = 0;
  let totalWeightedVolume = 0;
  let totalPriceSum = 0;
  let totalWeightedPriceSum = 0;
  
  for (let i = 0; i < length; i++) {
    const item = sortedData[i];
    totalVolume += item.volume;
    totalPriceSum += item.price;
    totalWeightedVolume += item.volume * item.percentage;
    totalWeightedPriceSum += item.price * item.volume * item.percentage;
  }
  
  // 价格范围和平均价格
  const minPrice = sortedData[0].price;
  const maxPrice = sortedData[length - 1].price;
  const priceRange = maxPrice - minPrice;
  const avgPrice = totalPriceSum / length;
  const vwap = totalWeightedVolume > 0 ? totalWeightedPriceSum / totalWeightedVolume : avgPrice;
  
  // 查找峰值
  const rawPeaks: EnhancedChipPeak[] = [];
  
  // 自适应峰值检测算法
  for (let i = 1; i < length - 1; i++) {
    const current = sortedData[i];
    const prev = sortedData[i - 1];
    const next = sortedData[i + 1];
    
    // 自适应阈值：根据局部成交量分布动态调整检测阈值
    const localAvgVolume = (prev.volume + current.volume + next.volume) / 3;
    const volumeThreshold = Math.max(localAvgVolume * 1.5, Math.max(prev.volume * 1.2, next.volume * 1.2));
    
    if (current.volume > volumeThreshold && current.percentage > 0.005) {
      // 精确的峰值边界检测
      let leftIndex = i;
      let rightIndex = i;
      let leftVolumeSum = current.volume;
      let rightVolumeSum = current.volume;
      let continuityScore = 1.0;
      
      // 向左查找峰值边界（考虑连续性）
      while (leftIndex > 0) {
        const prevItem = sortedData[leftIndex - 1];
        if (prevItem.volume < current.volume * 0.3) break;
        
        // 连续性评分：相邻成交量变化的平滑度
        const volumeChange = Math.abs(prevItem.volume - sortedData[leftIndex].volume) / current.volume;
        continuityScore *= (1 - volumeChange * 0.5);
        
        leftIndex--;
        leftVolumeSum += prevItem.volume;
      }
      
      // 向右查找峰值边界
      while (rightIndex < length - 1) {
        const nextItem = sortedData[rightIndex + 1];
        if (nextItem.volume < current.volume * 0.3) break;
        
        // 连续性评分：相邻成交量变化的平滑度
        const volumeChange = Math.abs(nextItem.volume - sortedData[rightIndex].volume) / current.volume;
        continuityScore *= (1 - volumeChange * 0.5);
        
        rightIndex++;
        rightVolumeSum += nextItem.volume;
      }
      
      // 计算峰值属性
      const width = sortedData[rightIndex].price - sortedData[leftIndex].price;
      const totalPeakVolume = leftVolumeSum + rightVolumeSum - current.volume;
      const dominance = totalVolume > 0 ? totalPeakVolume / totalVolume : 0;
      const percentageSum = sortedData.slice(leftIndex, rightIndex + 1)
        .reduce((sum, item) => sum + item.percentage, 0);
      
      // 计算中心价格和成交量加权价格
      const weightedSum = sortedData.slice(leftIndex, rightIndex + 1)
        .reduce((sum, item) => sum + item.price * item.volume, 0);
      const volumeWeightedPrice = totalPeakVolume > 0 ? weightedSum / totalPeakVolume : current.price;
      
      // 计算峰值的孤立性
      const leftDistance = leftIndex > 0 ? sortedData[leftIndex].price - sortedData[leftIndex - 1].price : width;
      const rightDistance = rightIndex < length - 1 ? sortedData[rightIndex + 1].price - sortedData[rightIndex].price : width;
      const avgDistance = (leftDistance + rightDistance) / 2;
      const isolation = Math.min(1, avgDistance / (width + 0.1));
      
      // 计算距离VWAP的价格距离
      const priceDistanceToVWAP = Math.abs(current.price - vwap);
      
      // 与价格趋势的一致性（简单假设：价格越高，趋势向上）
      const trendAlignment = (current.price - minPrice) / (priceRange + 0.1);
      
      // 成为支撑/阻力位的潜力
      const supportResistancePotential = continuityScore * (1 - Math.abs(current.price - avgPrice) / (priceRange + 0.1));
      
      // 计算峰值强度（多因子综合）
      const positionFactor = 1 - Math.abs(current.price - vwap) / (priceRange + 0.1);
      const volumeFactor = totalPeakVolume / (totalVolume + 0.1);
      const continuityFactor = continuityScore;
      const isolationFactor = isolation;
      
      const strength = (dominance * 0.3 + percentageSum * 0.2 + positionFactor * 0.2 + volumeFactor * 0.1 + continuityFactor * 0.1 + isolationFactor * 0.1);
      
      // 计算可靠性指标
      const widthFactor = Math.min(1, 1 / (width + 1));
      const reliability = (strength * 0.5 + percentageSum * 0.2 + widthFactor * 0.1 + continuityScore * 0.1 + isolation * 0.1);
      
      rawPeaks.push({
        price: current.price,
        ratio: current.percentage,
        volume: totalPeakVolume,
        width,
        dominance,
        strength,
        reliability,
        centerPrice: (sortedData[leftIndex].price + sortedData[rightIndex].price) / 2,
        volumeWeightedPrice,
        continuity: Math.max(0, continuityScore),
        isolation,
        priceDistanceToVWAP,
        trendAlignment,
        supportResistancePotential
      });
    }
  }
  
  // 处理边界情况
  const firstItem = sortedData[0];
  const lastItem = sortedData[length - 1];
  
  if (length === 1) {
    // 只有一个数据点的情况
    const dominance = totalVolume > 0 ? firstItem.volume / totalVolume : 0;
    rawPeaks.push({
      price: firstItem.price,
      ratio: firstItem.percentage,
      volume: firstItem.volume,
      width: priceRange / 2 || 1,
      dominance,
      strength: dominance * 0.8,
      reliability: dominance * 0.7,
      centerPrice: firstItem.price,
      volumeWeightedPrice: firstItem.price,
      continuity: 1.0,
      isolation: 1.0,
      priceDistanceToVWAP: Math.abs(firstItem.price - vwap),
      trendAlignment: 0.5,
      supportResistancePotential: 0.5
    });
  } else {
    // 处理第一个数据点
    if (firstItem.volume > sortedData[1].volume * 1.5) {
      const dominance = totalVolume > 0 ? firstItem.volume / totalVolume : 0;
      rawPeaks.push({
        price: firstItem.price,
        ratio: firstItem.percentage,
        volume: firstItem.volume,
        width: Math.max(1, priceRange / 10),
        dominance,
        strength: dominance * 0.6,
        reliability: dominance * 0.5,
        centerPrice: firstItem.price,
        volumeWeightedPrice: firstItem.price,
        continuity: 0.5,
        isolation: 0.8,
        priceDistanceToVWAP: Math.abs(firstItem.price - vwap),
        trendAlignment: 0.0,
        supportResistancePotential: 0.7
      });
    }
    
    // 处理最后一个数据点
    if (lastItem.volume > sortedData[length - 2].volume * 1.5) {
      const dominance = totalVolume > 0 ? lastItem.volume / totalVolume : 0;
      rawPeaks.push({
        price: lastItem.price,
        ratio: lastItem.percentage,
        volume: lastItem.volume,
        width: Math.max(1, priceRange / 10),
        dominance,
        strength: dominance * 0.6,
        reliability: dominance * 0.5,
        centerPrice: lastItem.price,
        volumeWeightedPrice: lastItem.price,
        continuity: 0.5,
        isolation: 0.8,
        priceDistanceToVWAP: Math.abs(lastItem.price - vwap),
        trendAlignment: 1.0,
        supportResistancePotential: 0.7
      });
    }
  }
  
  // 按强度排序
  const enhancedPeaks = rawPeaks.sort((a, b) => b.strength - a.strength);
  const peaks = enhancedPeaks as unknown as ChipPeak[];
  
  // 确定主峰和次要峰值
  const dominantPeak = enhancedPeaks.length > 0 ? enhancedPeaks[0] : {
    price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0, reliability: 0, 
    centerPrice: 0, volumeWeightedPrice: 0, continuity: 0, isolation: 0, 
    priceDistanceToVWAP: 0, trendAlignment: 0, supportResistancePotential: 0
  };
  
  const isSinglePeak = dominantPeak.dominance > 0.5;
  const peakDensity = enhancedPeaks.length / (priceRange > 0 ? priceRange : 1);
  const secondaryPeaks = enhancedPeaks.length > 1 ? 
    enhancedPeaks.slice(1).filter(p => p.strength > dominantPeak.strength * 0.3) as unknown as ChipPeak[] : [];
  
  // 改进的峰值质量分数计算
  const peakQualityScore = (dominantPeak.strength * 0.3 + 
                          dominantPeak.reliability * 0.25 + 
                          dominantPeak.dominance * 0.2 + 
                          dominantPeak.continuity * 0.1 + 
                          dominantPeak.isolation * 0.1 + 
                          (1 - dominantPeak.width / (priceRange > 0 ? priceRange : 1)) * 0.05);
  
  // 确定峰值分布类型
  let peakDistribution: 'single' | 'double' | 'multiple' | 'scattered';
  if (enhancedPeaks.length === 0) {
    peakDistribution = 'scattered';
  } else if (enhancedPeaks.length === 1) {
    peakDistribution = 'single';
  } else if (enhancedPeaks.length === 2) {
    peakDistribution = 'double';
  } else {
    peakDistribution = 'multiple';
  }
  
  // 计算峰值成交量统计
  const totalPeakVolume = enhancedPeaks.reduce((sum, peak) => sum + peak.volume, 0);
  const peakVolumeRatio = totalVolume > 0 ? totalPeakVolume / totalVolume : 0;

  return {
    peakPrice: dominantPeak.price,
    peakRatio: dominantPeak.ratio,
    isSinglePeak,
    peaks,
    dominantPeak: dominantPeak as unknown as ChipPeak,
    secondaryPeaks,
    peakDensity,
    peakQualityScore,
    priceRange,
    enhancedPeaks,
    peakDistribution,
    totalPeakVolume,
    peakVolumeRatio
  };
}

// 兼容旧版本的接口
export function identifyChipPeaksLegacy(chipData: ChipDistributionItem[], isSorted: boolean = false): ChipPeakInfo {
  const enhancedResult = identifyChipPeaks(chipData, isSorted);
  return {
    peakPrice: enhancedResult.peakPrice,
    peakRatio: enhancedResult.peakRatio,
    isSinglePeak: enhancedResult.isSinglePeak,
    peaks: enhancedResult.peaks,
    dominantPeak: enhancedResult.dominantPeak,
    secondaryPeaks: enhancedResult.secondaryPeaks,
    peakDensity: enhancedResult.peakDensity,
    peakQualityScore: enhancedResult.peakQualityScore,
    priceRange: enhancedResult.priceRange
  };
}

// 增强的支撑/压力位评估
export interface EnhancedSupportResistanceLevel extends SupportResistanceLevel {
  priceRange: [number, number]; // 支撑/压力位的价格范围
  volumeConcentration: number; // 成交量集中度（0-1）
  priceDensity: number; // 价格密度（单位价格区间的筹码数量）
  distanceFromPeak: number; // 距离最近筹码峰值的距离
  trendContinuity: number; // 趋势连续性（0-1）
  breakoutPotential: number; // 突破潜力（0-1）
  historicalImportance: number; // 历史重要性（0-1）
}

export interface EnhancedSupportResistanceLevels extends SupportResistanceLevels {
  enhancedSupportLevels: EnhancedSupportResistanceLevel[];
  enhancedResistanceLevels: EnhancedSupportResistanceLevel[];
  supportResistanceBalance: number; // 支撑/压力位平衡度（-1到1，负数表示支撑强于压力，正数表示压力强于支撑）
  mostImportantSupportResistance: EnhancedSupportResistanceLevel | null;
}

// 密集区类型
export interface DensityZone {
  startIndex: number;
  endIndex: number;
  totalStrength: number;
  totalVolume: number;
  averagePrice: number;
  priceRange: [number, number];
  volumeConcentration: number;
  priceDensity: number;
  peakCount: number; // 包含的峰值数量
}

// 计算支撑/压力位（增强版）
export function calculateSupportResistance(
  chipData: ChipDistributionItem[], 
  currentPrice: number, 
  isSorted: boolean = false
): EnhancedSupportResistanceLevels {
  if (chipData.length === 0) {
    return {
      supportLevels: [],
      resistanceLevels: [],
      strongestSupport: null,
      strongestResistance: null,
      supportResistanceRatio: 0,
      enhancedSupportLevels: [],
      enhancedResistanceLevels: [],
      supportResistanceBalance: 0,
      mostImportantSupportResistance: null
    };
  }
  
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  const length = sortedData.length;
  
  // 预计算总成交量和总百分比
  let totalVolume = 0;
  let totalPercentage = 0;
  let weightedSum = 0;
  
  for (let i = 0; i < length; i++) {
    const item = sortedData[i];
    totalVolume += item.volume;
    totalPercentage += item.percentage;
    weightedSum += item.price * item.volume;
  }
  
  // 计算加权平均价格（用于位置评估）
  const vwap = totalVolume > 0 ? weightedSum / totalVolume : 0;
  
  // 价格范围和平均价格
  const minPrice = sortedData[0].price;
  const maxPrice = sortedData[length - 1].price;
  const priceRange = maxPrice - minPrice;
  const avgPrice = (minPrice + maxPrice) / 2;
  
  // 智能密度阈值计算
  const sortedPercentages = [...sortedData].map(d => d.percentage).sort((a, b) => b - a);
  const top20PercentIndex = Math.max(1, Math.floor(length * 0.2));
  const bottom20PercentIndex = Math.max(1, Math.floor(length * 0.2));
  
  const top20Avg = sortedPercentages.slice(0, top20PercentIndex).reduce((sum, p) => sum + p, 0) / top20PercentIndex;
  const bottom20Avg = sortedPercentages.slice(-bottom20PercentIndex).reduce((sum, p) => sum + p, 0) / bottom20PercentIndex;
  
  // 动态密度阈值：考虑分布的偏度
  const densityThreshold = bottom20Avg + (top20Avg - bottom20Avg) * 0.3;
  
  // 识别密集区（增强的聚类算法）
  const zones: DensityZone[] = [];
  let currentZone: DensityZone | null = null;
  
  for (let i = 0; i < length; i++) {
    const item = sortedData[i];
    
    if (item.percentage >= densityThreshold) {
      if (!currentZone) {
        // 开始新区域
        currentZone = {
          startIndex: i,
          endIndex: i,
          totalStrength: item.percentage,
          totalVolume: item.volume,
          averagePrice: item.price,
          priceRange: [item.price, item.price],
          volumeConcentration: 0,
          priceDensity: 0,
          peakCount: 0
        };
      } else {
        // 扩展当前区域
        currentZone.endIndex = i;
        currentZone.totalStrength += item.percentage;
        currentZone.totalVolume += item.volume;
        currentZone.averagePrice = (currentZone.averagePrice * (i - currentZone.startIndex) + item.price) / (i - currentZone.startIndex + 1);
        currentZone.priceRange[1] = item.price;
      }
    } else if (currentZone) {
      // 结束当前区域并计算额外属性
      currentZone.volumeConcentration = currentZone.totalVolume / totalVolume;
      const zonePriceRange = currentZone.priceRange[1] - currentZone.priceRange[0] + 0.1;
      currentZone.priceDensity = (currentZone.endIndex - currentZone.startIndex + 1) / zonePriceRange;
      
      // 计算区域内的峰值数量
      let peakCount = 0;
      for (let j = Math.max(currentZone.startIndex + 1, 1); j < Math.min(currentZone.endIndex, length - 1); j++) {
        const prev = sortedData[j - 1];
        const curr = sortedData[j];
        const next = sortedData[j + 1];
        if (curr.percentage > prev.percentage && curr.percentage > next.percentage) {
          peakCount++;
        }
      }
      currentZone.peakCount = peakCount;
      
      zones.push(currentZone);
      currentZone = null;
    }
  }
  
  // 处理最后一个区域
  if (currentZone) {
    currentZone.volumeConcentration = currentZone.totalVolume / totalVolume;
    const zonePriceRange = currentZone.priceRange[1] - currentZone.priceRange[0] + 0.1;
    currentZone.priceDensity = (currentZone.endIndex - currentZone.startIndex + 1) / zonePriceRange;
    zones.push(currentZone);
  }
  
  // 计算每个密集区到当前价格的距离
  const supportZones = zones.filter(zone => zone.averagePrice < currentPrice);
  const resistanceZones = zones.filter(zone => zone.averagePrice > currentPrice);
  
  // 从区域创建增强的支撑/压力位
  const createEnhancedLevel = (zone: DensityZone, type: 'support' | 'resistance'): EnhancedSupportResistanceLevel => {
    const zoneData = sortedData.slice(zone.startIndex, zone.endIndex + 1);
    const centerPrice = zone.averagePrice;
    const width = zone.priceRange[1] - zone.priceRange[0];
    const distance = currentPrice > 0 ? Math.abs((centerPrice - currentPrice) / currentPrice) * 100 : 0;
    
    // 计算强度因子
    const strengthFactor = zone.totalStrength / (zoneData.length * sortedData.reduce((sum, item) => sum + item.percentage, 0));
    const volumeFactor = zone.totalVolume / totalVolume;
    const positionFactor = 1 - Math.abs(centerPrice - vwap) / (priceRange + 0.1);
    const densityFactor = zone.priceDensity / (sortedData.length / (priceRange + 0.1));
    
    // 计算强度和可靠性
    const strength = (strengthFactor * 0.3 + volumeFactor * 0.25 + positionFactor * 0.2 + densityFactor * 0.15 + (zone.peakCount > 0 ? 0.1 : 0));
    const reliability = (volumeFactor * 0.4 + strengthFactor * 0.3 + densityFactor * 0.2 + (zone.peakCount > 0 ? 0.1 : 0));
    
    // 计算距离最近筹码峰值的距离（简化计算）
    const distanceFromPeak = Math.abs(centerPrice - avgPrice);
    
    // 趋势连续性（简单假设：价格越接近当前价格，趋势连续性越高）
    const trendContinuity = 1 - (distance / 100);
    
    // 突破潜力
    const breakoutPotential = (1 - reliability) * (1 - strength) * 0.5;
    
    // 历史重要性（基于成交量和强度）
    const historicalImportance = strength * reliability;
    
    return {
      price: centerPrice,
      strength,
      volume: zone.totalVolume,
      reliability,
      width,
      distance,
      type,
      priceRange: zone.priceRange,
      volumeConcentration: zone.volumeConcentration,
      priceDensity: zone.priceDensity,
      distanceFromPeak,
      trendContinuity,
      breakoutPotential,
      historicalImportance
    };
  };
  
  const enhancedSupportLevels = supportZones.map(zone => createEnhancedLevel(zone, 'support'));
  const enhancedResistanceLevels = resistanceZones.map(zone => createEnhancedLevel(zone, 'resistance'));
  
  // 转换为标准格式
  const supportLevels = enhancedSupportLevels as unknown as SupportResistanceLevel[];
  const resistanceLevels = enhancedResistanceLevels as unknown as SupportResistanceLevel[];
  
  // 智能排序和过滤
  enhancedSupportLevels.sort((a, b) => {
    // 优先考虑距离当前价格较近的支撑位
    if (Math.abs(a.distance - b.distance) < 5) {
      return b.strength - a.strength; // 距离相近时，按强度排序
    }
    return a.distance - b.distance;
  }).filter((_, index) => index < 5); // 只保留前5个最强支撑位
  
  enhancedResistanceLevels.sort((a, b) => {
    // 优先考虑距离当前价格较近的压力位
    if (Math.abs(a.distance - b.distance) < 5) {
      return b.strength - a.strength; // 距离相近时，按强度排序
    }
    return a.distance - b.distance;
  }).filter((_, index) => index < 5); // 只保留前5个最强压力位
  
  // 找到最强支撑和压力位
  let strongestSupport: SupportResistanceLevel | null = null;
  let strongestResistance: SupportResistanceLevel | null = null;
  
  if (enhancedSupportLevels.length > 0) {
    strongestSupport = enhancedSupportLevels.reduce((best, current) => 
      current.strength > best.strength ? current : best, enhancedSupportLevels[0]);
  }
  
  if (enhancedResistanceLevels.length > 0) {
    strongestResistance = enhancedResistanceLevels.reduce((best, current) => 
      current.strength > best.strength ? current : best, enhancedResistanceLevels[0]);
  }
  
  // 计算支撑压力比
  const totalSupportStrength = enhancedSupportLevels.reduce((sum, level) => sum + level.strength * (1 / (level.distance + 1)), 0);
  const totalResistanceStrength = enhancedResistanceLevels.reduce((sum, level) => sum + level.strength * (1 / (level.distance + 1)), 0);
  
  const supportResistanceRatio = totalResistanceStrength > 0 
    ? totalSupportStrength / totalResistanceStrength 
    : totalSupportStrength > 0 ? 10 : 1;
  
  // 计算支撑/压力位平衡度
  const supportResistanceBalance = (totalResistanceStrength - totalSupportStrength) / (totalResistanceStrength + totalSupportStrength + 0.1);
  
  // 找到最重要的支撑/压力位
  let mostImportantSupportResistance: EnhancedSupportResistanceLevel | null = null;
  
  if (enhancedSupportLevels.length > 0 || enhancedResistanceLevels.length > 0) {
    const allLevels = [...enhancedSupportLevels, ...enhancedResistanceLevels];
    mostImportantSupportResistance = allLevels.reduce((best, current) => 
      !best || current.strength > best.strength ? current : best, allLevels[0]);
  }
  
  return {
    supportLevels,
    resistanceLevels,
    strongestSupport,
    strongestResistance,
    supportResistanceRatio,
    enhancedSupportLevels,
    enhancedResistanceLevels,
    supportResistanceBalance,
    mostImportantSupportResistance
  };
}

// 兼容旧版本的接口
export function calculateSupportResistanceLegacy(
  chipData: ChipDistributionItem[], 
  currentPrice: number, 
  isSorted: boolean = false
): SupportResistanceLevels {
  const enhancedResult = calculateSupportResistance(chipData, currentPrice, isSorted);
  return {
    supportLevels: enhancedResult.supportLevels,
    resistanceLevels: enhancedResult.resistanceLevels,
    strongestSupport: enhancedResult.strongestSupport,
    strongestResistance: enhancedResult.strongestResistance,
    supportResistanceRatio: enhancedResult.supportResistanceRatio
  };
}
