// 测试所有实现的功能
import { submitOrder, cancelOrder, fetchPositions, OrderDirection, OrderType } from '../api/trade/orderService';
import { riskControlAgent, checkOrderRiskControl } from './risk-control';
import { profitCalculator } from './profit-calculator';

// 测试下单功能
async function testSubmitOrder() {
  console.log('=== 测试下单功能 ===');
  try {
    const params = {
      stockCode: 'SH600000',
      stockName: '浦发银行',
      direction: OrderDirection.BUY,
      orderType: OrderType.LIMIT,
      price: 8.5,
      quantity: 1000,
      remark: '测试订单'
    };
    
    const result = await submitOrder(params);
    console.log('下单成功:', result.data);
    return result.data.orderId;
  } catch (error) {
    console.error('下单失败:', error);
    return null;
  }
}

// 测试撤单功能
async function testCancelOrder(orderId: string) {
  console.log('\n=== 测试撤单功能 ===');
  try {
    const params = {
      orderId,
      stockCode: 'SH600000'
    };
    
    const result = await cancelOrder(params);
    console.log('撤单成功:', result.data);
    return true;
  } catch (error) {
    console.error('撤单失败:', error);
    return false;
  }
}

// 测试获取持仓功能
async function testFetchPositions() {
  console.log('\n=== 测试获取持仓功能 ===');
  try {
    const result = await fetchPositions();
    console.log('获取持仓成功:', result.data);
    return result.data;
  } catch (error) {
    console.error('获取持仓失败:', error);
    return null;
  }
}

// 测试风控熔断逻辑
async function testRiskControl() {
  console.log('\n=== 测试风控熔断逻辑 ===');
  try {
    // 测试单票持仓比例限制
    const positionLimitResult = riskControlAgent.checkSingleStockPositionLimit(100000, 'SH600000');
    console.log('单票持仓比例限制检查:', positionLimitResult);
    
    // 测试实时风险评估
    const realTimeRisk = await riskControlAgent.assessRealTimeRisk('SH600000');
    console.log('实时风险评估:', realTimeRisk);
    
    // 测试综合风控检查
    const riskCheckResult = await checkOrderRiskControl({
      stockCode: 'SH600000',
      stockName: '浦发银行',
      direction: OrderDirection.BUY,
      price: 8.5,
      quantity: 1000,
      orderAmount: 8500
    });
    console.log('综合风控检查:', riskCheckResult);
    
    return true;
  } catch (error) {
    console.error('风控测试失败:', error);
    return false;
  }
}

// 测试盈亏实时计算逻辑
function testProfitCalculator() {
  console.log('\n=== 测试盈亏实时计算逻辑 ===');
  try {
    // 测试单次计算
    const singleCalculation = profitCalculator.getCurrentProfitData();
    console.log('单次盈亏计算:', singleCalculation);
    
    // 测试订阅功能
    console.log('测试盈亏数据订阅...');
    const unsubscribe = profitCalculator.subscribe(data => {
      console.log('收到盈亏数据更新:', {
        totalProfitLoss: data.totalProfitLoss,
        totalProfitLossRate: data.totalProfitLossRate,
        updateTime: new Date(data.updateTime).toLocaleTimeString()
      });
    });
    
    // 启动实时计算
    profitCalculator.startRealTimeCalculation(500);
    
    // 3秒后停止测试
    setTimeout(() => {
      unsubscribe();
      profitCalculator.stopRealTimeCalculation();
      console.log('盈亏计算测试完成');
    }, 3000);
    
    return true;
  } catch (error) {
    console.error('盈亏计算测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runAllTests() {
  console.log('开始运行所有功能测试...\n');
  
  // 1. 测试风控逻辑
  await testRiskControl();
  
  // 2. 测试获取持仓
  await testFetchPositions();
  
  // 3. 测试下单和撤单
  const orderId = await testSubmitOrder();
  if (orderId) {
    await testCancelOrder(orderId);
  }
  
  // 4. 测试盈亏计算
  testProfitCalculator();
  
  console.log('\n所有测试完成！');
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

// 导出测试函数
export { runAllTests };
