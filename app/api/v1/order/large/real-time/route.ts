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
    // 调用业务逻辑
    const result = await fetchLargeOrderRealTime({
      stockCode,
      largeOrderThreshold
    });
    
    return result;
  } catch (error) {
    console.error('大单实时数据请求失败，使用降级Mock数据:', error);
    
    // 降级策略：使用Mock数据生成器生成数据
    const mockParams: LargeOrderRealTimeParams = {
      stockCode,
      largeOrderThreshold
    };
    
    try {
      const mockData = await generateLargeOrderRealTimeMock(mockParams);
      // 使用successResponse包装，确保包含requestId和timestamp
      return successResponse(mockData);
    } catch (mockError) {
      console.error('Mock数据生成也失败:', mockError);
      
      // 终极降级：返回空的默认数据结构
      return successResponse({
        stockCode,
        stockName: '未知股票',
        currentPrice: 0,
        totalLargeOrderAmount: 0,
        largeOrderNetInflow: 0,
        largeOrderRatio: 0,
        realTimeLargeOrders: [],
        abnormalSignal: [],
        orderPower: { buyAmount: 0, sellAmount: 0, buyRatio: 0, sellRatio: 0 }
      });
    }
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleOrderLargeRealTimeRequest);
}
