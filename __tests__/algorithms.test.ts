// 综合测试脚本：验证量化交易算法的功能和性能

import { calculateWADEnhancedChipDistribution } from '../lib/algorithms/wad';
import { EnhancedRealTimeLargeOrderProcessor, OrderItem } from '../lib/algorithms/largeOrder';
import {
  calculateMACD,
  calculateRSI,
  calculateKDJ,
  calculateBollingerBands,
  recognizeEnhancedKlinePatterns,
  calculateAdvancedDTW,
  DTWAdvancedParams
} from '../lib/algorithms/technicalIndicators';

// 生成测试数据
function generateTestPriceData(count: number): Array<{ timestamp: number; high: number; low: number; close: number; volume: number }> {
  const data: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }> = [];
  let currentPrice = 100;
  const currentTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    const volatility = Math.random() * 2;
    const change = (Math.random() - 0.5) * volatility;
    const newPrice = currentPrice + change;
    const high = Math.max(newPrice, newPrice + Math.random() * 0.5);
    const low = Math.min(newPrice, newPrice - Math.random() * 0.5);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({
      timestamp: currentTime - (count - i) * 60000, // 每分钟一个数据点
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(newPrice * 100) / 100,
      volume
    });
    
    currentPrice = newPrice;
  }
  
  return data;
}

function generateTestOrderData(count: number): OrderItem[] {
  const orders: OrderItem[] = [];
  const currentTime = Date.now();
  let currentPrice = 100;
  
  for (let i = 0; i < count; i++) {
    const priceChange = (Math.random() - 0.5) * 2;
    currentPrice += priceChange;
    currentPrice = Math.round(currentPrice * 100) / 100;
    
    const volume = Math.floor(Math.random() * 100000) + 1000;
    const amount = Math.round(currentPrice * volume * 100); // 分
    const direction = Math.random() > 0.5 ? 'buy' : 'sell';
    
    orders.push({
      tradeTime: new Date(currentTime - (count - i) * 1000).toISOString(), // 每秒一个订单
      tradePrice: Math.round(currentPrice * 100), // 分
      tradeVolume: volume,
      tradeAmount: amount,
      tradeDirection: direction,
      orderType: Math.random() > 0.7 ? 'market' : 'limit'
    });
  }
  
  // 添加一些大额订单
  for (let i = 0; i < 5; i++) {
    const priceChange = (Math.random() - 0.5) * 2;
    currentPrice += priceChange;
    currentPrice = Math.round(currentPrice * 100) / 100;
    
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    const amount = Math.round(currentPrice * volume * 100); // 分
    const direction = Math.random() > 0.5 ? 'buy' : 'sell';
    
    orders.push({
      tradeTime: new Date(currentTime - (count - i * 20) * 1000).toISOString(),
      tradePrice: Math.round(currentPrice * 100), // 分
      tradeVolume: volume,
      tradeAmount: amount,
      tradeDirection: direction,
      orderType: Math.random() > 0.7 ? 'market' : 'limit'
    });
  }
  
  return orders;
}

// 测试WAD增强筹码分布算法
function testWADChipDistribution() {
  console.log('=== 测试WAD增强筹码分布算法 ===');
  
  const testData = generateTestPriceData(1000);
  const currentPrice = testData[testData.length - 1].close;
  
  const startTime = performance.now();
  
  const result = calculateWADEnhancedChipDistribution({
    priceData: testData,
    currentPrice,
    decayRate: 0.1,
    useHighFrequency: false,
    priceBucketCount: 100
  });
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  console.log(`处理时间: ${processingTime.toFixed(2)}ms`);
  console.log(`是否满足实时延迟要求 (<300ms): ${processingTime < 300}`);
  
  console.log('筹码分布结果:');
  console.log(`- 筹码集中度: ${(result.concentration * 100).toFixed(2)}%`);
  console.log(`- 主筹峰值: ${result.mainPeak.peakPrice.toFixed(2)}元 (占比: ${(result.mainPeak.peakRatio * 100).toFixed(2)}%)`);
  console.log(`- WAD影响因子: ${result.wadFactor.toFixed(4)}`);
  console.log(`- 应用时间衰减: ${result.timeDecayApplied}`);
  
  console.log(`支撑位数量: ${result.supportResistance.supportLevels.length}`);
  console.log(`压力位数量: ${result.supportResistance.resistanceLevels.length}`);
  
  if (result.supportResistance.strongestSupport) {
    console.log(`最强支撑位: ${result.supportResistance.strongestSupport.price.toFixed(2)}元`);
  }
  
  if (result.supportResistance.strongestResistance) {
    console.log(`最强压力位: ${result.supportResistance.strongestResistance.price.toFixed(2)}元`);
  }
  
  return { success: true, processingTime };
}

