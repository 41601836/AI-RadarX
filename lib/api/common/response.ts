// 通用响应体格式定义
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  requestId: string;
  timestamp: number;
}

// 分页参数接口
export interface PaginationParams {
  pageNum?: number;
  pageSize?: number;
}

// 分页响应数据接口
export interface PaginationResponse<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

// 生成唯一请求ID
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// 生成成功响应
export function successResponse<T = any>(
  data: T = {} as T,
  msg: string = 'success'
): ApiResponse<T> {
  return {
    code: 200,
    msg,
    data,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
}

// 生成分页成功响应
export function paginatedSuccessResponse<T>(
  list: T[],
  total: number,
  pageNum: number = 1,
  pageSize: number = 20,
  msg: string = 'success'
): ApiResponse<PaginationResponse<T>> {
  const pages = Math.ceil(total / pageSize);
  
  return {
    code: 200,
    msg,
    data: {
      list,
      total,
      pageNum,
      pageSize,
      pages,
    },
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
}
