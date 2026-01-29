#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// API配置列表
const apiConfigs = [
  // 风险控制分析接口
  {
    routePath: '/app/api/v1/risk/account/assessment',
    handlerName: 'handleRiskAccountAssessmentRequest',
    importPath: '../../../../../lib/api/risk/assessment',
    fetchFunction: 'fetchRiskAccountAssessment',
    method: 'GET',
    hasStockCode: false,
    params: []
  },
  {
    routePath: '/app/api/v1/risk/stop/rule/config',
    handlerName: 'handleRiskStopRuleConfigRequest',
    importPath: '../../../../../lib/api/risk/stopRule',
    fetchFunction: 'updateRiskStopRuleConfig',
    method: 'POST',
    hasStockCode: false,
    params: []
  },
  
  // 游资行为分析接口
  {
    routePath: '/app/api/v1/heat/flow/stock/seat',
    handlerName: 'handleHeatFlowStockSeatRequest',
    importPath: '../../../../../lib/api/heatFlow/stockSeat',
    fetchFunction: 'fetchHeatFlowStockSeat',
    method: 'GET',
    hasStockCode: true,
    params: ['startDate', 'endDate']
  },
  {
    routePath: '/app/api/v1/heat/flow/alert/list',
    handlerName: 'handleHeatFlowAlertListRequest',
    importPath: '../../../../../lib/api/heatFlow/alert',
    fetchFunction: 'fetchHeatFlowAlertList',
    method: 'GET',
    hasStockCode: false,
    params: ['alertLevel', 'pageNum', 'pageSize']
  },
  
  // 大单异动分析接口
  {
    routePath: '/app/api/v1/order/large/real-time',
    handlerName: 'handleOrderLargeRealTimeRequest',
    importPath: '../../../../../lib/api/largeOrder/realTime',
    fetchFunction: 'fetchOrderLargeRealTime',
    method: 'GET',
    hasStockCode: true,
    params: ['largeOrderThreshold']
  },
  {
    routePath: '/app/api/v1/order/large/trend',
    handlerName: 'handleOrderLargeTrendRequest',
    importPath: '../../../../../lib/api/largeOrder/trend',
    fetchFunction: 'fetchOrderLargeTrend',
    method: 'GET',
    hasStockCode: true,
    params: ['timeType', 'days']
  },
  
  // 技术分析接口
  {
    routePath: '/app/api/v1/tech/indicator/data',
    handlerName: 'handleTechIndicatorDataRequest',
    importPath: '../../../../../lib/api/techIndicator/indicator',
    fetchFunction: 'fetchTechIndicatorData',
    method: 'GET',
    hasStockCode: true,
    params: ['cycleType', 'indicatorTypes', 'days']
  },
  {
    routePath: '/app/api/v1/tech/kline/pattern/recognize',
    handlerName: 'handleTechKlinePatternRecognizeRequest',
    importPath: '../../../../../lib/api/techIndicator/klinePattern',
    fetchFunction: 'fetchTechKlinePatternRecognize',
    method: 'GET',
    hasStockCode: true,
    params: ['cycleType', 'days']
  }
];

// 基础模板
const getRouteTemplate = (config) => {
  let stockCodeValidation = '';
  let paramsParsing = '';
  let paramsPassing = '';
  
  if (config.hasStockCode) {
    stockCodeValidation = `  // 验证必要参数
  if (!stockCode) {
    return NextResponse.json(
      errorResponse(badRequestError('stockCode is required')),
      { status: 400 }
    );
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    return NextResponse.json(
      errorResponse(stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字')),
      { status: 400 }
    );
  }\n`;
  }
  
  if (config.params.length > 0) {
    paramsParsing = config.params.map(param => {
      if (param === 'pageNum' || param === 'pageSize') {
        return `  const ${param} = searchParams.get('${param}');`;
      } else {
        return `  const ${param} = searchParams.get('${param}');`;
      }
    }).join('\n');
    
    paramsPassing = config.params.map(param => {
      if (param === 'pageNum') {
        return `${param}: ${param} ? parseInt(${param}, 10) : 1`;
      } else if (param === 'pageSize') {
        return `${param}: ${param} ? parseInt(${param}, 10) : 20`;
      } else {
        return `${param}`;
      }
    }).join(',\n    ');
  }
  
  let requestHandling = '';
  if (config.method === 'GET') {
    requestHandling = `  // 解析请求参数
  const { searchParams } = new URL(request.url);
  ${config.hasStockCode ? '  const stockCode = searchParams.get(\'stockCode\');\n' : ''}
${paramsParsing}\n${stockCodeValidation}
  // 调用业务逻辑
  const result = await ${config.fetchFunction}({${config.hasStockCode ? '\n    stockCode,' : ''}${paramsPassing ? '\n    ' + paramsPassing : ''}\n  });`;
  } else if (config.method === 'POST') {
    requestHandling = `  // 解析请求体
  const body = await request.json();\n  
  // 调用业务逻辑
  const result = await ${config.fetchFunction}(body);`;
  }
  
  return `import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../../lib/api/common/handler';
import { errorResponse, badRequestError${config.hasStockCode ? ', stockCodeFormatError' : ''} } from '../../../../../lib/api/common/errors';
import { ${config.fetchFunction} } from '${config.importPath}';


/**
 * API处理函数
 * 接口路径：${config.routePath.replace('/app/api', '')}
 * 请求方法：${config.method}
 */
async function ${config.handlerName}(request: NextRequest) {
${requestHandling}
  
  return result;
}

export async function ${config.method}(request: NextRequest) {
  return apiHandler(request, ${config.handlerName});
}
`;
};

// 生成文件
apiConfigs.forEach(config => {
  const fullPath = path.join(__dirname, config.routePath, 'route.ts');
  const directory = path.dirname(fullPath);
  
  // 创建目录
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  // 生成文件
  const content = getRouteTemplate(config);
  fs.writeFileSync(fullPath, content, { encoding: 'utf8' });
  console.log(`Generated: ${fullPath}`);
});

console.log('All route files generated successfully!');
