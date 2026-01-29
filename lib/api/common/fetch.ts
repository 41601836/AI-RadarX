import { ApiResponse } from './response';
import { ApiError, ErrorCode } from './errors';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function apiGet<T = any>(url: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
  try {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const fullUrl = `${BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;

    // 增加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new ApiError(res.status, `HTTP Error ${res.status}`);
    }

    const data = await res.json();
    return data as ApiResponse<T>;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('API Request Timeout');
      throw new ApiError(ErrorCode.NETWORK_ERROR, 'Request timeout');
    }
    console.error('API Request Error:', error);
    throw new ApiError(ErrorCode.NETWORK_ERROR, error.message || 'Network request failed');
  }
}
