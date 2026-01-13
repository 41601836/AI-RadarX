// 技术指标API
import { apiGet } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { stockCodeFormatError } from '../common/errors';

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

export async function fetchTechIndicatorData(
  params: TechIndicatorParams
): Promise<ApiResponse<TechIndicatorData>> {
  // 验证股票代码格式
  if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
    throw stockCodeFormatError();
  }
  return apiGet<TechIndicatorData>('/v1/tech/indicator/data', params);
}
