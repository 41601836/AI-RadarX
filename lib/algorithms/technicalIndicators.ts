// 自研技术指标算法实现
import { logger } from '../utils/logger';

// DTW (动态时间规整) 计算
export interface DTWCalculationParams {
  sequence1: number[];
  sequence2: number[];
  series1?: number[];
  series2?: number[];
}

export function calculateDTW(params: DTWCalculationParams): number {
  const timerLabel = 'calculateDTW';
  logger.time(timerLabel);
  
  const { sequence1 = params.series1 || [], sequence2 = params.series2 || [] } = params;
  const n = sequence1.length;
  const m = sequence2.length;
  
  // 初始化距离矩阵
  const distanceMatrix: number[][] = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    distanceMatrix[i] = new Array(m + 1).fill(Infinity);
  }
  distanceMatrix[0][0] = 0;
  
  // 计算距离矩阵
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(sequence1[i - 1] - sequence2[j - 1]);
      const minDistance = Math.min(
        distanceMatrix[i - 1][j],
        distanceMatrix[i][j - 1],
        distanceMatrix[i - 1][j - 1]
      );
      distanceMatrix[i][j] = cost + minDistance;
    }
  }
  
  logger.timeEnd(timerLabel);
  return distanceMatrix[n][m];
}

// 兼容旧版本的DTW相似度计算
export function calculateDTWSimilarity(params: DTWCalculationParams): number {
  return calculateDTW(params);
}

// 增强版 DTW 计算
export interface DTWAdvancedParams {
  series1: number[];
  series2: number[];
  windowSize?: number;
  normalization?: 'zscore' | 'minmax' | 'none';
  distanceMetric?: 'euclidean' | 'manhattan' | 'cosine';
  weighted?: boolean;
  weight?: (i: number, j: number) => number;
}

export function calculateAdvancedDTW(params: DTWAdvancedParams): number {
  const timerLabel = 'calculateAdvancedDTW';
  logger.time(timerLabel);
  
  const { 
    series1, 
    series2, 
    windowSize = 10, 
    normalization = 'none',
    distanceMetric = 'euclidean',
    weighted = false,
    weight 
  } = params;
  
  // 数据归一化
  const normalize = (data: number[]): number[] => {
    if (normalization === 'none') return data;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
    
    if (normalization === 'zscore') {
      return data.map(val => (val - mean) / (std || 1));
    } else if (normalization === 'minmax') {
      const min = Math.min(...data);
      const max = Math.max(...data);
      return data.map(val => (val - min) / ((max - min) || 1));
    }
    return data;
  };
  
  const normalizedSeries1 = normalize(series1);
  const normalizedSeries2 = normalize(series2);
  
  const n = normalizedSeries1.length;
  const m = normalizedSeries2.length;
  
  // 初始化距离矩阵
  const distanceMatrix: number[][] = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    distanceMatrix[i] = new Array(m + 1).fill(Infinity);
  }
  distanceMatrix[0][0] = 0;
  
  // 计算距离
  const calculateDistance = (a: number, b: number): number => {
    if (distanceMetric === 'euclidean') {
      return Math.pow(a - b, 2);
    } else if (distanceMetric === 'manhattan') {
      return Math.abs(a - b);
    } else if (distanceMetric === 'cosine') {
      return 1 - (a * b) / (Math.sqrt(a * a) * Math.sqrt(b * b) || 1);
    }
    return Math.abs(a - b);
  };
  
  // 计算距离矩阵
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(1, i - windowSize); j <= Math.min(m, i + windowSize); j++) {
      const cost = calculateDistance(normalizedSeries1[i - 1], normalizedSeries2[j - 1]);
      const weightedCost = weighted && weight ? cost * weight(i - 1, j - 1) : cost;
      
      const minDistance = Math.min(
        distanceMatrix[i - 1][j],
        distanceMatrix[i][j - 1],
        distanceMatrix[i - 1][j - 1]
      );
      distanceMatrix[i][j] = weightedCost + minDistance;
    }
  }
  
  logger.timeEnd(timerLabel);
  return distanceMatrix[n][m];
}

