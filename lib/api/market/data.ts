// 市场数据API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { getTushareDailyData, getTushareStockBasic, convertTushareDailyToOHLCV } from '../common/tushare';
import { calculateCumulativeWAD, WADItem } from '@/lib/algorithms/wad';

export interface MarketDataParams {
  stockCode: string;
  startDate?: string;
  endDate?: string;
  indicators?: string[];
}

export interface MarketDataItem {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  wad?: number;
  weightedWad?: number;
}

export interface MarketData {
  stockCode: string;
  stockName: string;
  data: MarketDataItem[];
}

// 基于WAD的市场数据增强函数
function enhanceMarketDataWithWAD(dailyData: any[], stockCode: string, stockName: string): MarketData {
  // 计算累积WAD值
  const wadItems: WADItem[] = dailyData.map(item => ({
    timestamp: item.timestamp,
    high: item.high,
    low: item.low,
    close: item.close
  }));
  
  const cumulativeWAD = calculateCumulativeWAD(wadItems, {
    decayRate: 0.1,
    useExponentialDecay: true
  });
  
  // 合并WAD数据到市场数据
  const enhancedData: MarketDataItem[] = dailyData.map((item, index) => {
    const wadData = cumulativeWAD[index];
    return {
      ...item,
      wad: wadData?.wad,
      weightedWad: wadData?.weightedWad
    };
  });
  
  return {
    stockCode,
    stockName,
    data: enhancedData
  };
}

// Mock数据生成器
export const generateMarketDataMock: MockDataGenerator<MarketData> = async (params: MarketDataParams) => {
  const { stockCode = 'SH600000' } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
    'SH000001': '上证指数',
    'SZ399001': '深成指',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  
  // 生成模拟的日线数据
  const mockDailyData = [];
  // 设置指数基准值：上证指数 4085.50 / 深成指 10256
  let basePrice = 850;
  if (stockCode === 'SH000001') {
    basePrice = 408550; // 上证指数 4085.50
    // 打印系统日志
    console.log('[System] UI Refined, Base Index: 4085.50');
  } else if (stockCode === 'SZ399001') {
    basePrice = 1025678; // 深成指 10256.78
  }
  const now = Date.now();
  
  for (let i = 30; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 20;
    let price;
    let highChange;
    let lowChange;
    
    if (stockCode === 'SH000001' || stockCode === 'SZ399001') {
      // 指数价格波动范围更大
      price = basePrice + change * i * 10;
      highChange = Math.random() * 500;
      lowChange = Math.random() * 500;
    } else {
      // 普通股票价格限制在合理范围内
      price = Math.max(700, Math.min(1000, basePrice + change * i));
      highChange = Math.random() * 15;
      lowChange = Math.random() * 15;
    }
    
    mockDailyData.push({
      timestamp: now - (i * 24 * 60 * 60 * 1000),
      open: price,
      high: price + highChange,
      low: Math.max(price - lowChange, basePrice * 0.95), // 不低于基准价的95%
      close: price,
      volume: Math.random() * 10000000,
      amount: price * Math.random() * 10000000
    });
  }
  
  return enhanceMarketDataWithWAD(mockDailyData, stockCode, stockName);
};

