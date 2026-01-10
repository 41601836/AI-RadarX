// WAD（加权平均分布）模型算法实现

// 指数级时间衰减权重计算
export function calculateDecayWeight(timestamp: number, currentTime: number, decayRate: number = 0.1): number {
  const timeDiff = currentTime - timestamp;
  // 转换为天为单位
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  // 指数衰减公式：weight = e^(-decayRate * daysDiff)
  return Math.exp(-decayRate * daysDiff);
}

// 基于成交量的时间衰减权重计算（适用于高频数据）
export function calculateVolumeDecayWeight(
  timestamp: number, 
  currentTime: number, 
  volume: number, 
  decayRate: number = 0.1
): number {
  const timeWeight = calculateDecayWeight(timestamp, currentTime, decayRate);
  // 成交量标准化权重（假设最大成交量为1000万手）
  const volumeWeight = Math.min(1, volume / 10000000);
  // 综合时间和成交量的权重
  return timeWeight * volumeWeight;
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

// 累积WAD指标计算（性能优化版）
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
  
  // 预计算时间转换常数
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const decayFactor = decayRate;
  
  for (let i = 0; i < dataLength; i++) {
    const item = sortedData[i];
    const previousClose = i > 0 ? sortedData[i - 1].close : item.close;
    
    // 性能优化：内联calculateWAD函数，减少函数调用开销
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
    
    // 计算权重
    let weight = 1.0;
    if (useExponentialDecay) {
      if (weightType === 'volume' && item.volume) {
        // 性能优化：内联calculateVolumeDecayWeight函数
        const timeDiff = currentTime - item.timestamp;
        const daysDiff = timeDiff / millisecondsPerDay;
        const timeWeight = Math.exp(-decayFactor * daysDiff);
        const volumeWeight = Math.min(1, item.volume / 10000000);
        weight = timeWeight * volumeWeight;
      } else {
        // 内联计算衰减权重，减少函数调用开销
        const timeDiff = currentTime - item.timestamp;
        const daysDiff = timeDiff / millisecondsPerDay;
        weight = Math.exp(-decayFactor * daysDiff);
      }
    }
    
    // 累积WAD
    cumulativeWAD += wadIncrement;
    
    // 计算加权累积WAD
    cumulativeWeightedWAD += wadIncrement * weight;
    
    // 直接设置数组元素，避免push操作的开销
    result[i] = {
      timestamp: item.timestamp,
      wad: cumulativeWAD,
      weightedWad: cumulativeWeightedWAD,
      rawIncrement: wadIncrement,
      weight
    };
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
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const decayFactor = decayRate;
  
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
    
    // 计算权重
    let weight = 1.0;
    if (useExponentialDecay) {
      if (weightType === 'volume' && item.volume) {
        const timeDiff = currentTime - item.timestamp;
        const daysDiff = timeDiff / millisecondsPerDay;
        const timeWeight = Math.exp(-decayFactor * daysDiff);
        const volumeWeight = Math.min(1, item.volume / 10000000);
        weight = timeWeight * volumeWeight;
      } else {
        const timeDiff = currentTime - item.timestamp;
        const daysDiff = timeDiff / millisecondsPerDay;
        weight = Math.exp(-decayFactor * daysDiff);
      }
    }
    weights[i] = weight;
    
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
