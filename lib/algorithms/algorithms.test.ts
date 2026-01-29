// 算法测试用例
import { calculateCumulativeWAD, calculateWAD, generateWADSignals } from './wad';
import { calculateHHI, calculateGiniCoefficient, identifyChipPeaks, calculateSupportResistance, calculateEnhancedChipDistribution } from './chipDistribution';
import { calculateMA, calculateMACD, calculateRSI, calculateBollingerBands, calculateKDJ, calculateDTW, calculateDTWSimilarity, recognizeKlinePatterns } from './technicalIndicators';

// 测试数据准备
const testWADData = [
  { timestamp: 1609459200000, high: 105, low: 95, close: 100, volume: 1000000 },
  { timestamp: 1609545600000, high: 110, low: 100, close: 108, volume: 1200000 },
  { timestamp: 1609632000000, high: 115, low: 105, close: 112, volume: 1500000 },
  { timestamp: 1609718400000, high: 120, low: 110, close: 118, volume: 1800000 },
  { timestamp: 1609804800000, high: 125, low: 115, close: 122, volume: 2000000 }
];

const testClosePrices = [100, 102, 105, 103, 107, 108, 110, 109, 112, 115];
const testHighPrices = [101, 104, 106, 104, 109, 110, 112, 111, 113, 116];
const testLowPrices = [99, 101, 104, 102, 106, 107, 109, 108, 111, 114];
const testOpenPrices = [100, 102, 104, 103, 107, 108, 110, 109, 112, 115];

