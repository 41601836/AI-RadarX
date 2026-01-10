// 筹码趋势API
import { ApiResponse } from '../common/response';
import { apiGet } from '../common/fetch';

export interface ChipTrendParams {
  stockCode: string;
  days?: number; // 统计天数，默认 60 天，最大 365 天
}

export interface ChipTrendDayData {
  date: string;
  chipConcentration: number; // 筹码集中度（0-1）
  mainCostPrice: number; // 主力成本价（分）
}

export interface ChipTrendData {
  stockCode: string;
  stockName: string;
  trend: ChipTrendDayData[];
}

export async function fetchChipTrend(
  params: ChipTrendParams
): Promise<ApiResponse<ChipTrendData>> {
  // 实现筹码趋势数据获取逻辑
  return apiGet<ChipTrendData>('/chip/trend', params);
}
