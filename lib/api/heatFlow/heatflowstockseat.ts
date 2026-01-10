// heatFlow API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse, PaginationResponse } from '../common/response';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { formatDateTime } from '../common/utils';

// 定义参数接口
export interface HeatFlowStockSeatParams {
  stockCode?: string;
  startDate?: string;
  endDate?: string;
}

// 定义响应数据接口
// TODO: 完善响应数据接口定义
export interface HeatFlowStockSeatData {
  stockCode?: string;
  stockName?: string;
  date?: string;
  // 添加更多字段...
}

// Mock数据生成器
export const generateHeatFlowStockSeatMock: MockDataGenerator<HeatFlowStockSeatData> = async (params: HeatFlowStockSeatParams) => {
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
};

export async function fetchHeatFlowStockSeat(
  params: HeatFlowStockSeatParams
): Promise<ApiResponse<HeatFlowStockSeatData>> {
  const { stockCode } = params;
  let dataSource = 'Mock'; // 默认数据源
  
  try {
    // 1. 优先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      dataSource = 'Mock';
      return apiGet<HeatFlowStockSeatData>(
        '/heat/flow/stock/seat',
        params,
        { requiresAuth: false },
        generateHeatFlowStockSeatMock
      );
    }
    
    // 2. 尝试调用本地后端API
    try {
      console.info('Trying to fetch from local backend API');
      const response = await apiGet<HeatFlowStockSeatData>(
        '/heat/flow/stock/seat',
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
  const mockResponse = await apiGet<HeatFlowStockSeatData>(
    '/heat/flow/stock/seat',
    params,
    { requiresAuth: false },
    generateHeatFlowStockSeatMock
  );
  
  return mockResponse;
}