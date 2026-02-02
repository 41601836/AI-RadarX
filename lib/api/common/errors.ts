import { ApiResponse, generateRequestId } from './response';

export enum ErrorCode {
  SUCCESS = 0,
  UNKNOWN_ERROR = 10000,
  NETWORK_ERROR = 10001,
  UNAUTHORIZED = 40100,
  NOT_FOUND = 40400,
  SERVER_ERROR = 50000,
}

export class ApiError extends Error {
  code: number;
  data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const accountNotExistError = (): ApiError => {
  return new ApiError(ErrorCode.NOT_FOUND, 'Account not found');
};

export const stockCodeFormatError = (message: string = 'Stock code format error'): ApiError => {
  return new ApiError(40000, message);
};

export const internalServerError = (error: Error, message?: string): ApiError => {
  return new ApiError(ErrorCode.SERVER_ERROR, message || error.message);
};

export const badRequestError = (message: string): ApiError => {
  return new ApiError(40000, message);
};

export const unauthorizedError = (message: string = 'Unauthorized'): ApiError => {
  return new ApiError(ErrorCode.UNAUTHORIZED, message);
};

export const noHotMoneyRecordError = (message: string = 'No hot money record found'): ApiError => {
  return new ApiError(40401, message);
};

export const invalidLargeOrderThresholdError = (message: string = 'Invalid large order threshold'): ApiError => {
  return new ApiError(40002, message);
};

export const invalidStopRuleValueError = (message: string = 'Invalid stop rule value'): ApiError => {
  return new ApiError(40003, message);
};

export function errorResponse(error: ApiError | Error | number, msg?: string): ApiResponse<null> {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      msg: error.message,
      data: null as any,
      requestId: generateRequestId(),
      timestamp: Date.now(),
    };
  }
  if (error instanceof Error) {
    return {
      code: ErrorCode.SERVER_ERROR,
      msg: error.message,
      data: null as any,
      requestId: generateRequestId(),
      timestamp: Date.now(),
    };
  }
  return {
    code: error as number,
    msg: msg || 'error',
    data: null as any,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
}
