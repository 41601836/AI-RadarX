import { NextRequest, NextResponse } from 'next/server';
import { successResponse, ApiResponse, generateRequestId } from './response';
import { errorResponse, internalServerError, ApiError } from './errors';
import { Logger, logger } from '../../utils/logger';

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
  // 生成requestId
  const requestId = generateRequestId();
  const apiLogger = logger.withCategory('API').withRequestId(requestId);
  
  // 记录请求开始时间
  const startTime = performance.now();
  
  try {
    apiLogger.info('API请求开始', {
      pathname: request.nextUrl.pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // 执行具体的API处理逻辑
    const result = await handler(request);
    
    // 计算执行时间
    const duration = performance.now() - startTime;
    
    // 检查返回结果是否已经是ApiResponse类型
    if (result && typeof result === 'object' && 'code' in result && 'msg' in result && 'data' in result) {
      // 已经是标准的ApiResponse格式，确保使用相同的requestId
      const apiResponse = {
        ...(result as ApiResponse<T>),
        requestId,
        timestamp: Date.now()
      };
      const httpStatusCode = getHttpStatusCode(apiResponse.code);
      
      apiLogger.info('API请求成功', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: apiResponse.code,
        msg: apiResponse.msg
      });
      
      return NextResponse.json(apiResponse, { status: httpStatusCode });
    } else {
      // 不是标准格式，使用successResponse包装后返回，确保使用相同的requestId
      const response = {
        ...successResponse(result as T),
        requestId
      };
      
      apiLogger.info('API请求成功', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: response.code,
        msg: response.msg
      });
      
      return NextResponse.json(response);
    }
  } catch (error) {
    // 计算执行时间
    const duration = performance.now() - startTime;
    
    let errorResponseData;
    let httpStatusCode = 500;
    
    if (error instanceof ApiError) {
      // 处理ApiError类型的错误，确保使用相同的requestId
      const baseErrorResponse = errorResponse(error);
      errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      httpStatusCode = getHttpStatusCode(error.code);
      
      apiLogger.error('API请求错误', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    } else {
      // 处理其他类型的错误，确保使用相同的requestId
      const apiError = internalServerError(error as Error);
      const baseErrorResponse = errorResponse(apiError);
      errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      
      apiLogger.error('API请求内部错误', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
  // 生成requestId
  const requestId = generateRequestId();
  const apiLogger = logger.withCategory('API').withRequestId(requestId);
  
  // 记录请求开始时间
  const startTime = performance.now();
  
  try {
    apiLogger.info('API请求开始(带验证)', {
      pathname: request.nextUrl.pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // 执行参数验证
    const validationResult = await validator(request);
    
    if (validationResult instanceof ApiError) {
      // 验证失败，返回验证错误，确保使用相同的requestId
      const duration = performance.now() - startTime;
      
      apiLogger.warn('API请求参数验证失败', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: validationResult.code,
        message: validationResult.message
      });
      
      const baseErrorResponse = errorResponse(validationResult);
      const errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      
      return NextResponse.json(
        errorResponseData,
        { status: getHttpStatusCode(validationResult.code) }
      );
    }
    
    if (!validationResult) {
      // 验证失败，返回通用的参数验证错误，确保使用相同的requestId
      const duration = performance.now() - startTime;
      
      apiLogger.warn('API请求参数验证失败', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        message: '参数验证失败'
      });
      
      const apiError = internalServerError(new Error('参数验证失败'));
      const baseErrorResponse = errorResponse(apiError);
      const errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      
      return NextResponse.json(
        errorResponseData,
        { status: 400 }
      );
    }
    
    // 执行具体的API处理逻辑
    const result = await handler(request);
    
    // 计算执行时间
    const duration = performance.now() - startTime;
    
    // 返回成功响应，确保使用相同的requestId
    const response = {
      ...successResponse(result),
      requestId
    };
    
    apiLogger.info('API请求成功(带验证)', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: response.code,
        msg: response.msg
      });
    
    return NextResponse.json(response);
  } catch (error) {
    // 计算执行时间
    const duration = performance.now() - startTime;
    
    let errorResponseData;
    let httpStatusCode = 500;
    
    if (error instanceof ApiError) {
      // 处理ApiError类型的错误，确保使用相同的requestId
      const baseErrorResponse = errorResponse(error);
      errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      httpStatusCode = getHttpStatusCode(error.code);
      
      apiLogger.error('API请求错误(带验证)', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    } else {
      // 处理其他类型的错误，确保使用相同的requestId
      const apiError = internalServerError(error as Error);
      const baseErrorResponse = errorResponse(apiError);
      errorResponseData = {
        ...baseErrorResponse,
        requestId
      };
      
      apiLogger.error('API请求内部错误(带验证)', {
        pathname: request.nextUrl.pathname,
        method: request.method,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    // 返回错误响应
    return NextResponse.json(errorResponseData, { status: httpStatusCode });
  }
}

