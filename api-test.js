// 简单的API测试脚本 - 用于验证后端服务是否在线
const axios = require('axios');

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试API端点列表
const apiEndpoints = [
  // 筹码分析相关
  {
    name: '筹码分布',
    path: '/chip/distribution',
    method: 'GET',
    params: { stockCode: 'SH600000' }
  },
  // 市场数据相关
  {
    name: '市场数据',
    path: '/market/data',
    method: 'GET',
    params: { stockCode: 'SH600000' }
  }
];

// 执行API测试
async function testApi() {
  console.log('=== 开始API全接口扫描 ===');
  console.log(`扫描目标: ${apiClient.defaults.baseURL}`);
  console.log(`待测试接口数: ${apiEndpoints.length}`);
  console.log('=========================');

  let isBackendOnline = true;

  // 依次测试所有API端点
  for (const endpoint of apiEndpoints) {
    console.log(`\n测试接口: ${endpoint.name} (${endpoint.path})`);
    
    try {
      const startTime = Date.now();
      
      let response;
      
      // 根据请求方法使用不同的axios方法
      switch (endpoint.method) {
        case 'GET':
          response = await apiClient.get(endpoint.path, { params: endpoint.params });
          break;
        case 'POST':
          response = await apiClient.post(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'PUT':
          response = await apiClient.put(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'DELETE':
          response = await apiClient.delete(endpoint.path, { params: endpoint.params });
          break;
        default:
          throw new Error(`不支持的请求方法: ${endpoint.method}`);
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ 成功 - 响应时间: ${responseTime}ms - 状态码: ${response.status}`);
      
      // 简单验证响应格式
      if (response.data) {
        console.log(`   响应格式: ${response.data.code ? '规范' : '不规范'}`);
        if (response.data.code === 200) {
          console.log(`   业务状态: 成功`);
        } else {
          console.log(`   业务状态: 失败 - ${response.data.msg}`);
        }
      }
    } catch (error) {
      console.log(`❌ 失败 - ${error.message}`);
      isBackendOnline = false;
      
      // 检查是否是网络错误
      if (error.code && error.code === 'ECONNREFUSED') {
        console.log('   原因: 服务器连接失败，请检查Java后端是否正在运行');
      } else if (error.response) {
        // 服务器返回了错误响应
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   错误信息: ${error.response.data?.msg || '未知错误'}`);
      }
    }
  }

  console.log('\n=== API全接口扫描完成 ===');
  
  if (isBackendOnline) {
    console.log('✅ 后端服务正常运行');
  } else {
    console.warn('⚠️ 后端服务部分或完全不可用，请检查服务器状态');
  }

  return isBackendOnline;
}

// 执行测试
testApi().then(isOnline => {
  process.exit(isOnline ? 0 : 1);
}).catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