export async function fetchMarketData(
  params: MarketDataParams
): Promise<ApiResponse<MarketData>> {
  try {
    // 首先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      // 直接返回模拟数据，确保完整的ApiResponse格式
      return apiGet<MarketData>(
        '/market/data',
        params,
        { requiresAuth: false },
        generateMarketDataMock
      );
    }
    
    // 首先尝试从Tushare获取真实数据
    const { stockCode, startDate, endDate } = params;
    
    // 获取股票基本信息
    const stockBasic = await getTushareStockBasic(stockCode);
    
    // 获取历史日线数据
    const dailyData = await getTushareDailyData(stockCode, startDate, endDate);
    
    if (dailyData && dailyData.length > 0 && stockBasic) {
      // 转换Tushare数据格式
      const convertedData = convertTushareDailyToOHLCV(dailyData);
      
      // 使用WAD算法增强市场数据
      const marketData = enhanceMarketDataWithWAD(convertedData, stockCode, stockBasic.name);
      
      // 返回真实数据增强的结果，确保完整的ApiResponse格式
      return {
        code: 200,
        msg: 'success',
        data: marketData,
        requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        timestamp: Date.now()
      };
    }
  } catch (error) {
    // 如果Tushare数据获取失败，直接抛出错误
    console.error('Failed to fetch Tushare data for market data:', error);
    throw new Error('Failed to fetch market data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
  
  // 默认返回模拟数据
  console.info('Falling back to mock data');
  return apiGet<MarketData>(
    '/market/data',
    params,
    { requiresAuth: false },
    generateMarketDataMock
  );
}

// 行业热门板块评分接口
export interface IndustryScore {
  industry: string; // 行业名称
  score: number; // 热门评分 (0-100)
  rank: number; // 排名
  change: number; // 排名变化 (正数为上升，负数为下降)
  hotStocks: string[]; // 热门股票
  trend: 'up' | 'down' | 'stable'; // 趋势
  description: string; // 行业描述
}

/**
 * 获取行业热门板块评分
 * @returns 行业热门板块评分列表
 */
export async function fetchIndustryScores(): Promise<ApiResponse<IndustryScore[]>> {
  // 模拟数据，实际项目中可替换为真实API调用
  const mockData: IndustryScore[] = [
    { 
      industry: '银行', 
      score: 85, 
      rank: 1, 
      change: 0, 
      hotStocks: ['招商银行', '平安银行', '浦发银行'], 
      trend: 'up', 
      description: '银行板块受益于政策支持，业绩稳定增长'
    },
    { 
      industry: '电气设备', 
      score: 82, 
      rank: 2, 
      change: 1, 
      hotStocks: ['宁德时代', '比亚迪', '隆基绿能'], 
      trend: 'up', 
      description: '新能源行业持续高景气，订单充足'
    },
    { 
      industry: '饮料制造', 
      score: 78, 
      rank: 3, 
      change: -1, 
      hotStocks: ['贵州茅台', '五粮液', '泸州老窖'], 
      trend: 'stable', 
      description: '白酒行业需求平稳，高端酒表现突出'
    },
    { 
      industry: '电子', 
      score: 75, 
      rank: 4, 
      change: 2, 
      hotStocks: ['海康威视', '立讯精密', '歌尔股份'], 
      trend: 'up', 
      description: '消费电子行业复苏迹象明显'
    },
    { 
      industry: '保险', 
      score: 70, 
      rank: 5, 
      change: -2, 
      hotStocks: ['中国平安', '中国人寿', '中国人保'], 
      trend: 'down', 
      description: '保险行业转型中，短期业绩承压'
    },
    { 
      industry: '旅游综合', 
      score: 68, 
      rank: 6, 
      change: 3, 
      hotStocks: ['中国中免', '宋城演艺', '中青旅'], 
      trend: 'up', 
      description: '旅游市场持续恢复，免税业务增长迅速'
    },
    { 
      industry: '房地产开发', 
      score: 62, 
      rank: 7, 
      change: -1, 
      hotStocks: ['万科A', '保利发展', '招商蛇口'], 
      trend: 'stable', 
      description: '房地产政策逐步放松，行业底部企稳'
    },
  ];

  return {
    code: 200,
    msg: 'success',
    data: mockData,
    requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    timestamp: Date.now()
  };
}

/**
 * 获取特定行业的评分
 * @param industry 行业名称
 * @returns 行业评分信息
 */
export async function fetchIndustryScore(industry: string): Promise<ApiResponse<IndustryScore | null>> {
  try {
    const response = await fetchIndustryScores();
    const industryScore = response.data.find(item => item.industry === industry) || null;
    return {
      code: 200,
      msg: 'success',
      data: industryScore,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch industry score:', error);
    return {
      code: 500,
      msg: 'Failed to fetch industry score',
      data: null,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}