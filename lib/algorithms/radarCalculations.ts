// 雷达图维度计算算法库
import { calculateIntradayStrength, IntradayStrengthParams, IntradayStrengthResult } from './intradayStrength';
import { calculateHHI, calculateAverageCost, identifyChipPeaks, calculateSupportResistance, ChipDistributionItem, calculateCompositeChipStrength, EnhancedChipDistributionResult } from './chipDistribution';
import { OrderItem } from './largeOrder';
import { calculateCumulativeWAD, WADItem } from './wad';
import { getLiquidityData, getVolumePowerData, LiquidityData, VolumePowerData } from '../api/market/quote';


// 上证指数基准值（战时基准）
export const SHANGHAI_INDEX_BENCHMARK = 4085.50;

// 计算流动性评分（0-100）
// 公式：基于当日成交额与5日均值的比值，结合量比计算
interface LiquidityParams {
  currentTurnover: number;      // 当日成交额（亿）
  fiveDayAvgTurnover: number;   // 5日平均成交额（亿）
  volumeRatio: number;          // 量比
}

export function calculateLiquidityScore(params: LiquidityParams): number {
  const { currentTurnover, fiveDayAvgTurnover, volumeRatio } = params;
  
  // 避免除以零
  if (fiveDayAvgTurnover === 0) return 50;
  
  // 计算成交额比值（当日/5日均值）
  const turnoverRatio = currentTurnover / fiveDayAvgTurnover;
  
  // 量比评分（0-100）
  const volumeRatioScore = Math.min(Math.max(volumeRatio * 20, 0), 100);
  
  // 成交额比值评分（0-100）
  const turnoverRatioScore = Math.min(Math.max(turnoverRatio * 50, 0), 100);
  
  // 综合评分（成交额比值占60%，量比占40%）
  const liquidityScore = turnoverRatioScore * 0.6 + volumeRatioScore * 0.4;
  
  return Math.round(liquidityScore);
}

// 计算抛压评分（0-100）
// 公式：卖盘挂单深度 + 筹码获利盘抛压
interface SellingPressureParams {
  sellOrderDepth: number;       // 卖盘挂单深度（相对值）
  profitTakingPercentage: number; // 获利盘比例（%）
  recentVolumeTrend: number;    // 近期成交量趋势（-1到1之间）
}

export function calculateSellingPressure(params: SellingPressureParams): number {
  const { sellOrderDepth, profitTakingPercentage, recentVolumeTrend } = params;
  
  // 卖盘挂单深度评分（0-100）
  const orderDepthScore = Math.min(Math.max(sellOrderDepth * 100, 0), 100);
  
  // 获利盘抛压评分（0-100）
  const profitTakingScore = Math.min(Math.max(profitTakingPercentage, 0), 100);
  
  // 成交量趋势调整（负趋势增加抛压）
  const trendAdjustment = (1 - recentVolumeTrend) * 10;
  
  // 综合评分（卖盘深度占40%，获利盘占50%，趋势调整占10%）
  const pressureScore = orderDepthScore * 0.4 + profitTakingScore * 0.5 + trendAdjustment;
  
  return Math.round(Math.min(Math.max(pressureScore, 0), 100));
}

// 计算情绪评分（0-100）
// 公式：全市场炸板率 + 连板高度
interface SentimentParams {
  explosionRate: number;        // 全市场炸板率（%）
  maxContinuationHeight: number; // 连板高度最大值
  marketIndexChange: number;    // 市场指数涨跌幅（%）
}

export function calculateSentimentScore(params: SentimentParams): number {
  const { explosionRate, maxContinuationHeight, marketIndexChange } = params;
  
  // 炸板率评分（炸板率越高，情绪越差）
  const explosionScore = Math.max(100 - explosionRate * 2, 0);
  
  // 连板高度评分（连板高度越高，情绪越好）
  const continuationScore = Math.min(maxContinuationHeight * 10, 100);
  
  // 市场指数调整
  const indexAdjustment = marketIndexChange * 5;
  
  // 综合评分（炸板率占40%，连板高度占40%，指数调整占20%）
  const sentimentScore = explosionScore * 0.4 + continuationScore * 0.4 + indexAdjustment;
  
  return Math.round(Math.min(Math.max(sentimentScore, 0), 100));
}

// 计算量能强度（0-100）
interface VolumePowerParams {
  currentVolume: number;        // 当前成交量
  avgVolume: number;            // 平均成交量
  volumeAccumulation: number;   // 成交量累积趋势（-1到1）
}