// K线形态识别
export interface KlinePattern {
  name: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  type: 'bullish' | 'bearish' | 'neutral';
  patternType?: string;
  patternFamily?: string;
}

export interface RecognizeEnhancedKlinePatternsParams {
  high: number[];
  low: number[];
  close: number[];
  open: number[];
  useCNN?: boolean;
  useTA?: boolean;
  confidenceThreshold?: number;
}

export function recognizeEnhancedKlinePatterns(
  params: RecognizeEnhancedKlinePatternsParams
): KlinePattern[] {
  const { high, low, close, open, useCNN = false, useTA = true, confidenceThreshold = 0.5 } = params;
  const patterns: KlinePattern[] = [];
  
  // 构建数据数组
  const data = close.map((_, i) => ({
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i]
  }));
  
  // 简单的形态识别示例
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    
    // 识别阳线
    if (current.close > current.open) {
      patterns.push({
        name: 'bullish_candle',
        confidence: 0.8,
        startIndex: i,
        endIndex: i,
        type: 'bullish',
        patternType: 'single_candle',
        patternFamily: 'bullish'
      });
    }
    // 识别阴线
    else if (current.close < current.open) {
      patterns.push({
        name: 'bearish_candle',
        confidence: 0.8,
        startIndex: i,
        endIndex: i,
        type: 'bearish',
        patternType: 'single_candle',
        patternFamily: 'bearish'
      });
    }
  }
  
  return patterns;
}

// 增强版K线形态识别
export function recognizeAdvancedKlinePatterns(
  data: Array<{ open: number; high: number; low: number; close: number; volume: number }>
): KlinePattern[] {
  const patterns: KlinePattern[] = [];
  
  // 更高级的形态识别逻辑（示例）
  for (let i = 2; i < data.length; i++) {
    const current = data[i];
    const prev1 = data[i - 1];
    const prev2 = data[i - 2];
    
    // 识别红三兵形态
    if (prev2.close > prev2.open && 
        prev1.close > prev1.open && 
        current.close > current.open &&
        prev1.close > prev2.close &&
        current.close > prev1.close) {
      patterns.push({
        name: 'three_white_soldiers',
        confidence: 0.9,
        startIndex: i - 2,
        endIndex: i,
        type: 'bullish'
      });
    }
    
    // 识别黑三兵形态
    if (prev2.close < prev2.open && 
        prev1.close < prev1.open && 
        current.close < current.open &&
        prev1.close < prev2.close &&
        current.close < prev1.close) {
      patterns.push({
        name: 'three_black_crows',
        confidence: 0.9,
        startIndex: i - 2,
        endIndex: i,
        type: 'bearish'
      });
    }
  }
  
  // 识别更多K线形态
  patterns.push(...recognizeCandlestickPatterns(data));
  
  return patterns;
}

