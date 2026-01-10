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
        // 查找并替换所有错误的API路径
        // 使用更精确的正则表达式来匹配所有可能的错误路径格式
        let updatedContent = fileContent;
        
        // 匹配所有可能的错误API路径模式
        const apiPathPattern = /\/[a-z\/\-]+-([a-z-]+)/g;
        
        // 替换所有匹配的路径
        updatedContent = updatedContent.replace(apiPathPattern, match => {
          return correctPath;
        });
        
        // 如果替换后内容不同，则写入文件
        if (updatedContent !== fileContent) {
          fs.writeFileSync(filePath, updatedContent, { encoding: 'utf8' });
          console.log(`Fixed paths in: ${filePath}`);
        } else {
          console.log(`No paths to fix in: ${filePath}`);
        }
      }
    });
  });
}

// 执行修复
fixApiPaths();
console.log('All API paths fixed successfully!');
