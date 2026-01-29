const http = require('http');
const https = require('https');

// 负载测试配置
const config = {
  baseUrl: 'http://localhost:3002',
  endpoints: [
    '/api/v1/chip/distribution?stockCode=SH600000',
    '/api/v1/public/opinion/summary?stockCode=SH600000',
    '/api/v1/order/large/real-time?stockCode=SH600000'
  ],
  loadPhases: [
    { duration: 30000, users: 10 },  // 初始负载：10个并发用户，持续30秒
    { duration: 60000, users: 20 },  // 增加负载：20个并发用户，持续60秒
    { duration: 60000, users: 50 },  // 高负载：50个并发用户，持续60秒
    { duration: 60000, users: 100 }, // 极高负载：100个并发用户，持续60秒
    { duration: 30000, users: 0 }     // 逐渐降低负载：0个并发用户，持续30秒
  ],
  warmUpDuration: 10000 // 预热时间（毫秒）
};

// 测试结果
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  phaseResults: [],
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
      
      resolve({ status: 'success', statusCode: res.statusCode, responseTime });
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
      
      resolve({ status: 'error', statusCode: 0, responseTime });
    });
  });
}

// 运行单个负载阶段
async function runLoadPhase(phaseIndex, phase) {
  const { duration, users } = phase;
  console.log(`\n负载阶段 ${phaseIndex + 1}: ${users}个并发用户，持续${duration}毫秒`);
  
  const phaseStartTime = Date.now();
  const phaseResults = {
    phaseIndex,
    users,
    duration,
    startTime: phaseStartTime,
    endTime: phaseStartTime + duration,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    endpointResults: {}
  };
  
  // 初始化阶段端点结果
  config.endpoints.forEach(endpoint => {
    phaseResults.endpointResults[endpoint] = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };
  });
  
  // 运行负载阶段
  while (Date.now() - phaseStartTime < duration) {
    // 创建并发请求
    const requests = Array.from({ length: users }, async () => {
      const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
      const result = await sendRequest(endpoint);
      
      // 更新阶段结果
      phaseResults.totalRequests++;
      phaseResults.responseTimes.push(result.responseTime);
      
      // 更新阶段端点结果
      phaseResults.endpointResults[endpoint].totalRequests++;
      phaseResults.endpointResults[endpoint].responseTimes.push(result.responseTime);
      
      if (result.status === 'success') {
        phaseResults.successfulRequests++;
        phaseResults.endpointResults[endpoint].successfulRequests++;
      } else {
        phaseResults.failedRequests++;
        phaseResults.endpointResults[endpoint].failedRequests++;
      }
      
      return result;
    });
    
    await Promise.all(requests);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 计算阶段统计信息
  phaseResults.stats = calculateStats(phaseResults.responseTimes);
  
  // 输出阶段结果
  console.log(`阶段 ${phaseIndex + 1} 完成:`);
  console.log(`  请求总数: ${phaseResults.totalRequests}`);
  console.log(`  成功请求: ${phaseResults.successfulRequests} (${((phaseResults.successfulRequests / phaseResults.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`  失败请求: ${phaseResults.failedRequests} (${((phaseResults.failedRequests / phaseResults.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`  平均响应时间: ${phaseResults.stats.avg.toFixed(2)} 毫秒`);
  console.log(`  95th 百分位: ${phaseResults.stats.p95.toFixed(2)} 毫秒`);
  console.log(`  吞吐量: ${(phaseResults.totalRequests / (duration / 1000)).toFixed(2)} 请求/秒`);
  
  results.phaseResults.push(phaseResults);
  return phaseResults;
}

// 运行测试
async function runLoadTest() {
  console.log('开始API负载测试...');
  console.log(`测试配置: ${config.loadPhases.length}个负载阶段`);
  
  // 预热
  console.log('\n预热阶段...');
  const warmUpStartTime = Date.now();
  while (Date.now() - warmUpStartTime < config.warmUpDuration) {
    await Promise.all(
      Array.from({ length: 5 }, async () => {
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
  
  // 运行负载阶段
  for (let i = 0; i < config.loadPhases.length; i++) {
    await runLoadPhase(i, config.loadPhases[i]);
  }
  
  // 计算总体统计信息
  const overallStats = calculateStats(results.responseTimes);
  const endpointStats = {};
  
  for (const [endpoint, result] of Object.entries(results.endpointResults)) {
    endpointStats[endpoint] = calculateStats(result.responseTimes);
  }
  
  // 输出总体结果
  console.log('\n\n=== 负载测试总体结果 ===');
  console.log(`测试持续时间: ${config.loadPhases.reduce((sum, phase) => sum + phase.duration, 0)} 毫秒`);
  console.log(`总请求数: ${results.totalRequests}`);
  console.log(`成功请求数: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`失败请求数: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  
  console.log('\n总体响应时间统计 (毫秒):');
  console.log(`平均值: ${overallStats.avg.toFixed(2)}`);
  console.log(`中位数: ${overallStats.median.toFixed(2)}`);
  console.log(`90th 百分位: ${overallStats.p90.toFixed(2)}`);
  console.log(`95th 百分位: ${overallStats.p95.toFixed(2)}`);
  console.log(`99th 百分位: ${overallStats.p99.toFixed(2)}`);
  console.log(`最小值: ${overallStats.min.toFixed(2)}`);
  console.log(`最大值: ${overallStats.max.toFixed(2)}`);
  console.log(`总体吞吐量: ${(results.totalRequests / (config.loadPhases.reduce((sum, phase) => sum + phase.duration, 0) / 1000)).toFixed(2)} 请求/秒`);
  
  // 输出端点统计
  console.log('\n=== 端点负载统计 ===');
  for (const [endpoint, result] of Object.entries(results.endpointResults)) {
    console.log(`\n${endpoint}:`);
    console.log(`  总请求数: ${result.totalRequests}`);
    console.log(`  成功率: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  平均响应时间: ${endpointStats[endpoint].avg.toFixed(2)} 毫秒`);
    console.log(`  95th 百分位: ${endpointStats[endpoint].p95.toFixed(2)} 毫秒`);
    console.log(`  吞吐量: ${(result.totalRequests / (config.loadPhases.reduce((sum, phase) => sum + phase.duration, 0) / 1000)).toFixed(2)} 请求/秒`);
  }
  
  // 输出负载阶段比较
  console.log('\n\n=== 负载阶段比较 ===');
  console.log('阶段 | 用户数 | 吞吐量(请求/秒) | 平均响应时间(毫秒) | 95th百分位(毫秒) | 成功率(%)');
  console.log('-----|-------|-----------------|-------------------|------------------|----------');
  
  results.phaseResults.forEach(phase => {
    const throughput = (phase.totalRequests / (phase.duration / 1000)).toFixed(2);
    const avgResponseTime = phase.stats.avg.toFixed(2);
    const p95 = phase.stats.p95.toFixed(2);
    const successRate = ((phase.successfulRequests / phase.totalRequests) * 100).toFixed(2);
    
    console.log(`${phase.phaseIndex + 1}     | ${phase.users}     | ${throughput}          | ${avgResponseTime}          | ${p95}         | ${successRate}`);
  });
  
  // 生成负载测试总结
  console.log('\n\n=== 负载测试总结 ===');
  if (results.failedRequests === 0) {
    console.log('✅ 系统在所有负载下表现稳定，无失败请求');
  } else if (results.failedRequests / results.totalRequests < 0.05) {
    console.log('⚠️  系统在高负载下表现良好，失败率低于5%');
  } else {
    console.log('❌ 系统在高负载下表现不稳定，失败率高于5%');
  }
  
  // 识别性能瓶颈
  const maxUsers = Math.max(...results.phaseResults.map(phase => phase.users));
  const maxUsersPhase = results.phaseResults.find(phase => phase.users === maxUsers);
  
  if (maxUsersPhase) {
    const maxUsersSuccessRate = (maxUsersPhase.successfulRequests / maxUsersPhase.totalRequests) * 100;
    const maxUsersAvgResponseTime = maxUsersPhase.stats.avg;
    
    console.log(`\n📊 系统在${maxUsers}个并发用户时:`);
    console.log(`   成功率: ${maxUsersSuccessRate.toFixed(2)}%`);
    console.log(`   平均响应时间: ${maxUsersAvgResponseTime.toFixed(2)} 毫秒`);
    
    if (maxUsersSuccessRate < 95) {
      console.log(`   ❌ 建议：系统在${maxUsers}个并发用户时成功率低于95%，可能存在性能瓶颈`);
    } else if (maxUsersAvgResponseTime > 200) {
      console.log(`   ⚠️  建议：系统在${maxUsers}个并发用户时响应时间较长，可能需要优化`);
    } else {
      console.log(`   ✅ 系统在${maxUsers}个并发用户时表现良好`);
    }
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

// 运行负载测试
runLoadTest().catch((error) => {
  console.error('负载测试失败:', error);
  process.exit(1);
});
