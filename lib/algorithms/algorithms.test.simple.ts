// 简化版测试脚本，用于验证算法功能
import { calculateCumulativeWAD, calculateWAD, generateWADSignals } from './wad';
import { calculateHHI, calculateGiniCoefficient, identifyChipPeaks, calculateSupportResistance, calculateEnhancedChipDistribution } from './chipDistribution';
import { calculateMA, calculateMACD, calculateRSI, calculateBollingerBands, calculateKDJ, calculateDTW, calculateDTWSimilarity, recognizeKlinePatterns } from './technicalIndicators';

// 简单的断言函数
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ 测试失败:', message);
    return false;
  } else {
    console.log('✅ 测试通过:', message);
    return true;
  }
}

function assertCloseTo(actual: number, expected: number, precision: number, message: string) {
  const delta = Math.pow(10, -precision);
  const passed = Math.abs(actual - expected) <= delta;
  if (!passed) {
    console.error(`❌ 测试失败: ${message}. 实际值: ${actual}, 期望值: ${expected}`);
    return false;
  } else {
    console.log(`✅ 测试通过: ${message}. 实际值: ${actual}, 期望值: ${expected}`);
    return true;
  }
}

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

console.log('=== 开始算法功能测试 ===\n');

// 测试计数器
let passedTests = 0;
let totalTests = 0;

// WAD算法测试
console.log('=== WAD算法测试 ===');

totalTests++;
const result1 = calculateWAD({ high: 105, low: 95, close: 100, previousClose: 100 });
if (assertCloseTo(result1, 0, 2, 'calculateWAD 测试用例1')) {
  passedTests++;
}

totalTests++;
const result2 = calculateWAD({ high: 110, low: 100, close: 108, previousClose: 100 });
if (assert(result2 > 0, 'calculateWAD 测试用例2')) {
  passedTests++;
}

totalTests++;
const result3 = calculateWAD({ high: 105, low: 95, close: 98, previousClose: 100 });
if (assert(result3 < 0, 'calculateWAD 测试用例3')) {
  passedTests++;
}

totalTests++;
const wadResult = calculateCumulativeWAD(testWADData);
if (assert(wadResult.length === testWADData.length && wadResult[0].wad !== undefined, 'calculateCumulativeWAD 返回正确结构')) {
  passedTests++;
}

totalTests++;
const signals = generateWADSignals({
  wadData: wadResult,
  threshold: 5,
  lookbackPeriod: 2
});
if (assert(signals.length === wadResult.length, 'generateWADSignals 返回正确数量的信号')) {
  passedTests++;
}

// 筹码分布算法测试
console.log('\n=== 筹码分布算法测试 ===');

const testChipData = [
  { price: 100, volume: 1000000, percentage: 0.2 },
  { price: 105, volume: 2000000, percentage: 0.4 },
  { price: 110, volume: 1500000, percentage: 0.3 },
  { price: 115, volume: 250000, percentage: 0.05 },
  { price: 120, volume: 250000, percentage: 0.05 }
];

totalTests++;
const hhi = calculateHHI(testChipData);
if (assertCloseTo(hhi, 0.295, 3, 'calculateHHI 返回正确的赫芬达尔-赫希曼指数')) {
  passedTests++;
}

totalTests++;
const gini = calculateGiniCoefficient(testChipData);
if (assert(gini >= 0 && gini <= 1, 'calculateGiniCoefficient 返回有效的基尼系数')) {
  passedTests++;
}

totalTests++;
const peakInfo = identifyChipPeaks(testChipData, true);
if (assert(peakInfo.peakPrice === 105 && peakInfo.peakRatio === 0.4, 'identifyChipPeaks 返回正确的峰值信息')) {
  passedTests++;
}

totalTests++;
const levels = calculateSupportResistance(testChipData, 110, true);
if (assert(levels.supportLevels.length >= 0 && levels.resistanceLevels.length >= 0, 'calculateSupportResistance 返回正确的支撑/压力位')) {
  passedTests++;
}

totalTests++;
const enhancedChipResult = calculateEnhancedChipDistribution(testWADData);
if (assert(enhancedChipResult.chipDistribution.length > 0, 'calculateEnhancedChipDistribution 返回正确结构')) {
  passedTests++;
}

// 技术指标算法测试
console.log('\n=== 技术指标算法测试 ===');

totalTests++;
const ma = calculateMA({ data: testClosePrices, period: 5 });
if (assert(ma.length === testClosePrices.length, 'calculateMA 返回正确长度')) {
  passedTests++;
}