// 识别更多K线形态
export function recognizeCandlestickPatterns(
  data: Array<{ open: number; high: number; low: number; close: number; volume: number }>
): KlinePattern[] {
  const patterns: KlinePattern[] = [];
  const length = data.length;
  
  for (let i = 1; i < length; i++) {
    const current = data[i];
    const prev = data[i - 1];
    
    // 识别十字星
    const bodyLength = Math.abs(current.close - current.open);
    const totalLength = current.high - current.low;
    if (bodyLength / totalLength < 0.1 && totalLength > 0) {
      patterns.push({
        name: 'doji',
        confidence: 0.8,
        startIndex: i,
        endIndex: i,
        type: 'neutral',
        patternType: 'single_candle',
        patternFamily: 'doji'
      });
    }
    
    // 识别锤头线
    if (i >= 1) {
      const lowerShadow = current.low - Math.min(current.open, current.close);
      const upperShadow = current.high - Math.max(current.open, current.close);
      const realBody = Math.abs(current.close - current.open);
      
      if (lowerShadow > realBody * 2 && upperShadow < realBody * 0.5) {
        const type = current.close > current.open ? 'bullish' : 'bearish';
        patterns.push({
          name: 'hammer',
          confidence: 0.85,
          startIndex: i,
          endIndex: i,
          type,
          patternType: 'single_candle',
          patternFamily: 'hammer'
        });
      }
    }
  }
  
  // 识别双K线形态
  for (let i = 1; i < length; i++) {
    const current = data[i];
    const prev = data[i - 1];
    
    // 识别吞没形态
    if (Math.abs(current.close - current.open) > Math.abs(prev.close - prev.open) &&
        ((current.close > current.open && prev.close < prev.open && 
          current.open < prev.close && current.close > prev.open) ||
         (current.close < current.open && prev.close > prev.open && 
          current.open > prev.close && current.close < prev.open))) {
      const type = current.close > current.open ? 'bullish' : 'bearish';
      patterns.push({
        name: 'engulfing',
        confidence: 0.85,
        startIndex: i - 1,
        endIndex: i,
        type,
        patternType: 'two_candle',
        patternFamily: 'engulfing'
      });
    }
    
    // 识别刺透形态
    if (prev.close < prev.open && current.close > current.open &&
        current.close > prev.open && current.open < prev.close) {
      patterns.push({
        name: 'piercing',
        confidence: 0.8,
        startIndex: i - 1,
        endIndex: i,
        type: 'bullish',
        patternType: 'two_candle',
        patternFamily: 'reversal'
      });
    }
    
    // 识别乌云盖顶形态
    if (prev.close > prev.open && current.close < current.open &&
        current.close < prev.open && current.open > prev.close) {
      patterns.push({
        name: 'dark_cloud_cover',
        confidence: 0.8,
        startIndex: i - 1,
        endIndex: i,
        type: 'bearish',
        patternType: 'two_candle',
        patternFamily: 'reversal'
      });
    }
  }
  
  // 识别三K线形态
  for (let i = 2; i < length; i++) {
    const current = data[i];
    const prev1 = data[i - 1];
    const prev2 = data[i - 2];
    
    // 识别早晨之星
    if (prev2.close < prev2.open && prev1.open < prev2.close &&
        Math.abs(prev1.close - prev1.open) / (prev1.high - prev1.low) < 0.2 &&
        current.close > current.open && current.close > prev2.close) {
      patterns.push({
        name: 'morning_star',
        confidence: 0.9,
        startIndex: i - 2,
        endIndex: i,
        type: 'bullish',
        patternType: 'three_candle',
        patternFamily: 'reversal'
      });
    }
    
    // 识别黄昏之星
    if (prev2.close > prev2.open && prev1.open > prev2.close &&
        Math.abs(prev1.close - prev1.open) / (prev1.high - prev1.low) < 0.2 &&
        current.close < current.open && current.close < prev2.close) {
      patterns.push({
        name: 'evening_star',
        confidence: 0.9,
        startIndex: i - 2,
        endIndex: i,
        type: 'bearish',
        patternType: 'three_candle',
        patternFamily: 'reversal'
      });
    }
  }
  
  return patterns;
}

// CNN模型接入层接口
export interface CNNModelInterface {
  predict(patternData: number[][]): Promise<KlinePattern[]>;
  loadModel(): Promise<void>;
  isModelLoaded(): boolean;
  getSupportedPatterns(): string[];
}

// CNN模型包装类（用于集成外部CNN模型）
export class CNNPatternRecognitionModel implements CNNModelInterface {
  private model: any = null;
  private supportedPatterns: string[] = [
    'three_white_soldiers', 'three_black_crows', 'engulfing', 'morning_star',
    'evening_star', 'hammer', 'doji', 'piercing', 'dark_cloud_cover'
  ];
  
