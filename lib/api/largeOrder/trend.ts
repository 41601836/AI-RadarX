// 大单趋势API
import { ApiResponse } from '../common/response';
import { apiGet } from '../common/fetch';
import { stockCodeFormatError } from '../common/errors';

export interface LargeOrderTrendParams {
  stockCode: string;
  timeType?: 'minute' | 'day'; // 分时/day，默认 day
  days?: number; // 统计天数
}

export interface LargeOrderTrendItem {
  time: string;
  netInflow: number; // 净流入（分）
  totalBuy: number; // 总买入（分）
  totalSell: number; // 总卖出（分）
  ratio: number; // 大单占比
}

export interface LargeOrderTrendData {
  stockCode: string;
  stockName: string;
  timeType: 'minute' | 'day';
  trend: LargeOrderTrendItem[];
}

export async function fetchLargeOrderTrend(
  params: LargeOrderTrendParams
): Promise<ApiResponse<LargeOrderTrendData>> {
  try {
    // 验证股票代码格式
    if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
      throw stockCodeFormatError();
    }

    // 实现大单趋势数据获取逻辑
    return apiGet<LargeOrderTrendData>('/order/large/trend', params);
  } catch (error) {
    console.error('Error fetching large order trend data:', error);
    throw error;
  }
}
