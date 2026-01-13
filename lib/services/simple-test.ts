// 简单测试脚本，只测试我们实现的核心功能
console.log('=== 简单测试开始 ===\n');

// 测试1: 导入模块
console.log('1. 测试模块导入...');
try {
  const { OrderDirection, OrderType } = require('../api/trade/orderService');
  const { riskControlAgent } = require('./risk-control');
  const { profitCalculator } = require('./profit-calculator');
  
  console.log('✅ 模块导入成功');
  console.log('   - OrderDirection:', OrderDirection);
  console.log('   - OrderType:', OrderType);
  console.log('   - riskControlAgent:', typeof riskControlAgent);
  console.log('   - profitCalculator:', typeof profitCalculator);
} catch (error) {
    console.error('❌ 模块导入失败:', String(error));
    process.exit(1);
  }

// 测试2: 测试风控代理的单票持仓比例检查
console.log('\n2. 测试风控代理的单票持仓比例检查...');
try {
  const { riskControlAgent } = require('./risk-control');
  
  const result = riskControlAgent.checkSingleStockPositionLimit(100000, 'SH600000');
  console.log('✅ 单票持仓比例检查成功');
  console.log('   检查结果:', result);
} catch (error) {
    console.error('❌ 单票持仓比例检查失败:', String(error));
  }

// 测试3: 测试盈亏计算器的单次计算
console.log('\n3. 测试盈亏计算器的单次计算...');
try {
  const { profitCalculator } = require('./profit-calculator');
  
  const result = profitCalculator.getCurrentProfitData();
  console.log('✅ 盈亏计算成功');
  console.log('   计算结果:', {
    totalMarketValue: result.totalMarketValue,
    totalProfitLoss: result.totalProfitLoss,
    totalProfitLossRate: result.totalProfitLossRate,
    positionsCount: result.positions.length
  });
} catch (error) {
    console.error('❌ 盈亏计算失败:', String(error));
  }

console.log('\n=== 简单测试完成 ===');
