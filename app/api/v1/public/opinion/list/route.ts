import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../../lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '../../../../../lib/api/common/errors';
import { fetchPublicOpinionList } from '../../../../../lib/api/publicOpinion/list';

/**
 * 获取股票舆情详情列表
 * 接口路径：/api/v1/public/opinion/list
 * 请求方法：GET
 */
async function handlePublicOpinionListRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode');
  const timeRange = searchParams.get('timeRange');
  const sentimentType = searchParams.get('sentimentType');
  const pageNum = searchParams.get('pageNum');
  const pageSize = searchParams.get('pageSize');
  
  // 验证必要参数
  if (!stockCode) {
    return NextResponse.json(
      errorResponse(badRequestError('stockCode is required')),
      { status: 400 }
    );
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    return NextResponse.json(
      errorResponse(stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字')),
      { status: 400 }
    );
  }
  
  // 验证分页参数
  const pageNumInt = pageNum ? parseInt(pageNum, 10) : 1;
  const pageSizeInt = pageSize ? parseInt(pageSize, 10) : 20;
  
  if (pageNumInt < 1) {
    return NextResponse.json(
      errorResponse(badRequestError('pageNum参数必须大于0')),
      { status: 400 }
    );
  }
  
  if (pageSizeInt < 1 || pageSizeInt > 100) {
    return NextResponse.json(
      errorResponse(badRequestError('pageSize参数必须在1-100之间')),
      { status: 400 }
    );
  }
  
  // 验证timeRange参数（如果提供）
  const validTimeRanges = ['1d', '3d', '7d', '30d'];
  if (timeRange && !validTimeRanges.includes(timeRange)) {
    return NextResponse.json(
      errorResponse(badRequestError('timeRange参数必须是1d/3d/7d/30d之一')),
      { status: 400 }
    );
  }
  
  // 验证sentimentType参数（如果提供）
  const validSentimentTypes = ['positive', 'negative', 'neutral'];
  if (sentimentType && !validSentimentTypes.includes(sentimentType)) {
    return NextResponse.json(
      errorResponse(badRequestError('sentimentType参数必须是positive/negative/neutral之一')),
      { status: 400 }
    );
  }
  
  // 调用业务逻辑获取舆情详情列表
  const publicOpinionListData = await fetchPublicOpinionList({
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
