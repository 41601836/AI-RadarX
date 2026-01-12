import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { generateChipDistributionMock } from '@/lib/api/chip/distribution';
import { ChipDistributionParams } from '@/lib/api/chip/distribution';

/**
 * 获取单只股票筹码分布数据
 * 接口路径：/api/v1/chip/distribution
 * 请求方法：GET
 */
async function handleChipDistributionRequest(request: NextRequest) {
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
  
  // 直接调用Mock数据生成器，避免循环调用
  const params: ChipDistributionParams = { stockCode, startDate, endDate };
  const chipDistributionData = await generateChipDistributionMock(params);
  
  return chipDistributionData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleChipDistributionRequest);
}