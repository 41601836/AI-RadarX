// WAD（加权平均分布）模型算法实现
import { ChipDistributionItem, ChipPeak, ChipPeakInfo, SupportResistanceLevel, SupportResistanceLevels } from './chipDistribution';

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
function fastExp(x: number): number {
  // 对于小的x值，使用泰勒级数近似：e^x ≈ 1 + x + x²/2! + x³/6! + x⁴/24! + x⁵/120 + x⁶/720 + x⁷/5040 + x⁸/40320
  // 误差在x ∈ [-1, 1]时小于0.0001
  if (x < -1 || x > 1) {
    return Math.exp(x); // 超出近似范围，使用标准计算
  }
  
  // 优化：使用高精度泰勒级数展开（增加到x⁸项）
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const x6 = x5 * x;
  const x7 = x6 * x;
  const x8 = x7 * x;
  return 1 + x + x2/2 + x3/6 + x4/24 + x5/120 + x6/720 + x7/5040 + x8/40320;
}

// 快速批量指数计算（SIMD-like优化）
function fastBatchExp(values: number[]): number[] {
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
  
  // 检查是否有预计算的衰减系数可用
  let precomputedCoefficients: { [key: number]: number } | undefined;
  switch (timeUnit) {
    case 'day':
      precomputedCoefficients = DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.DAILY;
      break;
    case 'hour':
      precomputedCoefficients = DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.HOURLY;
      break;
    case 'minute':
      precomputedCoefficients = DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS.MINUTELY;
      break;
    default:
      precomputedCoefficients = undefined;
  }
  
  let usePrecomputed = false;
  let precomputedCoeff = 1.0;
  
  if (precomputedCoefficients && precomputedCoefficients[decayRate] !== undefined) {
    usePrecomputed = true;
    precomputedCoeff = precomputedCoefficients[decayRate];
  }
  
  // 预计算常用时间差的权重（用于小批量计算）
  const useFastExp = timestamps.length < 1000; // 小批量使用快速指数近似
  
  // 并行计算权重，减少函数调用开销
  for (let i = 0; i < timestamps.length; i++) {
    const timeDiff = currentTime - timestamps[i];
    const timeUnitDiff = timeDiff * factor;
    const exponent = decayFactor * timeUnitDiff;
    
    if (usePrecomputed && timeUnit === 'day' && timeUnitDiff < 31) {
      // 使用预计算的查找表（每日衰减，30天内）
      const dayIndex = Math.floor(timeUnitDiff);
      result[i] = DECAY_CONSTANTS.BATCH_DECAY_LOOKUP_TABLES.DAILY_30DAYS[dayIndex];
    } else if (useFastExp) {
      // 小批量使用快速指数近似
      result[i] = fastExp(exponent);
    } else {
      // 大批量使用标准指数计算
      result[i] = Math.exp(exponent);
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
  const { 
    decayRate = 0.1, 
    weightType = 'time',
    useExponentialDecay = true,
    windowSize = 0 // 0表示不使用滑动窗口
  } = options;
  
  const dataLength = data.length;
  if (dataLength === 0) return [];
  
  // 预计算衰减因子
  const decayFactor = -decayRate;
  
  // 性能优化：预分配结果数组
  const result = new Array(dataLength);
  let cumulativeWAD = 0;
  let cumulativeWeightedWAD = 0;
  const currentTime = Date.now();
  
  // 性能优化：避免spread操作，直接创建排序数组
  const sortedData = new Array(dataLength);
  for (let i = 0; i < dataLength; i++) {
    sortedData[i] = data[i];
  }
  sortedData.sort((a, b) => a.timestamp - b.timestamp);
  
  // 批量预计算权重（如果可能）
  let weights: number[] | undefined;
  if (useExponentialDecay) {
    if (weightType === 'time') {
      const timestamps = sortedData.map(item => item.timestamp);
      weights = calculateBatchDecayWeights(timestamps, currentTime, decayRate);
    } else if (weightType === 'volume') {
      // 批量预计算成交量衰减权重
      const timestamps = sortedData.map(item => item.timestamp);
      const volumes = sortedData.map(item => item.volume || 0);
      weights = calculateBatchVolumeDecayWeights(timestamps, currentTime, volumes, decayRate);
    }
  }
  
  // 使用局部变量缓存提高访问速度
  let previousClose = sortedData[0].close;
  
  for (let i = 0; i < dataLength; i++) {
    const item = sortedData[i];
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
        const timeWeight = Math.exp(decayFactor * daysDiff); // 使用预计算的负数衰减因子
        const volumeWeight = item.volume / MAX_VOLUME;
        const normalizedVolumeWeight = volumeWeight > 1 ? 1 : volumeWeight;
        weight = timeWeight * normalizedVolumeWeight;
      } else if (weights) {
        // 使用批量预计算的权重
        weight = weights[i];
      } else {
        // 内联计算时间衰减权重
        const timeDiff = currentTime - timestamp;
        const daysDiff = timeDiff / MILLISECONDS_PER_DAY;
        weight = Math.exp(decayFactor * daysDiff); // 使用预计算的负数衰减因子
      }
    }
    
    // 累积WAD（使用直接赋值避免重复计算）
    cumulativeWAD += wadIncrement;
    cumulativeWeightedWAD += wadIncrement * weight;
    
    // 直接设置数组元素，避免push操作的开销
    result[i] = {
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

// 计算赫芬达尔-赫希曼指数（HHI）
export function calculateHHI(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 计算赫芬达尔-赫希曼指数：HHI = Σ(percentage^2)
  // 优化：使用高精度累加器和内联计算，避免不必要的函数调用
  let hhi = 0.0;
  const length = chipData.length;
  
  // 使用普通for循环和类型断言，避免隐式转换
  for (let i = 0; i < length; i++) {
    const percentage = chipData[i].percentage;
    // 直接使用高精度计算，避免toFixed导致的精度损失
    hhi += percentage * percentage;
  }
  
  // 确保HHI在合理范围内（0-1）
  return Math.min(1, Math.max(0, hhi));
}

// 识别筹码峰值
export function identifyChipPeaks(chipData: ChipDistributionItem[], isSorted: boolean = false): ChipPeakInfo {
  if (chipData.length === 0) {
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
      peakPrice: 0,
      peakRatio: 0,
      isSinglePeak: true,
      peaks: [],
      dominantPeak: emptyPeak,
      secondaryPeaks: [],
      peakDensity: 0,
      peakQualityScore: 0,
      priceRange: 0
    };
  }
  
  // 只在需要时排序，优化排序性能
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  const length = sortedData.length;
  
  // 预计算总成交量（使用普通for循环提高性能）
  let totalVolume = 0;
  for (let i = 0; i < length; i++) {
    totalVolume += sortedData[i].volume;
  }
  
  // 价格范围
  const minPrice = sortedData[0].price;
  const maxPrice = sortedData[length - 1].price;
  const priceRange = maxPrice - minPrice;
  
  // 查找峰值
  const peaks: ChipPeak[] = [];
  
  // 优化的峰值检测算法
  for (let i = 1; i < length - 1; i++) {
    const current = sortedData[i];
    const prev = sortedData[i - 1];
    const next = sortedData[i + 1];
    
    // 峰值条件：当前成交量大于前后成交量
    if (current.volume > prev.volume && current.volume > next.volume) {
      // 计算峰值宽度（优化：使用二分查找或更高效的算法）
      let leftIndex = i;
      let rightIndex = i;
      
      // 向左查找峰值边界
      while (leftIndex > 0 && sortedData[leftIndex].volume > current.volume * 0.5) {
        leftIndex--;
      }
      
      // 向右查找峰值边界
      while (rightIndex < length - 1 && sortedData[rightIndex].volume > current.volume * 0.5) {
        rightIndex++;
      }
      
      const width = sortedData[rightIndex].price - sortedData[leftIndex].price;
      const dominance = totalVolume > 0 ? current.volume / totalVolume : 0;
      const strength = dominance * (1 - (priceRange > 0 ? width / priceRange : 0));
      
      // 计算更精确的可靠性指标
      const reliability = strength * 0.8 + (width / (priceRange > 0 ? priceRange : 1)) * 0.2;
      
      peaks.push({
        price: current.price,
        ratio: current.percentage,
        volume: current.volume,
        width,
        dominance,
        strength,
        reliability,
        centerPrice: current.price,
        volumeWeightedPrice: current.price
      });
    }
  }
  
  // 处理边界情况（优化：减少不必要的条件检查）
  const firstItem = sortedData[0];
  const lastItem = sortedData[length - 1];
  
  if (length === 1) {
    // 只有一个数据点的情况
    const dominance = totalVolume > 0 ? firstItem.volume / totalVolume : 0;
    peaks.push({
      price: firstItem.price,
      ratio: firstItem.percentage,
      volume: firstItem.volume,
      width: priceRange / 2 || 1,
      dominance,
      strength: dominance,
      reliability: dominance * 0.7,
      centerPrice: firstItem.price,
      volumeWeightedPrice: firstItem.price
    });
  } else {
    // 处理第一个数据点
    if (firstItem.volume > sortedData[1].volume) {
      const dominance = totalVolume > 0 ? firstItem.volume / totalVolume : 0;
      peaks.push({
        price: firstItem.price,
        ratio: firstItem.percentage,
        volume: firstItem.volume,
        width: priceRange / 2 || 1,
        dominance,
        strength: dominance,
        reliability: dominance * 0.7,
        centerPrice: firstItem.price,
        volumeWeightedPrice: firstItem.price
      });
    }
    
    // 处理最后一个数据点
    if (lastItem.volume > sortedData[length - 2].volume) {
      const dominance = totalVolume > 0 ? lastItem.volume / totalVolume : 0;
      peaks.push({
        price: lastItem.price,
        ratio: lastItem.percentage,
        volume: lastItem.volume,
        width: priceRange / 2 || 1,
        dominance,
        strength: dominance,
        reliability: dominance * 0.7,
        centerPrice: lastItem.price,
        volumeWeightedPrice: lastItem.price
      });
    }
  }
  
  // 按强度排序
  peaks.sort((a, b) => b.strength - a.strength);
  
  // 确定主峰和次要峰值
  const dominantPeak = peaks.length > 0 ? peaks[0] : { price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0, reliability: 0, centerPrice: 0, volumeWeightedPrice: 0 };
  const isSinglePeak = dominantPeak.dominance > 0.5;
  const peakDensity = peaks.length / (priceRange > 0 ? priceRange : 1);
  const secondaryPeaks = peaks.length > 1 ? peaks.slice(1) : [];
  
  // 改进的峰值质量分数计算
  const peakQualityScore = dominantPeak.strength * 0.5 + dominantPeak.reliability * 0.3 + dominantPeak.dominance * 0.2;

  return {
    peakPrice: dominantPeak.price,
    peakRatio: dominantPeak.ratio,
    isSinglePeak,
    peaks,
    dominantPeak,
    secondaryPeaks,
    peakDensity,
    peakQualityScore,
    priceRange
  };
}

// 计算支撑/压力位
export function calculateSupportResistance(
  chipData: ChipDistributionItem[], 
  currentPrice: number, 
  isSorted: boolean = false
): SupportResistanceLevels {
  if (chipData.length === 0) {
    return { supportLevels: [], resistanceLevels: [], strongestSupport: null, strongestResistance: null, supportResistanceRatio: 0 };
  }
  
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  const length = sortedData.length;
  
  // 预计算总成交量（使用普通for循环提高性能）
  let totalVolume = 0;
  for (let i = 0; i < length; i++) {
    totalVolume += sortedData[i].volume;
  }
  
  // 动态密度阈值计算（优化：使用更高效的平均计算）
  let totalPercentage = 0;
  for (let i = 0; i < length; i++) {
    totalPercentage += sortedData[i].percentage;
  }
  const avgDensity = totalPercentage / length;
  const densityThreshold = avgDensity * 1.5;
  
  // 识别密集区
  const supportLevels: SupportResistanceLevel[] = [];
  const resistanceLevels: SupportResistanceLevel[] = [];
  
  // 优化的密集区识别算法
  for (let i = 0; i < length; i++) {
    const item = sortedData[i];
    
    // 只考虑超过密度阈值的区域
    if (item.percentage < densityThreshold) continue;
    
    // 计算支撑/压力位强度和可靠性
    const strength = item.percentage;
    const reliability = totalVolume > 0 ? item.volume / totalVolume : 0;
    const distance = currentPrice > 0 ? Math.abs((item.price - currentPrice) / currentPrice) * 100 : 0;
    
    // 确定支撑位或压力位
    if (item.price < currentPrice - 0.01) { // 支撑位：价格略低于当前价格
      supportLevels.push({
        price: item.price,
        strength,
        volume: item.volume,
        reliability,
        width: 0, // 将在后续计算中更新
        distance,
        type: 'support'
      });
    } else if (item.price > currentPrice + 0.01) { // 压力位：价格略高于当前价格
      resistanceLevels.push({
        price: item.price,
        strength,
        volume: item.volume,
        reliability,
        width: 0, // 将在后续计算中更新
        distance,
        type: 'resistance'
      });
    }
    // 忽略当前价格附近的区域
  }
  
  // 优化的宽度计算
  function calculateWidth(levels: SupportResistanceLevel[], data: ChipDistributionItem[]): void {
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      let leftIndex = 0;
      let rightIndex = data.length - 1;
      
      // 向左查找边界
      for (let j = 0; j < data.length; j++) {
        if (data[j].price >= level.price - avgDensity) {
          leftIndex = j;
          break;
        }
      }
      
      // 向右查找边界
      for (let j = data.length - 1; j >= 0; j--) {
        if (data[j].price <= level.price + avgDensity) {
          rightIndex = j;
          break;
        }
      }
      
      level.width = data[rightIndex].price - data[leftIndex].price;
    }
  }
  
  // 计算支撑位和压力位的宽度
  calculateWidth(supportLevels, sortedData);
  calculateWidth(resistanceLevels, sortedData);
  
  // 排序：支撑位从高到低，压力位从低到高
  supportLevels.sort((a, b) => b.price - a.price);
  resistanceLevels.sort((a, b) => a.price - b.price);
  
  // 找到最强支撑和压力位（优化：使用更高效的查找方法）
  let strongestSupport: SupportResistanceLevel | null = null;
  let strongestResistance: SupportResistanceLevel | null = null;
  
  if (supportLevels.length > 0) {
    strongestSupport = supportLevels[0];
    for (let i = 1; i < supportLevels.length; i++) {
      if (supportLevels[i].strength > strongestSupport.strength) {
        strongestSupport = supportLevels[i];
      }
    }
  }
  
  if (resistanceLevels.length > 0) {
    strongestResistance = resistanceLevels[0];
    for (let i = 1; i < resistanceLevels.length; i++) {
      if (resistanceLevels[i].strength > strongestResistance.strength) {
        strongestResistance = resistanceLevels[i];
      }
    }
  }
  
  // 计算支撑压力比
  let totalSupportStrength = 0;
  for (const level of supportLevels) {
    totalSupportStrength += level.strength;
  }
  
  let totalResistanceStrength = 0;
  for (const level of resistanceLevels) {
    totalResistanceStrength += level.strength;
  }
  
  const supportResistanceRatio = totalResistanceStrength > 0 
    ? totalSupportStrength / totalResistanceStrength 
    : totalSupportStrength > 0 ? 10 : 1;
  
  return {
    supportLevels,
    resistanceLevels,
    strongestSupport,
    strongestResistance,
    supportResistanceRatio
  };
}
