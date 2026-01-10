// techIndicator API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse, PaginationResponse } from '../common/response';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { formatDateTime } from '../common/utils';

// 定义参数接口
export interface TechIndicatorDataParams {
  stockCode: string;
  cycleType?: 'day' | 'week' | 'month' | '60min';
  indicatorTypes?: string;
  days?: number;
}

// 定义均线指标接口
export interface MAIndicator {
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma30?: number;
  ma60?: number;
}

// 定义MACD指标接口
export interface MACDIndicator {
  diff?: number;
  dea?: number;
  bar?: number;
}

// 定义RSI指标接口
export interface RSIIndicator {
  rsi6?: number;
  rsi12?: number;
  rsi24?: number;
}

// 定义技术指标数据接口
export interface IndicatorDataItem {
  time: string;
  openPrice: number; // 开盘价（分）
  closePrice: number; // 收盘价（分）
  highPrice: number; // 最高价（分）
  lowPrice: number; // 最低价（分）
  volume: number; // 成交量（股）
  ma?: MAIndicator;
  macd?: MACDIndicator;
  rsi?: RSIIndicator;
  // 可以添加更多技术指标...
}

// 定义响应数据接口
export interface TechIndicatorData {
  stockCode: string;
  stockName: string;
  cycleType: 'day' | 'week' | 'month' | '60min';
  indicatorDataList: IndicatorDataItem[];
}

// Mock数据生成器
export const generateTechIndicatorDataMock: MockDataGenerator<TechIndicatorData> = async (params: TechIndicatorDataParams) => {
  const { stockCode = 'SH600000', cycleType = 'day', days = 60 } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  
  // 生成基础价格（分）
  const basePrice = 8500; // 85.00元
  
  // 生成技术指标数据
  const indicatorDataList: IndicatorDataItem[] = [];
  
  // 生成历史数据
  for (let i = days - 1; i >= 0; i--) {
    // 生成随机价格波动
    const priceChange = (Math.random() - 0.5) * 500; // 随机波动范围：-250到+250分
    const closePrice = Math.max(1000, Math.round((basePrice + priceChange) * 100) / 100);
    const openPrice = Math.max(1000, Math.round((closePrice + (Math.random() - 0.5) * 200) * 100) / 100);
    const highPrice = Math.max(openPrice, closePrice, Math.round((Math.max(openPrice, closePrice) + Math.random() * 300) * 100) / 100);
    const lowPrice = Math.min(openPrice, closePrice, Math.round((Math.min(openPrice, closePrice) - Math.random() * 300) * 100) / 100);
    const volume = Math.floor(Math.random() * 10000000) + 1000000; // 成交量：100万到1100万股
    
    // 生成时间
    let time: string;
    if (cycleType === '60min') {
      // 生成最近days小时的时间
      time = new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString().substring(0, 16);
    } else if (cycleType === 'day') {
      // 生成最近days天的时间
      time = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10);
    } else if (cycleType === 'week') {
      // 生成最近days周的时间
      time = new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10);
    } else { // month
      // 生成最近days月的时间
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      time = date.toISOString().substring(0, 7);
    }
    
    // 模拟计算MA指标（简单移动平均）
    const ma: MAIndicator = {};
    if (i >= 4) ma.ma5 = Math.round((closePrice * 0.2 + Math.random() * 100) * 100) / 100;
    if (i >= 9) ma.ma10 = Math.round((closePrice * 0.1 + Math.random() * 150) * 100) / 100;
    if (i >= 19) ma.ma20 = Math.round((closePrice * 0.05 + Math.random() * 200) * 100) / 100;
    
    // 模拟计算MACD指标
    const macd: MACDIndicator = {
      diff: Math.round((Math.random() * 100 - 50) * 100) / 100,
      dea: Math.round((Math.random() * 100 - 50) * 100) / 100,
      bar: Math.round((Math.random() * 200 - 100) * 100) / 100
    };
    
    // 模拟计算RSI指标（相对强弱指标）
    const rsi: RSIIndicator = {
      rsi6: Math.round((Math.random() * 100) * 100) / 100,
      rsi12: Math.round((Math.random() * 100) * 100) / 100,
      rsi24: Math.round((Math.random() * 100) * 100) / 100
    };
    
    indicatorDataList.push({
      time,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      volume,
      ma,
      macd,
      rsi
    });
  }
  
  return {
    stockCode,
    stockName,
    cycleType,
    indicatorDataList
  };
};

export async function fetchTechIndicatorData(
  params: TechIndicatorDataParams
): Promise<ApiResponse<TechIndicatorData>> {
  const { stockCode } = params;
  let dataSource = 'Mock'; // 默认数据源
  
  try {
    // 1. 优先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      dataSource = 'Mock';
      return apiGet<TechIndicatorData>(
        '/tech/indicator/data',
        params,
        { requiresAuth: false },
        generateTechIndicatorDataMock
      );
    }
    
    // 2. 尝试调用本地后端API
    try {
      console.info('Trying to fetch from local backend API');
      const response = await apiGet<TechIndicatorData>(
        '/tech/indicator/data',
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
  const mockResponse = await apiGet<TechIndicatorData>(
    '/tech/indicator/data',
    params,
    { requiresAuth: false },
    generateTechIndicatorDataMock
  );
  
  return mockResponse;
}