  async predict(patternData: number[][]): Promise<KlinePattern[]> {
    if (!this.model) {
      throw new Error('CNN model not loaded');
    }
    
    try {
      // 这里是CNN模型预测的占位符，实际实现需要根据模型类型进行调整
      // 假设模型返回的是每个时间点的模式概率分布
      const predictions = await this.model.predict(patternData);
      
      // 将模型输出转换为KlinePattern格式
      const patterns: KlinePattern[] = [];
      
      // 示例转换逻辑，实际需要根据模型输出格式调整
      predictions.forEach((pred: any, index: number) => {
        const maxProb = Math.max(...pred.probabilities);
        const patternIndex = pred.probabilities.indexOf(maxProb);
        
        if (maxProb > 0.5) {
          patterns.push({
            name: this.supportedPatterns[patternIndex],
            confidence: maxProb,
            startIndex: index,
            endIndex: index + patternData[0].length - 1, // 假设每个输入片段的长度
            type: pred.type || 'neutral',
            patternType: 'cnn_detected',
            patternFamily: 'cnn'
          });
        }
      });
      
      return patterns;
    } catch (error) {
      console.error('CNN model prediction failed:', error);
      return [];
    }
  }
  
  async loadModel(): Promise<void> {
    try {
      // 这里是模型加载的占位符，实际实现需要根据模型类型进行调整
      // 例如，使用TensorFlow.js加载模型
      // this.model = await tf.loadLayersModel('model/model.json');
      
      // 模拟模型加载
      this.model = { 
        predict: async (data: number[][]) => {
          // 模拟预测结果
          return data.map((_, index) => ({
            probabilities: [0.1, 0.1, 0.6, 0.1, 0.05, 0.05, 0, 0, 0],
            type: Math.random() > 0.5 ? 'bullish' : 'bearish'
          }));
        }
      };
      
      console.log('CNN model loaded successfully');
    } catch (error) {
      console.error('Failed to load CNN model:', error);
      throw error;
    }
  }
  
  isModelLoaded(): boolean {
    return this.model !== null;
  }
  
  getSupportedPatterns(): string[] {
    return this.supportedPatterns;
  }
}

// 增强的K线形态识别服务（整合传统方法和CNN模型）
export class EnhancedKlinePatternRecognitionService {
  private cnnModel: CNNPatternRecognitionModel;
  private useCNN: boolean;
  private useTraditional: boolean;
  
  constructor(useCNN: boolean = true, useTraditional: boolean = true) {
    this.cnnModel = new CNNPatternRecognitionModel();
    this.useCNN = useCNN;
    this.useTraditional = useTraditional;
  }
  
  // 初始化模型（异步）
  async initialize(): Promise<void> {
    if (this.useCNN && !this.cnnModel.isModelLoaded()) {
      await this.cnnModel.loadModel();
    }
  }
  
  // 识别K线形态（整合传统方法和CNN模型）
  async recognizePatterns(
    data: Array<{ open: number; high: number; low: number; close: number; volume: number }>,
    useCNN: boolean = this.useCNN,
    useTraditional: boolean = this.useTraditional
  ): Promise<KlinePattern[]> {
    const patterns: KlinePattern[] = [];
    
    // 使用传统方法识别形态
    if (useTraditional) {
      const traditionalPatterns = recognizeAdvancedKlinePatterns(data);
      patterns.push(...traditionalPatterns);
    }
    
    // 使用CNN模型识别形态
    if (useCNN && this.cnnModel.isModelLoaded()) {
      try {
        // 准备模型输入数据
        const modelInput = this.prepareModelInput(data);
        const cnnPatterns = await this.cnnModel.predict(modelInput);
        patterns.push(...cnnPatterns);
      } catch (error) {
        console.error('CNN pattern recognition failed:', error);
      }
    }
    
    // 去重和合并相似形态
    return this.mergePatterns(patterns);
  }
  
