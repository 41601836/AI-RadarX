#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// API模块配置
const apiModules = [
  // 舆情分析模块
  {
    moduleName: 'publicOpinion',
    apiFunctions: [
      {
        functionName: 'fetchPublicOpinionSummary',
        params: ['stockCode', 'timeRange'],
        hasStockCode: true,
        returnType: 'PublicOpinionSummaryData'
      },
      {
        functionName: 'fetchPublicOpinionList',
        params: ['stockCode', 'timeRange', 'sentimentType', 'pageNum', 'pageSize'],
        hasStockCode: true,
        returnType: 'PaginationResponse<PublicOpinionItem>'
      }
    ]
  },
  
  // 风险控制模块
  {
    moduleName: 'risk',
    apiFunctions: [
      {
        functionName: 'fetchRiskAccountAssessment',
        params: [],
        hasStockCode: false,
        returnType: 'RiskAccountAssessmentData'
      },
      {
        functionName: 'updateRiskStopRuleConfig',
        params: ['stockCode', 'stopType', 'ruleType', 'value', 'isEnabled'],
        hasStockCode: false,
        returnType: 'RiskStopRuleConfigData'
      }
    ]
  },
  
  // 游资行为分析模块
  {
    moduleName: 'heatFlow',
    apiFunctions: [
      {
        functionName: 'fetchHeatFlowStockSeat',
        params: ['stockCode', 'startDate', 'endDate'],
        hasStockCode: true,
        returnType: 'HeatFlowStockSeatData'
      },
      {
        functionName: 'fetchHeatFlowAlertList',
        params: ['alertLevel', 'pageNum', 'pageSize'],
        hasStockCode: false,
        returnType: 'PaginationResponse<HeatFlowAlertItem>'
      }
    ]
  },
  
  // 大单异动分析模块
  {
    moduleName: 'largeOrder',
    apiFunctions: [
      {
        functionName: 'fetchOrderLargeRealTime',
        params: ['stockCode', 'largeOrderThreshold'],
        hasStockCode: true,
        returnType: 'LargeOrderRealTimeData'
      },
      {
        functionName: 'fetchOrderLargeTrend',
        params: ['stockCode', 'timeType', 'days'],
        hasStockCode: true,
        returnType: 'LargeOrderTrendData'
      }
    ]
  },
  
  // 技术分析模块
  {
    moduleName: 'techIndicator',
    apiFunctions: [
      {
        functionName: 'fetchTechIndicatorData',
        params: ['stockCode', 'cycleType', 'indicatorTypes', 'days'],
        hasStockCode: true,
        returnType: 'TechIndicatorData'
      },
      {
        functionName: 'fetchTechKlinePatternRecognize',
        params: ['stockCode', 'cycleType', 'days'],
        hasStockCode: true,
        returnType: 'TechKlinePatternData'
      }
    ]
  }
];

