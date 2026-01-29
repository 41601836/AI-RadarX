import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, badRequestError, unauthorizedError, internalServerError } from '../../../lib/api/common/errors';
import { apiHandler } from '../../../lib/api/common/handler';
import { successResponse } from '../../../lib/api/common/response';

// Tushare API基础配置
const TUSHARE_BASE_URL = 'https://api.tushare.pro';

// 具体的API处理逻辑
async function handleTushareRequest(request: NextRequest) {
  try {
    // 获取Tushare Token（仅从服务端环境变量获取）
    const token = process.env.TUSHARE_TOKEN;

    // 检查Token是否存在
    if (!token) {
      // 返回标准错误码，引导前端切换到Mock逻辑
      throw unauthorizedError('TUSHARE_TOKEN is not configured on server');
    }

    // 解析前端请求参数
    let requestBody;
    try {
      requestBody = await request.json() as { api_name: string; params?: any; fields?: string };
    } catch (error) {
      throw badRequestError('Invalid JSON format in request body');
    }

    const { api_name, params, fields = '*' } = requestBody;

    // 验证必要参数
    if (!api_name) {
      throw badRequestError('api_name is required');
    }

    // 封装标准的Tushare POST请求
    let response;
    try {
      // 设置超时保护
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      response = await fetch(TUSHARE_BASE_URL, {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Tushare API request timeout');
        }
        throw new Error(`Failed to connect to Tushare API: ${error.message}`);
      }
      throw new Error('Failed to connect to Tushare API');
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    let data;

    if (!response.ok) {
      // 处理HTTP错误
      if (response.status === 402) {
        throw new Error('Tushare API credits insufficient');
      }

      // 尝试获取错误信息
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json() as { msg?: string };
          errorMessage = `Tushare API error: ${errorData.msg || errorMessage}`;
        } catch (jsonError) {
          // 如果JSON解析失败，尝试获取文本
          try {
            const errorText = await response.text();
            errorMessage = `Tushare API error: ${errorText || errorMessage}`;
          } catch (textError) {
            // 忽略文本解析错误
          }
        }
      } else {
        // 非JSON响应
        try {
          const errorText = await response.text();
          errorMessage = `Tushare API error: ${errorText || errorMessage}`;
        } catch (textError) {
          // 忽略文本解析错误
        }
      }
      throw new Error(errorMessage);
    }

    // 解析成功响应
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error) {
        throw new Error(`Failed to parse Tushare API response: ${(error as Error).message}`);
      }
    } else {
      // 如果不是JSON，返回错误
      try {
        const text = await response.text();
        throw new Error(`Tushare API returned non-JSON response: ${text}`);
      } catch (textError) {
        throw new Error('Tushare API returned invalid response');
      }
    }

    // 返回标准的ApiResponse格式
    return successResponse(data);
  } catch (error) {
    // 所有错误都在这里捕获并统一返回格式
    console.error('Tushare API Error:', error);

    let errorMessage = 'Internal Server Error';
    let errorCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // 根据错误类型设置不同的错误码
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        errorCode = 401;
      } else if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
        errorCode = 400;
      } else if (errorMessage.includes('402') || errorMessage.includes('credits insufficient')) {
        errorCode = 402;
      } else if (errorMessage.includes('timeout')) {
        errorCode = 504;
      }
    }

    // 严格按照ApiResponse格式返回
    return {
      code: errorCode,
      msg: errorMessage,
      data: null,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}

export async function POST(request: NextRequest) {
  return apiHandler(request, handleTushareRequest);
}