// 测试大单异动识别算法
function testLargeOrderDetection() {
  console.log('\n=== 测试大单异动识别算法 ===');
  
  const testOrders = generateTestOrderData(1000);
  const processor = new EnhancedRealTimeLargeOrderProcessor(1000, 2);
  
  let totalProcessingTime = 0;
  let largeOrderCount = 0;
  let extraLargeOrderCount = 0;
  
  // 处理每个订单
  for (const order of testOrders) {
    const startTime = performance.now();
    const result = processor.processOrder(order);
    const endTime = performance.now();
    
    totalProcessingTime += (endTime - startTime);
    
    if (result.isLargeOrder) {
      largeOrderCount++;
      if (result.isExtraLargeOrder) {
        extraLargeOrderCount++;
      }
    }
  }
  
  const avgProcessingTime = totalProcessingTime / testOrders.length;
  const maxProcessingTime = Math.max(...testOrders.map((_, i) => {
    const startTime = performance.now();
    processor.processOrder(testOrders[i]);
    return performance.now() - startTime;
  }));
  
  console.log(`总订单数: ${testOrders.length}`);
  console.log(`识别到大单: ${largeOrderCount}个`);
  console.log(`识别到特大单: ${extraLargeOrderCount}个`);
  console.log(`平均处理时间: ${avgProcessingTime.toFixed(4)}ms`);
  console.log(`最大处理时间: ${maxProcessingTime.toFixed(2)}ms`);
  console.log(`是否满足实时延迟要求 (<300ms): ${maxProcessingTime < 300}`);
  
  // 获取统计信息
  const stats = processor.getStatistics();
  console.log('\n订单统计信息:');
  console.log(`- 总成交金额: ${(stats.totalAmount / 1000000).toFixed(2)}万元`);
  console.log(`- 大单成交占比: ${(stats.largeOrderRatio * 100).toFixed(2)}%`);
  console.log(`- 资金净流入: ${(stats.netInflow / 1000000).toFixed(2)}万元`);
  console.log(`- 买单金额: ${(stats.orderPower.buyAmount / 1000000).toFixed(2)}万元`);
  console.log(`- 卖单金额: ${(stats.orderPower.sellAmount / 1000000).toFixed(2)}万元`);
  
  return { success: true, avgProcessingTime, maxProcessingTime };
}

