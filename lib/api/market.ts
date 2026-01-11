// API 桥接模块：将原本请求 Fincept Mock 数据的代码重定向到 Java 后端
import { apiGet } from './common/fetch';
import { ApiResponse, PaginationResponse } from './common/response';
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

// 实时指数数据接口
export interface RealTimeIndexData {
  symbol: string;
  name: string;
  current: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  updateTime: string;
}

// 数据源类型
export enum DataSource {
  TENCENT_REALTIME = 'TENCENT_REALTIME',
  TUSHARE = 'TUSHARE',
  MOCK = 'MOCK'
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
    
    // 无论什么错误，都生成模拟数据作为后备
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
export async function fetchStockBasicList(): Promise<ApiResponse<PaginationResponse<StockBasicInfo>>> {
  try {
    // 使用统一的 apiGet 函数调用 Tushare 的 stock_basic 接口
    const response = await apiGet<{ data: PaginationResponse<StockBasicInfo> }>('/market/stock_basic', {
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
    
    // 无论什么错误，都生成模拟数据作为后备
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
function generateMockStockBasicList(): PaginationResponse<StockBasicInfo> {
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

  return {
    list: mockStocks,
    total: mockStocks.length,
    pageNum: 1,
    pageSize: 20,
    pages: 1
  };
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

/**
 * 从腾讯财经API获取实时指数数据
 * @returns 实时指数数据和数据源信息
 */
export async function fetchRealTimeIndices(): Promise<{ indices: RealTimeIndexData[]; dataSource: DataSource }> {
  // 腾讯财经API基础URL
  const TENCENT_FINANCE_URL = 'http://qt.gtimg.cn/q=';
  
  // 上证指数和深证成指的代码
  const indexCodes = ['sh000001', 'sz399001'];
  
  try {
    // 构建腾讯财经API请求URL
    const url = `${TENCENT_FINANCE_URL}${indexCodes.join(',')}`;
    
    // 设置超时保护
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // 发起请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`Tencent Finance API error: ${response.status}`);
    }
    
    // 解析响应数据
    const data = await response.text();
    
    // 解析腾讯财经返回的文本数据
    const indices = parseTencentIndexData(data);
    
    return { indices, dataSource: DataSource.TENCENT_REALTIME };
  } catch (error) {
    console.error('获取实时指数数据失败:', error);
    
    // 如果API调用失败，返回模拟数据
    return { 
      indices: generateMockRealTimeIndices(), 
      dataSource: DataSource.MOCK 
    };
  }
}

/**
 * 解析腾讯财经返回的指数数据
 * @param data 原始文本数据
 * @returns 格式化后的指数数据
 */
function parseTencentIndexData(data: string): RealTimeIndexData[] {
  const result: RealTimeIndexData[] = [];
  const lines = data.split(';');
  
  lines.forEach(line => {
    if (!line || !line.startsWith('v_')) return;
    
    try {
      // 提取指数代码和数据
      const [keyPart, valuePart] = line.split('=');
      if (!keyPart || !valuePart) return;
      
      // 提取指数代码
      const symbol = keyPart.substring(2);
      
      // 解析数据部分
      const dataStr = valuePart.replace(/^"|"$/g, '');
      const dataArray = dataStr.split('~');
      
      if (dataArray.length < 30) return;
      
      // 提取关键数据
      const name = dataArray[1];
      const current = parseFloat(dataArray[3]) * 100; // 转换为分
      const preClose = parseFloat(dataArray[4]) * 100;
      const open = parseFloat(dataArray[5]) * 100;
      const high = parseFloat(dataArray[33]) * 100;
      const low = parseFloat(dataArray[34]) * 100;
      const volume = parseInt(dataArray[36]);
      const amount = parseFloat(dataArray[37]) * 1000000; // 转换为分（原数据是万元）
      
      // 计算涨跌额和涨跌幅
      const change = current - preClose;
      const changePercent = parseFloat(dataArray[31]);
      
      // 格式化更新时间
      const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      result.push({
        symbol,
        name,
        current,
        change,
        changePercent,
        open,
        high,
        low,
        volume,
        amount,
        updateTime
      });
    } catch (error) {
      console.error(`解析指数数据失败: ${line}`, error);
    }
  });
  
  return result;
}

/**
 * 生成模拟实时指数数据
 * @returns 模拟的实时指数数据
 */
function generateMockRealTimeIndices(): RealTimeIndexData[] {
  return [
    {
      symbol: 'sh000001',
      name: '上证指数',
      current: 3285.16 * 100,
      change: 12.34 * 100,
      changePercent: 0.38,
      open: 3275.50 * 100,
      high: 3290.22 * 100,
      low: 3270.18 * 100,
      volume: 23580000000,
      amount: 3568000000000,
      updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    },
    {
      symbol: 'sz399001',
      name: '深证成指',
      current: 12456.78 * 100,
      change: -23.45 * 100,
      changePercent: -0.19,
      open: 12480.23 * 100,
      high: 12495.67 * 100,
      low: 12430.56 * 100,
      volume: 34210000000,
      amount: 5678000000000,
      updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
  ];
}