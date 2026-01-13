import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, badRequestError } from '../../../../lib/api/common/errors';
import { apiHandler } from '../../../../lib/api/common/handler';

// 腾讯财经API基础URL
const TENCENT_FINANCE_URL = 'https://qt.gtimg.cn/q=';

/**
 * 处理股票行情请求
 * @param request 请求对象
 * @returns 股票价格和分时数据
 */
async function handleQuoteRequest(request: NextRequest) {
  // 获取查询参数
  const searchParams = request.nextUrl.searchParams;
  const symbols = searchParams.get('symbols');
  
  // 验证必要参数
  if (!symbols) {
    return NextResponse.json(
      errorResponse(badRequestError('symbols parameter is required')),
      { status: 400 }
    );
  }
  
  // 解析股票代码列表
  const symbolList = symbols.split(',');
  
  // 验证股票代码数量
  if (symbolList.length === 0 || symbolList.length > 100) {
    return NextResponse.json(
      errorResponse(badRequestError('symbols must be 1-100 stock codes')),
      { status: 400 }
    );
  }
  
  try {
    // 构建腾讯财经API请求URL
    const url = `${TENCENT_FINANCE_URL}${symbolList.join(',')}`;
    
    // 发起请求（仅在服务端完成），设置超时保护
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain; charset=gbk',
        'Accept-Charset': 'gbk, utf-8',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`Tencent Finance API error: ${response.status}`);
    }
    
    // 解析响应数据
    const data = await response.text();
    
    // 解析腾讯财经返回的文本数据
    const result = parseTencentFinanceData(data);
    
    // 返回格式化后的响应（使用标准的successResponse）
    return NextResponse.json({
      code: 200,
      msg: 'success',
      data: result,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now(),
    });
  } catch (error) {
    // 处理错误
    let errorObj: Error;
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // 超时错误，返回服务不可用
        return NextResponse.json(
          errorResponse(new Error('外部API请求超时')),
          { status: 503 }
        );
      }
      errorObj = error;
    } else {
      errorObj = new Error('未知错误');
    }
    
    return NextResponse.json(
      errorResponse(errorObj),
      { status: 500 }
    );
  }
}

/**
 * 解析腾讯财经返回的文本数据
 * @param data 原始文本数据
 * @returns 格式化后的股票数据
 */
function parseTencentFinanceData(data: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = data.split(';');
  
  lines.forEach(line => {
    if (!line || !line.startsWith('v_')) return;
    
    try {
      // 提取股票代码和数据
      const [keyPart, valuePart] = line.split('=');
      if (!keyPart || !valuePart) return;
      
      // 提取股票代码
      const symbol = keyPart.substring(2);
      
      // 解析数据部分
      const dataStr = valuePart.replace(/^"|"$/g, '');
      const dataArray = dataStr.split('~');
      
      if (dataArray.length < 30) return;
      
      // 提取关键数据
      result[symbol] = {
        name: dataArray[1],                  // 股票名称
        price: parseFloat(dataArray[3]),     // 当前价格
        open: parseFloat(dataArray[5]),      // 开盘价
        high: parseFloat(dataArray[33]),     // 最高价
        low: parseFloat(dataArray[34]),      // 最低价
        volume: parseInt(dataArray[36]),     // 成交量
        amount: parseFloat(dataArray[37]),   // 成交额
        preClose: parseFloat(dataArray[4]),  // 昨收价
        change: parseFloat(dataArray[32]),   // 涨跌额
        changePercent: parseFloat(dataArray[31]), // 涨跌幅
        timestamp: Date.now(),               // 当前时间戳
      };
    } catch (error) {
      // 忽略解析错误的行
      console.error(`Failed to parse line: ${line}`, error);
    }
  });
  
  return result;
}

// 导出GET方法
export async function GET(request: NextRequest) {
  return apiHandler(request, handleQuoteRequest);
}
