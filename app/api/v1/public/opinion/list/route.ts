import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { fetchOpinionList } from '@/lib/api/publicOpinion/list';

/**
 * 获取股票舆情详情列表
 * 接口路径：/api/v1/public/opinion/list
 * 请求方法：GET
 */
async function handlePublicOpinionListRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode') || '';
  const timeRange = searchParams.get('timeRange') || undefined;
  const sentimentType = searchParams.get('sentimentType') as 'positive' | 'negative' | 'neutral' | undefined;
  const pageNum = searchParams.get('pageNum');
  const pageSize = searchParams.get('pageSize');
  
  // 验证必要参数
  if (!stockCode) {
    throw badRequestError('stockCode is required');
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字');
  }
  
  // 验证分页参数
  const pageNumInt = pageNum ? parseInt(pageNum, 10) : 1;
  const pageSizeInt = pageSize ? parseInt(pageSize, 10) : 20;
  
  if (pageNumInt < 1) {
    throw badRequestError('pageNum参数必须大于0');
  }
  
  if (pageSizeInt < 1 || pageSizeInt > 100) {
    throw badRequestError('pageSize参数必须在1-100之间');
  }
  
  // 验证timeRange参数（如果提供）
  const validTimeRanges = ['1d', '3d', '7d', '30d'];
  if (timeRange && !validTimeRanges.includes(timeRange)) {
    throw badRequestError('timeRange参数必须是1d/3d/7d/30d之一');
  }
  
  // 验证sentimentType参数（如果提供）
  const validSentimentTypes = ['positive', 'negative', 'neutral'];
  if (sentimentType && !validSentimentTypes.includes(sentimentType)) {
    throw badRequestError('sentimentType参数必须是positive/negative/neutral之一');
  }
  
  // 调用业务逻辑获取舆情详情列表
  const publicOpinionListData = await fetchOpinionList({
    stockCode,
    timeRange,
    sentimentType,
    pageNum: pageNumInt,
    pageSize: pageSizeInt
  });
  
  return publicOpinionListData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handlePublicOpinionListRequest);
}
