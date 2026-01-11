// WAD模型性能测试
import { calculateDecayWeight, calculateBatchDecayWeights, calculateCumulativeWAD, WADItem, WADCalculationOptions } from './lib/algorithms/wad.ts';

// 生成测试数据
function generateTestData(count: number): WADItem[] {
  const data: WADItem[] = [];
  const now = Date.now();
  let price = 100;
  
  for (let i = 0; i < count; i++) {
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = low + Math.random() * (high - low);
    
    data.push({
      timestamp: now - i * 60000, // 每分钟一条数据
      high,
      low,
      close,
      volume: Math.random() * 1000000
    });
    
    price = close;
  }
  
  return data;
}

// 测试衰减权重计算性能
function testDecayWeightCalculation() {
  console.log('=== 测试衰减权重计算性能 ===');
  
  const now = Date.now();
  const count = 100000;
  const timestamps = Array.from({ length: count }, (_, i) => now - i * 60000);
  
  // 测试单个计算
  const singleStart = performance.now();
  for (const timestamp of timestamps) {
    calculateDecayWeight(timestamp, now, 0.1);
  }
  const singleEnd = performance.now();
  console.log(`单个计算耗时: ${singleEnd - singleStart}ms`);
  
  // 测试批量计算
  const batchStart = performance.now();
  calculateBatchDecayWeights(timestamps, now, 0.1);
  const batchEnd = performance.now();
  console.log(`批量计算耗时: ${batchEnd - batchStart}ms`);
  
  console.log(`批量计算提升倍数: ${(singleEnd - singleStart) / (batchEnd - batchStart)}x`);
}

// 测试累积WAD计算性能
function testCumulativeWADCalculation() {
  console.log('\n=== 测试累积WAD计算性能 ===');
  
  const counts = [1000, 10000, 100000];
  
  for (const count of counts) {
    const data = generateTestData(count);
    const options: WADCalculationOptions = {
      decayRate: 0.1,
      weightType: 'time',
      useExponentialDecay: true
    };
    
    const start = performance.now();
    const result = calculateCumulativeWAD(data, options);
    const end = performance.now();
    
    console.log(`数据量 ${count} 条: ${end - start}ms`);
    console.log(`平均每条数据耗时: ${(end - start) / count * 1000}μs`);
  }
}

// 运行测试
// testDecayWeightCalculation();
// testCumulativeWADCalculation();
