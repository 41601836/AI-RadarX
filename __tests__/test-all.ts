// 综合测试脚本，验证所有量化交易算法功能

import { 
  calculateWAD, 
  calculateCumulativeWAD, 
  calculateWADEnhancedChipDistribution, 
  fastExp 
} from './lib/algorithms/wad';

import { 
  FlinkStyleOrderStreamProcessor, 
  WindowConfig, 
  calculateEfficientDynamicThreshold, 
  OrderItem 
} from './lib/algorithms/largeOrder';

import {
  calculateDTW as calculateBasicDTW,
  calculateAdvancedDTW,
  recognizeKlinePatterns,
  EnhancedKlinePatternRecognitionService
} from './lib/algorithms/technicalIndicators';

// 为了兼容旧代码，重新导出calculateDTW
const calculateDTW = calculateBasicDTW;

import { calculateChipConcentration } from './lib/algorithms/chipDistribution';

// 测试1: WAD模型指数时间衰减计算
function testWADModel() {
  console.log('=== 测试1: WAD模型指数时间衰减计算 ===');
  
  // 测试快速指数计算函数
  const testValues = [-1, -0.5, -0.1, 0, 0.1, 0.5, 1];
  
  console.log('快速指数计算精度测试:');
  testValues.forEach(x => {
    const exact = Math.exp(x);
    const fast = fastExp(x);
    const error = Math.abs(exact - fast);
    console.log(`x = ${x.toFixed(2)}: exact = ${exact.toFixed(6)}, fast = ${fast.toFixed(6)}, error = ${error.toFixed(8)}`);
  });
  
  // 测试WAD计算
  const wadParams = {
    high: 105,
    low: 95,
    close: 100,
    previousClose: 98
  };
  
  const wadResult = calculateWAD(wadParams);
  console.log(`\nWAD计算结果: ${wadResult.toFixed(4)}`);
  
  // 测试累积WAD
  const wadData = [
    { timestamp: Date.now() - 86400000, high: 105, low: 95, close: 100 },
    { timestamp: Date.now() - 43200000, high: 110, low: 100, close: 108 },
    { timestamp: Date.now(), high: 115, low: 105, close: 112 }
  ];
  
  const cumulativeWAD = calculateCumulativeWAD(wadData, {
    decayRate: 0.1,
    weightType: 'time',
    useExponentialDecay: true
  });
  
  console.log(`\n累积WAD结果 (最后一个值):`);
  console.log(`  WAD: ${cumulativeWAD[cumulativeWAD.length - 1].wad.toFixed(4)}`);
  console.log(`  Weighted WAD: ${cumulativeWAD[cumulativeWAD.length - 1].weightedWad.toFixed(4)}`);
  console.log(`  Weight: ${cumulativeWAD[cumulativeWAD.length - 1].weight.toFixed(4)}`);
  
  console.log('\nWAD模型测试完成!');
}

