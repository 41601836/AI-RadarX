// 高并发runConsensus负载测试脚本
import useStrategyStore from './lib/store/useStrategyStore.ts';

// 测试配置
const CONFIG = {
  STOCK_COUNT: 100, // 并发股票数量
  TEST_DURATION: 60000, // 测试持续时间（毫秒）
  CONCURRENT_REQUESTS: 20, // 最大并发请求数
};

// 测试结果记录
interface TestResult {
  success: number;
  failure: number;
  totalRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
  startTimestamp: number;
  endTimestamp: number;
}

// 初始化测试结果
const testResults: TestResult = {
  success: 0,
  failure: 0,
  totalRequests: 0,
  avgResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  responseTimes: [],
  startTimestamp: Date.now(),
  endTimestamp: 0,
};

// 模拟股票代码生成
function generateStockCode(index: number): string {
  // 生成模拟股票代码，如 SH600001, SH600002, SH600003...
  const code = 600000 + index;
  return `SH${code}`;
}

// 并发控制队列
class ConcurrencyQueue {
  private maxConcurrent: number;
  private active: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.active++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.dequeue();
        }
      };

      if (this.active < this.maxConcurrent) {
        task();
      } else {
        this.queue.push(task);
      }
    });
  }

  private dequeue() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        task();
      }
    }
  }
}

// 单个runConsensus测试
async function testRunConsensus(stockCode: string, index: number) {
  const startTime = Date.now();
  const stockName = `股票${index}`;
  
  try {
    await useStrategyStore.getState().runConsensus(stockCode, stockName);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 更新测试结果
    testResults.success++;
    testResults.responseTimes.push(responseTime);
    testResults.minResponseTime = Math.min(testResults.minResponseTime, responseTime);
    testResults.maxResponseTime = Math.max(testResults.maxResponseTime, responseTime);
    
    console.log(`✅ ${stockCode} 成功 (${responseTime}ms)`);
  } catch (error) {
    testResults.failure++;
    console.error(`❌ ${stockCode} 失败:`, error);
  } finally {
    testResults.totalRequests++;
  }
}

// 生成测试报告
function generateTestReport() {
  testResults.endTimestamp = Date.now();
  const totalDuration = testResults.endTimestamp - testResults.startTimestamp;
  const avgResponseTime = testResults.responseTimes.length > 0 
    ? testResults.responseTimes.reduce((sum, time) => sum + time, 0) / testResults.responseTimes.length
    : 0;
  
  // 计算百分位数
  const sortedTimes = [...testResults.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 runConsensus高并发负载测试报告');
  console.log('='.repeat(60));
  
  console.log('\n1. 测试配置');
  console.log('-'.repeat(40));
  console.log(`并发股票数量: ${CONFIG.STOCK_COUNT}`);
  console.log(`测试持续时间: ${totalDuration / 1000}秒`);
  console.log(`最大并发请求数: ${CONFIG.CONCURRENT_REQUESTS}`);
  
  console.log('\n2. 测试结果');
  console.log('-'.repeat(40));
  console.log(`总请求数: ${testResults.totalRequests}`);
  console.log(`成功请求: ${testResults.success}`);
  console.log(`失败请求: ${testResults.failure}`);
  console.log(`成功率: ${((testResults.success / testResults.totalRequests) * 100).toFixed(2)}%`);
  console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${testResults.minResponseTime}ms`);
  console.log(`最大响应时间: ${testResults.maxResponseTime}ms`);
  
  console.log('\n3. 响应时间分布');
  console.log('-'.repeat(40));
  console.log(`50% 分位数: ${p50}ms`);
  console.log(`90% 分位数: ${p90}ms`);
  console.log(`95% 分位数: ${p95}ms`);
  console.log(`99% 分位数: ${p99}ms`);
  
  console.log('\n4. 性能评估');
  console.log('-'.repeat(40));
  if (avgResponseTime < 300) {
    console.log('✅ 实时接口性能优秀（平均响应时间 < 300ms）');
  } else if (avgResponseTime < 1000) {
    console.log('⚠️  实时接口性能一般（平均响应时间 300-1000ms）');
  } else {
    console.log('❌ 实时接口性能较差（平均响应时间 > 1000ms）');
  }
}

// 主测试函数
async function runLoadTest() {
  console.log('🚀 开始runConsensus高并发负载测试...');
  console.log(`配置: ${CONFIG.STOCK_COUNT}只股票，最大并发${CONFIG.CONCURRENT_REQUESTS}个请求`);
  
  // 创建并发控制队列
  const concurrencyQueue = new ConcurrencyQueue(CONFIG.CONCURRENT_REQUESTS);
  
  // 生成股票代码列表
  const stockCodes = Array.from({ length: CONFIG.STOCK_COUNT }, (_, i) => generateStockCode(i + 1));
  
  // 执行并发请求
  const promises = stockCodes.map(async (stockCode, index) => {
    return concurrencyQueue.execute(() => testRunConsensus(stockCode, index + 1));
  });
  
  try {
    // 等待所有请求完成
    await Promise.allSettled(promises);
    
    // 生成测试报告
    generateTestReport();
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    generateTestReport();
  }
}

// 执行测试
runLoadTest().catch(error => {
  console.error('测试启动失败:', error);
  process.exit(1);
});