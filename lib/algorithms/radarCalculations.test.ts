// 雷达图计算算法测试
import { 
  calculateLiquidityScore, 
  calculateSellingPressure, 
  calculateSentimentScore, 
  calculateTrendStrength, 
  calculateChipDistributionAxis, 
  calculateDeviationScore,
  calculateRadarDimensions,
  SHANGHAI_INDEX_BENCHMARK
} from './radarCalculations';

describe('Radar Chart Calculations', () => {
  // 测试流动性评分计算
  test('calculateLiquidityScore should return correct score', () => {
    const result = calculateLiquidityScore({
      currentTurnover: 120,
      fiveDayAvgTurnover: 80,
      volumeRatio: 2.0
    });
    
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试抛压评分计算
  test('calculateSellingPressure should return correct score', () => {
    const result = calculateSellingPressure({
      sellOrderDepth: 0.6,
      profitTakingPercentage: 70,
      recentVolumeTrend: -0.5
    });
    
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试情绪评分计算
  test('calculateSentimentScore should return correct score', () => {
    const result = calculateSentimentScore({
      explosionRate: 10,
      maxContinuationHeight: 5,
      marketIndexChange: 2
    });
    
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试趋势强度计算
  test('calculateTrendStrength should return correct score', () => {
    const result = calculateTrendStrength({
      shortTermTrend: 0.8,
      mediumTermTrend: 0.6,
      longTermTrend: 0.4,
      volatility: 0.3
    });
    
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试偏离度评分计算
  test('calculateDeviationScore should return correct score', () => {
    const result = calculateDeviationScore({
      currentPrice: 4200,
      benchmarkPrice: SHANGHAI_INDEX_BENCHMARK,
      deviationDuration: 30,
      volatility: 0.2
    });
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试偏离度评分使用默认基准
  test('calculateDeviationScore should use default benchmark when not provided', () => {
    const result = calculateDeviationScore({
      currentPrice: 4200,
      deviationDuration: 30,
      volatility: 0.2
    });
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试筹码分布轴计算
  test('calculateChipDistributionAxis should return correct score', () => {
    const result = calculateChipDistributionAxis({
      chipData: [
        { price: 4000, volume: 1000, percentage: 10 },
        { price: 4050, volume: 3000, percentage: 30 },
        { price: 4100, volume: 5000, percentage: 50 },
        { price: 4150, volume: 1000, percentage: 10 }
      ],
      currentPrice: 4085.50
    });
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });
  
  // 测试完整的雷达图维度计算
  test('calculateRadarDimensions should return all 6 dimensions', () => {
    const result = calculateRadarDimensions({
      // 流动性参数
      currentTurnover: 100,
      fiveDayAvgTurnover: 80,
      volumeRatio: 1.5,
      
      // 抛压参数
      sellOrderDepth: 0.6,
      profitTakingPercentage: 70,
      recentVolumeTrend: -0.5,
      
      // 情绪参数
      explosionRate: 10,
      maxContinuationHeight: 5,
      marketIndexChange: 2,
      
      // 量能参数
      currentVolume: 15000000,
      avgVolume: 10000000,
      volumeAccumulation: 0.7,
      
      // 趋势参数
      shortTermTrend: 0.8,
      mediumTermTrend: 0.6,
      longTermTrend: 0.4,
      volatility: 0.3,
      
      // 分时强度参数
      intradayStrengthParams: {
        priceData: [
          { timestamp: Date.now(), high: 4100, low: 4050, close: 4085, volume: 1000000 }
        ]
      },
      
      // 筹码分布参数
      chipDistributionParams: {
        chipData: [
          { price: 4000, volume: 1000, percentage: 10 },
          { price: 4050, volume: 3000, percentage: 30 },
          { price: 4100, volume: 5000, percentage: 50 },
          { price: 4150, volume: 1000, percentage: 10 }
        ],
        currentPrice: 4085.50
      },
      
      // 偏离度参数
      deviationParams: {
        currentPrice: 4085.50,
        deviationDuration: 15,
        volatility: 0.2
      }
    });
    
    // 验证返回结果包含所有6个维度
    expect(result).toHaveProperty('liquidity');
    expect(result).toHaveProperty('sellingPressure');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('chipDistribution');
    expect(result).toHaveProperty('trendStrength');
    expect(result).toHaveProperty('deviation');
    
    // 验证所有维度值都在0-100范围内
    expect(result.liquidity).toBeGreaterThanOrEqual(0);
    expect(result.liquidity).toBeLessThanOrEqual(100);
    
    expect(result.sellingPressure).toBeGreaterThanOrEqual(0);
    expect(result.sellingPressure).toBeLessThanOrEqual(100);
    
    expect(result.sentiment).toBeGreaterThanOrEqual(0);
    expect(result.sentiment).toBeLessThanOrEqual(100);
    
    expect(result.chipDistribution).toBeGreaterThanOrEqual(0);
    expect(result.chipDistribution).toBeLessThanOrEqual(100);
    
    expect(result.trendStrength).toBeGreaterThanOrEqual(0);
    expect(result.trendStrength).toBeLessThanOrEqual(100);
    
    expect(result.deviation).toBeGreaterThanOrEqual(0);
    expect(result.deviation).toBeLessThanOrEqual(100);
  });
  
  // 测试战时基准设置
  test('SHANGHAI_INDEX_BENCHMARK should be set to 4085.50', () => {
    expect(SHANGHAI_INDEX_BENCHMARK).toBe(4085.50);
  });
});
