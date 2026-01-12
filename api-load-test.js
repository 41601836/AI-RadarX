// API负载测试脚本
// 测试环境：http://localhost:3000

const axios = require('axios');
const performance = require('perf_hooks').performance;

const API_BASE_URL = 'http://localhost:3000/api/v1';

// 负载测试结果
const loadTestResults = [];

// 单个API负载测试函数
async function apiLoadTest(apiPath, concurrentUsers, testDuration, rampUpTime = 0) {
  console.log(`\n=== 负载测试: ${apiPath} (${concurrentUsers} 用户, ${testDuration}秒) ===`);
  
  const results = {
    apiPath,
    concurrentUsers,
    testDuration,
    rampUpTime,
    startTime: performance.now(),
    requests: [],
    errors: 0,
    metrics: {}
  };
  
  let activeUsers = 0;
  let completedRequests = 0;
  let requestPromises = [];
  
  // 用户请求函数
  async function userRequest() {
    const userId = activeUsers++;
    
    try {
      while (performance.now() - results.startTime < (testDuration + rampUpTime) * 1000) {
        const requestStart = performance.now();
        try {
          const response = await axios.get(`${API_BASE_URL}${apiPath}`);
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          
          results.requests.push({
            userId,
            timestamp: requestStart,
            responseTime,
            status: response.status
          });
          
          completedRequests++;
        } catch (error) {
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          
          results.requests.push({
            userId,
            timestamp: requestStart,
            responseTime,
            status: error.response ? error.response.status : 0,
            error: error.message
          });
          
          results.errors++;
          completedRequests++;
        }
        
        // 随机思考时间 (0.5-2秒)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
      }
    } catch (error) {
      console.error(`用户 ${userId} 请求错误:`, error);
    }
  }
  
  // 逐步增加用户
  if (rampUpTime > 0) {
    const usersPerSecond = concurrentUsers / rampUpTime;
    for (let i = 0; i < concurrentUsers; i++) {
      requestPromises.push(userRequest());
      await new Promise(resolve => setTimeout(resolve, 1000 / usersPerSecond));
    }
  } else {
    // 立即启动所有用户
    for (let i = 0; i < concurrentUsers; i++) {
      requestPromises.push(userRequest());
    }
  }
  
  // 等待所有测试完成
  await Promise.all(requestPromises);
  
  results.endTime = performance.now();
  results.actualDuration = (results.endTime - results.startTime) / 1000;
  
  // 计算性能指标
  if (results.requests.length > 0) {
    const responseTimes = results.requests.map(req => req.responseTime);
    
    results.metrics = {
      totalRequests: results.requests.length,
      successfulRequests: results.requests.filter(req => req.status >= 200 && req.status < 300).length,
      failedRequests: results.errors,
      requestsPerSecond: results.requests.length / results.actualDuration,
      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      percentiles: calculatePercentiles(responseTimes),
      errorRate: (results.errors / results.requests.length) * 100
    };
  }
  
  // 输出结果
  console.log(`\n=== 负载测试结果: ${apiPath} ===`);
  console.log(`并发用户数: ${concurrentUsers}`);
  console.log(`测试持续时间: ${results.actualDuration.toFixed(2)} 秒`);
  console.log(`总请求数: ${results.metrics.totalRequests}`);
  console.log(`成功请求数: ${results.metrics.successfulRequests}`);
  console.log(`失败请求数: ${results.metrics.failedRequests}`);
  console.log(`每秒请求数 (RPS): ${results.metrics.requestsPerSecond.toFixed(2)}`);
  console.log(`平均响应时间: ${results.metrics.avgResponseTime.toFixed(2)} ms`);
  console.log(`最小响应时间: ${results.metrics.minResponseTime.toFixed(2)} ms`);
  console.log(`最大响应时间: ${results.metrics.maxResponseTime.toFixed(2)} ms`);
  console.log(`错误率: ${results.metrics.errorRate.toFixed(2)}%`);
  console.log(`百分位数响应时间:`);
  console.log(`  - 50th: ${results.metrics.percentiles.p50.toFixed(2)} ms`);
  console.log(`  - 90th: ${results.metrics.percentiles.p90.toFixed(2)} ms`);
  console.log(`  - 95th: ${results.metrics.percentiles.p95.toFixed(2)} ms`);
  console.log(`  - 99th: ${results.metrics.percentiles.p99.toFixed(2)} ms`);
  
  loadTestResults.push(results);
  return results;
}

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

