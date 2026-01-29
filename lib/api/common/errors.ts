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