  // 准备CNN模型输入数据
  private prepareModelInput(data: Array<{ open: number; high: number; low: number; close: number; volume: number }>): number[][] {
    // 将K线数据转换为模型输入格式
    // 标准化处理每个K线的OHLCV数据
    const normalizedData: number[][] = [];
    
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const range = candle.high - candle.low;
      
      // 标准化处理，将价格数据映射到[-1, 1]范围
      const normalized: number[] = [
        range > 0 ? (candle.open - candle.low) / range : 0,
        range > 0 ? (candle.high - candle.low) / range : 0,
        range > 0 ? (candle.low - candle.low) / range : 0,
        range > 0 ? (candle.close - candle.low) / range : 0,
        // 成交量标准化（简单示例，实际可能需要更复杂的标准化）
        candle.volume / (data.reduce((sum, c) => sum + c.volume, 0) / data.length)
      ];
      
      normalizedData.push(normalized);
    }
    
    // 将数据转换为滑动窗口格式
    const windowSize = 5; // 假设模型需要5个连续K线作为输入
    const inputWindows: number[][] = [];
    
    for (let i = windowSize; i < normalizedData.length; i++) {
      const window = normalizedData.slice(i - windowSize, i).flat();
      inputWindows.push(window);
    }
    
    return inputWindows;
  }
  
  // 合并相似形态（去重）
  private mergePatterns(patterns: KlinePattern[]): KlinePattern[] {
    // 按名称和时间范围去重
    const uniquePatterns = new Map<string, KlinePattern>();
    
    for (const pattern of patterns) {
      const key = `${pattern.name}-${pattern.startIndex}-${pattern.endIndex}`;
      if (!uniquePatterns.has(key)) {
        uniquePatterns.set(key, pattern);
      } else {
        // 如果已有相同的模式，保留置信度更高的
        const existing = uniquePatterns.get(key)!;
        if (pattern.confidence > existing.confidence) {
          uniquePatterns.set(key, pattern);
        }
      }
    }
    
    return Array.from(uniquePatterns.values());
  }
  
  // 获取支持的形态列表
  getSupportedPatterns(): string[] {
    const traditionalPatterns = [
      'three_white_soldiers', 'three_black_crows', 'engulfing', 'morning_star',
      'evening_star', 'hammer', 'doji', 'piercing', 'dark_cloud_cover'
    ];
    
    if (this.useCNN) {
      const cnnPatterns = this.cnnModel.getSupportedPatterns();
      return Array.from(new Set([...traditionalPatterns, ...cnnPatterns]));
    }
    
    return traditionalPatterns;
  }
  
  // 设置是否使用CNN模型
  setUseCNN(useCNN: boolean): void {
    this.useCNN = useCNN;
  }
  
  // 设置是否使用传统方法
  setUseTraditional(useTraditional: boolean): void {
    this.useTraditional = useTraditional;
  }
  
  // 获取CNN模型状态
  isCNNModelLoaded(): boolean {
    return this.cnnModel.isModelLoaded();
  }
}

// 兼容旧版本的K线形态识别
export function recognizeKlinePatterns(
  data: { high: number[]; low: number[]; close: number[]; open: number[] }
): KlinePattern[] {
  const { high, low, close, open } = data;
  // 构建数据数组
  const klineData = close.map((_, i) => ({
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i]
  }));
  
  return recognizeAdvancedKlinePatterns(klineData as any);
}


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
  period: number;
}

