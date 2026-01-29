// 大单异动检测阈值计算测试
import { calculateEnhancedDynamicThreshold, calculateEfficientDynamicThreshold, OrderItem } from './lib/algorithms/largeOrder';

// 生成测试订单数据
function generateTestOrders(count: number, baseAmount: number = 100000, volatility: number = 0.2): OrderItem[] {
  const orders: OrderItem[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    // 生成随机订单金额，大部分符合正态分布，偶尔有大单
    let amount: number;
    if (Math.random() < 0.05) {
      // 5%的概率生成大单（3-5倍标准差）
      amount = baseAmount * (3 + Math.random() * 2);
    } else {
      // 95%的概率生成正常订单（符合正态分布）
      const z = Math.random() * 2 - 1; // 标准正态分布
      amount = Math.max(100, baseAmount * (1 + z * volatility));
    }
    
    orders.push({
      tradeTime: now.toISOString(),
      tradePrice: 100 + Math.random() * 10,
      tradeVolume: amount / 100,
      tradeAmount: amount,
      tradeDirection: Math.random() > 0.5 ? 'buy' : 'sell',
      orderType: Math.random() > 0.7 ? 'market' : 'limit'
    });
  }
  
  return orders;
}

// 测试动态阈值计算
function testDynamicThresholdCalculation() {
  console.log('=== 测试动态阈值计算 ===');
  
  const orders = generateTestOrders(10000, 100000, 0.3);
  
  // 测试增强版动态阈值计算
  const enhancedStart = performance.now();
  const enhancedThreshold = calculateEnhancedDynamicThreshold(orders, 2);
  const enhancedEnd = performance.now();
  
  console.log('增强版动态阈值计算结果:');
  console.log(`均值: ${enhancedThreshold.mean.toFixed(2)}`);
  console.log(`标准差: ${enhancedThreshold.std.toFixed(2)}`);
  console.log(`阈值 (均值 + 2倍标准差): ${enhancedThreshold.threshold.toFixed(2)}`);
  console.log(`超大型订单阈值 (均值 + 3倍标准差): ${enhancedThreshold.upperThreshold.toFixed(2)}`);
  console.log(`中位数: ${enhancedThreshold.median.toFixed(2)}`);
  console.log(`众数: ${enhancedThreshold.mode.toFixed(2)}`);
  console.log(`第一四分位数: ${enhancedThreshold.q1.toFixed(2)}`);
  console.log(`第三四分位数: ${enhancedThreshold.q3.toFixed(2)}`);
  console.log(`四分位距: ${enhancedThreshold.iqr.toFixed(2)}`);
  console.log(`异常值数量: ${enhancedThreshold.outlierCount}`);
  console.log(`计算耗时: ${enhancedEnd - enhancedStart}ms`);
  
  // 测试高效版动态阈值计算
  const efficientStart = performance.now();
  const efficientThreshold = calculateEfficientDynamicThreshold(orders, 2, true, 60000);
  const efficientEnd = performance.now();
  
  console.log('\n高效版动态阈值计算结果:');
  console.log(`均值: ${efficientThreshold.mean.toFixed(2)}`);
  console.log(`标准差: ${efficientThreshold.std.toFixed(2)}`);
  console.log(`阈值 (均值 + 2倍标准差): ${efficientThreshold.threshold.toFixed(2)}`);
  console.log(`超大型订单阈值 (均值 + 3倍标准差): ${efficientThreshold.upperThreshold.toFixed(2)}`);
  console.log(`计算耗时: ${efficientEnd - efficientStart}ms`);
  console.log(`性能提升: ${(enhancedEnd - enhancedStart) / (efficientEnd - efficientStart)}x`);
  
  // 验证阈值的有效性
  const largeOrders = orders.filter(order => order.tradeAmount > enhancedThreshold.threshold);
  const extraLargeOrders = orders.filter(order => order.tradeAmount > enhancedThreshold.upperThreshold);
  
  console.log('\n阈值有效性验证:');
  console.log(`总订单数: ${orders.length}`);
  console.log(`大单数量: ${largeOrders.length} (占比: ${(largeOrders.length / orders.length * 100).toFixed(2)}%)`);
  console.log(`超大型订单数量: ${extraLargeOrders.length} (占比: ${(extraLargeOrders.length / orders.length * 100).toFixed(2)}%)`);
}

// 测试大单识别性能
function testLargeOrderIdentification() {
  console.log('\n=== 测试大单识别性能 ===');
  
  const orders = generateTestOrders(10000, 100000, 0.3);
  const threshold = calculateEfficientDynamicThreshold(orders, 2, true, 60000);
  
  const start = performance.now();
  for (const order of orders) {
    // 这里可以添加大单识别逻辑
    const isLargeOrder = order.tradeAmount > threshold.threshold;
    const isExtraLargeOrder = order.tradeAmount > threshold.upperThreshold;
  }
  const end = performance.now();
  
  console.log(`识别10000个订单耗时: ${end - start}ms`);
  console.log(`每个订单平均耗时: ${(end - start) / 10000 * 1000}μs`);
}

// 运行测试
testDynamicThresholdCalculation();
testLargeOrderIdentification();
