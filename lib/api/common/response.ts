export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  requestId?: string;
  timestamp?: number;
}

export interface PaginationResponse<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export const generateRequestId = (): string => {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export function successResponse<T>(data: T, msg: string = 'success'): ApiResponse<T> {
  return {
    code: 200, // or 0, depending on the standard used in this project. Dashboard uses code 200 often.
    msg,
    data,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
}

export function paginatedSuccessResponse<T>(data: PaginationResponse<T>, msg: string = 'success'): ApiResponse<PaginationResponse<T>> {
  return {
    code: 200,
    msg,
    data,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
}
