// AI推理API测试脚本
const axios = require('axios');

// 测试股票代码
const stockCode = 'SH600000';

async function testAIInference() {
  try {
    console.log('正在测试AI推理API...');
    console.log(`测试股票代码: ${stockCode}`);
    
    // 调用AI智能分析API
    const response = await axios.get(`http://localhost:3000/api/ai-inference/smart-analysis?stockCode=${stockCode}`);
    
    console.log('\n✅ API调用成功！');
    console.log(`状态码: ${response.status}`);
    console.log(`响应时间: ${response.headers['x-response-time'] || '未知'}ms`);
    
    // 打印AI分析结果
    const analysisResult = response.data.data;
    console.log('\n📊 AI分析结果:');
    console.log(`趋势研判: ${analysisResult.trendAnalysis}`);
    console.log(`主力意图: ${analysisResult.mainIntention}`);
    console.log(`操作评级: ${analysisResult.operationRating}`);
    console.log(`置信度评分: ${analysisResult.confidenceScore}%`);
    console.log('\n⚠️  风险预警:');
    analysisResult.riskWarning.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
    
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('❌ API调用失败:', error.response?.statusText || error.message);
    if (error.response?.data) {
      console.error('错误详情:', error.response.data);
    }
  }
}

// 执行测试
testAIInference();
