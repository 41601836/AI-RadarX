// 核心错误码定义
export enum ErrorCode {
  // 成功
  SUCCESS = 200,
  
  // 客户端错误
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  
  // 服务器错误
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
  
  // 业务错误
  STOCK_CODE_FORMAT_ERROR = 60001,
  ACCOUNT_NOT_EXIST = 60002,
  NO_HOT_MONEY_RECORD = 60003,
  INVALID_LARGE_ORDER_THRESHOLD = 60004,
  INVALID_STOP_RULE_VALUE = 60005,
}

// 错误消息映射
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.BAD_REQUEST]: '参数无效/缺失',
  [ErrorCode.UNAUTHORIZED]: '未授权/Token过期',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务端内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [ErrorCode.STOCK_CODE_FORMAT_ERROR]: '股票代码格式错误',
  [ErrorCode.ACCOUNT_NOT_EXIST]: '账户不存在',
  [ErrorCode.NO_HOT_MONEY_RECORD]: '游资数据暂无记录',
  [ErrorCode.INVALID_LARGE_ORDER_THRESHOLD]: '大单阈值设置不合理',
  [ErrorCode.INVALID_STOP_RULE_VALUE]: '止损/止盈值设置不合理',
};

// 自定义错误类
export class ApiError extends Error {
  public code: number;
  public requestId: string;
  
  constructor(
    code: ErrorCode,
    message?: string,
    public originalError?: Error
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.code = code;
    this.name = 'ApiError';
    this.requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 生成错误响应
export function errorResponse(
  error: ApiError | Error
): { code: number; msg: string; data: any; requestId: string; timestamp: number } {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      msg: error.message,
      data: {},
      requestId: error.requestId,
      timestamp: Date.now(),
    };
  }
  
  // 非ApiError类型的错误默认返回500
  return {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    msg: error.message || ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
    data: {},
    requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    timestamp: Date.now(),
  };
}

// 客户端错误生成函数
export function badRequestError(message?: string): ApiError {
  return new ApiError(ErrorCode.BAD_REQUEST, message);
}

export function unauthorizedError(message?: string): ApiError {
  return new ApiError(ErrorCode.UNAUTHORIZED, message);
}

export function forbiddenError(message?: string): ApiError {
  return new ApiError(ErrorCode.FORBIDDEN, message);
}

export function notFoundError(message?: string): ApiError {
  return new ApiError(ErrorCode.NOT_FOUND, message);
}

export function tooManyRequestsError(message?: string): ApiError {
  return new ApiError(ErrorCode.TOO_MANY_REQUESTS, message);
}

// 服务器错误生成函数
export function internalServerError(originalError?: Error, message?: string): ApiError {
  return new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, message, originalError);
}

export function serviceUnavailableError(message?: string): ApiError {
  return new ApiError(ErrorCode.SERVICE_UNAVAILABLE, message);
}

// 业务错误生成函数
export function stockCodeFormatError(message?: string): ApiError {
  return new ApiError(ErrorCode.STOCK_CODE_FORMAT_ERROR, message);
}

export function accountNotExistError(message?: string): ApiError {
  return new ApiError(ErrorCode.ACCOUNT_NOT_EXIST, message);
}

export function noHotMoneyRecordError(message?: string): ApiError {
  return new ApiError(ErrorCode.NO_HOT_MONEY_RECORD, message);
}

export function invalidLargeOrderThresholdError(message?: string): ApiError {
  return new ApiError(ErrorCode.INVALID_LARGE_ORDER_THRESHOLD, message);
}

export function invalidStopRuleValueError(message?: string): ApiError {
  return new ApiError(ErrorCode.INVALID_STOP_RULE_VALUE, message);
}
