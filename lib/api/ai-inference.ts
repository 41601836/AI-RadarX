// AI推理相关API接口
import { apiGet } from './common/fetch';
import { ApiResponse } from './common/response';
import { StockBasicInfo } from './market';

// 情报分类标签类型
export type IntelligenceTag = 'SIGINT' | 'HUMINT' | 'OSINT' | 'FININT' | 'TECHINT';

// 情报分类标签接口
export interface IntelligenceTagItem {
  type: IntelligenceTag;
  description: string;
  level: 'high' | 'medium' | 'low';
}

// AI选股情报简报接口
export interface IntelligenceBriefData {
  stock: StockBasicInfo;
  tags: IntelligenceTagItem[]; // 情报分类标签
  selectionLogic: {
    overallScore: number;
    factors: Array<{
      name: string;
      score: number;
      description: string;
    }>;
  };
  seatGame: {
    majorSeats: Array<{
      name: string;
      direction: 'buy' | 'sell' | 'neutral';
      amount: string;
      influence: string;
    }>;
    gameResult: 'bull' | 'bear' | 'balanced';
    conclusion: string;
  };
  riskControl: {
    hardThresholds: Array<{
      name: string;
      value: string;
      status: 'safe' | 'warning' | 'danger';
    }>;
    dynamicRisks: Array<{
      type: string;
      level: 'low' | 'medium' | 'high';
      description: string;
      time: string;
    }>;
  };
  decisionSummary: string; // 10字以内的决策总结
}

/**
 * 获取AI选股情报简报
 * @param stockCode 股票代码
 * @returns AI选股情报简报数据
 */
export async function fetchIntelligenceBrief(
  stockCode: string
): Promise<ApiResponse<IntelligenceBriefData>> {
  return apiGet<IntelligenceBriefData>('/ai-inference/intelligence-brief', {
    stockCode
  }, {
    useMock: true, // 在网络波动时使用mock数据
    requiresAuth: false // AI简报API不需要认证
  });
}
