// publicOpinion API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse, PaginationResponse } from '../common/response';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { formatDateTime } from '../common/utils';

// 定义参数接口
export interface PublicOpinionSummaryParams {
  stockCode: string;
  timeRange?: string;
}

// 定义热点事件接口
export interface HotEvent {
  eventId: string;
  eventTitle: string;
  eventTime: string;
  eventInfluence: number; // 事件影响力评分（0-100）
  eventSentiment: 'positive' | 'negative' | 'neutral'; // 事件情绪
}

// 定义舆情评分趋势接口
export interface OpinionTrend {
  time: string;
  score: number;
}

// 定义响应数据接口
export interface PublicOpinionSummaryData {
  stockCode: string;
  stockName: string;
  opinionScore: number; // 舆情综合评分（0-100，越高越正面）
  positiveRatio: number; // 正面舆情占比
  negativeRatio: number; // 负面舆情占比
  neutralRatio: number; // 中性舆情占比
  hotEvents: HotEvent[]; // 核心热点事件
  opinionTrend: OpinionTrend[]; // 舆情评分趋势（按天/小时分组）
}

// Mock数据生成器
export const generatePublicOpinionSummaryMock: MockDataGenerator<PublicOpinionSummaryData> = async (params: PublicOpinionSummaryParams) => {
  const { stockCode = 'SH600000', timeRange = '7d' } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  
  // 生成舆情综合评分（随机70-85分）
  const opinionScore = Math.floor(Math.random() * 16) + 70;
  
  // 生成舆情占比
  const positiveRatio = Math.round((opinionScore / 100) * 100) / 100;
  const negativeRatio = Math.round(((100 - opinionScore) * 0.3) * 100) / 100;
  const neutralRatio = Math.round((1 - positiveRatio - negativeRatio) * 100) / 100;
  
  // 生成热点事件
  const hotEvents: HotEvent[] = [];
  const eventCount = Math.floor(Math.random() * 3) + 2; // 2-4个热点事件
  
  for (let i = 0; i < eventCount; i++) {
    const sentimentOptions: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
    const randomSentiment = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
    
    hotEvents.push({
      eventId: `event-${Date.now()}-${i}`,
      eventTitle: `${stockName}${randomSentiment === 'positive' ? '发布利好消息' : randomSentiment === 'negative' ? '面临市场质疑' : '发布常规公告'}`,
      eventTime: formatDateTime(new Date(Date.now() - (i * 24 * 60 * 60 * 1000))),
      eventInfluence: Math.floor(Math.random() * 31) + 70, // 70-100分
      eventSentiment: randomSentiment
    });
  }
  
  // 生成舆情评分趋势
  const opinionTrend: OpinionTrend[] = [];
  const trendDays = timeRange === '1d' ? 24 : timeRange === '3d' ? 3 : timeRange === '7d' ? 7 : 30;
  
  for (let i = trendDays - 1; i >= 0; i--) {
    const baseScore = opinionScore + (Math.random() - 0.5) * 10;
    opinionTrend.push({
      time: timeRange === '1d' 
        ? `${new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString().substring(11, 13)}:00`
        : new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10),
      score: Math.max(0, Math.min(100, Math.round(baseScore * 100) / 100))
    });
  }
  
  return {
    stockCode,
    stockName,
    opinionScore,
    positiveRatio,
    negativeRatio,
    neutralRatio,
    hotEvents,
    opinionTrend
  };
};

export async function fetchPublicOpinionSummary(
  params: PublicOpinionSummaryParams
): Promise<ApiResponse<PublicOpinionSummaryData>> {
  const { stockCode } = params;
  let dataSource = 'Mock'; // 默认数据源
  
  try {
    // 1. 优先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      dataSource = 'Mock';
      return apiGet<PublicOpinionSummaryData>(
        '/public/opinion/summary',
        params,
        { requiresAuth: false },
        generatePublicOpinionSummaryMock
      );
    }
    
    // 2. 尝试调用本地后端API
    try {
      console.info('Trying to fetch from local backend API');
      const response = await apiGet<PublicOpinionSummaryData>(
        '/public/opinion/summary',
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
  const mockResponse = await apiGet<PublicOpinionSummaryData>(
    '/public/opinion/summary',
    params,
    { requiresAuth: false },
    generatePublicOpinionSummaryMock
  );
  
  return mockResponse;
}
