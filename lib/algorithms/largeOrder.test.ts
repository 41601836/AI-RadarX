const largeOrderAlgorithms = require('./largeOrder');
const { OrderItem, LargeOrderResult, OrderIntentionAnalysisResult } = require('./largeOrder');

// 生成模拟订单数据
function generateMockOrders(count: number, basePrice: number = 10000, baseAmount: number = 100000): OrderItem[] {
  const orders: OrderItem[] = [];
  const now = Date.now();
  let currentPrice = basePrice;
  
  for (let i = 0; i < count; i++) {
    // 随机生成订单时间（过去1小时内）
    const tradeTime = new Date(now - Math.random() * 3600000).toISOString();
    
    // 随机生成价格变化
    const priceChange = (Math.random() - 0.5) * 100;
    currentPrice += priceChange;
    
    // 随机生成成交量
    const tradeVolume = Math.floor(Math.random() * 10000) + 100;
    
    // 随机生成成交金额
    const tradeAmount = Math.floor(currentPrice * tradeVolume);
    
    // 随机生成买卖方向
    const tradeDirection = Math.random() > 0.5 ? 'buy' : 'sell';
    
    // 偶尔生成特大单
    if (Math.random() < 0.05) { // 5%概率生成特大单
      const largeTradeVolume = Math.floor(Math.random() * 100000) + 10000;
      const largeTradeAmount = Math.floor(currentPrice * largeTradeVolume);
      
      orders.push({
        tradeTime,
        tradePrice: Math.floor(currentPrice),
        tradeVolume: largeTradeVolume,
        tradeAmount: largeTradeAmount,
        tradeDirection
      });
    } else {
      orders.push({
        tradeTime,
        tradePrice: Math.floor(currentPrice),
        tradeVolume,
        tradeAmount,
        tradeDirection
      });
    }
  }
  
  return orders;
}

// 测试动态阈值计算（波动率调整）
function testDynamicThresholdCalculation() {
  console.log('=== 测试动态阈值计算（波动率调整） ===');
  
  // 生成测试订单
  const orders = generateMockOrders(1000);
  
  // 计算带波动率调整的动态阈值
  const thresholdWithVolatility = largeOrderAlgorithms.calculateEfficientDynamicThreshold(
    orders,
    2,
    true,
    60000,
    true,
    true,
    true // 启用波动率调整
  );
  
  // 计算不带波动率调整的动态阈值
  const thresholdWithoutVolatility = largeOrderAlgorithms.calculateEfficientDynamicThreshold(
    orders,
    2,
    true,
    60000,
    true,
    true,
    false // 不启用波动率调整
  );
  
  console.log('带波动率调整的阈值:', {
    mean: thresholdWithVolatility.mean,
    std: thresholdWithVolatility.std,
    threshold: thresholdWithVolatility.threshold,
    n: thresholdWithVolatility.n,
    upperThreshold: thresholdWithVolatility.upperThreshold
  });
  
  console.log('不带波动率调整的阈值:', {
    mean: thresholdWithoutVolatility.mean,
    std: thresholdWithoutVolatility.std,
    threshold: thresholdWithoutVolatility.threshold,
    n: thresholdWithoutVolatility.n,
    upperThreshold: thresholdWithoutVolatility.upperThreshold
  });
  
  console.log('波动率调整效果:', thresholdWithVolatility.threshold < thresholdWithoutVolatility.threshold ? '降低了阈值' : '提高了阈值');
  console.log('');
}