export function calculateRSI(params: RSICalculationParams): number[] {
  const { data, period } = params;
  const result = new Array(data.length);
  
  if (data.length < period + 1) {
    for (let i = 0; i < data.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  
  // 计算RSI
  let gains = 0;
  let losses = 0;
  
  // 初始化前period个周期的涨跌幅
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
  let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  result[period] = rsi;
  
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    result[i] = rsi;
  }
  
  // 填充前period个值为零
  for (let i = 0; i < period; i++) {
    result[i] = 0;
  }
  
  return result;
}

// MACD (指数平滑异同移动平均线) 计算
export interface MACDCalculationParams {
  data: number[];
  close?: number[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
  diff?: number[];
  dea?: number[];
  bar?: number[];
}

export function calculateMACD(params: MACDCalculationParams): MACDResult {
  const { data = params.close || [], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = params;
  const macd: number[] = new Array(data.length).fill(0);
  const signal: number[] = new Array(data.length).fill(0);
  const histogram: number[] = new Array(data.length).fill(0);
  
  if (data.length < slowPeriod) {
    return { macd, signal, histogram, diff: macd, dea: signal, bar: histogram };
  }
  
  // 计算快速EMA和慢速EMA
  const fastEMA = calculateEMA({ data, period: fastPeriod });
  const slowEMA = calculateEMA({ data, period: slowPeriod });
  
  // 计算MACD线
  for (let i = 0; i < data.length; i++) {
    macd[i] = fastEMA[i] - slowEMA[i];
  }
  
  // 计算信号线
  const signalEMA = calculateEMA({ data: macd, period: signalPeriod });
  for (let i = 0; i < data.length; i++) {
    signal[i] = signalEMA[i];
  }
  
  // 计算柱状图
  for (let i = 0; i < data.length; i++) {
    histogram[i] = macd[i] - signal[i];
  }
  
  // 兼容旧版本的返回结构
  return { 
    macd, 
    signal, 
    histogram, 
    diff: macd, 
    dea: signal, 
    bar: histogram 
  };
}

// KDJ (随机指标) 计算
export interface KDJCalculationParams {
  high: number[];
  low: number[];
  close: number[];
  period: number;
  kPeriod: number;
  dPeriod: number;
}

export interface KDJResult {
  k: number[];
  d: number[];
  j: number[];
}

export function calculateKDJ(params: KDJCalculationParams): KDJResult {
  const { high, low, close, period, kPeriod, dPeriod } = params;
  const length = close.length;
  const k: number[] = new Array(length).fill(0);
  const d: number[] = new Array(length).fill(0);
  const j: number[] = new Array(length).fill(0);
  
  if (length < period + kPeriod + dPeriod) {
    return { k, d, j };
  }
  
  // 计算RSV
  for (let i = period - 1; i < length; i++) {
    let highest = high[i];
    let lowest = low[i];
    
    for (let j = 0; j < period; j++) {
      highest = Math.max(highest, high[i - j]);
      lowest = Math.min(lowest, low[i - j]);
    }
    
    const rsv = (close[i] - lowest) / (highest - lowest) * 100;
    
    // 计算K值
    if (i === period - 1) {
      k[i] = 50;
    } else {
      k[i] = (2 / 3) * k[i - 1] + (1 / 3) * rsv;
    }
    
    // 计算D值
    if (i === period - 1 + kPeriod - 1) {
      d[i] = 50;
    } else if (i >= period - 1 + kPeriod - 1) {
      d[i] = (2 / 3) * d[i - 1] + (1 / 3) * k[i];
    }
    
    // 计算J值
    if (i >= period - 1 + kPeriod - 1) {
      j[i] = 3 * k[i] - 2 * d[i];
    }
  }
  
  return { k, d, j };
}

// 布林带 (Bollinger Bands) 计算
export interface BollingerBandsCalculationParams {
  close: number[];
  period: number;
  standardDeviations: number;
}

export interface BollingerBandsResult {
  middle: number[];
  upper: number[];
  lower: number[];
}

export function calculateBollingerBands(params: BollingerBandsCalculationParams): BollingerBandsResult {
  const { close, period, standardDeviations } = params;
  const data = close;
  const length = data.length;
  const middle: number[] = new Array(length).fill(0);
  const upper: number[] = new Array(length).fill(0);
  const lower: number[] = new Array(length).fill(0);
  
  if (length < period) {
    return { middle, upper, lower };
  }
  
  // 计算MA
  const ma = calculateMA({ data, period });
  
  // 计算标准差
  for (let i = period - 1; i < length; i++) {
    middle[i] = ma[i];
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(data[i - j] - middle[i], 2);
    }
    
    const std = Math.sqrt(sum / period);
    upper[i] = middle[i] + std * standardDeviations;
    lower[i] = middle[i] - std * standardDeviations;
  }
  
  return { middle, upper, lower };
}