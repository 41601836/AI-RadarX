// 分析和显示13条浏览器控制台日志
console.log('=== 分析13条浏览器控制台日志 ===');

const logs = [
  { type: 'exception', message: 'setSearchLoading is not defined' },
  { type: 'error', message: 'Access to fetch blocked by CORS policy' },
  { type: 'error', message: 'Failed to load resource: net::ERR_FAILED' },
  { type: 'error', message: 'Error fetching stock basic list: ApiError' },
  { type: 'error', message: 'Error loading stock data: ApiError' },
  { type: 'error', message: 'Access to fetch blocked by CORS policy (duplicate)' },
  { type: 'error', message: 'Failed to load resource: net::ERR_FAILED (duplicate)' },
  { type: 'error', message: 'Error fetching stock basic list: ApiError (duplicate)' },
  { type: 'error', message: 'Error loading stock data: ApiError (duplicate)' },
  { type: 'warning', message: 'Module not found: Can\'t resolve \'talib\'' },
  { type: 'warning', message: 'Module not found: Can\'t resolve \'talib\' (duplicate)' },
  { type: 'error', message: 'Failed to load resource: 500 Internal Server Error' },
  { type: 'error', message: 'Cannot update a component while rendering a different component' }
];

console.log(`\n总共有 ${logs.length} 条日志:`);
console.log('-----------------------------------------');
console.log('序号 | 类型 | 消息');
console.log('-----------------------------------------');

for (let i = 0; i < logs.length; i++) {
  const log = logs[i];
  console.log(`${i+1}.  | ${log.type} | ${log.message}`);
}

console.log('\n=== 日志分析总结 ===');
console.log('1. 主要问题是CORS跨域限制');
console.log('2. 缺少talib模块依赖');
console.log('3. React组件渲染问题');
console.log('4. API服务连接失败');
console.log('5. 函数未定义错误');
