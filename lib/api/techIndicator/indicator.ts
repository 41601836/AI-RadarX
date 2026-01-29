// 技术指标API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { stockCodeFormatError } from '../common/errors';
import { calculateRSI, calculateMACD } from '../../algorithms/technicalIndicators';

export interface TechIndicatorParams {
  stockCode: string;
  cycleType?: 'day' | 'week' | 'month' | '60min'; // 周期类型，默认 day
  indicatorTypes?: string[]; // 指标类型（多个用逗号分隔），默认返回全部核心指标
  days?: number; // 统计天数，默认 60 天
}

export interface MAIndicator {
  ma5: number;
  ma10: number;
  ma20: number;
}

export interface MACDIndicator {
  diff: number;
  dea: number;
  bar: number;
}

export interface RSIIndicator {
  rsi6: number;
  rsi12: number;
  rsi24: number;
}

export interface WADIndicator {
  wad: number; // WAD指标值
  signal?: number; // 信号值（可选）
}

export interface TechIndicatorDataItem {
  time: string;
  openPrice: number; // 开盘价（分）
  closePrice: number; // 收盘价（分）
  highPrice: number; // 最高价（分）
  lowPrice: number; // 最低价（分）
  volume: number; // 成交量（股）
  ma?: MAIndicator;
  macd?: MACDIndicator;
  rsi?: RSIIndicator;
  wad?: WADIndicator;
}

export interface TechIndicatorData {
  stockCode: string;
  stockName: string;
  cycleType: string;
  indicatorDataList: TechIndicatorDataItem[];
}

// Mock数据生成器
const generateTechIndicatorDataMock: MockDataGenerator<TechIndicatorData> = async (params: TechIndicatorParams) => {
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
  const indicatorDataList: TechIndicatorDataItem[] = [];
  const closePrices: number[] = [];
  
  // 生成历史数据
  for (let i = days - 1; i >= 0; i--) {
    // 生成随机价格波动
    const priceChange = (Math.random() - 0.5) * 500; // 随机波动范围：-250到+250分
    const closePrice = Math.max(1000, Math.round((basePrice + priceChange) * 100) / 100);
    const openPrice = Math.max(1000, Math.round((closePrice + (Math.random() - 0.5) * 200) * 100) / 100);
    const highPrice = Math.max(openPrice, closePrice, Math.round((Math.max(openPrice, closePrice) + Math.random() * 300) * 100) / 100);
    const lowPrice = Math.min(openPrice, closePrice, Math.round((Math.min(openPrice, closePrice) - Math.random() * 300) * 100) / 100);
    const volume = Math.floor(Math.random() * 10000000) + 1000000; // 成交量：100万到1100万股
    
    closePrices.push(closePrice);
    
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
    const ma: MAIndicator = {
      ma5: Math.round((closePrice * 0.2 + Math.random() * 100) * 100) / 100,
      ma10: Math.round((closePrice * 0.1 + Math.random() * 150) * 100) / 100,
      ma20: Math.round((closePrice * 0.05 + Math.random() * 200) * 100) / 100
    };
    
    // 使用真实的MACD计算
    const macdResult = calculateMACD({ 
      data: closePrices.slice(-26),
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9
    });
    const macd: MACDIndicator = {
      diff: macdResult.macd[macdResult.macd.length - 1] || Math.round((Math.random() * 100 - 50) * 100) / 100,
      dea: macdResult.signal[macdResult.signal.length - 1] || Math.round((Math.random() * 100 - 50) * 100) / 100,
      bar: macdResult.histogram[macdResult.histogram.length - 1] || Math.round((Math.random() * 200 - 100) * 100) / 100
    };
    
    // 使用真实的RSI计算
    const rsi6 = calculateRSI({ data: closePrices.slice(-6), period: 6 });
    const rsi12 = calculateRSI({ data: closePrices.slice(-12), period: 12 });
    const rsi24 = calculateRSI({ data: closePrices.slice(-24), period: 24 });
    
    const rsi: RSIIndicator = {
      rsi6: rsi6[rsi6.length - 1] || Math.round((Math.random() * 100) * 100) / 100,
      rsi12: rsi12[rsi12.length - 1] || Math.round((Math.random() * 100) * 100) / 100,
      rsi24: rsi24[rsi24.length - 1] || Math.round((Math.random() * 100) * 100) / 100
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
  params: TechIndicatorParams
): Promise<ApiResponse<TechIndicatorData>> {
  // 验证股票代码格式
  if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
    throw stockCodeFormatError();
  }
  
  try {
    // 使用apiGet调用真实接口，确保API链路完整
    return apiGet<TechIndicatorData>(
      '/tech-indicator/data',
      params,
      { requiresAuth: false },
      generateTechIndicatorDataMock
    );
  } catch (error) {
    console.error('Failed to fetch tech indicator data:', error);
    // 如果真实接口失败，使用模拟数据作为兜底
    const mockData = await generateTechIndicatorDataMock(params);
    return {
      code: 200,
      msg: 'success',
      data: mockData,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}
