// 综合测试用例：验证特大单识别和K线形态识别功能

import { 
  OrderItem, 
  FlinkStyleOrderStreamProcessor, 
  EnhancedRealTimeLargeOrderProcessor, 
  calculateEfficientDynamicThreshold, 
  identifySingleLargeOrder, 
  WindowConfig, 
  WindowType
} from './largeOrder';
import { 
  recognizeEnhancedKlinePatterns, 
  EnhancedKlinePatternRecognitionService, 
  calculateMA, 
  calculateMACD, 
  calculateRSI 
} from './technicalIndicators';
import { calculateDTW } from './technicalIndicators';
import { calculateWADEnhancedChipDistribution } from './wad';
import { ChipDistributionItem, identifyChipPeaks } from './chipDistribution';

// 生成模拟订单数据
function generateMockOrders(count: number, baseAmount: number = 1000000, volatility: number = 0.5): OrderItem[] {
  const orders: OrderItem[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    // 生成随机订单金额，包含一些特大单
    const isLargeOrder = Math.random() < 0.05; // 5%的概率是大单
    const amountMultiplier = isLargeOrder ? Math.random() * 10 + 5 : Math.random() * 2;
    const tradeAmount = Math.round(baseAmount * amountMultiplier);
    
    orders.push({
      tradeTime: new Date(now.getTime() - i * 1000).toISOString(),
      tradePrice: Math.round((100 + Math.random() * 20) * 100) / 100, // 价格在100-120之间
      tradeVolume: Math.round(tradeAmount / (100 + Math.random() * 20)),
      tradeAmount,
      tradeDirection: Math.random() > 0.5 ? 'buy' : 'sell',
      orderType: Math.random() > 0.7 ? 'market' : Math.random() > 0.5 ? 'limit' : 'iceberg'
    });
  }
  
  return orders;
}

// 生成模拟K线数据
function generateMockKlineData(count: number, basePrice: number = 100, volatility: number = 0.02): Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> {
  const klines = [];
  let currentPrice = basePrice;
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const timestamp = now - i * 60000; // 每分钟一个数据点，从当前时间往前推
    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility * basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;
    const volume = Math.round((Math.random() * 1000000 + 500000) * (1 + Math.abs(change) / basePrice));
    
    klines.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }
  
  return klines;
}

// 生成模拟筹码分布数据
function generateMockChipData(priceRange: [number, number] = [90, 130], count: number = 20): ChipDistributionItem[] {
  const chipData: ChipDistributionItem[] = [];
  const [minPrice, maxPrice] = priceRange;
  const priceStep = (maxPrice - minPrice) / count;
  
  // 创建筹码分布，包含几个主要峰值
  for (let i = 0; i < count; i++) {
    const price = minPrice + i * priceStep;
    
    // 创建几个峰值
    let volume = 0;
    if (price > 95 && price < 105) {
      // 第一个峰值区域
      volume = Math.round((1 - Math.abs(price - 100) / 10) * 1000000);
    } else if (price > 110 && price < 120) {
      // 第二个峰值区域
      volume = Math.round((1 - Math.abs(price - 115) / 15) * 800000);
    } else {
      // 其他区域
      volume = Math.round((Math.random() * 300000 + 100000) * (1 + Math.abs(price - 100) / 50));
    }
    
    chipData.push({
      price,
      volume,
      percentage: 0 // 将在calculateWAD中计算
    });
  }
  
  return chipData;
}

// 性能测试函数
async function runPerformanceTest<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const endTime = performance.now();
    console.log(`${name} - 执行时间: ${endTime - startTime}ms`);
    return result;
  } catch (error) {
    const endTime = performance.now();
    console.error(`${name} - 执行时间: ${endTime - startTime}ms - 错误:`, error);
    throw error;
  }
}