export function calculateVolumePower(params: VolumePowerParams): number {
  const { currentVolume, avgVolume, volumeAccumulation } = params;
  
  if (avgVolume === 0) return 50;
  
  // 量能比值
  const volumeRatio = currentVolume / avgVolume;
  
  // 基础量能评分
  let baseScore = Math.min(volumeRatio * 50, 100);
  
  // 累积趋势调整
  baseScore += volumeAccumulation * 20;
  
  return Math.round(Math.min(Math.max(baseScore, 0), 100));
}

// 计算趋势强度（0-100）
interface TrendStrengthParams {
  shortTermTrend: number;       // 短期趋势（-1到1）
  mediumTermTrend: number;      // 中期趋势（-1到1）
  longTermTrend: number;        // 长期趋势（-1到1）
  volatility: number;           // 波动率（相对值）
}

// 计算偏离度评分（0-100）
// 公式：基于当前价格与基准价格的偏离程度，结合偏离持续时间和波动率计算
interface DeviationParams {
  currentPrice: number;         // 当前价格
  benchmarkPrice?: number;      // 基准价格（默认使用上证指数战时基准）
  deviationDuration: number;    // 偏离持续时间（分钟）
  volatility: number;           // 波动率（相对值）
}

export function calculateDeviationScore(params: DeviationParams): number {
  const { 
    currentPrice, 
    benchmarkPrice = SHANGHAI_INDEX_BENCHMARK, 
    deviationDuration, 
    volatility 
  } = params;
  
  // 避免除以零
  if (benchmarkPrice === 0) return 50;
  
  // 计算价格偏离百分比
  const priceDeviationPercent = Math.abs(currentPrice - benchmarkPrice) / benchmarkPrice * 100;
  
  // 计算偏离持续时间因子（0-1）
  const durationFactor = Math.min(deviationDuration / 120, 1); // 最长2小时
  
  // 计算波动率调整因子（0-1）
  const volatilityFactor = 1 - Math.min(volatility, 1);
  
  // 计算偏离度得分（0-100，偏离越小得分越高）
  const baseScore = Math.max(100 - priceDeviationPercent * 5, 0);
  
  // 结合持续时间和波动率进行调整
  const adjustedScore = baseScore * (1 - durationFactor * 0.3) * (0.7 + volatilityFactor * 0.3);
  
  return Math.round(Math.min(Math.max(adjustedScore, 0), 100));
}

export function calculateTrendStrength(params: TrendStrengthParams): number {
  const { shortTermTrend, mediumTermTrend, longTermTrend, volatility } = params;
  
  // 趋势综合评分（短期30%，中期40%，长期30%）
  const trendScore = (shortTermTrend + mediumTermTrend + longTermTrend) * 33.33;
  
  // 波动率调整（波动率越高，趋势强度越低）
  const volatilityAdjustment = (1 - volatility) * 20;
  
  // 最终评分（0-100）
  const finalScore = 50 + trendScore + volatilityAdjustment;
  
  return Math.round(Math.min(Math.max(finalScore, 0), 100));
}

// 分时强度轴参数
interface IntradayStrengthAxisParams {
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  orderData?: OrderItem[];
  windowSize?: number;
}

// 筹码分布轴参数
interface ChipDistributionAxisParams {
  chipData: ChipDistributionItem[];
  currentPrice: number;
  enhancedChipData?: EnhancedChipDistributionResult;
}

// 计算筹码集中度（0-100）
interface ChipConcentrationParams {
  top10HolderRatio: number;     // 前十大股东持股比例（%）
  averageHolding: number;       // 人均持股数
  recentTurnoverRate: number;   // 近期换手率（%）
}

export function calculateChipConcentration(params: ChipConcentrationParams): number {
  const { top10HolderRatio, averageHolding, recentTurnoverRate } = params;
  
  // 前十大股东持股比例评分（0-100）
  const holderRatioScore = Math.min(top10HolderRatio, 100);
  
  // 人均持股评分（0-100）
  const avgHoldingScore = Math.min(Math.max(averageHolding / 10000 * 100, 0), 100);
  
  // 换手率调整（换手率越高，集中度越低）
  const turnoverAdjustment = Math.max(100 - recentTurnoverRate * 5, 0);
  
  // 综合评分（前十大股东占50%，人均持股占30%，换手率调整占20%）
  const concentrationScore = holderRatioScore * 0.5 + avgHoldingScore * 0.3 + turnoverAdjustment * 0.2;
  
  return Math.round(Math.min(Math.max(concentrationScore, 0), 100));
}