// 基础模板
const getApiTemplate = (moduleName, apiFunction) => {
  const paramsInterfaceName = `${apiFunction.functionName.replace('fetch', '').replace('update', '')}Params`;
  const hasStockCode = apiFunction.hasStockCode || apiFunction.params.includes('stockCode');
  
  // 生成参数接口
  let paramsInterface = `export interface ${paramsInterfaceName} {`;
  apiFunction.params.forEach(param => {
    if (param === 'pageNum' || param === 'pageSize' || param === 'days' || param === 'largeOrderThreshold') {
      paramsInterface += `
  ${param}?: number;`;
    } else {
      paramsInterface += `
  ${param}?: string;`;
    }
  });
  if (hasStockCode && !apiFunction.params.includes('stockCode')) {
    paramsInterface += `
  stockCode: string;`;
  }
  paramsInterface += `
}`;
  
  // 生成模拟数据生成器
  const mockGeneratorName = `generate${apiFunction.functionName.replace('fetch', '').replace('update', '')}Mock`;
  const mockGenerator = `// Mock数据生成器
export const ${mockGeneratorName}: MockDataGenerator<${apiFunction.returnType.replace('PaginationResponse<', '').replace('>', '')}> = async (params: ${paramsInterfaceName}) => {
  const { stockCode = 'SH600000' } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  
  // 生成当前时间
  const now = new Date();
  const date = formatDateTime(now);
  
  // TODO: 实现具体的模拟数据生成逻辑
  return {
    // 基础模拟数据结构
    stockCode,
    stockName,
    date
    // 添加更多字段...
  };
};`;
  
  // 生成API函数
  let apiFunctionBody = `export async function ${apiFunction.functionName}(
  params: ${paramsInterfaceName}
): Promise<ApiResponse<${apiFunction.returnType}>> {
  const { stockCode } = params;
  let dataSource = 'Mock'; // 默认数据源
  
  try {
    // 1. 优先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      dataSource = 'Mock';
      return apiGet<${apiFunction.returnType.replace('PaginationResponse<', '').replace('>', '')}>(
        '/${moduleName.replace(/([A-Z])/g, '/$1').toLowerCase()}/${apiFunction.functionName.replace('fetch', '').replace('update', '').replace(/([A-Z])/g, '-$1').toLowerCase()}',
        params,
        { requiresAuth: false },
        ${mockGeneratorName}
      );
    }
    
    // 2. 尝试调用本地后端API
    try {
      console.info('Trying to fetch from local backend API');
      const response = await apiGet<${apiFunction.returnType.replace('PaginationResponse<', '').replace('>', '')}>(
        '/${moduleName.replace(/([A-Z])/g, '/$1').toLowerCase()}/${apiFunction.functionName.replace('fetch', '').replace('update', '').replace(/([A-Z])/g, '-$1').toLowerCase()}',
        params,
        { requiresAuth: false }
      );
      
      if (response.code === 200) {
        dataSource = 'Local-API';
        return response;
      }
    } catch (localApiError) {
      console.warn('Local backend API failed, falling back to mock:', localApiError);
      // 继续尝试下一级兜底
    }
  } catch (error) {
    console.error('All data sources failed:', error);
    // 所有数据源都失败，最终回退到模拟数据
  }
  
  // 最终回退到模拟数据
  console.info('All data sources failed, using mock data');
  const mockResponse = await apiGet<${apiFunction.returnType.replace('PaginationResponse<', '').replace('>', '')}>(
    '/${moduleName.replace(/([A-Z])/g, '/$1').toLowerCase()}/${apiFunction.functionName.replace('fetch', '').replace('update', '').replace(/([A-Z])/g, '-$1').toLowerCase()}',
    params,
    { requiresAuth: false },
    ${mockGeneratorName}
  );
  
  return mockResponse;
}`;
  
  // 生成完整的API文件
  return `// ${moduleName} API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse, PaginationResponse } from '../common/response';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { formatDateTime } from '../common/utils';

// 定义参数接口
${paramsInterface}

// 定义响应数据接口
// TODO: 完善响应数据接口定义
export interface ${apiFunction.returnType.replace('PaginationResponse<', '').replace('>', '')} {
  stockCode?: string;
  stockName?: string;
  date?: string;
  // 添加更多字段...
}

${mockGenerator}

${apiFunctionBody}`;
};

// 生成文件
apiModules.forEach(module => {
  module.apiFunctions.forEach(apiFunction => {
    // 构建文件路径
    const fileName = apiFunction.functionName.replace('fetch', '').replace('update', '').toLowerCase();
    const fullPath = path.join(__dirname, `lib/api/${module.moduleName}/${fileName}.ts`);
    const directory = path.dirname(fullPath);
    
    // 创建目录
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // 生成文件内容
    const content = getApiTemplate(module.moduleName, apiFunction);
    
    // 写入文件
    fs.writeFileSync(fullPath, content, { encoding: 'utf8' });
    console.log(`Generated: ${fullPath}`);
  });
});

// 生成模块的index.ts文件
apiModules.forEach(module => {
  const indexPath = path.join(__dirname, `lib/api/${module.moduleName}/index.ts`);
  
  let content = `// ${module.moduleName} API模块索引\n\n`;
  
  module.apiFunctions.forEach(apiFunction => {
    const fileName = apiFunction.functionName.replace('fetch', '').replace('update', '').toLowerCase();
    content += `export * from './${fileName}';\n`;
  });
  
  fs.writeFileSync(indexPath, content, { encoding: 'utf8' });
  console.log(`Generated: ${indexPath}`);
});

console.log('All API framework files generated successfully!');
