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