// 测试套件
class ComprehensiveTestSuite {
  // 测试特大单识别功能
  async testLargeOrderRecognition() {
    return runPerformanceTest('特大单识别功能测试', async () => {
      console.log('=== 特大单识别功能测试 ===');
      
      // 生成模拟订单数据
      const orders = generateMockOrders(1000);
      console.log(`生成了 ${orders.length} 条模拟订单数据`);
      
      // 测试高效动态阈值计算
      const threshold = calculateEfficientDynamicThreshold(orders, 2, true, 60000, true, true);
      console.log('高效动态阈值计算结果:', {
        mean: threshold.mean,
        std: threshold.std,
        threshold: threshold.threshold,
        n: threshold.n,
        orderCount: threshold.orderCount
      });
      
      // 测试单个特大单识别
      const largeOrder = orders.find(order => order.tradeAmount > threshold.threshold) || orders[0];
      const largeOrderResult = identifySingleLargeOrder(largeOrder, threshold, {
        currentPrice: largeOrder.tradePrice,
        priceLevel: 'resistance',
        marketTrend: 'up'
      });
      console.log('单个特大单识别结果:', {
        isLargeOrder: largeOrderResult.isLargeOrder,
        isExtraLargeOrder: largeOrderResult.isExtraLargeOrder,
        sizeLevel: largeOrderResult.sizeLevel,
        amountRatio: largeOrderResult.amountRatio,
        thresholdRatio: largeOrderResult.thresholdRatio,
        importanceScore: largeOrderResult.importanceScore
      });
      
      // 测试Flink风格订单流处理器
    const windowConfigs: WindowConfig[] = [
      { type: 'tumbling' as WindowType, size: 5000 }, // 5秒滚动窗口
      { type: 'sliding' as WindowType, size: 10000, slide: 2000 }, // 10秒滑动窗口，2秒滑动步长
      { type: 'count' as WindowType, size: 100 } // 100个订单的计数窗口
    ];
    
    const flinkProcessor = new FlinkStyleOrderStreamProcessor(windowConfigs, {
      n: 2,
      useRobustStats: true,
      useVolumeWeight: true,
      adaptiveN: true
    });
      
      // 处理订单流
      let largeOrderCount = 0;
      let extraLargeOrderCount = 0;
      
      for (const order of orders) {
        const result = flinkProcessor.processOrder(order);
        if (result.isLargeOrder) largeOrderCount++;
        if (result.isExtraLargeOrder) extraLargeOrderCount++;
      }
      
      console.log('Flink风格订单流处理器结果:', {
        totalOrders: orders.length,
        largeOrders: largeOrderCount,
        extraLargeOrders: extraLargeOrderCount,
        activeWindows: flinkProcessor.getActiveWindows().length
      });
      
      // 测试增强的实时特大单处理器
      const enhancedProcessor = new EnhancedRealTimeLargeOrderProcessor(10000, 2);
      
      // 批量处理订单
      const batchResults = await enhancedProcessor.batchProcess(orders);
      const batchStats = enhancedProcessor.getStatistics();
      
      console.log('增强的实时特大单处理器结果:', {
        totalOrders: batchResults.length,
        largeOrders: batchStats.largeOrders,
        extraLargeOrders: batchStats.extraLargeOrders,
        totalAmount: batchStats.totalAmount,
        largeOrderRatio: batchStats.largeOrderRatio,
        netInflow: batchStats.netInflow
      });
      
      console.log('=== 特大单识别功能测试完成 ===\n');
      return null;
    });
  }
  
  // 测试K线形态识别功能
  async testKlinePatternRecognition() {
    return runPerformanceTest('K线形态识别功能测试', async () => {
      console.log('=== K线形态识别功能测试 ===');
      
      // 生成模拟K线数据
      const klineData = generateMockKlineData(100);
      console.log(`生成了 ${klineData.length} 条模拟K线数据`);
      
      // 测试传统K线形态识别
      const high = klineData.map(d => d.high);
      const low = klineData.map(d => d.low);
      const close = klineData.map(d => d.close);
      const open = klineData.map(d => d.open);
      
      const patterns = recognizeEnhancedKlinePatterns({
        high,
        low,
        close,
        open,
        useCNN: false,
        useTA: true,
        confidenceThreshold: 0.5
      });
      
      console.log('传统K线形态识别结果:', {
        totalPatterns: patterns.length,
        patternNames: patterns.map(p => p.name).join(', ')
      });
      
      // 测试增强的K线形态识别服务（包含CNN模型）
      const patternService = new EnhancedKlinePatternRecognitionService(true, true);
      await patternService.initialize();
      
      const enhancedPatterns = await patternService.recognizePatterns(klineData);
      console.log('增强的K线形态识别服务结果:', {
        totalPatterns: enhancedPatterns.length,
        patternNames: enhancedPatterns.map(p => p.name).join(', '),
        supportedPatterns: patternService.getSupportedPatterns().length
      });
      
      // 测试技术指标计算
    const ma = calculateMA({ data: close, period: 20 });
    const macd = calculateMACD({ data: close });
    const rsi = calculateRSI({ data: close, period: 14 });
    
    console.log('技术指标计算结果:', {
      maLastValue: ma[ma.length - 1].toFixed(2),
      macdLastValue: macd.macd[macd.macd.length - 1].toFixed(2),
      rsiLastValue: rsi[rsi.length - 1].toFixed(2)
    });
      
      // 测试DTW计算
      const sequence1 = close.slice(0, 20);
      const sequence2 = close.slice(10, 30);
      const dtwDistance = calculateDTW({ sequence1, sequence2 });
      
      console.log('DTW计算结果:', {
        sequence1Length: sequence1.length,
        sequence2Length: sequence2.length,
        dtwDistance: dtwDistance.toFixed(2)
      });
      
      console.log('=== K线形态识别功能测试完成 ===\n');
      return null;
    });
  }
  
