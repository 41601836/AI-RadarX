// K线形态识别API
import { ApiResponse } from '../common/response';
import { apiGet } from '../common/fetch';
import { stockCodeFormatError } from '../common/errors';

export interface KlinePatternParams {
  stockCode: string;
  cycleType?: 'day' | 'week' | 'month' | '60min'; // 周期类型
  days?: number; // 统计天数
}

export interface KlinePatternItem {
  patternName: string;
  patternType: string;
  startDate: string;
  endDate: string;
  strengthScore: number; // 形态强度评分（0-100）
  trendPrediction: string;
}

export interface KlinePatternData {
  stockCode: string;
  stockName: string;
  cycleType: string;
  patternList: KlinePatternItem[];
  overallStrength: number; // 整体形态强度（0-100）
}

export async function recognizeKlinePattern(
  params: KlinePatternParams
): Promise<ApiResponse<KlinePatternData>> {
  // 验证股票代码格式
  if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
    throw stockCodeFormatError();
  }
  // 实现K线形态识别逻辑
  return apiGet<KlinePatternData>('/tech/kline/pattern/recognize', params);
}
