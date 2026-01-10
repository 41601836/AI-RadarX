// 自研技术指标算法实现
import { WADItem, calculateWAD } from './wad';

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

// MACD指标计算
export interface MACDParams {
  close: number[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
}

export interface MACDResult {
  diff: number[];
  dea: number[];
  bar: number[];
}

export function calculateMACD(params: MACDParams): MACDResult {
  const { close, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = params;
  const length = close.length;
  
  // 计算快速EMA和慢速EMA
  const emaFast = calculateEMA({ data: close, period: fastPeriod });
  const emaSlow = calculateEMA({ data: close, period: slowPeriod });
  
  // 计算DIF
  const diff = new Array(length);
  for (let i = 0; i < length; i++) {
    diff[i] = emaFast[i] - emaSlow[i];
  }
  
  // 计算DEA
  const dea = calculateEMA({ data: diff, period: signalPeriod });
  
  // 计算BAR (MACD柱状图)
  const bar = new Array(length);
  for (let i = 0; i < length; i++) {
    bar[i] = (diff[i] - dea[i]) * 2;
  }
  
  return { diff, dea, bar };
}

// RSI指标计算
export interface RSIParams {
  close: number[];
  period?: number;
}

export function calculateRSI(params: RSIParams): number[] {
  const { close, period = 14 } = params;
  const length = close.length;
  const rsi = new Array(length);
  
  if (length < period + 1) {
    for (let i = 0; i < length; i++) {
      rsi[i] = 0;
    }
    return rsi;
  }
  
  // 计算RSI
  let upSum = 0;
  let downSum = 0;
  
  // 计算前period个周期的上涨和下跌
  for (let i = 1; i <= period; i++) {
    const change = close[i] - close[i - 1];
    if (change > 0) {
      upSum += change;
    } else {
      downSum += Math.abs(change);
    }
  }
  
  let avgGain = upSum / period;
  let avgLoss = downSum / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  
  for (let i = period + 1; i < length; i++) {
    const change = close[i] - close[i - 1];
    let gain = 0;
    let loss = 0;
    
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  // 填充前period个值为零
  for (let i = 0; i < period; i++) {
    rsi[i] = 0;
  }
  
  return rsi;
}

// 计算WAD指标
export function calculateWADSeries(data: WADItem[]): number[] {
  const result = new Array(data.length);
  if (data.length === 0) return result;
  
  let cumulativeWAD = 0;
  let previousClose = data[0].close;
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const params = {
      high: item.high,
      low: item.low,
      close: item.close,
      previousClose
    };
    
    const wadIncrement = calculateWAD(params);
    cumulativeWAD += wadIncrement;
    result[i] = cumulativeWAD;
    previousClose = item.close;
  }
  
  return result;
}

// 计算布林带
export interface BollingerBandsParams {
  close: number[];
  period?: number;
  standardDeviations?: number;
}

export interface BollingerBandsResult {
  middle: number[];
  upper: number[];
  lower: number[];
}

export function calculateBollingerBands(params: BollingerBandsParams): BollingerBandsResult {
  const { close, period = 20, standardDeviations = 2 } = params;
  const length = close.length;
  
  // 计算中间带（MA）
  const middle = calculateMA({ data: close, period });
  
  // 计算标准差
  const stdDev = new Array(length);
  for (let i = 0; i < length; i++) {
    if (i < period - 1) {
      stdDev[i] = 0;
      continue;
    }
    
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += Math.pow(close[j] - middle[i], 2);
    }
    stdDev[i] = Math.sqrt(sum / period);
  }
  
  // 计算上轨和下轨
  const upper = new Array(length);
  const lower = new Array(length);
  for (let i = 0; i < length; i++) {
    upper[i] = middle[i] + standardDeviations * stdDev[i];
    lower[i] = middle[i] - standardDeviations * stdDev[i];
  }
  
  return { middle, upper, lower };
}

// 计算KDJ指标
export interface KDJParams {
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

export function calculateKDJ(params: KDJParams): KDJResult {
  const { high, low, close, period = 9, kPeriod = 3, dPeriod = 3 } = params;
  const length = close.length;
  
  // 计算RSV
  const rsv = new Array(length);
  for (let i = 0; i < length; i++) {
    if (i < period - 1) {
      rsv[i] = 0;
      continue;
    }
    
    let highest = high[i];
    let lowest = low[i];
    
    for (let j = i - period + 1; j <= i; j++) {
      if (high[j] > highest) highest = high[j];
      if (low[j] < lowest) lowest = low[j];
    }
    
    const currentClose = close[i];
    if (highest === lowest) {
      rsv[i] = 0;
    } else {
      rsv[i] = ((currentClose - lowest) / (highest - lowest)) * 100;
    }
  }
  
  // 计算K和D
  const k = new Array(length);
  const d = new Array(length);
  const j = new Array(length);
  
  // 初始值
  k[period - 1] = 50;
  d[period - 1] = 50;
  
  for (let i = period; i < length; i++) {
    k[i] = (k[i - 1] * (kPeriod - 1) + rsv[i]) / kPeriod;
    d[i] = (d[i - 1] * (dPeriod - 1) + k[i]) / dPeriod;
    j[i] = 3 * k[i] - 2 * d[i];
  }
  
  // 填充前period-1个值
  for (let i = 0; i < period - 1; i++) {
    k[i] = 0;
    d[i] = 0;
    j[i] = 0;
  }
  
  return { k, d, j };
}

// 归一化函数 (用于序列匹配)
export function normalize(data: number[]): number[] {
  const length = data.length;
  if (length === 0) return [];
  
  // 计算最小值和最大值
  let min = data[0];
  let max = data[0];
  for (let i = 1; i < length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  
  // 归一化到[0, 1]区间
  const result = new Array(length);
  if (max === min) {
    for (let i = 0; i < length; i++) {
      result[i] = 0;
    }
  } else {
    for (let i = 0; i < length; i++) {
      result[i] = (data[i] - min) / (max - min);
    }
  }
  
  return result;
}

// 动态时间规整 (DTW) 序列匹配
export interface DTWParams {
  sequence1: number[];
  sequence2: number[];
  windowSize?: number; // 可选的窗口大小，用于优化性能
}

export function calculateDTW(params: DTWParams): number {
  const { sequence1, sequence2, windowSize } = params;
  const m = sequence1.length;
  const n = sequence2.length;
  
  // 初始化距离矩阵
  const dtw = new Array(m + 1);
  for (let i = 0; i <= m; i++) {
    dtw[i] = new Array(n + 1).fill(Infinity);
  }
  dtw[0][0] = 0;
  
  // 设置窗口大小
  const w = windowSize || Math.max(m, n);
  
  // 计算DTW距离
  for (let i = 1; i <= m; i++) {
    for (let j = Math.max(1, i - w); j <= Math.min(n, i + w); j++) {
      const cost = Math.abs(sequence1[i - 1] - sequence2[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // 向上
        dtw[i][j - 1],     // 向左
        dtw[i - 1][j - 1]  // 对角线
      );
    }
  }
  
  return dtw[m][n];
}

// 计算DTW相似度 (0-1之间，值越大越相似)
export function calculateDTWSimilarity(params: DTWParams): number {
  const distance = calculateDTW(params);
  // 归一化距离到相似度（这里做简单的线性转换，实际应用中可能需要更复杂的归一化）
  const maxPossibleDistance = Math.max(
    params.sequence1.length,
    params.sequence2.length
  );
  return Math.max(0, 1 - distance / maxPossibleDistance);
}

// K线形态识别
export interface KlinePatternParams {
  high: number[];
  low: number[];
  close: number[];
  open: number[];
  pattern?: string; // 可选的特定形态名称
}

export interface KlinePatternResult {
  pattern: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// 识别基本K线形态
export function recognizeBasicPatterns(params: KlinePatternParams): KlinePatternResult[] {
  const { high, low, close, open } = params;
  const results: KlinePatternResult[] = [];
  const length = high.length;
  
  if (length < 2) return results;
  
  // 识别锤子线形态
  for (let i = 1; i < length; i++) {
    const currentHigh = high[i];
    const currentLow = low[i];
    const currentClose = close[i];
    const currentOpen = open[i];
    
    // 计算实体和影线长度
    const bodyLength = Math.abs(currentClose - currentOpen);
    const upperShadow = currentHigh - Math.max(currentClose, currentOpen);
    const lowerShadow = Math.min(currentClose, currentOpen) - currentLow;
    
    // 锤子线条件
    if (bodyLength < (currentHigh - currentLow) * 0.3 && // 实体较短
        lowerShadow > bodyLength * 2 && // 下影线较长
        upperShadow < bodyLength * 0.5) { // 上影线较短
      
      results.push({
        pattern: 'hammer',
        confidence: 0.8,
        startIndex: i,
        endIndex: i
      });
    }
    
    // 倒锤子线条件
    if (bodyLength < (currentHigh - currentLow) * 0.3 && // 实体较短
        upperShadow > bodyLength * 2 && // 上影线较长
        lowerShadow < bodyLength * 0.5) { // 下影线较短
      
      results.push({
        pattern: 'inverted_hammer',
        confidence: 0.8,
        startIndex: i,
        endIndex: i
      });
    }
    
    // 十字星条件
    if (bodyLength < (currentHigh - currentLow) * 0.1 && // 实体非常短
        bodyLength < 0.001 * Math.max(currentOpen, currentClose)) { // 相对于价格很小
      
      results.push({
        pattern: 'doji',
        confidence: 0.9,
        startIndex: i,
        endIndex: i
      });
    }
  }
  
  return results;
}

// 识别复合K线形态
export function recognizeComplexPatterns(params: KlinePatternParams): KlinePatternResult[] {
  const { high, low, close, open } = params;
  const results: KlinePatternResult[] = [];
  const length = high.length;
  
  if (length < 3) return results;
  
  // 识别红三兵形态
  for (let i = 2; i < length; i++) {
    const day1Close = close[i - 2];
    const day1Open = open[i - 2];
    const day2Close = close[i - 1];
    const day2Open = open[i - 1];
    const day3Close = close[i];
    const day3Open = open[i];
    
    // 红三兵条件：连续三天收阳，且每天收盘价高于前一天收盘价，每天开盘价在前一天收盘价附近
    if (day1Close > day1Open && // 第一天阳线
        day2Close > day2Open && // 第二天阳线
        day3Close > day3Open && // 第三天阳线
        day2Close > day1Close && // 第二天收盘价高于第一天
        day3Close > day2Close && // 第三天收盘价高于第二天
        day2Open >= day1Close * 0.995 && // 第二天开盘在前一天收盘价附近
        day3Open >= day2Close * 0.995) { // 第三天开盘在前一天收盘价附近
      
      results.push({
        pattern: 'three_white_soldiers',
        confidence: 0.75,
        startIndex: i - 2,
        endIndex: i
      });
    }
  }
  
  // 识别乌云盖顶形态
  for (let i = 1; i < length; i++) {
    const day1Close = close[i - 1];
    const day1Open = open[i - 1];
    const day2Close = close[i];
    const day2Open = open[i];
    
    // 乌云盖顶条件：第一天大阳线，第二天高开低走，收盘价跌破第一天阳线中点
    if (day1Close > day1Open && // 第一天阳线
        (day1Close - day1Open) > (high[i - 1] - low[i - 1]) * 0.6 && // 大阳线
        day2Open > day1Close && // 第二天高开
        day2Close < day1Close && // 第二天收阴
        day2Close < (day1Close + day1Open) / 2) { // 收盘价跌破中点
      
      results.push({
        pattern: 'dark_cloud_cover',
        confidence: 0.8,
        startIndex: i - 1,
        endIndex: i
      });
    }
  }
  
  return results;
}

// 综合K线形态识别
export function recognizeKlinePatterns(params: KlinePatternParams): KlinePatternResult[] {
  const basicPatterns = recognizeBasicPatterns(params);
  const complexPatterns = recognizeComplexPatterns(params);
  
  // 合并结果并按置信度排序
  return [...basicPatterns, ...complexPatterns]
    .sort((a, b) => b.confidence - a.confidence);
}
