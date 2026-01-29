const http = require('http');
const https = require('https');

// 测试配置
const config = {
  baseUrl: 'http://localhost:3002',
  endpoints: [
    '/api/v1/chip/distribution?stockCode=SH600000',
    '/api/v1/public/opinion/summary?stockCode=SH600000',
    '/api/v1/order/large/real-time?stockCode=SH600000',
    '/api/v1/tech/indicator/data?stockCode=SH600000&cycleType=day'
  ],
  testDuration: 30000, // 测试持续时间（毫秒）
  warmUpDuration: 5000, // 预热时间（毫秒）
  concurrentUsers: 10 // 并发用户数
};

// 测试结果
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  endpointResults: {}
};

// 初始化端点结果
config.endpoints.forEach(endpoint => {
  results.endpointResults[endpoint] = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: []
  };
});

// 发送HTTP请求
function sendRequest(endpoint) {
  const startTime = Date.now();
  const url = `${config.baseUrl}${endpoint}`;
  
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 更新结果
      results.totalRequests++;
      results.responseTimes.push(responseTime);
      
      // 更新端点结果
      results.endpointResults[endpoint].totalRequests++;
      results.endpointResults[endpoint].responseTimes.push(responseTime);
      
      if (res.statusCode === 200) {
        results.successfulRequests++;
        results.endpointResults[endpoint].successfulRequests++;
      } else {
        results.failedRequests++;
        results.endpointResults[endpoint].failedRequests++;
      }
      
      // 读取响应数据以完成请求
      res.resume();
      
      resolve();
    }).on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 更新结果
      results.totalRequests++;
      results.failedRequests++;
      results.responseTimes.push(responseTime);
      
      // 更新端点结果
      results.endpointResults[endpoint].totalRequests++;
      results.endpointResults[endpoint].failedRequests++;
      results.endpointResults[endpoint].responseTimes.push(responseTime);
      
      resolve();
    });
  });
}

// 运行测试
async function runTest() {
  console.log('开始API性能测试...');
  console.log(`测试配置: ${config.concurrentUsers}个并发用户，持续${config.testDuration}毫秒`);
  
  // 预热
  console.log('\n预热阶段...');
  const warmUpStartTime = Date.now();
  while (Date.now() - warmUpStartTime < config.warmUpDuration) {
    await Promise.all(
      Array.from({ length: config.concurrentUsers }, async () => {
        const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
        await sendRequest(endpoint);
      })
    );
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 重置结果
  Object.assign(results, {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: []
  });
  
  config.endpoints.forEach(endpoint => {
    Object.assign(results.endpointResults[endpoint], {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    });
  });
  
  // 正式测试
  console.log('\n正式测试阶段...');
  const testStartTime = Date.now();
  while (Date.now() - testStartTime < config.testDuration) {
    await Promise.all(
      Array.from({ length: config.concurrentUsers }, async () => {
        const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
        await sendRequest(endpoint);
      })
    );
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 计算统计信息
  const stats = calculateStats(results.responseTimes);
  const endpointStats = {};
  
  for (const [endpoint, result] of Object.entries(results.endpointResults)) {
    endpointStats[endpoint] = calculateStats(result.responseTimes);
  }
  
  // 输出结果
  console.log('\n=== 性能测试结果 ===');
  console.log(`总请求数: ${results.totalRequests}`);
  console.log(`成功请求数: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`失败请求数: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log('\n响应时间统计 (毫秒):');
  console.log(`平均值: ${stats.avg.toFixed(2)}`);
  console.log(`中位数: ${stats.median.toFixed(2)}`);
  console.log(`90th 百分位: ${stats.p90.toFixed(2)}`);
  console.log(`95th 百分位: ${stats.p95.toFixed(2)}`);
  console.log(`99th 百分位: ${stats.p99.toFixed(2)}`);
  console.log(`最小值: ${stats.min.toFixed(2)}`);
  console.log(`最大值: ${stats.max.toFixed(2)}`);
  console.log(`吞吐量: ${(results.totalRequests / (config.testDuration / 1000)).toFixed(2)} 请求/秒`);
  
  // 输出端点统计
  console.log('\n=== 端点性能统计 ===');
  for (const [endpoint, result] of Object.entries(results.endpointResults)) {
    console.log(`\n${endpoint}:`);
    console.log(`  总请求数: ${result.totalRequests}`);
    console.log(`  成功率: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  平均响应时间: ${endpointStats[endpoint].avg.toFixed(2)} 毫秒`);
    console.log(`  95th 百分位: ${endpointStats[endpoint].p95.toFixed(2)} 毫秒`);
  }
}

// 计算统计信息
function calculateStats(responseTimes) {
  if (responseTimes.length === 0) {
    return { avg: 0, median: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }
  
  responseTimes.sort((a, b) => a - b);
  
  const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const median = responseTimes[Math.floor(responseTimes.length / 2)];
  const p90 = responseTimes[Math.floor(responseTimes.length * 0.9)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
  const min = responseTimes[0];
  const max = responseTimes[responseTimes.length - 1];
  
  return { avg, median, p90, p95, p99, min, max };
}

// 运行测试
runTest().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