// 测试特大单识别
function testLargeOrderIdentification() {
  console.log('=== 测试特大单识别 ===');
  
  // 生成测试订单
  const orders = generateMockOrders(100);
  
  // 计算动态阈值
  const threshold = largeOrderAlgorithms.calculateEfficientDynamicThreshold(orders, 2, true, 60000, true, true, true);
  
  // 市场上下文
  const marketContext = {
    currentPrice: orders[orders.length - 1].tradePrice,
    priceLevel: 'support',
    marketTrend: 'up',
    trendStrength: 0.7,
    trendDuration: 3600, // 1小时
    volumeTrend: 'up',
    volumeChangeRatio: 1.5,
    supportLevels: [{ price: orders[orders.length - 1].tradePrice - 50, strength: 0.8 }],
    resistanceLevels: [{ price: orders[orders.length - 1].tradePrice + 100, strength: 0.6 }]
  };
  
  // 识别特大单
  const results: LargeOrderResult[] = [];
  let largeOrderCount = 0;
  let extraLargeOrderCount = 0;
  let hugeOrderCount = 0;
  
  for (const order of orders) {
    const result = largeOrderAlgorithms.identifySingleLargeOrder(order, threshold, marketContext);
    results.push(result);
    
    if (result.isLargeOrder) largeOrderCount++;
    if (result.isExtraLargeOrder) extraLargeOrderCount++;
    if (result.isHugeOrder) hugeOrderCount++;
  }
  
  console.log('测试结果:');
  console.log(`总订单数: ${orders.length}`);
  console.log(`识别出的大单: ${largeOrderCount} (${(largeOrderCount / orders.length * 100).toFixed(2)}%)`);
  console.log(`识别出的特大单: ${extraLargeOrderCount} (${(extraLargeOrderCount / orders.length * 100).toFixed(2)}%)`);
  console.log(`识别出的超特大单: ${hugeOrderCount} (${(hugeOrderCount / orders.length * 100).toFixed(2)}%)`);
  
  // 输出前5个特大单
  const largeOrders = results.filter(r => r.isLargeOrder).slice(0, 5);
  if (largeOrders.length > 0) {
    console.log('\n前5个特大单:');
    largeOrders.forEach((result, index) => {
      console.log(`${index + 1}. 金额: ${result.order.tradeAmount}, 比例: ${result.thresholdRatio.toFixed(2)}, 大小等级: ${result.sizeLevel}`);
      console.log(`   位置因子: ${result.positionFactor?.toFixed(2)}, 趋势因子: ${result.trendFactor?.toFixed(2)}, 成交量因子: ${result.volumeFactor?.toFixed(2)}`);
    });
  }
  
  console.log('');
}