// 计算分时强度轴得分（0-100）
export function calculateIntradayStrengthAxis(params: IntradayStrengthAxisParams): number {
  const { priceData, orderData, windowSize = 5 } = params;
  
  // 调用分时强度计算函数
  const strengthResults = calculateIntradayStrength({
    priceData,
    orderData,
    windowSize,
    useVolumeWeight: true,
    useWAD: true
  });
  
  if (strengthResults.length === 0) {
    return 50; // 默认中等强度
  }
  
  // 获取最新的分时强度结果
  const latestResult = strengthResults[strengthResults.length - 1];
  
  // 返回综合得分（已经是0-100范围）
  return Math.round(latestResult.compositeScore);
}

// 计算筹码分布轴得分（0-100）
export function calculateChipDistributionAxis(params: ChipDistributionAxisParams): number {
  const { chipData, currentPrice, enhancedChipData } = params;
  
  if (chipData.length === 0) {
    return 50; // 默认中等分布
  }
  
  // 计算综合筹码强度
  let strengthScore = 50;
  
  if (enhancedChipData) {
    // 如果有增强的筹码数据，使用综合强度计算
    const compositeResult = calculateCompositeChipStrength(enhancedChipData);
    strengthScore = Math.round(compositeResult.strength * 100);
  } else {
    // 否则使用基础的筹码分布指标计算
    const hhi = calculateHHI(chipData);
    const averageCost = calculateAverageCost(chipData);
    const peakInfo = identifyChipPeaks(chipData);
    const supportResistance = calculateSupportResistance(chipData, currentPrice);
    
    // 计算筹码集中度得分（HHI越高，集中度越高，得分越高）
    const concentrationScore = Math.min(hhi * 200, 100);
    
    // 计算主筹峰值得分
    const peakScore = peakInfo.isSinglePeak ? 80 : 50;
    
    // 计算支撑压力得分
    const supportResistanceScore = ((supportResistance.supportLevels.length > 0 ? 1 : 0) + 
                                   (supportResistance.resistanceLevels.length > 0 ? 1 : 0)) / 2 * 100;
    
    // 综合得分（集中度50%，主筹峰值30%，支撑压力20%）
    strengthScore = Math.round(concentrationScore * 0.5 + peakScore * 0.3 + supportResistanceScore * 0.2);
  }
  
  return Math.round(Math.min(Math.max(strengthScore, 0), 100));
}

// 增强版雷达图计算参数，支持异步数据获取
interface EnhancedRadarCalculationParams {
  // 股票代码（用于获取实时数据）
  symbol: string;
  
  // 抛压参数
  sellOrderDepth: number;
  profitTakingPercentage: number;
  recentVolumeTrend: number;
  
  // 情绪参数
  explosionRate: number;
  maxContinuationHeight: number;
  marketIndexChange: number;
  
  // 趋势参数
  shortTermTrend: number;
  mediumTermTrend: number;
  longTermTrend: number;
  volatility: number;
  
  // 分时强度参数
  intradayStrengthParams: IntradayStrengthAxisParams;
  
  // 筹码分布参数
  chipDistributionParams: ChipDistributionAxisParams;
  
  // 偏离度参数
  deviationParams: DeviationParams;
  
  // 可选的流动性和量能强度参数（用于直接传入而不调用API）
  liquidityData?: LiquidityData;
  volumePowerData?: VolumePowerData;
}

// 生成完整的雷达图数据
interface RadarCalculationParams {
  // 流动性参数
  currentTurnover: number;
  fiveDayAvgTurnover: number;
  volumeRatio: number;
  
  // 抛压参数
  sellOrderDepth: number;
  profitTakingPercentage: number;
  recentVolumeTrend: number;
  
  // 情绪参数
  explosionRate: number;
  maxContinuationHeight: number;
  marketIndexChange: number;
  
  // 量能参数
  currentVolume: number;
  avgVolume: number;
  volumeAccumulation: number;
  
  // 趋势参数
  shortTermTrend: number;
  mediumTermTrend: number;
  longTermTrend: number;
  volatility: number;
  
  // 分时强度参数
  intradayStrengthParams: IntradayStrengthAxisParams;
  
  // 筹码分布参数
  chipDistributionParams: ChipDistributionAxisParams;
  
  // 偏离度参数
  deviationParams: DeviationParams;
}

