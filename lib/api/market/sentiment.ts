// 市场情绪相关API定义
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { getTushareDailyData, getTushareStockBasic } from '../common/tushare';

// 指数行情数据接口
export interface IndexQuote {
  ts_code: string;    // 指数代码
  name: string;       // 指数名称
  price: number;      // 最新价格
  change: number;     // 涨跌额
  change_pct: number; // 涨跌幅(%)
  volume: number;     // 成交量(手)
  amount: number;     // 成交金额(万元)
  open: number;       // 开盘价
  high: number;       // 最高价
  low: number;        // 最低价
  pre_close: number;  // 昨收价
}

// 市场广度数据接口
export interface MarketBreadth {
  total: number;      // 总家数
  up: number;         // 上涨家数
  down: number;       // 下跌家数
  flat: number;       // 平盘家数
  up_ratio: number;   // 上涨占比(%)
  down_ratio: number; // 下跌占比(%)
  flat_ratio: number; // 平盘占比(%)
}

// 资金流向数据接口
export interface CapitalFlow {
  north_net_inflow: number;  // 北向资金净流入(万元)
  north_buy: number;         // 北向资金买入(万元)
  north_sell: number;        // 北向资金卖出(万元)
  south_net_inflow: number;  // 南向资金净流入(万元)
  south_buy: number;         // 南向资金买入(万元)
  south_sell: number;        // 南向资金卖出(万元)
}

// 情绪打分数据接口
export interface SentimentScore {
  score: number;             // 情绪分数(0-100)
  level: 'extreme_pessimistic' | 'pessimistic' | 'neutral' | 'optimistic' | 'extreme_optimistic'; // 情绪等级
  description: string;       // 情绪描述
  factors: {
    up_ratio_contribution: number;  // 上涨家数占比贡献
    volume_contribution: number;     // 成交量变化贡献
  };
}

// 成交量趋势数据接口
export interface VolumeTrend {
  timestamp: number;  // 时间戳
  volume: number;     // 成交量(手)
  amount: number;     // 成交金额(万元)
}

// 北向资金趋势数据接口
export interface NorthCapitalTrend {
  timestamp: number;  // 时间戳
  net_inflow: number; // 净流入金额(万元)
}

// 市场情绪综合数据接口
export interface MarketSentiment {
  index_quotes: IndexQuote[];        // 指数行情列表
  market_breadth: MarketBreadth;     // 市场广度
  capital_flow: CapitalFlow;         // 资金流向
  sentiment_score: SentimentScore;   // 情绪打分
  volume_trend: VolumeTrend[];       // 成交量趋势(最近30分钟)
  north_capital_trend: NorthCapitalTrend[]; // 北向资金趋势(最近30分钟)
  update_time: string;               // 更新时间
}