  // 测试WAD筹码分析功能
  async testWADChipAnalysis() {
    return runPerformanceTest('WAD筹码分析功能测试', async () => {
      console.log('=== WAD筹码分析功能测试 ===');
      
      // 生成模拟筹码分布数据
      const chipData = generateMockChipData([90, 130], 20);
      console.log(`生成了 ${chipData.length} 个价格区间的筹码分布数据`);
      
      // 测试WAD计算（使用增强版筹码分布函数）
    const currentPrice = 110;
    
    // 为了测试，生成一些模拟的价格数据
    const priceData = generateMockKlineData(100);
    
    const wadResult = calculateWADEnhancedChipDistribution({
      priceData,
      currentPrice,
      decayRate: 0.1,
      useHighFrequency: false,
      priceBucketCount: 20
    });
    
    console.log('WAD增强版筹码分布计算结果:', {
      concentration: wadResult.concentration.toFixed(4),
      wadFactor: wadResult.wadFactor.toFixed(4),
      timeDecayApplied: wadResult.timeDecayApplied,
      chipDistributionCount: wadResult.chipDistribution.length,
      mainPeakPrice: wadResult.mainPeak.peakPrice.toFixed(2),
      supportLevels: wadResult.supportResistance.supportLevels.length,
      resistanceLevels: wadResult.supportResistance.resistanceLevels.length
    });
    
    // 测试筹码峰值识别
    const peaks = identifyChipPeaks(chipData, true);
    
    console.log('筹码峰值识别结果:', {
      totalPeaks: peaks.peaks.length,
      dominantPeakPrice: peaks.dominantPeak?.price.toFixed(2),
      dominantPeakVolume: peaks.dominantPeak?.volume,
      dominantPeakRatio: peaks.dominantPeak?.ratio.toFixed(2)
    });
      
      console.log('=== WAD筹码分析功能测试完成 ===\n');
      return null;
    });
  }
  
  // 性能测试：高并发数据处理
  async testHighConcurrencyPerformance() {
    return runPerformanceTest('高并发数据处理性能测试', async () => {
      console.log('=== 高并发数据处理性能测试 ===');
      
      // 生成大量模拟订单数据（Level-2数据量）
      const highFreqOrders = generateMockOrders(10000, 500000, 0.8);
      console.log(`生成了 ${highFreqOrders.length} 条高频模拟订单数据`);
      
      // 测试增强的实时特大单处理器的性能
      const processor = new EnhancedRealTimeLargeOrderProcessor(50000, 2);
      
      const startTime = performance.now();
      
      // 处理高频订单流
      for (let i = 0; i < highFreqOrders.length; i++) {
        const result = processor.processOrder(highFreqOrders[i]);
        
        // 每处理1000个订单输出一次进度
        if (i % 1000 === 0) {
          const currentTime = performance.now();
          const processed = i + 1;
          const elapsed = currentTime - startTime;
          const throughput = processed / (elapsed / 1000); // 订单/秒
          console.log(`处理进度: ${processed}/${highFreqOrders.length} - 吞吐量: ${throughput.toFixed(2)} 订单/秒`);
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageLatency = totalTime / highFreqOrders.length;
      
      console.log('高并发性能测试结果:', {
        totalOrders: highFreqOrders.length,
        totalTime: totalTime.toFixed(2) + 'ms',
        averageLatency: averageLatency.toFixed(4) + 'ms/订单',
        throughput: (highFreqOrders.length / (totalTime / 1000)).toFixed(2) + ' 订单/秒'
      });
      
      // 检查是否满足延迟要求
      const realTimeThreshold = 0.3; // 300ms
      const nonRealTimeThreshold = 1.0; // 1000ms
      
      if (averageLatency <= realTimeThreshold) {
        console.log('✅ 满足实时接口延迟要求 (<= 300ms)');
      } else if (averageLatency <= nonRealTimeThreshold) {
        console.log('✅ 满足非实时接口延迟要求 (<= 1000ms)');
      } else {
        console.log('⚠️  不满足延迟要求 (> 1000ms)');
      }
      
      console.log('=== 高并发数据处理性能测试完成 ===\n');
      return null;
    });
  }
  
  // 运行所有测试
  async runAllTests() {
    console.log('开始运行综合测试套件...\n');
    
    try {
      await this.testLargeOrderRecognition();
      await this.testKlinePatternRecognition();
      await this.testWADChipAnalysis();
      await this.testHighConcurrencyPerformance();
      
      console.log('🎉 所有测试通过！');
    } catch (error) {
      console.error('❌ 测试失败:', error);
      throw error;
    }
  }
}

// 执行测试
const testSuite = new ComprehensiveTestSuite();
testSuite.runAllTests().catch(console.error);