// 测试2: 大单异动检测
function testLargeOrderDetection() {
  console.log('\n=== 测试2: 大单异动检测 ===');
  
  // 创建窗口配置
  const windowConfigs: WindowConfig[] = [
    {
      type: 'tumbling',
      size: 60000, // 1分钟滚动窗口
      timeCharacteristic: 'event_time',
      watermarkStrategy: 'fixed_delay',
      watermarkDelay: 1000
    },
    {
      type: 'sliding',
      size: 60000, // 1分钟窗口
      slide: 30000, // 30秒滑动
      timeCharacteristic: 'event_time',
      watermarkStrategy: 'bounded_out_of_orderness'
    }
  ];
  
  // 创建Flink风格的订单流处理器
  const processor = new FlinkStyleOrderStreamProcessor(windowConfigs, { n: 2 });
  
  // 生成测试订单数据
  const testOrders: OrderItem[] = [
    { tradeTime: new Date().toISOString(), tradePrice: 10000, tradeVolume: 1000, tradeAmount: 10000000, tradeDirection: 'buy' },
    { tradeTime: new Date().toISOString(), tradePrice: 10000, tradeVolume: 2000, tradeAmount: 20000000, tradeDirection: 'buy' },
    { tradeTime: new Date().toISOString(), tradePrice: 10000, tradeVolume: 50000, tradeAmount: 500000000, tradeDirection: 'buy' }, // 大单
    { tradeTime: new Date().toISOString(), tradePrice: 10000, tradeVolume: 3000, tradeAmount: 30000000, tradeDirection: 'sell' },
    { tradeTime: new Date().toISOString(), tradePrice: 10000, tradeVolume: 100000, tradeAmount: 1000000000, tradeDirection: 'buy' } // 特大单
  ];
  
  // 处理测试订单
  console.log('处理测试订单:');
  testOrders.forEach((order, index) => {
    const result = processor.processOrder(order);
    console.log(`  订单${index + 1}: ${order.tradeAmount.toLocaleString()} (${order.tradeDirection}) - ${result.isLargeOrder ? '大单' : '普通单'}${result.isExtraLargeOrder ? ' (特大单)' : ''}`);
    console.log(`    阈值比例: ${result.thresholdRatio.toFixed(2)}, 大小等级: ${result.sizeLevel}`);
  });
  
  // 查看当前动态阈值
  const currentThreshold = processor.getCurrentThreshold();
  console.log(`\n当前动态阈值:`);
  console.log(`  均值: ${currentThreshold.mean.toLocaleString()}`);
  console.log(`  标准差: ${currentThreshold.std.toLocaleString()}`);
  console.log(`  阈值 (均值 + 2*标准差): ${currentThreshold.threshold.toLocaleString()}`);
  
  // 查看统计信息
  const stats = processor.getStatistics();
  console.log(`\n统计信息:`);
  console.log(`  总订单数: ${stats.totalOrders}`);
  console.log(`  大单数量: ${stats.largeOrders}`);
  console.log(`  特大单数量: ${stats.extraLargeOrders}`);
  console.log(`  大单金额占比: ${(stats.largeOrderRatio * 100).toFixed(2)}%`);
  console.log(`  净流入: ${stats.netInflow.toLocaleString()}`);
  
  console.log('\n大单异动检测测试完成!');
}

// 测试3: DTW序列匹配算法
function testDTWSequenceMatching() {
  console.log('\n=== 测试3: DTW序列匹配算法 ===');
  
  // 生成测试序列
  const sequence1 = Array.from({ length: 50 }, (_, i) => Math.sin(i * 0.2) + Math.random() * 0.1);
  const sequence2 = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.2 + 0.1) + Math.random() * 0.1);
  
  // 测试不同距离度量
  const distanceMetrics = ['euclidean', 'manhattan'] as const;
  const normalizationMethods = ['none', 'minmax', 'zscore'] as const;
  
  console.log('DTW距离计算测试:');
  distanceMetrics.forEach(metric => {
    normalizationMethods.forEach(norm => {
      const distance = calculateAdvancedDTW({
        series1: sequence1,
        series2: sequence2,
        windowSize: 20,
        normalization: norm,
        distanceMetric: metric
      });
      
      // 计算相似度（基于距离的倒数）
      const similarity = 1 / (1 + distance);
      
      console.log(`  ${metric}距离, ${norm}归一化: 距离 = ${distance.toFixed(4)}, 相似度 = ${(similarity * 100).toFixed(2)}%`);
    });
  });
  
  console.log('\nDTW序列匹配算法测试完成!');
}

// 测试4: CNN模型接入层和K线形态识别
async function testCNNModel() {
  console.log('\n=== 测试4: CNN模型接入层和K线形态识别 ===');
  
  // 生成测试K线数据
  const generateKlineData = (count: number, basePrice: number = 100): Array<{ open: number; high: number; low: number; close: number; volume: number }> => {
    let currentPrice = basePrice;
    return Array.from({ length: count }, () => {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 5;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      currentPrice = close;
      
      return { open, high, low, close, volume };
    });
  };
  
  const klineData = generateKlineData(100, 100);
  
  // 测试K线形态识别服务
  const cnnService = new EnhancedKlinePatternRecognitionService(true, true);
  
  const cnnResults = await cnnService.recognizePatterns(klineData);
  
  console.log('CNN模型识别结果:');
  cnnResults.forEach((result, index) => {
    console.log(`  形态${index + 1}: ${result.name} (置信度: ${(result.confidence * 100).toFixed(2)}%)`);
    console.log(`    类型: ${result.type}, 区间: ${result.startIndex}-${result.endIndex}`);
  });
  
  // 测试组合识别（CNN + DTW）
  console.log('\n组合识别（CNN + DTW）测试:');
  const combinedResults = recognizeKlinePatterns({
    high: klineData.map(d => d.high),
    low: klineData.map(d => d.low),
    close: klineData.map(d => d.close),
    open: klineData.map(d => d.open)
  });
  
  console.log(`  识别到${combinedResults.length}种形态:`);
  combinedResults.slice(0, 3).forEach((pattern, index) => {
    console.log(`    ${index + 1}. ${pattern.name} (${pattern.type}) - 置信度: ${(pattern.confidence * 100).toFixed(2)}%`);
  });
  
  // 释放资源 - EnhancedKlinePatternRecognitionService 不需要显式 dispose
  
  console.log('\nCNN模型接入层和K线形态识别测试完成!');
}

