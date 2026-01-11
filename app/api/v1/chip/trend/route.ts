import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { fetchChipTrend } from '@/lib/api/chip/trend';

/**
 * 获取股票筹码趋势变化
 * 接口路径：/api/v1/chip/trend
 * 请求方法：GET
 */
async function handleChipTrendRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode') || '';
  const days = searchParams.get('days');
  
  // 验证必要参数
  if (!stockCode) {
    throw badRequestError('stockCode is required');
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字');
  }
  
  // 验证days参数（如果提供）
  const daysInt = days ? parseInt(days, 10) : undefined;
  if (daysInt && (daysInt <= 0 || daysInt > 365)) {
    throw badRequestError('days参数必须在1-365之间');
  }
  
  // 调用业务逻辑获取筹码趋势数据
  const chipTrendData = await fetchChipTrend({ stockCode, days: daysInt });
  
  return chipTrendData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleChipTrendRequest);
}
