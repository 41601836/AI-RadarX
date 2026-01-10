import { NextRequest, NextResponse } from 'next/server';
import { successResponse, ApiResponse } from './response';
import { errorResponse, internalServerError } from './errors';

/**
 * 统一的API处理函数
 * @param request Next.js请求对象
 * @param handler 具体的API处理逻辑
 * @returns Next.js响应对象
 */
export async function apiHandler<T>(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<T | ApiResponse<T>>
): Promise<NextResponse> {
  try {
    // 执行具体的API处理逻辑
    const result = await handler(request);
    
    // 检查返回结果是否已经是ApiResponse类型
    if (result && typeof result === 'object' && 'code' in result && 'msg' in result && 'data' in result) {
      // 已经是标准的ApiResponse格式，直接返回
      return NextResponse.json(result);
    } else {
      // 不是标准格式，使用successResponse包装后返回
      return NextResponse.json(successResponse(result as T));
    }
  } catch (error) {
    console.error('API处理错误:', error);
    
    // 返回错误响应
    return NextResponse.json(
      errorResponse(internalServerError(error as Error)),
      { status: 500 }
    );
  }
}

/**
 * 带参数验证的API处理函数
 * @param request Next.js请求对象
 * @param validator 参数验证函数
 * @param handler 具体的API处理逻辑
 * @returns Next.js响应对象
 */
export async function apiHandlerWithValidation<T>(
  request: NextRequest,
  validator: (request: NextRequest) => Promise<boolean>,
  handler: (request: NextRequest) => Promise<T>
): Promise<NextResponse> {
  try {
    // 执行参数验证
    const isValid = await validator(request);
    
    if (!isValid) {
      // 参数验证失败，返回400错误
      return NextResponse.json(
        errorResponse(new Error('参数验证失败')),
        { status: 400 }
      );
    }
    
    // 执行具体的API处理逻辑
    const result = await handler(request);
    
    // 返回成功响应
    return NextResponse.json(successResponse(result));
  } catch (error) {
    console.error('API处理错误:', error);
    
    // 返回错误响应
    return NextResponse.json(
      errorResponse(internalServerError(error as Error)),
      { status: 500 }
    );
  }
}
