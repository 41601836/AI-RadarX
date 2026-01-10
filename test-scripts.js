// 简化的JavaScript测试脚本
const fs = require('fs');
const path = require('path');

// 读取并执行TypeScript文件
function requireTS(filePath) {
  const ts = require('typescript');
  const tsCode = fs.readFileSync(filePath, 'utf8');
  
  const result = ts.transpileModule(tsCode, {
    compilerOptions: {
      target: 'es2017',
      module: 'commonjs',
      esModuleInterop: true,
      strict: false
    }
  });
  
  // 创建一个临时模块
  const module = { exports: {} };
  const require = (file) => {
    if (file.endsWith('.ts')) {
      return requireTS(path.join(path.dirname(filePath), file));
    }
    return require(file);
  };
  
  // 执行编译后的代码
  eval(result.outputText);
  
  return module.exports;
}

// 生成测试数据
function generateTestPriceData(count) {
  const data = [];
  let currentPrice = 100;
  const currentTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    const volatility = Math.random() * 2;
    const change = (Math.random() - 0.5) * volatility;
    const newPrice = currentPrice + change;
    const high = Math.max(newPrice, newPrice + Math.random() * 0.5);
    const low = Math.min(newPrice, newPrice - Math.random() * 0.5);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({
      timestamp: currentTime - (count - i) * 60000,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(newPrice * 100) / 100,
      volume
    });
    
    currentPrice = newPrice;
  }
  
  return data;
}

console.log('测试WAD增强筹码分布算法...');

try {
  // 直接测试核心算法功能
  const wadModule = requireTS('./lib/algorithms/wad.ts');
  
  const testData = generateTestPriceData(100);
  const currentPrice = testData[testData.length - 1].close;
  
  console.log(`测试数据点数量: ${testData.length}`);
  console.log(`当前价格: ${currentPrice}`);
  
  const result = wadModule.calculateWADEnhancedChipDistribution({
    priceData: testData,
    currentPrice,
    decayRate: 0.1,
    useHighFrequency: false,
    priceBucketCount: 50
  });
  
  console.log('\n测试结果:');
  console.log(`- 筹码集中度: ${(result.concentration * 100).toFixed(2)}%`);
  console.log(`- 主筹峰值: ${result.mainPeak.peakPrice.toFixed(2)}元`);
  console.log(`- 支撑位数量: ${result.supportResistance.supportLevels.length}`);
  console.log(`- 压力位数量: ${result.supportResistance.resistanceLevels.length}`);
  console.log('\n✅ WAD算法测试通过!');
  
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
}
