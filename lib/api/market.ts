// API 桥接模块：将原本请求 Fincept Mock 数据的代码重定向到 Java 后端
import { apiGet } from './common/fetch';
import { ApiResponse } from './common/response';
import { ApiError, ErrorCode } from './common/errors';

// 股票基本信息接口
export interface StockBasicInfo {
  ts_code: string; // 股票代码
  symbol: string; // 股票代码（不含交易所前缀）
  name: string; // 股票名称
  area: string; // 所在地区
  industry: string; // 所属行业
  market: string; // 市场类型（主板、创业板、科创板等）
  list_date: string; // 上市日期
  pinyin?: string; // 股票名称拼音（用于搜索联想）
}

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchKLineData(
  symbol: string,
  interval: string = '1d',
  limit: number = 100
): Promise<ApiResponse<OHLCVData[]>> {
  try {
    // 使用统一的 apiGet 函数
    const response = await apiGet<{ data: any[] }>('/market/kline', {
      symbol,
      interval,
      limit,
    });
    
    // 将 Tushare K 线格式映射为 Fincept OHLCV 格式
    const mappedData = mapTushareToOHLCV(response.data.data);
    
    // 返回符合 ApiResponse 格式的数据
    return {
      ...response,
      data: mappedData
    };
  } catch (error) {
    console.error('Error fetching K-line data:', error);
    // 如果是 ApiError，直接抛出
    if (error instanceof ApiError) {
      throw error;
    }
    
    // 生成模拟数据作为后备，并返回符合 ApiResponse 格式的响应
    const mockData = generateMockKLineData();
    return {
      code: ErrorCode.SUCCESS,
      msg: '操作成功',
      data: mockData,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}

// Tushare K 线数据格式映射为 OHLCV 格式
export function mapTushareToOHLCV(tushareData: any[]): OHLCVData[] {
  return tushareData.map((item: any) => ({
    timestamp: new Date(item.trade_date).getTime(),
    open: item.open * 100, // 转换为分
    high: item.high * 100, // 转换为分
    low: item.low * 100,   // 转换为分
    close: item.close * 100, // 转换为分
    volume: item.vol,     // 成交量
  }));
}

// 从 Tushare 获取股票基本信息列表
export async function fetchStockBasicList(): Promise<ApiResponse<StockBasicInfo[]>> {
  try {
    // 使用统一的 apiGet 函数调用 Tushare 的 stock_basic 接口
    const response = await apiGet<{ data: StockBasicInfo[] }>('/market/stock_basic', {
      exchange: 'SSE,SZSE', // 只获取上交所和深交所的股票
      list_status: 'L', // 只获取上市的股票
    });

    // 返回符合 ApiResponse 格式的数据
    return {
      ...response,
      data: response.data.data
    };
  } catch (error) {
    console.error('Error fetching stock basic list:', error);
    // 如果是 ApiError，直接抛出
    if (error instanceof ApiError) {
      throw error;
    }

    // 生成模拟数据作为后备，并返回符合 ApiResponse 格式的响应
    const mockData = generateMockStockBasicList();
    return {
      code: ErrorCode.SUCCESS,
      msg: '操作成功',
      data: mockData,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}

// 生成模拟股票基本信息数据
function generateMockStockBasicList(): StockBasicInfo[] {
  // 模拟A股股票列表
  const mockStocks: StockBasicInfo[] = [
    { ts_code: 'SH600000', symbol: '600000', name: '浦发银行', area: '上海', industry: '银行', market: '主板', list_date: '19990114', pinyin: 'pfyh' },
    { ts_code: 'SZ000001', symbol: '000001', name: '平安银行', area: '深圳', industry: '银行', market: '主板', list_date: '19910403', pinyin: 'payh' },
    { ts_code: 'SH600036', symbol: '600036', name: '招商银行', area: '上海', industry: '银行', market: '主板', list_date: '20020409', pinyin: 'zsyh' },
    { ts_code: 'SZ002415', symbol: '02415', name: '海康威视', area: '杭州', industry: '电子', market: '中小板', list_date: '20100528', pinyin: 'hkwx' },
    { ts_code: 'SZ000858', symbol: '000858', name: '五粮液', area: '四川', industry: '食品饮料', market: '主板', list_date: '19980427', pinyin: 'wly' },
    { ts_code: 'SH600519', symbol: '600519', name: '贵州茅台', area: '贵州', industry: '食品饮料', market: '主板', list_date: '20010827', pinyin: 'gzmt' },
    { ts_code: 'SZ300750', symbol: '300750', name: '宁德时代', area: '福建', industry: '电气设备', market: '创业板', list_date: '20180611', pinyin: 'nds' },
    { ts_code: 'SH601318', symbol: '61318', name: '中国平安', area: '上海', industry: '非银金融', market: '主板', list_date: '20070301', pinyin: 'zgpa' },
    { ts_code: 'SH600031', symbol: '600031', name: '三一重工', area: '湖南', industry: '机械设备', market: '主板', list_date: '20030703', pinyin: 'syhg' },
    { ts_code: 'SZ000002', symbol: '000002', name: '万科A', area: '深圳', industry: '房地产', market: '主板', list_date: '19910129', pinyin: 'wka' },
  ];

  return mockStocks;
}

// 生成模拟数据作为后备
function generateMockKLineData(): OHLCVData[] {
  const mockData: OHLCVData[] = [];
  const now = Date.now();
  let closePrice = 10000; // 初始价格 100.00 元

  for (let i = 99; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const open = closePrice;
    const high = open + Math.random() * 500;
    const low = open - Math.random() * 500;
    const close = low + Math.random() * (high - low);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    mockData.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    closePrice = close;
  }

  return mockData;
}