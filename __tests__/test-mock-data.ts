// 测试脚本：验证模拟数据函数的返回格式
import { fetchOpinionSummary } from './lib/api/publicOpinion/summary';
import { fetchOpinionList } from './lib/api/publicOpinion/list';
import { fetchHeatFlowStockSeat } from './lib/api/heatFlow/stockSeat';
import { fetchHeatFlowAlertList } from './lib/api/heatFlow/alert';

// 测试舆情汇总API
const testOpinionSummary = async () => {
  console.log('=== 测试舆情汇总API ===');
  try {
    const result = await fetchOpinionSummary({ stockCode: 'SH600000', timeRange: '7d' });
    console.log('返回格式:', JSON.stringify(result, null, 2));
    console.log('测试成功!');
  } catch (error) {
    console.error('测试失败:', error);
  }
};

// 测试舆情详情列表API
const testOpinionList = async () => {
  console.log('\n=== 测试舆情详情列表API ===');
  try {
    const result = await fetchOpinionList({ stockCode: 'SH600000', pageNum: 1, pageSize: 10 });
    console.log('返回格式:', JSON.stringify(result, null, 2));
    console.log('测试成功!');
  } catch (error) {
    console.error('测试失败:', error);
  }
};

// 测试股票游资席位API
const testHeatFlowStockSeat = async () => {
  console.log('\n=== 测试股票游资席位API ===');
  try {
    const result = await fetchHeatFlowStockSeat({ stockCode: 'SH600000' });
    console.log('返回格式:', JSON.stringify(result, null, 2));
    console.log('测试成功!');
  } catch (error) {
    console.error('测试失败:', error);
  }
};

// 测试游资行为预警API
const testHeatFlowAlertList = async () => {
  console.log('\n=== 测试游资行为预警API ===');
  try {
    const result = await fetchHeatFlowAlertList({ pageNum: 1, pageSize: 10 });
    console.log('返回格式:', JSON.stringify(result, null, 2));
    console.log('测试成功!');
  } catch (error) {
    console.error('测试失败:', error);
  }
};

// 运行所有测试
const runAllTests = async () => {
  console.log('开始测试所有模拟数据API...\n');
  
  await testOpinionSummary();
  await testOpinionList();
  await testHeatFlowStockSeat();
  await testHeatFlowAlertList();
  
  console.log('\n=== 所有测试完成 ===');
};

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
