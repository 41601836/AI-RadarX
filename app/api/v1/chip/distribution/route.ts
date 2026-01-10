import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '../../../../lib/api/common/errors';
import { fetchChipDistribution } from '../../../../lib/api/chip/distribution';

/**
 * 获取单只股票筹码分布数据
 * 接口路径：/api/v1/chip/distribution
 * 请求方法：GET
 */
async function handleChipDistributionRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
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
  
  // 调用业务逻辑获取筹码分布数据
  const chipDistributionData = await fetchChipDistribution({ stockCode, startDate, endDate });
  
  return chipDistributionData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleChipDistributionRequest);
}