// 逐步增加负载测试
async function stepLoadTest(apiPath, maxUsers, stepSize, testDuration, rampUpTime) {
  console.log(`\n=== 逐步增加负载测试: ${apiPath} (最大${maxUsers}用户) ===`);
  
  for (let users = stepSize; users <= maxUsers; users += stepSize) {
    await apiLoadTest(apiPath, users, testDuration, rampUpTime);
  }
}

// 突发流量测试
async function spikeLoadTest(apiPath, baselineUsers, spikeUsers, spikeDuration, baselineDuration) {
  console.log(`\n=== 突发流量测试: ${apiPath} (基准${baselineUsers}用户, 突发${spikeUsers}用户) ===`);
  
  // 基准负载
  await apiLoadTest(apiPath, baselineUsers, baselineDuration);
  
  // 突发负载
  await apiLoadTest(apiPath, spikeUsers, spikeDuration);
  
  // 恢复到基准负载
  await apiLoadTest(apiPath, baselineUsers, baselineDuration);
}

// 持续高负载测试
async function sustainedLoadTest(apiPath, concurrentUsers, testDuration) {
  console.log(`\n=== 持续高负载测试: ${apiPath} (${concurrentUsers}用户, ${testDuration}分钟) ===`);
  
  await apiLoadTest(apiPath, concurrentUsers, testDuration * 60, 60);
}

// 执行所有负载测试
async function runAllLoadTests() {
  console.log('开始API负载测试...');
  console.log(`测试环境: ${API_BASE_URL}`);
  
  // 选择要测试的API路径
  const targetApi = '/market/sentiment';
  
  // 1. 逐步增加负载测试
  await stepLoadTest(targetApi, 100, 20, 30, 10);
  
  // 2. 突发流量测试
  await spikeLoadTest(targetApi, 20, 100, 10, 20);
  
  // 3. 持续高负载测试（可选，耗时较长）
  // await sustainedLoadTest(targetApi, 50, 5);
  
  // 输出综合报告
  console.log('\n=== 负载测试综合报告 ===');
  
  loadTestResults.forEach(result => {
    console.log(`\nAPI: ${result.apiPath}`);
    console.log(`  并发用户数: ${result.concurrentUsers}`);
    console.log(`  测试持续时间: ${result.actualDuration.toFixed(2)}秒`);
    console.log(`  每秒请求数: ${result.metrics.requestsPerSecond.toFixed(2)}`);
    console.log(`  平均响应时间: ${result.metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`  错误率: ${result.metrics.errorRate.toFixed(2)}%`);
  });
  
  // 保存结果到文件
  const fs = require('fs');
  const reportFile = 'api-load-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(loadTestResults, null, 2));
  console.log(`\n负载测试报告已保存到: ${reportFile}`);
  
  // 生成性能建议
  generatePerformanceRecommendations();
}

// 生成性能建议
function generatePerformanceRecommendations() {
  console.log('\n=== 性能建议 ===');
  
  const marketSentimentResults = loadTestResults.filter(r => r.apiPath === '/market/sentiment');
  
  if (marketSentimentResults.length > 0) {
    const highLoadResults = marketSentimentResults
      .filter(r => r.concurrentUsers >= 50)
      .sort((a, b) => b.concurrentUsers - a.concurrentUsers);
    
    if (highLoadResults.length > 0) {
      const worstResult = highLoadResults[0];
      
      if (worstResult.metrics.errorRate > 5) {
        console.log('⚠️  警告: 当并发用户数超过50时，错误率超过5%');
        console.log('   建议: 增加服务器资源或优化API响应时间');
      }
      
      if (worstResult.metrics.avgResponseTime > 1000) {
        console.log('⚠️  警告: 当并发用户数超过50时，平均响应时间超过1秒');
        console.log('   建议: 优化数据库查询或增加缓存层');
      }
      
      if (worstResult.metrics.p99 > 5000) {
        console.log('⚠️  警告: 99%的请求响应时间超过5秒');
        console.log('   建议: 识别并优化慢请求，考虑异步处理');
      }
    }
  }
  
  console.log('\n✅ 负载测试完成！');
}

// 执行测试
if (require.main === module) {
  runAllLoadTests();
}

module.exports = { runAllLoadTests, loadTestResults };
