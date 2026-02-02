import { ApiResponse, generateRequestId } from './response';
import { ApiError, ErrorCode } from './errors';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export type MockDataGenerator<T> = (params?: any) => Promise<T>;

export interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, any>; // Query params
}

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for mock execution
async function executeMock<T>(
  mockGenerator: MockDataGenerator<T>,
  params?: any
): Promise<ApiResponse<T>> {
  console.log('[Mock] Executing mock generator', params);
  await delay(500); // Simulate network delay
  try {
    const data = await mockGenerator(params);
    return {
      code: 200,
      msg: 'success (mock)',
      data,
      requestId: generateRequestId(),
      timestamp: Date.now()
    };
  } catch (e: any) {
    console.error('Mock execution failed:', e);
    throw new ApiError(ErrorCode.UNKNOWN_ERROR, e.message || 'Mock error');
  }
}

export async function apiGet<T = any>(
  url: string,
  params: Record<string, any> = {},
  config: RequestConfig = {},
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  // Handle inconsistent usage handling
  // If params has 'requiresAuth', it's likely config passed as params
  // This is a heuristic to support existing buggy calls
  let finalConfig = { ...config };
  let finalParams = { ...params };

  if (params && typeof (params as any).requiresAuth === 'boolean') {
    finalConfig = { ...finalConfig, ...params } as any;
    // Remove known config keys from params to avoid sending them as query
    delete (finalParams as any).requiresAuth;
  }

  try {
    const queryString = new URLSearchParams(
      Object.entries(finalParams).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    const fullUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...finalConfig.headers,
    };

    // Add auth token if needed (placeholder)
    if (finalConfig.requiresAuth) {
      // headers['Authorization'] = ...
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
        ...finalConfig
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // If 404 and we have mock, maybe strictly use mock? 
        // But usually we throw error so catch block handles mock fallback.
        throw new ApiError(res.status, `HTTP Error ${res.status}`);
      }
      return await res.json() as ApiResponse<T>;

    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } catch (error) {
    if (mockGenerator) {
      console.warn(`API call to ${url} failed, using mock data.`);
      return executeMock(mockGenerator, finalParams);
    }
    throw error;
  }
}

export async function apiPost<T = any>(
  url: string,
  data: any,
  config: RequestConfig = {},
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  try {
    const fullUrl = `${BASE_URL}${url}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...config
    });

    if (!res.ok) {
      throw new ApiError(res.status, `HTTP Error ${res.status}`);
    }
    return await res.json() as ApiResponse<T>;
  } catch (error) {
    if (mockGenerator) {
      console.warn(`API call to ${url} failed, using mock data.`);
      return executeMock(mockGenerator, data);
    }
    throw error;
  }
}

export async function apiDelete<T = any>(
  url: string,
  config: RequestConfig = {},
  mockGenerator?: MockDataGenerator<T>
): Promise<ApiResponse<T>> {
  let queryString = '';
  if (config.params) {
    const paramEntries = Object.entries(config.params)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => [k, String(v)]);
    queryString = '?' + new URLSearchParams(paramEntries).toString();
  }

  try {
    const fullUrl = `${BASE_URL}${url}${queryString}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    const res = await fetch(fullUrl, {
      method: 'DELETE',
      headers,
      ...config
    });

    if (!res.ok) {
      throw new ApiError(res.status, `HTTP Error ${res.status}`);
    }
    return await res.json() as ApiResponse<T>;
  } catch (error) {
    if (mockGenerator) {
      console.warn(`API call to ${url} failed, using mock data.`);
      const mockArgs = config.params ? { ...config.params } : {};
      return executeMock(mockGenerator, mockArgs);
    }
    throw error;
  }
}
