#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// API模块路径映射
const apiPathMap = {
  // 舆情分析模块
  'publicopinionsummary': '/public/opinion/summary',
  'publicopinionlist': '/public/opinion/list',
  
  // 风险控制模块
  'riskaccountassessment': '/risk/account/assessment',
  'riskstopruleconfig': '/risk/stop/rule/config',
  
  // 游资行为分析模块
  'heatflowstockseat': '/heat/flow/stock/seat',
  'heatflowalertlist': '/heat/flow/alert/list',
  
  // 大单异动分析模块
  'orderlargerealtime': '/order/large/real-time',
  'orderlargetrend': '/order/large/trend',
  
  // 技术分析模块
  'techindicatordata': '/tech/indicator/data',
  'techklinepatternrecognize': '/tech/kline/pattern/recognize'
};

// 修复API路径
function fixApiPaths() {
  // 遍历API模块目录
  const apiDir = path.join(__dirname, 'lib/api');
  const moduleDirs = fs.readdirSync(apiDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.includes('common'))
    .map(dirent => dirent.name);
  
  moduleDirs.forEach(moduleDir => {
    const modulePath = path.join(apiDir, moduleDir);
    const files = fs.readdirSync(modulePath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.ts') && dirent.name !== 'index.ts')
      .map(dirent => dirent.name);
    
    files.forEach(fileName => {
      const filePath = path.join(modulePath, fileName);
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
      
      // 获取正确的API路径
      const baseName = fileName.replace('.ts', '');
      const correctPath = apiPathMap[baseName];
      
      if (correctPath) {
        // 修复API路径
        const updatedContent = fileContent.replace(/\/[a-z\/\-]+-summary|\/[a-z\/\-]+-list|\/[a-z\/\-]+-seat|\/[a-z\/\-]+-assessment|\/[a-z\/\-]+-config|\/[a-z\/\-]+-real-time|\/[a-z\/\-]+-trend|\/[a-z\/\-]+-data|\/[a-z\/\-]+-recognize/g, match => {
          // 查找对应的正确路径
          for (const [key, value] of Object.entries(apiPathMap)) {
            if (match.endsWith(key.replace(/([A-Z])/g, '-$1').toLowerCase())) {
              return value;
            }
          }
          return match;
        });
        
        // 写入修复后的内容
        fs.writeFileSync(filePath, updatedContent, { encoding: 'utf8' });
        console.log(`Fixed paths in: ${filePath}`);
      }
    });
  });
}

// 执行修复
fixApiPaths();
console.log('All API paths fixed successfully!');
