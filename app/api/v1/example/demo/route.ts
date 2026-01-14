import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { badRequestError, stockCodeFormatError, noHotMoneyRecordError } from '@/lib/api/common/errors';
import { successResponse, ApiResponse } from '@/lib/api/common/response';
import { isValidStockCode } from '@/lib/api/common/utils';

/**
 * 演示 API - 展示统一响应和异常处理机制
 * @param request Next.js 请求对象
 * @returns ApiResponse
 */
async function handleDemoRequest(request: NextRequest): Promise<ApiResponse<any>> {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode');
  const testError = searchParams.get('testError');
  
  // 1. 演示参数验证和错误处理
  if (!stockCode) {
    throw badRequestError('stockCode 参数是必填的');
  }
  
  // 2. 演示业务规则验证
  if (!isValidStockCode(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为 SH/SZ 开头的 6 位数字');
  }
  
  // 3. 演示业务错误处理
  if (testError === 'hotMoney') {
    throw noHotMoneyRecordError('游资数据暂无记录');
  }
  
  // 4. 演示服务器错误处理
  if (testError === 'server') {
    throw new Error('服务器内部错误演示');
  }
  
  // 5. 演示成功响应
  const demoData = {
    stockCode,
    stockName: `股票${stockCode.slice(-4)}`,
    currentPrice: 85000, // 价格单位为分
    marketStatus: '交易中',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
  
  return successResponse(demoData, '获取演示数据成功');
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleDemoRequest);
}

export async function POST(request: NextRequest) {
  return apiHandler(request, handleDemoRequest);
}