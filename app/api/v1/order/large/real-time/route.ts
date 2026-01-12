import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { fetchLargeOrderRealTime, generateLargeOrderRealTimeMock, LargeOrderRealTimeParams } from '@/lib/api/largeOrder/realTime';
import { successResponse } from '@/lib/api/common/response';


/**
 * API处理函数
 * 接口路径：/v1/order/large/real-time
 * 请求方法：GET
 */
async function handleOrderLargeRealTimeRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode') || '';

  const largeOrderThreshold = searchParams.get('largeOrderThreshold') ? parseInt(searchParams.get('largeOrderThreshold')!, 10) : undefined;
  
  // 验证必要参数
  if (!stockCode) {
    throw badRequestError('stockCode is required');
  }
  
  // 验证股票代码格式
  const stockCodeRegex = /^(SH|SZ)\d{6}$/;
  if (!stockCodeRegex.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字');
  }

  try {
    // 直接调用Mock数据生成器，避免循环调用
    const mockParams: LargeOrderRealTimeParams = {
      stockCode,
      largeOrderThreshold
    };
    
    const mockData = await generateLargeOrderRealTimeMock(mockParams);
    
    // 返回模拟数据，apiHandler会自动包装成标准格式
    return mockData;
  } catch (error) {
    console.error('Mock数据生成失败:', error);
    
    // 终极降级：返回空的默认数据结构
    return {
      stockCode,
      stockName: '未知股票',
      currentPrice: 0,
      totalLargeOrderAmount: 0,
      largeOrderNetInflow: 0,
      largeOrderRatio: 0,
      realTimeLargeOrders: [],
      abnormalSignal: [],
      orderPower: { buyAmount: 0, sellAmount: 0, buyRatio: 0, sellRatio: 0 }
    };
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleOrderLargeRealTimeRequest);
}