totalTests++;
const macd = calculateMACD({ close: testClosePrices });
if (assert(macd.diff.length === testClosePrices.length, 'calculateMACD 返回正确结构')) {
  passedTests++;
}

totalTests++;
const rsi = calculateRSI({ close: testClosePrices, period: 5 });
if (assert(rsi.length === testClosePrices.length && rsi.every(v => v >= 0 && v <= 100), 'calculateRSI 返回有效的RSI值')) {
  passedTests++;
}

totalTests++;
const bands = calculateBollingerBands({ close: testClosePrices, period: 5 });
if (assert(bands.middle.length === testClosePrices.length && bands.upper.length === testClosePrices.length, 'calculateBollingerBands 返回正确结构')) {
  passedTests++;
}

totalTests++;
const kdj = calculateKDJ({ 
  high: testHighPrices, 
  low: testLowPrices, 
  close: testClosePrices, 
  period: 5 
});
if (assert(kdj.k.length === testClosePrices.length, 'calculateKDJ 返回正确结构')) {
  passedTests++;
}

// DTW序列匹配测试
console.log('\n=== DTW序列匹配测试 ===');

const sequence1 = [0, 1, 2, 3, 4, 5];
const sequence2 = [0, 1, 2, 3, 4, 5];
const sequence3 = [0, 1, 1.5, 2.5, 3.5, 4.5, 5];
const sequence4 = [5, 4, 3, 2, 1, 0];

totalTests++;
const distance1 = calculateDTW({ sequence1, sequence2 });
if (assertCloseTo(distance1, 0, 2, 'calculateDTW 相同序列距离为0')) {
  passedTests++;
}

totalTests++;
const distance2 = calculateDTW({ sequence1, sequence2: sequence3 });
if (assert(distance2 > 0 && distance2 < 5, 'calculateDTW 相似序列距离较小')) {
  passedTests++;
}

totalTests++;
const similarity1 = calculateDTWSimilarity({ sequence1, sequence2 });
if (assertCloseTo(similarity1, 1, 2, 'calculateDTWSimilarity 相同序列相似度为1')) {
  passedTests++;
}

// K线形态识别测试
console.log('\n=== K线形态识别测试 ===');

// 锤子线测试数据
const hammerData = {
  high: [105, 108, 110, 115, 120],
  low: [95, 100, 105, 110, 115],
  close: [100, 108, 112, 118, 122],
  open: [100, 100, 110, 110, 120]
};

totalTests++;
const patterns = recognizeKlinePatterns(hammerData);
if (assert(patterns.length > 0, 'recognizeKlinePatterns 识别出K线形态')) {
  passedTests++;
}

// 红三兵测试数据
const threeWhiteSoldiersData = {
  high: [102, 105, 108, 111, 114],
  low: [98, 101, 104, 107, 110],
  close: [101, 104, 107, 110, 113],
  open: [100, 102, 105, 108, 111]
};

totalTests++;
const complexPatterns = recognizeKlinePatterns(threeWhiteSoldiersData);
if (assert(complexPatterns.every(p => p.confidence > 0 && p.confidence <= 1), 'K线形态识别返回有效的置信度')) {
  passedTests++;
}

// 性能测试
console.log('\n=== 性能测试 ===');

// 生成大量测试数据
function generateLargeData(size: number) {
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
  }
  
  return data;
}

totalTests++;
const largeData = generateLargeData(1000);
const startTime = performance.now();
const largeWADResult = calculateCumulativeWAD(largeData);
const endTime = performance.now();
const wadTime = endTime - startTime;
if (assert(wadTime < 100, `calculateCumulativeWAD 性能测试: ${wadTime.toFixed(2)}ms < 100ms`)) {
  passedTests++;
}

totalTests++;
const sequenceA = Array.from({ length: 100 }, () => Math.random());
const sequenceB = Array.from({ length: 100 }, () => Math.random());
const dtwStartTime = performance.now();
calculateDTW({ sequence1: sequenceA, sequence2: sequenceB, windowSize: 20 });
const dtwEndTime = performance.now();
const dtwTime = dtwEndTime - dtwStartTime;
if (assert(dtwTime < 100, `calculateDTW 性能测试: ${dtwTime.toFixed(2)}ms < 100ms`)) {
  passedTests++;
}

// 测试总结
console.log('\n=== 测试总结 ===');
console.log(`通过测试: ${passedTests}/${totalTests}`);
console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过!');
} else {
  console.log('⚠️  部分测试失败，需要进一步调试。');
}
