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
  // 对于小的x值，使用泰勒级数近似：e^x ≈ 1 + x + x²/2! + x³/6! + x⁴/24!
  // 误差在x ∈ [-1, 1]时小于0.018
  if (x < -1 || x > 1) {
    return Math.exp(x); // 超出近似范围，使用标准计算
  }
  
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  return 1 + x + x2/2 + x3/6 + x4/24;
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
  const factor = DECAY_CONSTANTS[
    timeUnit.toUpperCase() + '_FACTOR'
  ] as number;
  
  // 预计算衰减因子
  const decayFactor = -decayRate;
  
  // 检查是否有预计算的衰减系数可用
  const precomputedCoefficients = DECAY_CONSTANTS.PRECOMPUTED_DECAY_COEFFICIENTS[
    timeUnit.toUpperCase()
  ] as { [key: number]: number };
  
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
  const factor = DECAY_CONSTANTS[
    timeUnit.toUpperCase() + '_FACTOR'
  ] as number;
  
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
    const emptyPeak: ChipPeak = { price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0 };
    return {
      chipDistribution: [],
      concentration: 0,
      mainPeak: { peakPrice: 0, peakRatio: 0, isSinglePeak: true, peaks: [], dominantPeak: emptyPeak, peakDensity: 0 },
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
  let hhi = 0;
  for (const item of chipData) {
    hhi += item.percentage * item.percentage;
  }
  return hhi;
}

// 识别筹码峰值
export function identifyChipPeaks(chipData: ChipDistributionItem[], isSorted: boolean = false): ChipPeakInfo {
  if (chipData.length === 0) {
    const emptyPeak: ChipPeak = { price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0 };
    return { peakPrice: 0, peakRatio: 0, isSinglePeak: true, peaks: [], dominantPeak: emptyPeak, peakDensity: 0 };
  }
  
  // 只在需要时排序
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  
  // 计算总成交量
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  
  // 价格范围
  const minPrice = sortedData[0].price;
  const maxPrice = sortedData[sortedData.length - 1].price;
  const priceRange = maxPrice - minPrice;
  
  // 查找峰值
  const peaks: ChipPeak[] = [];
  
  for (let i = 1; i < sortedData.length - 1; i++) {
    const current = sortedData[i];
    const prev = sortedData[i - 1];
    const next = sortedData[i + 1];
    
    // 峰值条件：当前成交量大于前后成交量
    if (current.volume > prev.volume && current.volume > next.volume) {
      // 计算峰值宽度
      let leftIndex = i;
      let rightIndex = i;
      
      while (leftIndex > 0 && sortedData[leftIndex].volume > current.volume * 0.5) leftIndex--;
      while (rightIndex < sortedData.length - 1 && sortedData[rightIndex].volume > current.volume * 0.5) rightIndex++;
      
      const width = sortedData[rightIndex].price - sortedData[leftIndex].price;
      const dominance = totalVolume > 0 ? current.volume / totalVolume : 0;
      const strength = dominance * (1 - width / (priceRange || 1));
      
      peaks.push({
        price: current.price,
        ratio: current.percentage,
        volume: current.volume,
        width,
        dominance,
        strength
      });
    }
  }
  
  // 处理边界情况
  const firstItem = sortedData[0];
  const lastItem = sortedData[sortedData.length - 1];
  
  if (sortedData.length === 1 || firstItem.volume > sortedData[1].volume) {
    const dominance = totalVolume > 0 ? firstItem.volume / totalVolume : 0;
    peaks.push({
      price: firstItem.price,
      ratio: firstItem.percentage,
      volume: firstItem.volume,
      width: priceRange / 2 || 1,
      dominance,
      strength: dominance
    });
  }
  
  if (sortedData.length > 1 && lastItem.volume > sortedData[sortedData.length - 2].volume) {
    const dominance = totalVolume > 0 ? lastItem.volume / totalVolume : 0;
    peaks.push({
      price: lastItem.price,
      ratio: lastItem.percentage,
      volume: lastItem.volume,
      width: priceRange / 2 || 1,
      dominance,
      strength: dominance
    });
  }
  
  // 按强度排序
  peaks.sort((a, b) => b.strength - a.strength);
  
  const dominantPeak = peaks.length > 0 ? peaks[0] : { price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0 };
  const isSinglePeak = dominantPeak.dominance > 0.5;
  const peakDensity = peaks.length / (priceRange > 0 ? priceRange : 1);
  
  return {
    peakPrice: dominantPeak.price,
    peakRatio: dominantPeak.ratio,
    isSinglePeak,
    peaks,
    dominantPeak,
    peakDensity
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
  
  // 计算总成交量
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  
  // 动态密度阈值（基于平均密度的1.5倍）
  const avgDensity = sortedData.reduce((sum, item) => sum + item.percentage, 0) / sortedData.length;
  const densityThreshold = avgDensity * 1.5;
  
  // 识别密集区
  const supportLevels: SupportResistanceLevel[] = [];
  const resistanceLevels: SupportResistanceLevel[] = [];
  
  for (let i = 0; i < sortedData.length; i++) {
    const item = sortedData[i];
    
    if (item.percentage < densityThreshold) continue;
    
    // 计算强度和可靠性
    const strength = item.percentage;
    const reliability = item.volume / totalVolume;
    const distance = Math.abs((item.price - currentPrice) / currentPrice) * 100;
    
    // 确定是支撑位还是压力位
    if (item.price < currentPrice) {
      // 支撑位：下方密集区
      supportLevels.push({
        price: item.price,
        strength,
        volume: item.volume,
        reliability,
        width: 0, // 简化实现
        distance,
        type: 'support'
      });
    } else if (item.price > currentPrice) {
      // 压力位：上方密集区
      resistanceLevels.push({
        price: item.price,
        strength,
        volume: item.volume,
        reliability,
        width: 0, // 简化实现
        distance,
        type: 'resistance'
      });
    }
  }
  
  // 排序
  supportLevels.sort((a, b) => b.price - a.price); // 从高到低
  resistanceLevels.sort((a, b) => a.price - b.price); // 从低到高
  
  // 找到最强支撑和压力位
  const strongestSupport = supportLevels.length > 0 
    ? supportLevels.reduce((strongest, level) => level.strength > strongest.strength ? level : strongest, supportLevels[0]) 
    : null;
  
  const strongestResistance = resistanceLevels.length > 0 
    ? resistanceLevels.reduce((strongest, level) => level.strength > strongest.strength ? level : strongest, resistanceLevels[0]) 
    : null;
  
  // 计算支撑压力比
  const totalSupportStrength = supportLevels.reduce((sum, level) => sum + level.strength, 0);
  const totalResistanceStrength = resistanceLevels.reduce((sum, level) => sum + level.strength, 0);
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