// WAD算法测试
describe('WAD Algorithm Tests', () => {
  test('calculateWAD should return correct values', () => {
    const result1 = calculateWAD({ high: 105, low: 95, close: 100, previousClose: 100 });
    expect(result1).toBeCloseTo(0, 2);

    const result2 = calculateWAD({ high: 110, low: 100, close: 108, previousClose: 100 });
    expect(result2).toBeGreaterThan(0);

    const result3 = calculateWAD({ high: 105, low: 95, close: 98, previousClose: 100 });
    expect(result3).toBeLessThan(0);
  });

  test('calculateCumulativeWAD should return correct values', () => {
    const result = calculateCumulativeWAD(testWADData);

    expect(result.length).toBe(testWADData.length);
    expect(result[0].wad).toBeDefined();
    expect(result[0].weightedWad).toBeDefined();

    // 验证时间衰减权重
    expect(result[0].weight).toBeLessThan(result[testWADData.length - 1].weight);

    // 验证累积WAD随时间递增
    for (let i = 1; i < result.length; i++) {
      expect(result[i].wad).toBeGreaterThan(result[i - 1].wad);
    }
  });

  test('generateWADSignals should return correct signals', () => {
    const wadResult = calculateCumulativeWAD(testWADData);
    const signals = generateWADSignals({
      wadData: wadResult,
      threshold: 5,
      lookbackPeriod: 2
    });

    expect(signals.length).toBe(wadResult.length);
    expect(signals[0].signal).toBe('hold');

    // 验证信号强度范围
    signals.forEach(signal => {
      expect(signal.strength).toBeGreaterThanOrEqual(0);
      expect(signal.strength).toBeLessThanOrEqual(1);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// 筹码分布算法测试
describe('Chip Distribution Tests', () => {
  const testChipData = [
    { price: 100, volume: 1000000, percentage: 0.2 },
    { price: 105, volume: 2000000, percentage: 0.4 },
    { price: 110, volume: 1500000, percentage: 0.3 },
    { price: 115, volume: 250000, percentage: 0.05 },
    { price: 120, volume: 250000, percentage: 0.05 }
  ];

  test('calculateHHI should return correct concentration index', () => {
    const hhi = calculateHHI(testChipData);
    // HHI = 0.2² + 0.4² + 0.3² + 0.05² + 0.05² = 0.04 + 0.16 + 0.09 + 0.0025 + 0.0025 = 0.295
    expect(hhi).toBeCloseTo(0.295, 3);
  });

  test('calculateGiniCoefficient should return correct inequality index', () => {
    const gini = calculateGiniCoefficient(testChipData);
    // 验证Gini系数在0-1之间
    expect(gini).toBeGreaterThanOrEqual(0);
    expect(gini).toBeLessThanOrEqual(1);
  });

  test('identifyChipPeaks should return correct peak information', () => {
    const peakInfo = identifyChipPeaks(testChipData, true);

    expect(peakInfo.peakPrice).toBe(105); // 最大成交量对应的价格
    expect(peakInfo.peakRatio).toBe(0.4); // 最大成交量占比
    expect(peakInfo.peaks.length).toBeGreaterThan(0);
    expect(peakInfo.peaks[0].volume).toBe(2000000); // 最大成交量
  });

  test('calculateSupportResistance should return correct levels', () => {
    const levels = calculateSupportResistance(testChipData, 110, true);

    expect(levels.supportLevels.length).toBeGreaterThanOrEqual(0);
    expect(levels.resistanceLevels.length).toBeGreaterThanOrEqual(0);

    // 验证支撑位都低于当前价格，压力位都高于当前价格
    levels.supportLevels.forEach(level => {
      expect(level.price).toBeLessThan(110);
      expect(level.strength).toBeGreaterThan(0);
    });

    levels.resistanceLevels.forEach(level => {
      expect(level.price).toBeGreaterThan(110);
      expect(level.strength).toBeGreaterThan(0);
    });
  });

  test('calculateEnhancedChipDistribution should return correct result', () => {
    const result = calculateEnhancedChipDistribution(testWADData);

    expect(result.chipDistribution.length).toBeGreaterThan(0);
    expect(result.wadData.length).toBe(testWADData.length);
    expect(result.enhancedConcentration).toBeGreaterThan(0);
    expect(result.enhancedMainCost).toBeGreaterThan(0);
    expect(result.enhancedSupportResistance).toBeDefined();
  });
});

// 技术指标算法测试
describe('Technical Indicators Tests', () => {
  test('calculateMA should return correct moving averages', () => {
    const ma = calculateMA({ data: testClosePrices, period: 5 });

    expect(ma.length).toBe(testClosePrices.length);
    expect(ma[4]).toBeCloseTo((100 + 102 + 105 + 103 + 107) / 5, 2); // 5日均线
    expect(ma[9]).toBeCloseTo((108 + 110 + 109 + 112 + 115) / 5, 2); // 5日均线
  });

  test('calculateMACD should return correct MACD values', () => {
    const macd = calculateMACD({ close: testClosePrices });

    expect(macd.diff.length).toBe(testClosePrices.length);
    expect(macd.dea.length).toBe(testClosePrices.length);
    expect(macd.bar.length).toBe(testClosePrices.length);
  });

  test('calculateRSI should return correct RSI values', () => {
    const rsi = calculateRSI({ data: testClosePrices, period: 5 });

    expect(rsi.length).toBe(testClosePrices.length);

    // RSI应该在0-100之间
    rsi.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  test('calculateBollingerBands should return correct bands', () => {
    const bands = calculateBollingerBands({ data: testClosePrices, period: 5, stdDev: 2 });

    expect(bands.middle.length).toBe(testClosePrices.length);
    expect(bands.upper.length).toBe(testClosePrices.length);
    expect(bands.lower.length).toBe(testClosePrices.length);

    // 上轨应该大于中轨，中轨应该大于下轨
    for (let i = 0; i < testClosePrices.length; i++) {
      expect(bands.upper[i]).toBeGreaterThanOrEqual(bands.middle[i]);
      expect(bands.middle[i]).toBeGreaterThanOrEqual(bands.lower[i]);
    }
  });

  test('calculateKDJ should return correct values', () => {
    const kdj = calculateKDJ({
      high: testHighPrices,
      low: testLowPrices,
      close: testClosePrices,
      period: 5
    });

    expect(kdj.k.length).toBe(testClosePrices.length);
    expect(kdj.d.length).toBe(testClosePrices.length);
    expect(kdj.j.length).toBe(testClosePrices.length);

    // K、D值应该在0-100之间
    kdj.k.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });
});

// DTW序列匹配测试
describe('DTW Sequence Matching Tests', () => {
  const sequence1 = [0, 1, 2, 3, 4, 5];
  const sequence2 = [0, 1, 2, 3, 4, 5];
  const sequence3 = [0, 1, 1.5, 2.5, 3.5, 4.5, 5];
  const sequence4 = [5, 4, 3, 2, 1, 0];

  test('calculateDTW should return correct distance', () => {
    const distance1 = calculateDTW({ sequence1, sequence2 });
    expect(distance1).toBeCloseTo(0, 2); // 相同序列距离为0

    const distance2 = calculateDTW({ sequence1, sequence2: sequence3 });
    expect(distance2).toBeGreaterThan(0);
    expect(distance2).toBeLessThan(5); // 相似序列距离较小

    const distance3 = calculateDTW({ sequence1, sequence2: sequence4 });
    expect(distance3).toBeGreaterThan(distance2); // 相反序列距离较大
  });

  test('calculateDTWSimilarity should return correct similarity', () => {
    const similarity1 = calculateDTWSimilarity({ sequence1, sequence2 });
    expect(similarity1).toBeCloseTo(1, 2); // 相同序列相似度为1

    const similarity2 = calculateDTWSimilarity({ sequence1, sequence2: sequence3 });
    expect(similarity2).toBeGreaterThan(0.5);
    expect(similarity2).toBeLessThan(1);

    const similarity3 = calculateDTWSimilarity({ sequence1, sequence2: sequence4 });
    expect(similarity3).toBeLessThan(similarity2); // 相反序列相似度较低
  });
});

// K线形态识别测试
describe('Kline Pattern Recognition Tests', () => {
  // 锤子线测试数据
  const hammerData = {
    high: [105, 108, 110, 115, 120],
    low: [95, 100, 105, 110, 115],
    close: [100, 108, 112, 118, 122],
    open: [100, 100, 110, 110, 120]
  };

  // 红三兵测试数据
  const threeWhiteSoldiersData = {
    high: [102, 105, 108, 111, 114],
    low: [98, 101, 104, 107, 110],
    close: [101, 104, 107, 110, 113],
    open: [100, 102, 105, 108, 111]
  };

  test('recognizeKlinePatterns should identify basic patterns', () => {
    const patterns = recognizeKlinePatterns(hammerData);

    expect(patterns.length).toBeGreaterThan(0);

    // 应该识别出锤子线
    const hammerPatterns = patterns.filter(p => p.pattern === 'hammer');
    expect(hammerPatterns.length).toBeGreaterThan(0);
  });

  test('recognizeKlinePatterns should identify complex patterns', () => {
    const patterns = recognizeKlinePatterns(threeWhiteSoldiersData);

    expect(patterns.length).toBeGreaterThan(0);

    // 验证信号置信度
    patterns.forEach(pattern => {
      expect(pattern.confidence).toBeGreaterThan(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
      expect(pattern.startIndex).toBeGreaterThanOrEqual(0);
      expect(pattern.endIndex).toBeLessThan(threeWhiteSoldiersData.close.length);
    });
  });
});

// 性能测试
describe('Performance Tests', () => {
  // 生成大量测试数据
  const generateLargeData = (size: number) => {
    const data = [];
    let price = 100;
    const now = Date.now();

    for (let i = 0; i < size; i++) {
      const high = price + Math.random() * 10;
      const low = price - Math.random() * 10;
      const close = low + Math.random() * (high - low);

      data.push({
        timestamp: now - (size - i) * 86400000, // 每天一条数据
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });

      price = close;
    }

    return data;
  };

  test('calculateCumulativeWAD should handle large datasets efficiently', () => {
    const largeData = generateLargeData(1000);

    // 测试计算时间
    const startTime = performance.now();
    const result = calculateCumulativeWAD(largeData);
    const endTime = performance.now();

    expect(result.length).toBe(largeData.length);
    expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
  });

  test('calculateDTW should handle sequences efficiently', () => {
    const sequence1 = Array.from({ length: 100 }, () => Math.random());
    const sequence2 = Array.from({ length: 100 }, () => Math.random());

    const startTime = performance.now();
    const result = calculateDTW({ sequence1, sequence2, windowSize: 20 });
    const endTime = performance.now();

    expect(result).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
  });
});
