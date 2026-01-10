// 雷达图维度计算算法库

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
  
  // 筹码参数
  top10HolderRatio: number;
  averageHolding: number;
  recentTurnoverRate: number;
}

export interface RadarCalculationResult {
  liquidity: number;
  sellingPressure: number;
  sentiment: number;
  volumePower: number;
  trendStrength: number;
  chipConcentration: number;
}

export function calculateRadarDimensions(params: RadarCalculationParams): RadarCalculationResult {
  return {
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
    
    volumePower: calculateVolumePower({
      currentVolume: params.currentVolume,
      avgVolume: params.avgVolume,
      volumeAccumulation: params.volumeAccumulation
    }),
    
    trendStrength: calculateTrendStrength({
      shortTermTrend: params.shortTermTrend,
      mediumTermTrend: params.mediumTermTrend,
      longTermTrend: params.longTermTrend,
      volatility: params.volatility
    }),
    
    chipConcentration: calculateChipConcentration({
      top10HolderRatio: params.top10HolderRatio,
      averageHolding: params.averageHolding,
      recentTurnoverRate: params.recentTurnoverRate
    })
  };
}
