import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, badRequestError, unauthorizedError } from '../../../lib/api/common/errors';
import { apiHandler } from '../../../lib/api/common/handler';

// Tushare API基础配置
const TUSHARE_BASE_URL = 'http://api.tushare.pro';

// 具体的API处理逻辑
async function handleTushareRequest(request: NextRequest) {
  // 获取Tushare Token（仅从服务端环境变量获取）
  const token = process.env.TUSHARE_TOKEN;
  
  // 检查Token是否存在
  if (!token) {
    // 返回标准错误码，引导前端切换到Mock逻辑
    return NextResponse.json(
      errorResponse(unauthorizedError('TUSHARE_TOKEN is not configured on server')),
      { status: 401 }
    );
  }
  
  // 解析前端请求参数
  const requestBody = await request.json();
  const { api_name, params, fields = '*' } = requestBody;
  
  // 验证必要参数
  if (!api_name) {
    return NextResponse.json(
      errorResponse(badRequestError('api_name is required')),
      { status: 400 }
    );
  }
  
  // 封装标准的Tushare POST请求
  const response = await fetch(TUSHARE_BASE_URL, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_name,
      token,
      params,
      fields,
    }),
  });
  
  // 处理402(积分不足)错误
  if (response.status === 402) {
    return NextResponse.json(
      errorResponse(new Error('Tushare API credits insufficient')),
      { status: 402 }
    );
  }
  
  // 获取响应数据
  const data = await response.json();
  
  // 返回Tushare API的原始响应
  return data;
}

export async function POST(request: NextRequest) {
  return apiHandler(request, handleTushareRequest);
}
