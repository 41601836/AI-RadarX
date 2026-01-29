// 测试Tushare API缓存机制
const { getTushareStockBasic } = require('./lib/api/common/tushare');

// 模拟Tushare API请求函数
const originalTushareRequest = require('./lib/api/common/tushare').tushareRequest;

// 记录API调用次数
let apiCallCount = 0;

// 模拟Tushare API请求
require('./lib/api/common/tushare').tushareRequest = async (apiName, params) => {
  apiCallCount++;
  console.log(`API调用次数: ${apiCallCount}`);
  console.log(`调用API: ${apiName}, 参数: ${JSON.stringify(params)}`);
  
  // 返回模拟数据
  return {
    items: [{
      ts_code: params.ts_code,
      symbol: params.ts_code.split('.')[0],
      name: '测试股票',
      area: '上海',
      industry: '金融',
      list_date: '20000101'
    }]
  };
};

async function testCache() {
  console.log('=== 测试Tushare API缓存机制 ===');
  
  // 第一次调用 - 应该调用API
  console.log('\n1. 第一次调用getTushareStockBasic("SH600000"):');
  const result1 = await getTushareStockBasic('SH600000');
  console.log('结果:', result1);
  
  // 第二次调用 - 应该使用缓存
  console.log('\n2. 第二次调用getTushareStockBasic("SH600000"):');
  const result2 = await getTushareStockBasic('SH600000');
  console.log('结果:', result2);
  
  // 调用不同股票 - 应该调用API
  console.log('\n3. 调用getTushareStockBasic("SZ000001"):');
  const result3 = await getTushareStockBasic('SZ000001');
  console.log('结果:', result3);
  
  // 再次调用不同股票 - 应该使用缓存
  console.log('\n4. 再次调用getTushareStockBasic("SZ000001"):');
  const result4 = await getTushareStockBasic('SZ000001');
  console.log('结果:', result4);
  
  console.log('\n=== 测试完成 ===');
  console.log(`总共调用API次数: ${apiCallCount} (预期: 2次)`);
  
  if (apiCallCount === 2) {
    console.log('✅ 缓存机制正常工作！');
  } else {
    console.log('❌ 缓存机制可能存在问题！');
  }
}

testCache().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
