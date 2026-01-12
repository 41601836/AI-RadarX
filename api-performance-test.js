// API性能基准测试脚本
// 测试环境：http://localhost:3000

const axios = require('axios');
const performance = require('perf_hooks').performance;

const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_RUNS = 100; // 每个API测试运行次数

// 性能测试结果
const performanceResults = {};

// 计算百分位数
function calculatePercentiles(times, percentiles = [50, 90, 95, 99]) {
  const sorted = [...times].sort((a, b) => a - b);
  const result = {};
  
  percentiles.forEach(p => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    result[`p${p}`] = sorted[index];
  });
  
  return result;
}

// 单个API性能测试函数
async function testApiPerformance(apiPath, params = {}) {
  console.log(`\n=== 性能测试: ${apiPath} ===`);
  
  const responseTimes = [];
  let errors = 0;
  
  // 预热请求
  await axios.get(`${API_BASE_URL}${apiPath}`, { params }).catch(() => {});
  
  // 执行测试
  for (let i = 0; i < TEST_RUNS; i++) {
    const startTime = performance.now();
    try {
      await axios.get(`${API_BASE_URL}${apiPath}`, { params });
      const endTime = performance.now();
      responseTimes.push(endTime - startTime);
    } catch (error) {
      errors++;
    }
    
    // 每10次请求输出进度
    if ((i + 1) % 10 === 0) {
      console.log(`  已完成 ${i + 1}/${TEST_RUNS} 次请求`);
    }
  }
  
  // 计算统计数据
  let avgTime = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;
  let percentiles = {};
  
  if (responseTimes.length > 0) {
    const totalTime = responseTimes.reduce((sum, time) => sum + time, 0);
    avgTime = totalTime / responseTimes.length;
    minTime = Math.min(...responseTimes);
    maxTime = Math.max(...responseTimes);
    percentiles = calculatePercentiles(responseTimes);
  }
  
  // 输出结果
  console.log(`\n=== 性能测试结果: ${apiPath} ===`);
  console.log(`测试请求数: ${TEST_RUNS}`);
  console.log(`成功请求数: ${responseTimes.length}`);
  console.log(`失败请求数: ${errors}`);
  
  if (responseTimes.length > 0) {
    console.log(`平均响应时间: ${avgTime.toFixed(2)} ms`);
    console.log(`最小响应时间: ${minTime.toFixed(2)} ms`);
    console.log(`最大响应时间: ${maxTime.toFixed(2)} ms`);
    console.log(`百分位数响应时间:`);
    console.log(`  - 50th: ${percentiles.p50.toFixed(2)} ms`);
    console.log(`  - 90th: ${percentiles.p90.toFixed(2)} ms`);
    console.log(`  - 95th: ${percentiles.p95.toFixed(2)} ms`);
    console.log(`  - 99th: ${percentiles.p99.toFixed(2)} ms`);
  } else {
    console.log(`所有请求均失败，无法计算性能指标`);
  }
  
  // 保存结果
  performanceResults[apiPath] = {
    testRuns: TEST_RUNS,
    successfulRequests: responseTimes.length,
    failedRequests: errors,
    averageTime: avgTime,
    minTime,
    maxTime,
    percentiles
  };
}

