// JavaScript版本的测试脚本，用于验证算法功能
const { calculateCumulativeWAD, calculateWAD, generateWADSignals } = require('./wad');
const { calculateHHI, calculateGiniCoefficient, identifyChipPeaks, calculateSupportResistance, calculateEnhancedChipDistribution } = require('./chipDistribution');
const { calculateMA, calculateMACD, calculateRSI, calculateBollingerBands, calculateKDJ, calculateDTW, calculateDTWSimilarity, recognizeKlinePatterns } = require('./technicalIndicators');

// 简单的断言函数
function assert(condition, message) {
  if (!condition) {
    console.error('❌ 测试失败:', message);
    return false;
  } else {
    console.log('✅ 测试通过:', message);
    return true;
  }
}

function assertCloseTo(actual, expected, precision, message) {
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
try {
  const result1 = calculateWAD({ high: 105, low: 95, close: 100, previousClose: 100 });
  if (assertCloseTo(result1, 0, 2, 'calculateWAD 测试用例1')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateWAD 测试用例1:', error.message);
}

totalTests++;
try {
  const result2 = calculateWAD({ high: 110, low: 100, close: 108, previousClose: 100 });
  if (assert(result2 > 0, 'calculateWAD 测试用例2')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateWAD 测试用例2:', error.message);
}

totalTests++;
try {
  const result3 = calculateWAD({ high: 105, low: 95, close: 98, previousClose: 100 });
  if (assert(result3 < 0, 'calculateWAD 测试用例3')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateWAD 测试用例3:', error.message);
}

totalTests++;
try {
  const wadResult = calculateCumulativeWAD(testWADData);
  if (assert(wadResult.length === testWADData.length && wadResult[0].wad !== undefined, 'calculateCumulativeWAD 返回正确结构')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateCumulativeWAD:', error.message);
}

// 技术指标算法测试
console.log('\n=== 技术指标算法测试 ===');

totalTests++;
try {
  const ma = calculateMA({ data: testClosePrices, period: 5 });
  if (assert(ma.length === testClosePrices.length, 'calculateMA 返回正确长度')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateMA:', error.message);
}

totalTests++;
try {
  const macd = calculateMACD({ close: testClosePrices });
  if (assert(macd.diff.length === testClosePrices.length, 'calculateMACD 返回正确结构')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateMACD:', error.message);
}

totalTests++;
try {
  const rsi = calculateRSI({ close: testClosePrices, period: 5 });
  if (assert(rsi.length === testClosePrices.length && rsi.every(v => v >= 0 && v <= 100), 'calculateRSI 返回有效的RSI值')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateRSI:', error.message);
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
try {
  const hhi = calculateHHI(testChipData);
  if (assertCloseTo(hhi, 0.295, 3, 'calculateHHI 返回正确的赫芬达尔-赫希曼指数')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateHHI:', error.message);
}

// DTW序列匹配测试
console.log('\n=== DTW序列匹配测试 ===');

const sequence1 = [0, 1, 2, 3, 4, 5];
const sequence2 = [0, 1, 2, 3, 4, 5];
const sequence3 = [0, 1, 1.5, 2.5, 3.5, 4.5, 5];

totalTests++;
try {
  const distance1 = calculateDTW({ sequence1, sequence2 });
  if (assertCloseTo(distance1, 0, 2, 'calculateDTW 相同序列距离为0')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateDTW 测试用例1:', error.message);
}

totalTests++;
try {
  const distance2 = calculateDTW({ sequence1, sequence3 });
  if (assert(distance2 > 0 && distance2 < 5, 'calculateDTW 相似序列距离较小')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'calculateDTW 测试用例2:', error.message);
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
try {
  const patterns = recognizeKlinePatterns(hammerData);
  if (assert(patterns.length > 0, 'recognizeKlinePatterns 识别出K线形态')) {
    passedTests++;
  }
} catch (error) {
  console.error('❌ 测试错误:', 'recognizeKlinePatterns:', error.message);
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
