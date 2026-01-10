import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../../lib/api/common/handler';
import { errorResponse, badRequestError, stockCodeFormatError } from '../../../../../lib/api/common/errors';
import { fetchTechKlinePatternRecognize } from '../../../../../lib/api/techIndicator/klinePattern';


/**
 * API处理函数
 * 接口路径：/v1/tech/kline/pattern/recognize
 * 请求方法：GET
 */
async function handleTechKlinePatternRecognizeRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get('stockCode');

  const cycleType = searchParams.get('cycleType');
  const days = searchParams.get('days');
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

  // 调用业务逻辑
  const result = await fetchTechKlinePatternRecognize({
    stockCode,
    cycleType,
    days
  });
  
  return result;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleTechKlinePatternRecognizeRequest);
}
