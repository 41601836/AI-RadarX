// 自研技术指标算法实现

// 移动平均线 (MA) 计算
export interface MACalculationParams {
  data: number[];
  period: number;
}

export function calculateMA(params: MACalculationParams): number[] {
  const { data, period } = params;
  const result = new Array(data.length);
  
  if (data.length < period) {
    // 数据不足时返回零值数组
    for (let i = 0; i < data.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  
  // 计算MA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;
  
  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    result[i] = sum / period;
  }
  
  // 填充前period-1个值为零
  for (let i = 0; i < period - 1; i++) {
    result[i] = 0;
  }
  
  return result;
}

// 指数移动平均线 (EMA) 计算
export function calculateEMA(params: MACalculationParams): number[] {
  const { data, period } = params;
  const result = new Array(data.length);
  
  if (data.length < period) {
    for (let i = 0; i < data.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  
  // 计算EMA
  const k = 2 / (period + 1);
  let ema = data[period - 1];
  result[period - 1] = ema;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  
  // 填充前period-1个值为零
  for (let i = 0; i < period - 1; i++) {
    result[i] = 0;
  }
  
  return result;
}

// 相对强弱指标 (RSI) 计算
export interface RSICalculationParams {
  data: number[];
  period?: number;
}

export function calculateRSI(params: RSICalculationParams): number[] {
  const { data, period = 14 } = params;
  const result = new Array(data.length);
  
  if (data.length < period + 1) {
    for (let i = 0; i < data.length; i++) {
      result[i] = 50;
    }
    return result;
  }
  
  let gains = 0;
  let losses = 0;
  
  // 计算初始的平均增益和平均损失
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // 计算RSI
  result[period] = 100 - (100 / (1 + (avgGain / avgLoss)));
  
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    result[i] = 100 - (100 / (1 + (avgGain / avgLoss)));
  }
  
  // 填充前period个值为50
  for (let i = 0; i < period; i++) {
    result[i] = 50;
  }
  
  return result;
}

// 移动平均收敛发散 (MACD) 计算
export interface MACDCalculationParams {
  data: number[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACD(params: MACDCalculationParams): MACDResult {
  const { data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = params;
  
  const fastEMA = calculateEMA({ data, period: fastPeriod });
  const slowEMA = calculateEMA({ data, period: slowPeriod });
  
  const macd: number[] = new Array(data.length);
  
  // 计算MACD线
  for (let i = 0; i < data.length; i++) {
    macd[i] = fastEMA[i] - slowEMA[i];
  }
  
  // 计算信号线
  const signal = calculateEMA({ data: macd, period: signalPeriod });
  
  // 计算MACD柱状图
  const histogram: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    histogram[i] = macd[i] - signal[i];
  }
  
  return { macd, signal, histogram };
}

// KDJ指标计算
export interface KDJCalculationParams {
  high: number[];
  low: number[];
  close: number[];
  period?: number;
  kPeriod?: number;
  dPeriod?: number;
}

export interface KDJResult {
  k: number[];
  d: number[];
  j: number[];
}

export function calculateKDJ(params: KDJCalculationParams): KDJResult {
  const { high, low, close, period = 9, kPeriod = 3, dPeriod = 3 } = params;
  const length = close.length;
  
  const k: number[] = new Array(length);
  const d: number[] = new Array(length);
  const j: number[] = new Array(length);
  
  if (length < period) {
    for (let i = 0; i < length; i++) {
      k[i] = 50;
      d[i] = 50;
      j[i] = 50;
    }
    return { k, d, j };
  }
  
  // 计算RSV
  for (let i = period - 1; i < length; i++) {
    let highest = high[i];
    let lowest = low[i];
    
    for (let j = i - period + 1; j <= i; j++) {
      if (high[j] > highest) highest = high[j];
      if (low[j] < lowest) lowest = low[j];
    }
    
    const rsv = (close[i] - lowest) / (highest - lowest) * 100;
    
    // 计算K值
    if (i === period - 1) {
      k[i] = 50;
    } else {
      k[i] = (k[i - 1] * (kPeriod - 1) + rsv) / kPeriod;
    }
    
    // 计算D值
    if (i === period - 1) {
      d[i] = 50;
    } else {
      d[i] = (d[i - 1] * (dPeriod - 1) + k[i]) / dPeriod;
    }
    
    // 计算J值
    j[i] = 3 * k[i] - 2 * d[i];
  }
  
  // 填充前period-1个值
  for (let i = 0; i < period - 1; i++) {
    k[i] = 50;
    d[i] = 50;
    j[i] = 50;
  }
  
  return { k, d, j };
}

// 布林带 (Bollinger Bands) 计算
export interface BollingerBandsCalculationParams {
  data: number[];
  period?: number;
  standardDeviations?: number;
}

export interface BollingerBandsResult {
  middle: number[];
  upper: number[];
  lower: number[];
}

export function calculateBollingerBands(params: BollingerBandsCalculationParams): BollingerBandsResult {
  const { data, period = 20, standardDeviations = 2 } = params;
  
  // 计算中轨（20日移动平均线）
  const middle = calculateMA({ data, period });
  
  const upper: number[] = new Array(data.length);
  const lower: number[] = new Array(data.length);
  
  for (let i = period - 1; i < data.length; i++) {
    // 计算标准差
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - middle[i];
      sum += diff * diff;
    }
    const stdDev = Math.sqrt(sum / period);
    
    // 计算上轨和下轨
    upper[i] = middle[i] + standardDeviations * stdDev;
    lower[i] = middle[i] - standardDeviations * stdDev;
  }
  
  // 填充前period-1个值
  for (let i = 0; i < period - 1; i++) {
    upper[i] = data[i];
    lower[i] = data[i];
  }
  
  return { middle, upper, lower };
}