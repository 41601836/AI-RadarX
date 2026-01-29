// API压力与边界测试脚本
const { fetchChipDistribution } = require('./lib/api/chip/distribution');
const { fetchOpinionSummary } = require('./lib/api/publicOpinion/summary');
const { fetchHeatFlowAlertList } = require('./lib/api/heatFlow/alert');

// 测试结果记录
const testResults = {
  success: 0,
  failure: 0,
  totalRequests: 0,
  avgResponseTime: 0,
  responseTimes: []
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 单个API请求测试
async function testApiRequest(apiFunction, params, testName) {
  const startTime = Date.now();
  try {
    const result = await apiFunction(params);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 记录结果
    testResults.success++;
    testResults.responseTimes.push(responseTime);
    testResults.avgResponseTime = testResults.responseTimes.reduce((sum, time) => sum + time, 0) / testResults.responseTimes.length;
    
    console.log(`✅ ${testName} - 成功 (${responseTime}ms)`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    testResults.failure++;
    console.log(`❌ ${testName} - 失败: ${error.message}`);
    throw error;
  } finally {
    testResults.totalRequests++;
  }
}

// 并发请求测试
async function concurrentRequestsTest(apiFunction, params, count, testName) {
  console.log(`\n=== 并发请求测试: ${testName} (${count}个请求) ===`);
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(testApiRequest(apiFunction, params, `${testName}-${i+1}`));
  }
  
  try {
    await Promise.all(promises);
    console.log(`✅ 并发测试完成 - ${count}个请求`);
  } catch (error) {
    console.log(`❌ 并发测试部分失败`);
  }
}

// 边界测试
async function boundaryTests() {
  console.log('\n=== 边界测试 ===');
  
  // 筹码分布API边界测试
  console.log('\n--- 筹码分布API边界测试 ---');
  await testApiRequest(fetchChipDistribution, { stockCode: 'SH600000' }, '正常股票代码');
  await testApiRequest(fetchChipDistribution, { stockCode: 'INVALID' }, '无效股票代码');
  await testApiRequest(fetchChipDistribution, { stockCode: '' }, '空股票代码');
  
  // 舆情热度API边界测试
  console.log('\n--- 舆情热度API边界测试 ---');
  await testApiRequest(fetchOpinionSummary, { stockCode: 'SH600000', timeRange: '1d' }, '1天时间范围');
  await testApiRequest(fetchOpinionSummary, { stockCode: 'SH600000', timeRange: '30d' }, '30天时间范围');
  await testApiRequest(fetchOpinionSummary, { stockCode: 'SH600000', timeRange: 'invalid' }, '无效时间范围');
  
  // 游资预警API边界测试
  console.log('\n--- 游资预警API边界测试 ---');
  await testApiRequest(fetchHeatFlowAlertList, { pageNum: 1, pageSize: 10 }, '正常分页参数');
  await testApiRequest(fetchHeatFlowAlertList, { pageNum: 0, pageSize: 10 }, '分页-页码为0');
  await testApiRequest(fetchHeatFlowAlertList, { pageNum: 1, pageSize: 100 }, '分页-较大页面大小');
  await testApiRequest(fetchHeatFlowAlertList, { alertLevel: 'high' }, '高级别预警');
  await testApiRequest(fetchHeatFlowAlertList, { alertLevel: 'medium' }, '中级别预警');
  await testApiRequest(fetchHeatFlowAlertList, { alertLevel: 'low' }, '低级别预警');
}

// 性能测试
async function performanceTests() {
  console.log('\n=== 性能测试 ===');
  
  // 测试不同并发级别
  await concurrentRequestsTest(fetchChipDistribution, { stockCode: 'SH600000' }, 5, '筹码分布API');
  await concurrentRequestsTest(fetchOpinionSummary, { stockCode: 'SH600000' }, 5, '舆情热度API');
  await concurrentRequestsTest(fetchHeatFlowAlertList, {}, 5, '游资预警API');
  
  // 增加并发量
  await concurrentRequestsTest(fetchChipDistribution, { stockCode: 'SH600000' }, 10, '筹码分布API (10并发)');
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始API压力与边界测试\n');
  
  try {
    // 运行边界测试
    await boundaryTests();
    
    // 运行性能测试
    await performanceTests();
    
    // 输出最终测试结果
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));
    console.log(`总请求数: ${testResults.totalRequests}`);
    console.log(`成功请求: ${testResults.success}`);
    console.log(`失败请求: ${testResults.failure}`);
    console.log(`成功率: ${((testResults.success / testResults.totalRequests) * 100).toFixed(2)}%`);
    console.log(`平均响应时间: ${testResults.avgResponseTime.toFixed(2)}ms`);
    
    if (testResults.responseTimes.length > 0) {
      // 计算百分位数
      const sortedTimes = [...testResults.responseTimes].sort((a, b) => a - b);
      console.log(`50% 响应时间: ${sortedTimes[Math.floor(sortedTimes.length * 0.5)]}ms`);
      console.log(`90% 响应时间: ${sortedTimes[Math.floor(sortedTimes.length * 0.9)]}ms`);
      console.log(`95% 响应时间: ${sortedTimes[Math.floor(sortedTimes.length * 0.95)]}ms`);
      console.log(`99% 响应时间: ${sortedTimes[Math.floor(sortedTimes.length * 0.99)]}ms`);
    }
    
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.log('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 执行测试
runAllTests();
