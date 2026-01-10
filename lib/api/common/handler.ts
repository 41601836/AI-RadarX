import { NextRequest, NextResponse } from 'next/server';
import { successResponse, ApiResponse } from './response';
import { errorResponse, internalServerError, ApiError } from './errors';

/**
 * 根据错误码获取对应的HTTP状态码
 * @param errorCode 业务错误码
 * @returns HTTP状态码
 */
function getHttpStatusCode(errorCode: number): number {
  if (errorCode >= 200 && errorCode < 300) {
    return 200;
  } else if (errorCode >= 400 && errorCode < 500) {
    return errorCode;
  } else if (errorCode >= 500 && errorCode < 600) {
    return errorCode;
  } else if (errorCode >= 60000) {
    // 业务错误码，根据不同的错误类型返回对应的HTTP状态码
    switch (Math.floor(errorCode / 10000)) {
      case 6:
        return 400; // 业务参数错误
      default:
        return 500; // 其他业务错误
    }
  }
  return 500; // 默认返回500
}

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
      const httpStatusCode = getHttpStatusCode((result as any).code);
      return NextResponse.json(result, { status: httpStatusCode });
    } else {
      // 不是标准格式，使用successResponse包装后返回
      return NextResponse.json(successResponse(result as T));
    }
  } catch (error) {
    console.error('API处理错误:', error);
    
    let errorResponseData;
    let httpStatusCode = 500;
    
    if (error instanceof ApiError) {
      // 处理ApiError类型的错误
      errorResponseData = errorResponse(error);
      httpStatusCode = getHttpStatusCode(error.code);
    } else {
      // 处理其他类型的错误
      const apiError = internalServerError(error as Error);
      errorResponseData = errorResponse(apiError);
    }
    
    // 返回错误响应
    return NextResponse.json(errorResponseData, { status: httpStatusCode });
  }
}

/**
 * 带参数验证的API处理函数
 * @param request Next.js请求对象
 * @param validator 参数验证函数，返回boolean或ApiError
 * @param handler 具体的API处理逻辑
 * @returns Next.js响应对象
 */
export async function apiHandlerWithValidation<T>(
  request: NextRequest,
  validator: (request: NextRequest) => Promise<boolean | ApiError>,
  handler: (request: NextRequest) => Promise<T>
): Promise<NextResponse> {
  try {
    // 执行参数验证
    const validationResult = await validator(request);
    
    if (validationResult instanceof ApiError) {
      // 验证失败，返回验证错误
      return NextResponse.json(
        errorResponse(validationResult),
        { status: getHttpStatusCode(validationResult.code) }
      );
    }
    
    if (!validationResult) {
      // 验证失败，返回通用的参数验证错误
      return NextResponse.json(
        errorResponse(internalServerError(new Error('参数验证失败'))),
        { status: 400 }
      );
    }
    
    // 执行具体的API处理逻辑
    const result = await handler(request);
    
    // 返回成功响应
    return NextResponse.json(successResponse(result));
  } catch (error) {
    console.error('API处理错误:', error);
    
    let errorResponseData;
    let httpStatusCode = 500;
    
    if (error instanceof ApiError) {
      // 处理ApiError类型的错误
      errorResponseData = errorResponse(error);
      httpStatusCode = getHttpStatusCode(error.code);
    } else {
      // 处理其他类型的错误
      const apiError = internalServerError(error as Error);
      errorResponseData = errorResponse(apiError);
    }
    
    // 返回错误响应
    return NextResponse.json(errorResponseData, { status: httpStatusCode });
  }
}