// 并发性能测试
async function testConcurrentPerformance(apiPath, concurrentUsers, testDuration = 30) {
  console.log(`\n=== 并发性能测试: ${apiPath} (${concurrentUsers} 用户) ===`);
  
  const responseTimes = [];
  let completedRequests = 0;
  let startTime = performance.now();
  
  // 并发请求函数
  async function concurrentRequest() {
    while (performance.now() - startTime < testDuration * 1000) {
      const reqStartTime = performance.now();
      try {
        await axios.get(`${API_BASE_URL}${apiPath}`);
        const reqEndTime = performance.now();
        responseTimes.push(reqEndTime - reqStartTime);
        completedRequests++;
      } catch (error) {
        completedRequests++;
      }
    }
  }
  
  // 启动并发请求
  const requests = [];
  for (let i = 0; i < concurrentUsers; i++) {
    requests.push(concurrentRequest());
  }
  
  // 等待测试完成
  await Promise.all(requests);
  
  // 计算结果
  const totalRequests = completedRequests;
  const totalTime = performance.now() - startTime;
  const requestsPerSecond = (totalRequests / (totalTime / 1000)).toFixed(2);
  const avgResponseTime = responseTimes.length > 0 
    ? (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(2)
    : 0;
  
  console.log(`测试持续时间: ${(totalTime / 1000).toFixed(2)} 秒`);
  console.log(`完成请求数: ${totalRequests}`);
  console.log(`每秒请求数 (RPS): ${requestsPerSecond}`);
  console.log(`平均响应时间: ${avgResponseTime} ms`);
  
  if (!performanceResults[apiPath].concurrent) {
    performanceResults[apiPath].concurrent = [];
  }
  
  performanceResults[apiPath].concurrent.push({
    concurrentUsers,
    testDuration,
    totalRequests,
    requestsPerSecond,
    avgResponseTime
  });
}

// 执行所有性能测试
async function runAllPerformanceTests() {
  console.log('开始API性能基准测试...');
  console.log(`测试环境: ${API_BASE_URL}`);
  console.log(`每个API测试运行次数: ${TEST_RUNS}`);
  
  // 测试各个API端点
  await testApiPerformance('/market/sentiment');
  await testApiPerformance('/tech/indicator/data', { stockCode: 'SH000001', cycleType: 'day', indicatorTypes: 'MA,MACD,RSI' });
  await testApiPerformance('/heat/flow/stock/seat', { stockCode: 'SH000001', date: '2023-12-20' });
  await testApiPerformance('/order/large/real-time', { market: 'A', page: 1, pageSize: 20 });
  await testApiPerformance('/public/opinion/list', { page: 1, pageSize: 10 });
  
  // 执行并发性能测试
  console.log('\n=== 并发性能测试 ===');
  const concurrentUsers = [5, 10, 20, 50];
  for (const users of concurrentUsers) {
    await testConcurrentPerformance('/market/sentiment', users, 30);
  }
  
  // 输出综合报告
  console.log('\n=== 性能测试综合报告 ===');
  Object.keys(performanceResults).forEach(apiPath => {
    const result = performanceResults[apiPath];
    console.log(`\nAPI: ${apiPath}`);
    console.log(`  成功请求数: ${result.successfulRequests}`);
    console.log(`  失败请求数: ${result.failedRequests}`);
    
    if (result.successfulRequests > 0) {
      console.log(`  平均响应时间: ${result.averageTime.toFixed(2)} ms`);
      console.log(`  最小响应时间: ${result.minTime.toFixed(2)} ms`);
      console.log(`  最大响应时间: ${result.maxTime.toFixed(2)} ms`);
      
      if (result.percentiles.p50 !== undefined) {
        console.log(`  50th 百分位数: ${result.percentiles.p50.toFixed(2)} ms`);
      }
      if (result.percentiles.p95 !== undefined) {
        console.log(`  95th 百分位数: ${result.percentiles.p95.toFixed(2)} ms`);
      }
      if (result.percentiles.p99 !== undefined) {
        console.log(`  99th 百分位数: ${result.percentiles.p99.toFixed(2)} ms`);
      }
    } else {
      console.log(`  所有请求均失败，无法计算性能指标`);
    }
    
    if (result.concurrent) {
      console.log('  并发测试结果:');
      result.concurrent.forEach(concurrentResult => {
        console.log(`    ${concurrentResult.concurrentUsers} 用户: ${concurrentResult.requestsPerSecond} RPS, ${concurrentResult.avgResponseTime} ms`);
      });
    }
  });
  
  // 保存测试结果到文件
  const fs = require('fs');
  const reportFile = 'api-performance-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(performanceResults, null, 2));
  console.log(`\n性能测试报告已保存到: ${reportFile}`);
}

// 执行测试
if (require.main === module) {
  runAllPerformanceTests();
}

module.exports = { runAllPerformanceTests, performanceResults };