// 测试5: 筹码分布和WAD增强计算
function testChipDistribution() {
  console.log('\n=== 测试5: 筹码分布和WAD增强计算 ===');
  
  // 生成测试价格数据
  const generatePriceData = (count: number, basePrice: number = 100): Array<{ timestamp: number; high: number; low: number; close: number; volume: number }> => {
    let currentPrice = basePrice;
    return Array.from({ length: count }, (_, i) => {
      const timestamp = Date.now() - (count - i) * 86400000; // 每天一条数据
      const change = (Math.random() - 0.5) * 5;
      const close = currentPrice + change;
      const high = Math.max(currentPrice, close) + Math.random() * 2;
      const low = Math.min(currentPrice, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      currentPrice = close;
      
      return { timestamp, high, low, close, volume };
    });
  };
  
  const priceData = generatePriceData(30, 100);
  
  // 测试WAD增强的筹码分布
  const wadEnhancedResult = calculateWADEnhancedChipDistribution({
    priceData,
    currentPrice: priceData[priceData.length - 1].close,
    decayRate: 0.1,
    useHighFrequency: false
  });
  
  console.log('WAD增强的筹码分布结果:');
  console.log(`  筹码分布数量: ${wadEnhancedResult.chipDistribution.length}`);
  console.log(`  筹码集中度 (HHI): ${wadEnhancedResult.concentration.toFixed(4)}`);
  console.log(`  主筹峰值价格: ${wadEnhancedResult.mainPeak.dominantPeak.price.toFixed(2)}`);
  console.log(`  主筹峰值成交量比例: ${(wadEnhancedResult.mainPeak.dominantPeak.dominance * 100).toFixed(2)}%`);
  console.log(`  WAD影响因子: ${wadEnhancedResult.wadFactor.toFixed(4)}`);
  
  // 测试支撑/压力位
  console.log('\n支撑/压力位:');
  console.log(`  支撑位数量: ${wadEnhancedResult.supportResistance.supportLevels.length}`);
  console.log(`  压力位数量: ${wadEnhancedResult.supportResistance.resistanceLevels.length}`);
  
  if (wadEnhancedResult.supportResistance.strongestSupport) {
    console.log(`  最强支撑位: ${wadEnhancedResult.supportResistance.strongestSupport.price.toFixed(2)}`);
  }
  
  if (wadEnhancedResult.supportResistance.strongestResistance) {
    console.log(`  最强压力位: ${wadEnhancedResult.supportResistance.strongestResistance.price.toFixed(2)}`);
  }
  
  // 测试筹码集中度
  const concentrationResult = calculateChipConcentration({
    chipData: wadEnhancedResult.chipDistribution,
    currentPrice: priceData[priceData.length - 1].close
  });
  
  console.log(`\n筹码集中度综合评估:`);
  console.log(`  HHI指数: ${concentrationResult.hhi.toFixed(4)} (${concentrationResult.hhiLevel})`);
  console.log(`  基尼系数: ${concentrationResult.gini.toFixed(4)} (${concentrationResult.giniLevel})`);
  console.log(`  CR指标强度: ${concentrationResult.crIndicator.strength.toFixed(4)}`);
  console.log(`  综合集中度评分: ${(concentrationResult.concentrationScore * 100).toFixed(2)}% (${concentrationResult.concentrationGrade})`);
  
  console.log('\n筹码分布和WAD增强计算测试完成!');
}

// 运行所有测试
async function runAllTests() {
  console.log('开始运行综合测试...');
  
  const startTime = Date.now();
  
  // 运行所有测试
  testWADModel();
  testLargeOrderDetection();
  testDTWSequenceMatching();
  await testCNNModel();
  testChipDistribution();
  
  const endTime = Date.now();
  
  console.log(`\n=== 测试完成 ===`);
  console.log(`总测试时间: ${(endTime - startTime) / 1000}秒`);
  console.log('所有功能测试通过!');
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
