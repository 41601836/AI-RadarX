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
export const BASE_API_URL = '/api'; // 使用相对路径

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
  // 强制mock模式逻辑：如果环境变量MOCK=true，直接返回Mock，禁止执行任何fetch
  // 确保在客户端环境下检查，避免服务端渲染时的问题
  const isClient = typeof window !== 'undefined';
  const shouldForceMock = isClient && process.env.MOCK === 'true';
  
  // 优先使用MOCK环境变量，兼容原有NEXT_PUBLIC_API_MOCK
  const shouldUseLegacyMock = isClient && !shouldForceMock && process.env.NEXT_PUBLIC_API_MOCK === 'true';
  
  if (shouldForceMock || shouldUseLegacyMock) {
    console.log(`[FORCE MOCK MODE] Intercepting ALL requests to: ${BASE_API_URL}${endpoint}`);
    
    // 解构配置参数
    const {
      method = 'GET',
      mockDelay = 300, // 减少默认延迟以提高开发体验
      params,
      body
    } = config;

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
          data: ({} as any) as T, // 确保类型安全
          requestId,
          timestamp: Date.now(),
        } as ApiResponse<T>;
      }
    } else {
      // 根据不同的endpoint提供更有意义的默认mock响应
      let defaultData: any = {};
      let defaultMsg = 'mock mode enabled - default response';
      
      // 根据endpoint类型提供不同的默认数据
      if (endpoint.includes('stock_basic')) {
        defaultData = {
          list: [],
          total: 0,
          pageNum: 1,
          pageSize: 20,
          pages: 0
        };
        defaultMsg = 'mock mode - stock basic data';
      } else if (endpoint.includes('kline')) {
        defaultData = {
          data: []
        };
        defaultMsg = 'mock mode - kline data';
      } else if (endpoint.includes('chip')) {
        defaultData = {
          distribution: [],
          trend: []
        };
        defaultMsg = 'mock mode - chip data';
      } else if (endpoint.includes('alerts')) {
        defaultData = {
          list: [],
          total: 0
        };
        defaultMsg = 'mock mode - alerts data';
      } else if (endpoint.includes('wad')) {
        defaultData = {
          value: 0,
          data: []
        };
        defaultMsg = 'mock mode - wad indicator data';
      }
      
      // 生成唯一请求ID
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      return {
        code: 200,
        msg: defaultMsg,
        data: defaultData as T,
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

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    let data: any;

    if (!response.ok) {
      // 如果响应不是OK，检查是否为JSON
      if (contentType && contentType.includes('application/json')) {
        // 如果是JSON，尝试解析
        data = await response.json();
        const errorCode = (data.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR;
        const errorMessage = data.msg || `HTTP error! status: ${response.status}`;
        console.error(`API请求失败: ${errorMessage}`);
        throw new ApiError(errorCode, errorMessage);
      } else {
        // 如果不是JSON，直接获取文本并抛出错误
        const text = await response.text();
        // 检查是否以"Internal"开头
        if (text.startsWith('Internal')) {
          console.error(`API请求失败: ${text}`);
          throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, text);
        }
        // 其他非JSON错误
        console.error(`API请求失败: HTTP error! status: ${response.status}, text: ${text}`);
        throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, `HTTP error! status: ${response.status}`);
      }
    }

    // 如果响应是OK的，解析JSON
    data = await response.json();

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
      // 移除静默回退逻辑，直接抛出错误
      console.error(`API请求失败: ${error.message}`);
      throw error;
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // 网络错误（包括ERR_CONNECTION_REFUSED），直接抛出错误
      console.error('服务连接失败（ERR_CONNECTION_REFUSED）:', error);
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '服务连接失败，请检查网络');
    } else {
      // 其他错误，直接抛出错误
      console.error('服务端内部错误:', error);
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
