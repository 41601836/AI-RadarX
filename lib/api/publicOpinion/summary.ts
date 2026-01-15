// 舆情汇总API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { newsAggregator } from './aggregator';
import { formatDateTime, isValidStockCode } from '../common/utils'; // 导入通用工具函数

export interface OpinionSummaryParams {
  stockCode: string;
  timeRange?: string; // 时间范围（1d/3d/7d/30d），默认 7d
}

export interface OpinionHotEvent {
  eventId: string;
  eventTitle: string;
  eventTime: string;
  eventInfluence: number; // 事件影响力评分（0-100）
  eventSentiment: 'positive' | 'negative' | 'neutral'; // 事件情绪
}

export interface OpinionTrendData {
  time: string;
  score: number;
}

export interface OpinionSummaryData {
  stockCode: string;
  stockName: string;
  opinionScore: number; // 舆情综合评分（0-100，越高越正面）
  positiveRatio: number; // 正面舆情占比
  negativeRatio: number; // 负面舆情占比
  neutralRatio: number; // 中性舆情占比
  hotEvents: OpinionHotEvent[];
  opinionTrend: OpinionTrendData[];
  _dataSource?: string; // 数据源标识（可选）
}

// Mock数据生成器
export const generateOpinionSummaryMock: MockDataGenerator<OpinionSummaryData> = async (params: OpinionSummaryParams) => {
  const { stockCode, timeRange = '7d' } = params || {};
  
  // 验证股票代码格式
  if (!stockCode || !isValidStockCode(stockCode)) {
    throw stockCodeFormatError();
  }
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || `模拟股票${stockCode.slice(-4)}`;
  
  // 生成随机舆情评分（0-100）
  const generateRandomScore = (): number => {
    return Math.floor(Math.random() * 101);
  };
  
  // 根据时间范围确定天数
  const getDaysFromTimeRange = (timeRange?: string): number => {
    switch (timeRange) {
      case '1d': return 1;
      case '3d': return 3;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  };
  
  // 生成随机舆情趋势数据
  const generateOpinionTrend = (days: number): OpinionSummaryData['opinionTrend'] => {
    const trend: OpinionSummaryData['opinionTrend'] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      trend.push({
        time: formatDateTime(date),
        score: generateRandomScore()
      });
    }
    
    return trend;
  };
  
  // 生成热门事件
  const generateHotEvents = (count: number = 3): OpinionHotEvent[] => {
    const events: OpinionHotEvent[] = [];
    const eventTemplates = [
      {
        title: '公司发布季度财报，营收增长超过预期',
        sentiment: 'positive' as const
      },
      {
        title: '行业政策调整，对公司业务产生一定影响',
        sentiment: 'negative' as const
      },
      {
        title: '公司宣布与行业龙头达成合作协议',
        sentiment: 'positive' as const
      },
      {
        title: '公司高管变动，新任CEO上任',
        sentiment: 'neutral' as const
      },
      {
        title: '公司产品获得重要认证',
        sentiment: 'positive' as const
      },
      {
        title: '市场竞争加剧，公司市场份额略有下滑',
        sentiment: 'negative' as const
      },
      {
        title: '公司发布新产品，市场反响热烈',
        sentiment: 'positive' as const
      }
    ];
    
    for (let i = 0; i < count; i++) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const eventTime = new Date(Date.now() - i * 86400000);
      
      events.push({
        eventId: `event-${Date.now()}-${i}`,
        eventTitle: template.title,
        eventTime: formatDateTime(eventTime),
        eventInfluence: generateRandomScore(),
        eventSentiment: template.sentiment
      });
    }
    
    return events;
  };
  
  const days = getDaysFromTimeRange(timeRange);
  
  // 生成舆情比例（确保和为1）
  const positiveRatio = parseFloat((Math.random() * 0.7).toFixed(2));
  const negativeRatio = parseFloat((Math.random() * (0.9 - positiveRatio)).toFixed(2));
  const neutralRatio = parseFloat((1 - positiveRatio - negativeRatio).toFixed(2));
  
  return {
    stockCode,
    stockName,
    opinionScore: generateRandomScore(),
    positiveRatio,
    negativeRatio,
    neutralRatio,
    hotEvents: generateHotEvents(),
    opinionTrend: generateOpinionTrend(days)
  };
};

export async function fetchOpinionSummary(
  params: OpinionSummaryParams
): Promise<ApiResponse<OpinionSummaryData>> {
  const { stockCode, timeRange = '7d' } = params;
  let dataSource = 'Local-API'; // 默认数据源
  
  try {
    // 1. 尝试调用本地后端API
    console.info('Trying to fetch from local backend API');
    const response = await apiGet<OpinionSummaryData>(
      '/public-opinion/summary',
      params,
      { requiresAuth: false }
    );
    
    if (response.code === 200) {
      dataSource = 'Local-API';
      // 增强响应，添加数据源标识
      return {
        ...response,
        data: {
          stockCode: response.data?.stockCode ?? '',
          stockName: response.data?.stockName ?? '未知股票',
          opinionScore: response.data?.opinionScore ?? 0,
          positiveRatio: response.data?.positiveRatio ?? 0,
          negativeRatio: response.data?.negativeRatio ?? 0,
          neutralRatio: response.data?.neutralRatio ?? 0,
          hotEvents: response.data?.hotEvents ?? [],
          opinionTrend: response.data?.opinionTrend ?? [],
          _dataSource: dataSource
        }
      };
    }
  } catch (localApiError) {
    console.warn('Local backend API failed, falling back to NewsAggregator:', localApiError);
    // 继续尝试下一级兜底
  }
  
  // 2. 使用NewsAggregator生成舆情摘要
  try {
    console.info('Using NewsAggregator to generate opinion summary');
    const summaryData = await newsAggregator.generateOpinionSummary(stockCode, timeRange);
    dataSource = 'NewsAggregator';
    
    // 返回聚合后的舆情摘要
    return {
      code: 200,
      msg: 'success',
      data: {
        ...summaryData,
        _dataSource: dataSource
      },
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('All real data sources failed:', error);
    throw new ApiError(500, 'Failed to fetch opinion summary from real sources');
  }
}