// 测试订单意图分析
function testOrderIntentionAnalysis() {
  console.log('=== 测试订单意图分析 ===');
  
  // 生成测试订单
  const orders = generateMockOrders(50);
  
  // 计算动态阈值
  const threshold = largeOrderAlgorithms.calculateEfficientDynamicThreshold(orders, 2, true, 60000, true, true, true);
  
  // 市场上下文
  const marketContext = {
    currentPrice: orders[orders.length - 1].tradePrice,
    priceLevel: 'support',
    marketTrend: 'up',
    trendStrength: 0.7,
    trendDuration: 3600, // 1小时
    volumeTrend: 'up',
    volumeChangeRatio: 1.5,
    supportLevels: [{ price: orders[orders.length - 1].tradePrice - 50, strength: 0.8 }],
    resistanceLevels: [{ price: orders[orders.length - 1].tradePrice + 100, strength: 0.6 }]
  };
  
  // 支撑位和压力位
  const supportLevels = [{ price: orders[orders.length - 1].tradePrice - 50, strength: 0.8 }];
  const resistanceLevels = [{ price: orders[orders.length - 1].tradePrice + 100, strength: 0.6 }];
  
  // 识别特大单并分析意图
  const intentionResults: OrderIntentionAnalysisResult[] = [];
  const intentionStats: { [key: string]: number } = {};
  
  for (const order of orders) {
    const largeOrderResult = largeOrderAlgorithms.identifySingleLargeOrder(order, threshold, marketContext);
    
    if (largeOrderResult.isLargeOrder) {
      const intentionResult = largeOrderAlgorithms.analyzeOrderIntention({
        largeOrderResult,
        currentPrice: marketContext.currentPrice,
        supportLevels,
        resistanceLevels,
        recentPriceTrend: 'up',
        volumeTrend: 'up',
        priceImpact: Math.random() * 5 - 2.5 // 随机价格冲击
      });
      
      intentionResults.push(intentionResult);
      
      // 更新意图统计
      intentionStats[intentionResult.intention] = (intentionStats[intentionResult.intention] || 0) + 1;
    }
  }
  
  console.log('意图分析结果统计:');
  for (const [intention, count] of Object.entries(intentionStats)) {
    console.log(`${intention}: ${count} (${(count / intentionResults.length * 100).toFixed(2)}%)`);
  }
  
  // 输出前3个意图分析结果
  if (intentionResults.length > 0) {
    console.log('\n前3个意图分析结果:');
    intentionResults.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. 意图: ${result.intention}, 置信度: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   因子: 大小=${result.factors.sizeFactor.toFixed(2)}, 价格=${result.factors.priceFactor.toFixed(2)}, 趋势=${result.factors.trendFactor.toFixed(2)}`);
      console.log(`   支撑/压力=${result.factors.supportResistanceFactor.toFixed(2)}, 位置=${result.factors.pricePositionFactor.toFixed(2)}, 综合=${result.factors.combinedFactor.toFixed(2)}`);
    });
  }
  
  console.log('');
}

// 测试性能
function testPerformance() {
  console.log('=== 测试算法性能 ===');
  
  // 生成大量订单
  const orderCounts = [1000, 10000, 50000];
  
  for (const count of orderCounts) {
    console.log(`\n测试 ${count} 个订单的性能:`);
    
    // 生成订单
    const startTime = Date.now();
    const orders = generateMockOrders(count);
    const generateTime = Date.now() - startTime;
    console.log(`生成订单时间: ${generateTime}ms`);
    
    // 计算动态阈值
    const thresholdStartTime = Date.now();
    const threshold = largeOrderAlgorithms.calculateEfficientDynamicThreshold(orders, 2, true, 60000, true, true, true);
    const thresholdTime = Date.now() - thresholdStartTime;
    console.log(`计算动态阈值时间: ${thresholdTime}ms`);
    
    // 识别特大单
    const identificationStartTime = Date.now();
    const results = orders.map(order => 
      largeOrderAlgorithms.identifySingleLargeOrder(order, threshold)
    );
    const identificationTime = Date.now() - identificationStartTime;
    console.log(`识别特大单时间: ${identificationTime}ms`);
    console.log(`平均每个订单识别时间: ${(identificationTime / count).toFixed(3)}ms`);
    
    // 分析意图（仅对特大单）
    const largeOrders = results.filter(r => r.isLargeOrder);
    if (largeOrders.length > 0) {
      const intentionStartTime = Date.now();
      const intentionResults = largeOrders.map(result => 
        largeOrderAlgorithms.analyzeOrderIntention({
          largeOrderResult: result,
          currentPrice: orders[orders.length - 1].tradePrice,
          recentPriceTrend: 'up',
          volumeTrend: 'up'
        })
      );
      const intentionTime = Date.now() - intentionStartTime;
      console.log(`分析意图时间: ${intentionTime}ms`);
      console.log(`平均每个特大单意图分析时间: ${(intentionTime / largeOrders.length).toFixed(3)}ms`);
    }
    
    // 总时间
    const totalTime = generateTime + thresholdTime + identificationTime;
    console.log(`总处理时间: ${totalTime}ms`);
    console.log(`平均每个订单总处理时间: ${(totalTime / count).toFixed(3)}ms`);
    
    // 检查性能要求（实时接口300ms以内）
    if (count <= 1000 && totalTime <= 300) {
      console.log('✓ 满足实时接口性能要求（300ms以内）');
    } else if (count > 1000 && totalTime <= 1000) {
      console.log('✓ 满足非实时接口性能要求（1000ms以内）');
    } else {
      console.log('⚠ 性能超过要求');
    }
  }
}

// 运行所有测试
function runAllTests() {
  console.log('开始测试增强版特大单识别算法\n');
  
  // 测试动态阈值计算
  testDynamicThresholdCalculation();
  
  // 测试特大单识别
  testLargeOrderIdentification();
  
  // 测试订单意图分析
  testOrderIntentionAnalysis();
  
  // 测试性能
  testPerformance();
  
  console.log('\n所有测试完成！');
}

// 执行测试
runAllTests();
