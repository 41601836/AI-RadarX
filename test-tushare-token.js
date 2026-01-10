// 测试 Tushare API 密钥的有效性
const fetch = require('node-fetch');

// 配置
const TUSHARE_BASE_URL = 'http://api.tushare.pro';
const TUSHARE_TOKEN = 'f9b8c49d3923d62bb18f643e99711a98a938e7216962b8c58be2039f';

// 测试函数
async function testTushareToken() {
  console.log('Testing Tushare API token...');
  console.log(`Token: ${TUSHARE_TOKEN}`);
  
  try {
    // 发送测试请求
    const response = await fetch(TUSHARE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_name: 'stock_basic',
        token: TUSHARE_TOKEN,
        params: { ts_code: '600000.SH' },
        fields: 'ts_code,name',
      }),
    });
    
    // 解析响应
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // 检查结果
    if (result.code === 0 && result.data) {
      console.log('✅ Tushare API token is valid!');
    } else {
      console.log('❌ Tushare API token is invalid!');
      console.log('Error message:', result.msg);
    }
  } catch (error) {
    console.error('❌ Error testing Tushare API token:', error.message);
  }
}

// 运行测试
testTushareToken();