// 模拟数据生成器
export const generateMarketSentimentMock: MockDataGenerator<MarketSentiment> = async () => {
  // 模拟三大指数数据
  const indexQuotes: IndexQuote[] = [
    {
      ts_code: '000001.SH',
      name: '上证指数',
      price: 4085.50 + (Math.random() - 0.5) * 20,
      change: (Math.random() - 0.5) * 20,
      change_pct: (Math.random() - 0.5) * 0.5,
      volume: Math.floor(Math.random() * 100000000),
      amount: Math.floor(Math.random() * 10000000),
      open: 4085.50 + (Math.random() - 0.5) * 10,
      high: 4085.50 + Math.random() * 15,
      low: 4085.50 - Math.random() * 15,
      pre_close: 4085.50
    },
    {
      ts_code: '399001.SZ',
      name: '深证成指',
      price: 10256.78 + (Math.random() - 0.5) * 50,
      change: (Math.random() - 0.5) * 50,
      change_pct: (Math.random() - 0.5) * 0.5,
      volume: Math.floor(Math.random() * 200000000),
      amount: Math.floor(Math.random() * 20000000),
      open: 10256.78 + (Math.random() - 0.5) * 25,
      high: 10256.78 + Math.random() * 35,
      low: 10256.78 - Math.random() * 35,
      pre_close: 10256.78
    },
    {
      ts_code: '399006.SZ',
      name: '创业板指',
      price: 2018.34 + (Math.random() - 0.5) * 40,
      change: (Math.random() - 0.5) * 40,
      change_pct: (Math.random() - 0.5) * 0.8,
      volume: Math.floor(Math.random() * 150000000),
      amount: Math.floor(Math.random() * 15000000),
      open: 2018.34 + (Math.random() - 0.5) * 20,
      high: 2018.34 + Math.random() * 30,
      low: 2018.34 - Math.random() * 30,
      pre_close: 2018.34
    }
  ];

  // 模拟市场广度数据
  const total = 5000;
  const up = Math.floor(Math.random() * total * 0.8);
  const down = Math.floor(Math.random() * (total - up) * 0.8);
  const flat = total - up - down;
  const up_ratio = (up / total) * 100;
  const down_ratio = (down / total) * 100;
  const flat_ratio = (flat / total) * 100;

  const marketBreadth: MarketBreadth = {
    total,
    up,
    down,
    flat,
    up_ratio,
    down_ratio,
    flat_ratio
  };

  // 模拟资金流向数据
  const capitalFlow: CapitalFlow = {
    north_net_inflow: Math.floor((Math.random() - 0.3) * 100000),
    north_buy: Math.floor(Math.random() * 200000),
    north_sell: Math.floor(Math.random() * 200000),
    south_net_inflow: Math.floor((Math.random() - 0.5) * 50000),
    south_buy: Math.floor(Math.random() * 100000),
    south_sell: Math.floor(Math.random() * 100000)
  };

  // 模拟情绪打分数据
  // 基于上涨家数占比和成交量变化计算
  const baseScore = up_ratio * 0.8;
  const volumeChange = (Math.random() - 0.5) * 20;
  const volumeContribution = volumeChange * 0.2;
  let score = baseScore + volumeContribution;
  score = Math.max(0, Math.min(100, score));

  let level: SentimentScore['level'];
  let description: string;

  if (score >= 80) {
    level = 'extreme_optimistic';
    description = '极度贪婪 (过热)';
  } else if (score >= 60) {
    level = 'optimistic';
    description = '乐观';
  } else if (score >= 40) {
    level = 'neutral';
    description = '中性';
  } else if (score >= 20) {
    level = 'pessimistic';
    description = '悲观';
  } else {
    level = 'extreme_pessimistic';
    description = '极度悲观 (冰点)';
  }

  const sentimentScore: SentimentScore = {
    score,
    level,
    description,
    factors: {
      up_ratio_contribution: baseScore,
      volume_contribution: volumeContribution
    }
  };

  // 模拟成交量趋势数据(最近30分钟)
  const volumeTrend: VolumeTrend[] = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    volumeTrend.push({
      timestamp: now - i * 60 * 1000,
      volume: Math.floor(Math.random() * 10000000) + 5000000,
      amount: Math.floor(Math.random() * 1000000) + 500000
    });
  }

  // 模拟北向资金趋势数据(最近30分钟)
  const northCapitalTrend: NorthCapitalTrend[] = [];
  let cumulativeNetInflow = 0;
  for (let i = 29; i >= 0; i--) {
    const netInflow = Math.floor((Math.random() - 0.4) * 5000);
    cumulativeNetInflow += netInflow;
    northCapitalTrend.push({
      timestamp: now - i * 60 * 1000,
      net_inflow: cumulativeNetInflow
    });
  }

  return {
    index_quotes: indexQuotes,
    market_breadth: marketBreadth,
    capital_flow: capitalFlow,
    sentiment_score: sentimentScore,
    volume_trend: volumeTrend,
    north_capital_trend: northCapitalTrend,
    update_time: new Date().toISOString()
  };
};

/**
 * 获取市场情绪综合数据
 * @returns 市场情绪综合数据
 */
export async function fetchMarketSentiment(): Promise<ApiResponse<MarketSentiment>> {
  try {
    // 检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data for market sentiment');
      return apiGet<MarketSentiment>(
        '/api/v1/market/sentiment',
        {},
        { requiresAuth: false },
        generateMarketSentimentMock
      );
    }

    // 实际调用Tushare API的逻辑
    // TODO: 实现真实的API调用逻辑
    
    // 暂时返回模拟数据
    return apiGet<MarketSentiment>(
      '/api/v1/market/sentiment',
      {},
      { requiresAuth: false },
      generateMarketSentimentMock
    );
  } catch (error) {
    console.error('Failed to fetch market sentiment:', error);
    // 出错时返回模拟数据
    return apiGet<MarketSentiment>(
      '/api/v1/market/sentiment',
      {},
      { requiresAuth: false },
      generateMarketSentimentMock
    );
  }
}

// 更新市场情绪模块的索引文件
export * from './sentiment';
