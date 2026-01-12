// API测试用例集合
// 测试环境：http://localhost:3000

const axios = require('axios');
const assert = require('assert');

const API_BASE_URL = 'http://localhost:3000/api/v1';

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
};

// 测试用例执行函数
async function runTestCase(description, testFn) {
  testResults.total++;
  try {
    await testFn();
    console.log(`✅ PASS: ${description}`);
    testResults.passed++;
    testResults.results.push({ description, status: 'PASS' });
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.results.push({ description, status: 'FAIL', error: error.message });
  }
}

// 市场情绪API测试用例
async function testMarketSentimentAPI() {
  console.log('\n=== 市场情绪API测试 (/api/v1/market/sentiment) ===');
  
  // 正面测试：正常请求
  await runTestCase('获取市场情绪综合数据 - 正常请求', async () => {
    const response = await axios.get(`${API_BASE_URL}/market/sentiment`);
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
    assert.ok(response.data.index_quotes);
    assert.ok(response.data.market_breadth);
    assert.ok(response.data.capital_flow);
    assert.ok(response.data.sentiment_score);
    assert.ok(response.data.volume_trend);
    assert.ok(response.data.north_capital_trend);
    assert.ok(response.data.update_time);
  });
  
  // 正面测试：验证响应结构
  await runTestCase('验证市场情绪响应结构的完整性', async () => {
    const response = await axios.get(`${API_BASE_URL}/market/sentiment`);
    
    // 验证指数行情结构
    response.data.index_quotes.forEach(quote => {
      assert.ok(quote.ts_code);
      assert.ok(quote.name);
      assert.ok(typeof quote.price === 'number');
      assert.ok(typeof quote.change === 'number');
      assert.ok(typeof quote.change_pct === 'number');
    });
    
    // 验证市场广度结构
    const breadth = response.data.market_breadth;
    assert.ok(typeof breadth.total === 'number');
    assert.ok(typeof breadth.up === 'number');
    assert.ok(typeof breadth.down === 'number');
    assert.ok(typeof breadth.up_ratio === 'number');
    
    // 验证情绪打分结构
    const sentiment = response.data.sentiment_score;
    assert.ok(typeof sentiment.score === 'number');
    assert.ok(['extreme_pessimistic', 'pessimistic', 'neutral', 'optimistic', 'extreme_optimistic'].includes(sentiment.level));
    assert.ok(sentiment.score >= 0 && sentiment.score <= 100);
  });
}

// 技术指标API测试用例
async function testTechIndicatorAPI() {
  console.log('\n=== 技术指标API测试 (/api/v1/tech/indicator/data) ===');
  
  // 正面测试：正常请求（带有效参数）
  await runTestCase('获取技术指标数据 - 有效股票代码', async () => {
    const response = await axios.get(`${API_BASE_URL}/tech/indicator/data`, {
      params: { stockCode: 'SH000001', cycleType: 'day', indicatorTypes: 'MA,MACD,RSI' }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
  });
  
  // 负面测试：缺少必要参数
  await runTestCase('获取技术指标数据 - 缺少stockCode参数', async () => {
    try {
      await axios.get(`${API_BASE_URL}/tech/indicator/data`, {
        params: { cycleType: 'day' }
      });
      assert.fail('Expected 400 error for missing stockCode');
    } catch (error) {
      assert.strictEqual(error.response.status, 400);
      assert.ok(error.response.data.msg.includes('stockCode'));
    }
  });
  
  // 负面测试：股票代码格式错误
  await runTestCase('获取技术指标数据 - 股票代码格式错误', async () => {
    try {
      await axios.get(`${API_BASE_URL}/tech/indicator/data`, {
        params: { stockCode: '123456', cycleType: 'day' }
      });
      assert.fail('Expected 400 error for invalid stock code format');
    } catch (error) {
      assert.strictEqual(error.response.status, 400);
      assert.ok(error.response.data.msg.includes('格式错误'));
    }
  });
  
  // 负面测试：无效的周期类型
  await runTestCase('获取技术指标数据 - 无效的周期类型', async () => {
    try {
      await axios.get(`${API_BASE_URL}/tech/indicator/data`, {
        params: { stockCode: 'SH000001', cycleType: 'invalid', indicatorTypes: 'MA' }
      });
      assert.fail('Expected 400 error for invalid cycle type');
    } catch (error) {
      assert.strictEqual(error.response.status, 400);
    }
  });
}

// 资金流向API测试用例
async function testHeatFlowAPI() {
  console.log('\n=== 资金流向API测试 (/api/v1/heat/flow/stock/seat) ===');
  
  // 正面测试：正常请求
  await runTestCase('获取资金流向数据 - 正常请求', async () => {
    const response = await axios.get(`${API_BASE_URL}/heat/flow/stock/seat`, {
      params: { stockCode: 'SH000001', date: '2023-12-20' }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
  });
  
  // 负面测试：缺少股票代码
  await runTestCase('获取资金流向数据 - 缺少股票代码', async () => {
    try {
      await axios.get(`${API_BASE_URL}/heat/flow/stock/seat`, {
        params: { date: '2023-12-20' }
      });
      assert.fail('Expected 400 error for missing stockCode');
    } catch (error) {
      assert.strictEqual(error.response.status, 400);
    }
  });
}

// 大单交易API测试用例
async function testLargeOrderAPI() {
  console.log('\n=== 大单交易API测试 (/api/v1/order/large/real-time) ===');
  
  // 正面测试：正常请求
  await runTestCase('获取实时大单交易数据 - 正常请求', async () => {
    const response = await axios.get(`${API_BASE_URL}/order/large/real-time`, {
      params: { market: 'A' }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
  });
  
  // 正面测试：带分页参数
  await runTestCase('获取实时大单交易数据 - 带分页参数', async () => {
    const response = await axios.get(`${API_BASE_URL}/order/large/real-time`, {
      params: { market: 'A', page: 1, pageSize: 20 }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
    assert.ok(response.data.items);
    assert.ok(response.data.total);
  });
}

// 舆情分析API测试用例
async function testPublicOpinionAPI() {
  console.log('\n=== 舆情分析API测试 (/api/v1/public/opinion/list) ===');
  
  // 正面测试：正常请求
  await runTestCase('获取舆情列表数据 - 正常请求', async () => {
    const response = await axios.get(`${API_BASE_URL}/public/opinion/list`, {
      params: { page: 1, pageSize: 10 }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
  });
  
  // 正面测试：带筛选参数
  await runTestCase('获取舆情列表数据 - 带情感筛选', async () => {
    const response = await axios.get(`${API_BASE_URL}/public/opinion/list`, {
      params: { page: 1, pageSize: 10, sentiment: 'positive' }
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data);
  });
}

// 执行所有测试用例
async function runAllTests() {
  console.log('开始执行API测试...');
  console.log(`测试环境: ${API_BASE_URL}`);
  
  try {
    await testMarketSentimentAPI();
    await testTechIndicatorAPI();
    await testHeatFlowAPI();
    await testLargeOrderAPI();
    await testPublicOpinionAPI();
  } catch (error) {
    console.log('测试执行过程中发生错误:', error);
  }
  
  // 输出测试结果统计
  console.log('\n=== 测试结果统计 ===');
  console.log(`总测试用例数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  // 输出详细结果
  console.log('\n=== 详细测试结果 ===');
  testResults.results.forEach(result => {
    console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.description}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return testResults;
}

// 执行测试
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testResults };
