import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from './common/response';
import { logger } from '../utils/logger';
import { FinancialUnitConverter } from '../utils/data-converter';

// 扩展InternalAxiosRequestConfig添加metadata属性
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
    requestId: string;
  };
}

// 生成唯一RequestId
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// API请求配置接口
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  enableUnitConversion?: boolean; // 是否启用单位转换
}

// 全局离线状态管理
let isOffline = false;
let offlineTimer: NodeJS.Timeout | null = null;

// 处理连接被拒绝错误
function handleConnectionRefused(): void {
  if (isOffline) return; // 已处于离线状态，无需重复处理
  
  console.log('API服务器连接失败，进入离线模式');
  isOffline = true;
  
  // 30秒后尝试重新检测连接
  if (offlineTimer) {
    clearTimeout(offlineTimer);
  }
  
  offlineTimer = setTimeout(() => {
    console.log('尝试重新连接API服务器...');
    // 创建一个简单的请求来检测连接状态
    fetch('http://localhost:8080/api/v1/health', { method: 'HEAD' })
      .then(() => {
        console.log('API服务器重新连接成功！');
        isOffline = false;
        if (offlineTimer) {
          clearTimeout(offlineTimer);
          offlineTimer = null;
        }
      })
      .catch(() => {
        console.log('重新连接失败，继续保持离线状态');
        // 继续保持离线状态，30秒后再次尝试
        handleConnectionRefused();
      });
  }, 30000);
}

// Axios实例
class ApiClient {
  private axiosInstance;
  private enableUnitConversion: boolean;
  
  constructor(config: ApiClientConfig = {}) {
    this.enableUnitConversion = config.enableUnitConversion ?? true;
    
    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
    
    // 设置拦截器
    this.setupInterceptors();
  }
  
  // 设置请求和响应拦截器
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config: ExtendedAxiosRequestConfig) => {
        // 检查是否处于离线状态
        if (isOffline) {
          return Promise.reject(new Error('系统当前处于离线状态，无法发送请求'));
        }
        
        // 生成并添加RequestId
        const requestId = generateRequestId();
        config.headers['X-Request-Id'] = requestId;
        
        // 记录请求开始时间
        config.metadata = { startTime: Date.now(), requestId };
        
        // 打印请求日志
        logger.info('[API Request] ->', { 
          path: config.url, 
          method: config.method?.toUpperCase(),
          requestId 
        });
        
        return config;
      },
      (error: AxiosError) => {
        logger.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器 - 统一处理单位转换
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse<unknown>, InternalAxiosRequestConfig>) => {
        const { config, status } = response;
        const extendedConfig = config as ExtendedAxiosRequestConfig;
        const { startTime, requestId } = extendedConfig.metadata || {};
        const duration = startTime ? Date.now() - startTime : 0;
        
        // 打印响应日志
        logger.info('[API Response] <-', { 
          status,
          duration,
          requestId,
          path: config.url
        });
        
        // 对所有API返回数据进行单位转换（分转元）
        if (this.enableUnitConversion && response.data.data) {
          this.convertAllPriceData(response);
        }
        
        // 请求成功，重置离线状态
        if (isOffline) {
          isOffline = false;
          if (offlineTimer) {
            clearTimeout(offlineTimer);
            offlineTimer = null;
          }
        }
        
        return response;
      },
      (error: AxiosError<unknown, InternalAxiosRequestConfig>) => {
        const { config } = error;
        const extendedConfig = config as ExtendedAxiosRequestConfig;
        const { startTime, requestId } = extendedConfig?.metadata || {};
        const duration = startTime ? Date.now() - startTime : 0;
        
        // 打印响应错误日志
        logger.error('[API Response Error] <-', { 
          status: error.response?.status,
          duration,
          requestId,
          path: config?.url,
          error: error.message
        });
        
        // 检测ERR_CONNECTION_REFUSED错误
        if (error.code === 'ERR_CONNECTION_REFUSED') {
          handleConnectionRefused();
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // 转换所有价格相关数据（分转元）
  private convertAllPriceData(response: AxiosResponse): void {
    if (!response.data?.data) return;
    
    const data = response.data.data;
    
    // 递归转换对象或数组中的价格字段
    const convertPrices = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => convertPrices(item));
      } else if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // 检查是否为价格相关字段
            const value = obj[key];
            if (this.isPriceField(key, value)) {
              result[key] = FinancialUnitConverter.centsToYuan(value);
            } else {
              result[key] = convertPrices(value);
            }
          }
        }
        return result;
      }
      return obj;
    };
    
    // 执行转换
    const convertedData = convertPrices(data);
    response.data.data = convertedData;
  }
  
  // 判断是否为价格相关字段
  private isPriceField(key: string, value: any): boolean {
    // 检查值是否为数字
    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }
    
    // 使用统一的工具类检查字段名是否匹配价格模式
    return FinancialUnitConverter.isPriceField(key);
  }
  
  // GET请求
  async get<T>(url: string, config?: Partial<InternalAxiosRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET请求失败: ${url}`, error);
      throw this.handleError(error);
    }
  }
  
  // POST请求
  async post<T>(url: string, data?: any, config?: Partial<InternalAxiosRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST请求失败: ${url}`, error);
      throw this.handleError(error);
    }
  }
  
  // PUT请求
  async put<T>(url: string, data?: any, config?: Partial<InternalAxiosRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT请求失败: ${url}`, error);
      throw this.handleError(error);
    }
  }
  
  // DELETE请求
  async delete<T>(url: string, config?: Partial<InternalAxiosRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE请求失败: ${url}`, error);
      throw this.handleError(error);
    }
  }
  
  // 批量请求
  async batch<T>(requests: Array<{ url: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any }>): Promise<T[]> {
    try {
      const promises = requests.map(request => {
        switch (request.method) {
          case 'GET':
            return this.get<T>(request.url);
          case 'POST':
            return this.post<T>(request.url, request.data);
          case 'PUT':
            return this.put<T>(request.url, request.data);
          case 'DELETE':
            return this.delete<T>(request.url);
          default:
            throw new Error(`不支持的请求方法: ${request.method}`);
        }
      });
      
      const responses = await Promise.all(promises);
      return responses.map(response => response.data as T);
    } catch (error) {
      console.error('批量请求失败', error);
      throw error;
    }
  }
  
  // 错误处理
  private handleError(error: any): Error {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;
      const apiError = new Error(`API错误 ${status}: ${data?.msg || '未知错误'}`);
      // 保留原始错误码信息
      (apiError as any).code = data?.code || status;
      return apiError;
    } else if (error.request) {
      // 网络错误
      const networkError = new Error('网络连接失败，请检查网络设置');
      (networkError as any).code = 0; // 网络错误码
      return networkError;
    } else {
      // 其他错误
      const otherError = new Error(`请求配置错误: ${error.message}`);
      (otherError as any).code = 0;
      return otherError;
    }
  }
}

// 创建默认客户端实例
export const apiClient = new ApiClient({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 10000,
  enableUnitConversion: true,
});

// 导出便捷方法
export const api = {
  get: <T>(url: string, config?: Partial<InternalAxiosRequestConfig>) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: Partial<InternalAxiosRequestConfig>) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: Partial<InternalAxiosRequestConfig>) => apiClient.put<T>(url, data, config),
  delete: <T>(url: string, config?: Partial<InternalAxiosRequestConfig>) => apiClient.delete<T>(url, config),
  batch: <T>(requests: Array<{ url: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any }>) => 
    apiClient.batch<T>(requests),
};
