import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { fetchHeatFlowStockSeat } from '@/lib/api/heatFlow/stockSeat';


/**
 * API处理函数
 * 接口路径：/v1/heat/flow/stock/seat
 * 请求方法：GET
 */
async function handleHeatFlowStockSeatRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get('stockCode') || '';

  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  // 验证必要参数
  if (!stockCode) {
    throw badRequestError('stockCode is required');
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字');
  }

  // 调用业务逻辑
  const result = await fetchHeatFlowStockSeat({
    stockCode,
    startDate,
    endDate
  });
  
  return result;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleHeatFlowStockSeatRequest);
}