export interface RadarCalculationResult {
  liquidity: number;
  sellingPressure: number;
  sentiment: number;
  chipDistribution: number;
  trendStrength: number;
  deviation: number;
  timestamp: number;
  latency: number;
}

/**
 * 获取并计算增强版雷达图数据，优先使用实时数据源
 * @param params 增强版雷达图计算参数
 * @returns 雷达图计算结果
 */
export async function calculateEnhancedRadarDimensions(params: EnhancedRadarCalculationParams): Promise<RadarCalculationResult> {
  const startTime = Date.now();
  
  // 并发获取流动性和量能强度数据
  const [liquidityData, volumePowerData] = await Promise.all([
    params.liquidityData || getLiquidityData(params.symbol),
    params.volumePowerData || getVolumePowerData(params.symbol)
  ]);
  
  // 使用获取到的数据计算雷达图维度
  const result = {
    liquidity: calculateLiquidityScore(liquidityData),
    
    sellingPressure: calculateSellingPressure({
      sellOrderDepth: params.sellOrderDepth,
      profitTakingPercentage: params.profitTakingPercentage,
      recentVolumeTrend: params.recentVolumeTrend
    }),
    
    sentiment: calculateSentimentScore({
      explosionRate: params.explosionRate,
      maxContinuationHeight: params.maxContinuationHeight,
      marketIndexChange: params.marketIndexChange
    }),
    
    chipDistribution: calculateChipDistributionAxis({
      chipData: params.chipDistributionParams.chipData,
      currentPrice: params.chipDistributionParams.currentPrice,
      enhancedChipData: params.chipDistributionParams.enhancedChipData
    }),
    
    trendStrength: calculateTrendStrength({
      shortTermTrend: params.shortTermTrend,
      mediumTermTrend: params.mediumTermTrend,
      longTermTrend: params.longTermTrend,
      volatility: params.volatility
    }),
    
    deviation: calculateDeviationScore({
      currentPrice: params.chipDistributionParams.currentPrice,
      benchmarkPrice: SHANGHAI_INDEX_BENCHMARK, // 使用战时基准
      deviationDuration: params.deviationParams.deviationDuration,
      volatility: params.deviationParams.volatility
    }),
    
    timestamp: Date.now(),
    latency: Date.now() - startTime
  };
  
  // 检查延迟是否在要求范围内
  if (result.latency > 300) {
    console.warn(`Enhanced radar calculation exceeded real-time latency requirement: ${result.latency}ms`);
  } else if (result.latency > 1000) {
    console.error(`Enhanced radar calculation exceeded non-real-time latency requirement: ${result.latency}ms`);
  }
  
  return result;
}

/**
 * 同步计算雷达图数据（兼容原有接口）
 * @param params 雷达图计算参数
 * @returns 雷达图计算结果
 */
export function calculateRadarDimensions(params: RadarCalculationParams): RadarCalculationResult {
  const startTime = Date.now();
  
  const result = {
    liquidity: calculateLiquidityScore({
      currentTurnover: params.currentTurnover,
      fiveDayAvgTurnover: params.fiveDayAvgTurnover,
      volumeRatio: params.volumeRatio
    }),
    
    sellingPressure: calculateSellingPressure({
      sellOrderDepth: params.sellOrderDepth,
      profitTakingPercentage: params.profitTakingPercentage,
      recentVolumeTrend: params.recentVolumeTrend
    }),
    
    sentiment: calculateSentimentScore({
      explosionRate: params.explosionRate,
      maxContinuationHeight: params.maxContinuationHeight,
      marketIndexChange: params.marketIndexChange
    }),
    
    chipDistribution: calculateChipDistributionAxis({
      chipData: params.chipDistributionParams.chipData,
      currentPrice: params.chipDistributionParams.currentPrice,
      enhancedChipData: params.chipDistributionParams.enhancedChipData
    }),
    
    trendStrength: calculateTrendStrength({
      shortTermTrend: params.shortTermTrend,
      mediumTermTrend: params.mediumTermTrend,
      longTermTrend: params.longTermTrend,
      volatility: params.volatility
    }),
    
    deviation: calculateDeviationScore({
      currentPrice: params.chipDistributionParams.currentPrice,
      benchmarkPrice: SHANGHAI_INDEX_BENCHMARK, // 使用战时基准
      deviationDuration: params.deviationParams.deviationDuration,
      volatility: params.deviationParams.volatility
    }),
    
    timestamp: Date.now(),
    latency: Date.now() - startTime
  };
  
  return result;
}

