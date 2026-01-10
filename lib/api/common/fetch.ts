import { ApiResponse } from './response';
import { ApiError, errorResponse, ErrorCode } from './errors';

// API请求配置接口
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>; // GET请求参数
  requiresAuth?: boolean;
  useMock?: boolean; // 是否使用Mock数据
  mockDelay?: number; // Mock数据延迟（毫秒）
}

// Mock数据生成器接口
export interface MockDataGenerator<T> {
  (params?: any, body?: any): Promise<T>;
}

// 基础API URL
export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'; // 使用Next.js默认的API路径

// 获取认证Token
export function getAuthToken(): string | null {
  // 从localStorage或其他存储中获取Token
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

// 模拟延迟函数
async function simulateDelay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 智能环境变量检查函数
function isMockModeEnabled(): boolean {
  // 确保在客户端和服务端都能一致读取环境变量
  return process.env.NEXT_PUBLIC_API_MOCK === 'true';
}

// 智能API请求处理（安全优先）
export async function apiRequest<T>(
  endpoint: string,
  config: ApiRequestConfig = {},
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  // 强制mock模式逻辑：如果环境变量NEXT_PUBLIC_API_MOCK为true，直接返回Mock，禁止执行任何fetch
  if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
    console.log(`[Mock Mode] Intercepting request to: ${BASE_API_URL}${endpoint}`);
    
    // 使用现有的mock逻辑处理请求
    const {
      method = 'GET',
      headers = {},
      body,
      requiresAuth = true,
      mockDelay = 500,
      params,
    } = config;

    // 确保使用mock模式
    const useMock = true;

    // 构建请求URL
    const url = `${BASE_API_URL}${endpoint}`;

    // 模拟网络延迟
    await simulateDelay(mockDelay);
    
    // 生成Mock数据或默认响应
    if (mockGenerator) {
      try {
        // 生成Mock数据
        const mockData = await mockGenerator(method === 'GET' ? params : undefined, body);
        
        // 生成唯一请求ID
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        // 返回完整的API响应结构
        return {
          code: 200,
          msg: 'success',
          data: mockData,
          requestId,
          timestamp: Date.now(),
        } as ApiResponse<T>;
      } catch (error) {
        console.error('Mock数据生成失败:', error);
        // 即使Mock生成失败，也要返回一个有效的ApiResponse结构
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        return {
          code: 200,
          msg: 'mock data generated with warning',
          data: {} as T,
          requestId,
          timestamp: Date.now(),
        } as ApiResponse<T>;
      }
    } else {
      // 如果没有提供Mock生成器但启用了Mock模式，返回默认响应
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      return {
        code: 200,
        msg: 'mock mode enabled but no mock generator provided',
        data: {} as T,
        requestId,
        timestamp: Date.now(),
      } as ApiResponse<T>;
    }
  }

  const {
    method = 'GET',
    headers = {},
    body,
    requiresAuth = true,
    useMock = isMockModeEnabled(),
    mockDelay = 500,
  } = config;

  // 构建请求URL
  const url = `${BASE_API_URL}${endpoint}`;

  // 构建请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // 添加认证Token
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // 安全第一原则：如果是Mock模式，直接使用Mock数据，不进行任何外部请求
  if (useMock) {
    if (mockGenerator) {
      try {
        // 模拟网络延迟
        await simulateDelay(mockDelay);
        
        // 生成Mock数据
        const mockData = await mockGenerator(config.method === 'GET' ? config.params : undefined, body);
        
        // 生成唯一请求ID
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        // 返回完整的API响应结构
        return {
          code: 200,
          msg: 'success',
          data: mockData,
          requestId,
          timestamp: Date.now(),
        } as ApiResponse<T>;
      } catch (error) {
        console.error('Mock数据生成失败:', error);
        // 即使Mock生成失败，也要返回一个有效的ApiResponse结构
        return {
          code: 200,
          msg: 'mock data generated with warning',
          data: {} as T,
          requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          timestamp: Date.now(),
        } as ApiResponse<T>;
      }
    } else {
      // 如果没有提供Mock生成器但启用了Mock模式，返回默认响应
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      return {
        code: 200,
        msg: 'mock mode enabled but no mock generator provided',
        data: {} as T,
        requestId,
        timestamp: Date.now(),
      } as ApiResponse<T>;
    }
  }

  // 非Mock模式下的真实API请求
  // 构建请求选项
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  // 添加请求体
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    // 发送请求
    const response = await fetch(url, requestOptions);

    // 解析响应
    const data = await response.json();

    // 检查HTTP状态码
    if (!response.ok) {
      // 尝试从响应中获取错误码
      const errorCode = (data.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR;
      const errorMessage = data.msg || `HTTP error! status: ${response.status}`;
      
      // 如果配置了Mock生成器，实现静默回退
      if (mockGenerator) {
        console.warn(`API请求失败，静默回退到Mock数据: ${errorMessage}`);
        try {
          const mockData = await mockGenerator(config.method === 'GET' ? config.params : undefined, body);
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          return {
            code: 200,
            msg: 'api fallback to mock',
            data: mockData,
            requestId,
            timestamp: Date.now(),
          } as ApiResponse<T>;
        } catch (mockError) {
          console.error('Mock数据回退失败:', mockError);
        }
      }
      
      throw new ApiError(errorCode, errorMessage);
    }

    // 确保返回的数据结构完整
    if (!data.requestId) {
      data.requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    // 返回响应数据
    return data as ApiResponse<T>;
  } catch (error) {
    // 网络错误或其他错误处理
    if (error instanceof ApiError) {
      // 如果配置了Mock生成器，实现静默回退
      if (mockGenerator) {
        console.warn(`API请求失败，静默回退到Mock数据: ${error.message}`);
        try {
          const mockData = await mockGenerator(config.method === 'GET' ? config.params : undefined, body);
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          return {
            code: 200,
            msg: 'api fallback to mock',
            data: mockData,
            requestId,
            timestamp: Date.now(),
          } as ApiResponse<T>;
        } catch (mockError) {
          console.error('Mock数据回退失败:', mockError);
        }
      }
      throw error;
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // 网络错误（包括ERR_CONNECTION_REFUSED），实现静默失败策略
      if (mockGenerator) {
        console.warn('服务连接失败（ERR_CONNECTION_REFUSED），静默回退到Mock数据');
        try {
          const mockData = await mockGenerator(config.method === 'GET' ? config.params : undefined, body);
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          return {
            code: 200,
            msg: 'network fallback to mock',
            data: mockData,
            requestId,
            timestamp: Date.now(),
          } as ApiResponse<T>;
        } catch (mockError) {
          console.error('Mock数据回退失败:', mockError);
        }
      }
      // 如果没有提供mockGenerator，仍然抛出异常
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '服务连接失败，请检查网络');
    } else {
      // 其他错误，尝试静默回退
      if (mockGenerator) {
        console.warn('服务端内部错误，静默回退到Mock数据');
        try {
          const mockData = await mockGenerator(config.method === 'GET' ? config.params : undefined, body);
          const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          return {
            code: 200,
            msg: 'internal error fallback to mock',
            data: mockData,
            requestId,
            timestamp: Date.now(),
          } as ApiResponse<T>;
        } catch (mockError) {
          console.error('Mock数据回退失败:', mockError);
        }
      }
      throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, '服务端内部错误', error as Error);
    }
  }
}

// GET请求快捷方法
export function apiGet<T>(
  endpoint: string,
  params?: Record<string, any>,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>,
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  // 构建查询参数
  const queryParams = params 
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
  
  return apiRequest<T>(`${endpoint}${queryParams}`, {
    ...config,
    method: 'GET',
    params, // 将params传递给config，供Mock生成器使用
  }, mockGenerator);
}

// POST请求快捷方法
export function apiPost<T>(
  endpoint: string,
  body?: any,
  config?: Omit<ApiRequestConfig, 'method'>,
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...config,
    method: 'POST',
    body,
  }, mockGenerator);
}

// PUT请求快捷方法
export function apiPut<T>(
  endpoint: string,
  body?: any,
  config?: Omit<ApiRequestConfig, 'method'>,
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...config,
    method: 'PUT',
    body,
  }, mockGenerator);
}

// DELETE请求快捷方法
export function apiDelete<T>(
  endpoint: string,
  config?: Omit<ApiRequestConfig, 'method' | 'body'>,
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...config,
    method: 'DELETE',
  }, mockGenerator);
}
