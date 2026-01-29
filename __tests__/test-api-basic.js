// 基础API测试脚本
const axios = require('axios');

// API基础URL
const BASE_URL = 'http://localhost:3000/api/v1';

// 测试股票代码
const TEST_STOCK_CODE = 'SH600000';

// API测试函数
async function testAPI(endpoint, params = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await axios.get(url, { params });
    
    console.log(`✅ ${endpoint} 测试通过`);
    console.log('   响应状态:', response.status);
    console.log('   响应数据:', JSON.stringify(response.data, null, 2));
    console.log('\n');
    
    return response.data;
  } catch (error) {
    console.error(`❌ ${endpoint} 测试失败`);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    } else if (error.request) {
      console.error('   请求发送失败，没有收到响应');
    } else {
      console.error('   请求配置错误:', error.message);
    }
    console.log('\n');
    
    return null;
  }
}

// 批量测试所有API
async function runAllTests() {
  console.log('=== AI炒股软件 API 基础测试 ===\n');
  
  try {
    // 测试Chip模块
    console.log('1. 测试Chip模块 - 筹码分布API');
    await testAPI('/chip/distribution', { stockCode: TEST_STOCK_CODE });
    
    console.log('2. 测试Chip模块 - 筹码趋势API');
    await testAPI('/chip/trend', { stockCode: TEST_STOCK_CODE });
    
    // 测试TechIndicator模块
    console.log('3. 测试TechIndicator模块 - 技术指标API');
    await testAPI('/tech/indicator/data', { stockCode: TEST_STOCK_CODE });
    
    // 测试LargeOrder模块
    console.log('4. 测试LargeOrder模块 - 实时大单API');
    await testAPI('/order/large/real-time', { stockCode: TEST_STOCK_CODE });
    
    console.log('5. 测试LargeOrder模块 - 大单趋势API');
    await testAPI('/order/large/trend', { stockCode: TEST_STOCK_CODE });
    
    // 测试PublicOpinion模块
    console.log('6. 测试PublicOpinion模块 - 舆情列表API');
    await testAPI('/public/opinion/list', { stockCode: TEST_STOCK_CODE });
    
    console.log('7. 测试PublicOpinion模块 - 舆情摘要API');
    await testAPI('/public/opinion/summary', { stockCode: TEST_STOCK_CODE });
    
    // 测试HeatFlow模块
    console.log('8. 测试HeatFlow模块 - 资金流向预警API');
    await testAPI('/heat/flow/alert/list', { stockCode: TEST_STOCK_CODE });
    
    console.log('9. 测试HeatFlow模块 - 股票席位API');
    await testAPI('/heat/flow/stock/seat', { stockCode: TEST_STOCK_CODE });
    
    // 测试Risk模块
    console.log('10. 测试Risk模块 - 账户风险评估API');
    await testAPI('/risk/account/assessment');
    
    console.log('11. 测试Risk模块 - 止损规则配置API');
    await testAPI('/risk/stop/rule/config');
    
    console.log('=== 所有API测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
runAllTests();