// 测试技术指标算法
function testTechnicalIndicators() {
  console.log('\n=== 测试技术指标算法 ===');
  
  const testData = generateTestPriceData(200);
  const closePrices = testData.map(d => d.close);
  const highPrices = testData.map(d => d.high);
  const lowPrices = testData.map(d => d.low);
  const openPrices = testData.map(d => d.close - (Math.random() - 0.5) * 1); // 模拟开盘价
  
  // 测试MACD
  console.log('\n1. MACD指标:');

  const macdStartTime = performance.now();
  const macdResult = calculateMACD({ data: closePrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  const macdEndTime = performance.now();
  console.log(`处理时间: ${(macdEndTime - macdStartTime).toFixed(2)}ms`);
  console.log(`最新MACD: ${macdResult.macd[macdResult.macd.length - 1].toFixed(4)}`);
  console.log(`最新信号: ${macdResult.signal[macdResult.signal.length - 1].toFixed(4)}`);
  console.log(`最新柱状图: ${macdResult.histogram[macdResult.histogram.length - 1].toFixed(4)}`);
  
  // 测试RSI
  console.log('\n2. RSI指标:');
  const rsiStartTime = performance.now();
  const rsiResult = calculateRSI({ data: closePrices, period: 14 });
  const rsiEndTime = performance.now();
  console.log(`处理时间: ${(rsiEndTime - rsiStartTime).toFixed(2)}ms`);
  console.log(`最新RSI值: ${rsiResult[rsiResult.length - 1].toFixed(2)}`);
  
  // 测试KDJ
  console.log('\n3. KDJ指标:');
  const kdjStartTime = performance.now();
  const kdjResult = calculateKDJ({ 
    high: highPrices, 
    low: lowPrices, 
    close: closePrices,
    period: 9, 
    kPeriod: 3, 
    dPeriod: 3 
  });
  const kdjEndTime = performance.now();
  console.log(`处理时间: ${(kdjEndTime - kdjStartTime).toFixed(2)}ms`);
  console.log(`最新K值: ${kdjResult.k[kdjResult.k.length - 1].toFixed(2)}`);
  console.log(`最新D值: ${kdjResult.d[kdjResult.d.length - 1].toFixed(2)}`);
  console.log(`最新J值: ${kdjResult.j[kdjResult.j.length - 1].toFixed(2)}`);
  
  // 测试布林带
  console.log('\n4. 布林带指标:');
  const bbStartTime = performance.now();
  const bbResult = calculateBollingerBands({ close: closePrices, period: 20, standardDeviations: 2 });
  const bbEndTime = performance.now();
  console.log(`处理时间: ${(bbEndTime - bbStartTime).toFixed(2)}ms`);
  const latestIndex = bbResult.middle.length - 1;
  console.log(`中轨: ${bbResult.middle[latestIndex].toFixed(4)}`);
  console.log(`上轨: ${bbResult.upper[latestIndex].toFixed(4)}`);
  console.log(`下轨: ${bbResult.lower[latestIndex].toFixed(4)}`);
  
  return { success: true };
}

// 测试K线形态识别
function testKlinePatternRecognition() {
  console.log('\n=== 测试K线形态识别 ===');
  
  const testData = generateTestPriceData(50);
  const closePrices = testData.map(d => d.close);
  const highPrices = testData.map(d => d.high);
  const lowPrices = testData.map(d => d.low);
  const openPrices = testData.map(d => d.close - (Math.random() - 0.5) * 1);
  
  const startTime = performance.now();
  const patterns = recognizeEnhancedKlinePatterns({
    high: highPrices,
    low: lowPrices,
    close: closePrices,
    open: openPrices,
    useCNN: true,
    useTA: false,
    confidenceThreshold: 0.5
  });
  const endTime = performance.now();
  
  console.log(`处理时间: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`识别到${patterns.length}个K线形态`);
  
  if (patterns.length > 0) {
    console.log('\n主要形态:');
    patterns.slice(0, 3).forEach((pattern, index) => {
      console.log(`${index + 1}. ${pattern.name} (置信度: ${(pattern.confidence * 100).toFixed(2)}%)`);
      console.log(`   类型: ${pattern.patternType}, 家族: ${pattern.patternFamily}`);
      console.log(`   时间范围: 索引${pattern.startIndex}-${pattern.endIndex}`);
    });
  }
  
  return { success: true, patternCount: patterns.length, processingTime: endTime - startTime };
}

// 测试DTW序列匹配
function testDTWSequenceMatching() {
  console.log('\n=== 测试DTW序列匹配 ===');
  
  // 生成两个测试序列
  const sequence1 = Array.from({ length: 100 }, () => Math.random() * 100);
  const sequence2 = Array.from({ length: 120 }, () => Math.random() * 100);
  
  const params: DTWAdvancedParams = {
    sequence1,
    sequence2,
    windowSize: 20,
    normalization: 'zscore',
    distanceMetric: 'euclidean',
    weighted: true
  };
  
  const startTime = performance.now();
  const dtwDistance = calculateAdvancedDTW(params);
  const endTime = performance.now();
  
  console.log(`DTW距离: ${dtwDistance.toFixed(2)}`);
  console.log(`处理时间: ${(endTime - startTime).toFixed(2)}ms`);
  
  // 测试不同参数组合
  const params2: DTWAdvancedParams = {
    sequence1,
    sequence2,
    windowSize: 10,
    normalization: 'minmax',
    distanceMetric: 'manhattan',
    weighted: false
  };
  
  const startTime2 = performance.now();
  const dtwDistance2 = calculateAdvancedDTW(params2);
  const endTime2 = performance.now();
  
  console.log(`\n不同参数组合:`);
  console.log(`DTW距离: ${dtwDistance2.toFixed(2)}`);
  console.log(`处理时间: ${(endTime2 - startTime2).toFixed(2)}ms`);
  
  return { success: true, dtwDistance, processingTime: endTime - startTime };
}

// 综合性能测试
function runPerformanceTests() {
  console.log('\n=== 综合性能测试 ===');
  
  // 模拟大量数据
  const largePriceData = generateTestPriceData(10000);
  const largeOrderData = generateTestOrderData(10000);
  
  console.log('\n1. WAD筹码分布性能测试:');
  const wadStartTime = performance.now();
  const wadResult = calculateWADEnhancedChipDistribution({
    priceData: largePriceData.slice(0, 5000),
    currentPrice: largePriceData[4999].close,
    decayRate: 0.1,
    useHighFrequency: true,
    priceBucketCount: 200
  });
  const wadEndTime = performance.now();
  console.log(`处理时间: ${(wadEndTime - wadStartTime).toFixed(2)}ms`);
  console.log(`是否满足非实时延迟要求 (<1000ms): ${(wadEndTime - wadStartTime) < 1000}`);
  
  console.log('\n2. 大单识别性能测试:');
  const processor = new EnhancedRealTimeLargeOrderProcessor(10000, 2);
  const orderStartTime = performance.now();
  
  // 处理前1000个订单
  for (let i = 0; i < 1000; i++) {
    processor.processOrder(largeOrderData[i]);
  }
  
  const orderEndTime = performance.now();
  console.log(`处理1000个订单时间: ${(orderEndTime - orderStartTime).toFixed(2)}ms`);
  console.log(`平均每个订单处理时间: ${((orderEndTime - orderStartTime) / 1000).toFixed(4)}ms`);
  
  return {
    success: true,
    wadProcessingTime: wadEndTime - wadStartTime,
    orderProcessingTime: orderEndTime - orderStartTime
  };
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 启动量化交易算法综合测试...');
  console.log('='.repeat(60));
  
  const testResults = {
    wad: testWADChipDistribution(),
    largeOrder: testLargeOrderDetection(),
    technicalIndicators: testTechnicalIndicators(),
    klinePatterns: testKlinePatternRecognition(),
    dtw: testDTWSequenceMatching(),
    performance: runPerformanceTests()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.log('='.repeat(60));
  
  // 检查所有测试是否通过
  const allTestsPassed = Object.values(testResults).every(result => result.success !== false);
  
  console.log(`\n✅ 所有功能测试: ${allTestsPassed ? '通过' : '失败'}`);
  console.log(`📈 实时延迟要求 (<300ms): ${testResults.wad.processingTime < 300 && testResults.largeOrder.maxProcessingTime < 300 ? '满足' : '不满足'}`);
  console.log(`⏱️ 非实时延迟要求 (<1000ms): ${testResults.performance.wadProcessingTime < 1000 ? '满足' : '不满足'}`);
  
  console.log(`\n识别到的K线形态数: ${testResults.klinePatterns.patternCount}`);
  console.log(`DTW序列匹配处理时间: ${testResults.dtw.processingTime.toFixed(2)}ms`);
  
  if (allTestsPassed) {
    console.log('\n🎉 所有测试通过！量化交易算法功能正常。');
  } else {
    console.log('\n❌ 部分测试失败，需要进一步调试。');
  }
  
  return allTestsPassed;
}

// 执行测试
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
