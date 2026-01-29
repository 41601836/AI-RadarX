// Tushare API适配器
import { ApiError, ErrorCode } from './errors';

// Tushare API基础配置
const TUSHARE_BASE_URL = 'https://api.tushare.pro';

// 缓存配置
const CACHE_EXPIRY_TIME = 3600000; // 1小时，单位：毫秒

// Tushare连接状态
export interface TushareStatus {
  connected: boolean;
  isUsingMock: boolean;
  lastCheckTime: number;
  error?: string;
}

// 全局状态跟踪
let tushareStatus: TushareStatus = {
  connected: false,
  isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
  lastCheckTime: 0,
};

// 缓存数据结构
interface CacheItem<T> {
  data: T;
  expiryTime: number;
}

// 缓存存储
const cache = new Map<string, CacheItem<any>>();

// 获取Tushare Token（仅用于服务端）
function getTushareToken(): string | null {
  // 在Mock模式下，不检查TUSHARE_TOKEN
  if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
    return null;
  }

  // 仅从TUSHARE_TOKEN获取（服务端可用），客户端不再直接使用Token
  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    return null;
  }
  return token;
}

// 缓存键生成函数
function generateCacheKey(apiName: string, params: Record<string, any>): string {
  const paramsString = JSON.stringify(params);
  return `${apiName}:${paramsString}`;
}

// 设置缓存
function setCache<T>(apiName: string, params: Record<string, any>, data: T): void {
  const key = generateCacheKey(apiName, params);
  const expiryTime = Date.now() + CACHE_EXPIRY_TIME;
  cache.set(key, { data, expiryTime });
}

// 获取缓存
function getCache<T>(apiName: string, params: Record<string, any>): T | null {
  const key = generateCacheKey(apiName, params);
  const cacheItem = cache.get(key);

  if (!cacheItem) {
    return null;
  }

  if (Date.now() > cacheItem.expiryTime) {
    cache.delete(key); // 删除过期缓存
    return null;
  }

  return cacheItem.data;
}

// 检查Tushare连接状态
export async function checkTushareConnection(): Promise<TushareStatus> {
  // 如果使用Mock数据，直接返回模拟状态
  if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
    tushareStatus = {
      connected: false,
      isUsingMock: true,
      lastCheckTime: Date.now(),
      error: '当前使用Mock数据'
    };
    return tushareStatus;
  }

  try {
    // 检查是否在浏览器环境
    const isBrowser = typeof window !== 'undefined';

    let response, result;

    if (isBrowser) {
      // 浏览器环境：通过本地代理API检查连接
      response = await fetch('/api/tushare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_name: 'stock_basic',
          params: { ts_code: '600000.SH' },
          fields: 'ts_code,name',
        }),
      });

      result = await response.json();

      // 处理积分不足或Token缺失的情况，引导前端切换到Mock逻辑
      if (response.status === 402 || response.status === 500) {
        throw new Error(result.msg || 'Tushare API unavailable');
      }
    } else {
      // 服务端环境：直接请求Tushare API
      const token = getTushareToken();
      const requestParams = {
        api_name: 'stock_basic',
        token,
        params: { ts_code: '600000.SH' },
        fields: 'ts_code,name',
      };

      response = await fetch(TUSHARE_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
      });

      result = await response.json();
    }

    if (!response.ok || result.code !== 0) {
      throw new Error(`Tushare API error: ${result.msg || `Request failed with status ${response.status}`}`);
    }

    // 更新连接状态为成功
    tushareStatus = {
      connected: true,
      isUsingMock: false,
      lastCheckTime: Date.now()
    };

    return tushareStatus;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    // 更新连接状态为失败
    tushareStatus = {
      connected: false,
      isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
      lastCheckTime: Date.now(),
      error: errorMessage
    };

    return tushareStatus;
  }
}

// 获取当前Tushare连接状态
export function getTushareStatus(): TushareStatus {
  return tushareStatus;
}

// Tushare API请求函数
export async function tushareRequest<T>(apiName: string, params: Record<string, any>): Promise<T> {
  // 检查是否在浏览器环境
  const isBrowser = typeof window !== 'undefined';

  // 浏览器环境：转发到本地代理API
  if (isBrowser) {
    try {
      const response = await fetch('/api/tushare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_name: apiName,
          params,
          fields: '*',
        }),
      });

      const result = await response.json();

      // 处理积分不足或Token缺失的情况，引导前端切换到Mock逻辑
      if (response.status === 402 || response.status === 500) {
        throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, result.msg || 'Tushare API unavailable');
      }

      if (!response.ok || result.code !== 0) {
        throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, result.msg || `Tushare proxy request failed with status ${response.status}`);
      }

      // 更新连接状态为成功
      tushareStatus = {
        connected: true,
        isUsingMock: false,
        lastCheckTime: Date.now()
      };

      return result.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        // 更新连接状态为失败
        tushareStatus = {
          connected: false,
          isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
          lastCheckTime: Date.now(),
          error: error.message
        };
        throw error;
      }
      const apiError = new ApiError(ErrorCode.SERVICE_UNAVAILABLE, 'Failed to connect to Tushare proxy API', error as Error);
      // 更新连接状态为失败
      tushareStatus = {
        connected: false,
        isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
        lastCheckTime: Date.now(),
        error: apiError.message
      };
      throw apiError;
    }
  }

  // 服务端环境：直接请求Tushare API
  const token = getTushareToken();

  // 如果没有token或处于Mock模式，直接抛出错误让调用者处理回退
  if (!token) {
    const error = new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, 'TUSHARE_TOKEN is not configured on server');
    // 更新连接状态为失败
    tushareStatus = {
      connected: false,
      isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
      lastCheckTime: Date.now(),
      error: error.message
    };
    throw error;
  }

  try {
    // 构建Tushare API请求参数
    const requestParams = {
      api_name: apiName,
      token,
      params,
      fields: '*',
    };

    const response = await fetch(TUSHARE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestParams),
      // 开发环境下绕过SSL证书验证（生产环境应移除）
      ...(process.env.NODE_ENV === 'development' && {
        // 使用类型断言解决TypeScript类型检查问题
        agent: new (require('https').Agent)({ rejectUnauthorized: false }) as any,
      }),
    } as any);

    // 处理402(积分不足)错误
    if (response.status === 402) {
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, 'Tushare API credits insufficient');
    }

    if (!response.ok) {
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, `Tushare API request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 0) {
      // 检查是否是积分不足的错误
      if (result.msg && result.msg.includes('积分')) {
        throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, `Tushare API credits insufficient: ${result.msg}`);
      }
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, `Tushare API error: ${result.msg}`);
    }

    // 更新连接状态为成功
    tushareStatus = {
      connected: true,
      isUsingMock: false,
      lastCheckTime: Date.now()
    };

    return result.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      // 更新连接状态为失败
      tushareStatus = {
        connected: false,
        isUsingMock: false,
        lastCheckTime: Date.now(),
        error: error.message
      };
      throw error;
    }
    const apiError = new ApiError(ErrorCode.SERVICE_UNAVAILABLE, 'Failed to connect to Tushare API', error as Error);
    // 更新连接状态为失败
    tushareStatus = {
      connected: false,
      isUsingMock: false,
      lastCheckTime: Date.now(),
      error: apiError.message
    };
    throw apiError;
  }
}

// 获取历史日线数据
export async function getTushareDailyData(stockCode: string, startDate?: string, endDate?: string): Promise<any[]> {
  // 转换股票代码格式：SH600000 -> 600000.SH
  const formattedCode = stockCode.startsWith('SH')
    ? `${stockCode.slice(2)}.SH`
    : stockCode.startsWith('SZ')
      ? `${stockCode.slice(2)}.SZ`
      : stockCode;

  const params: Record<string, any> = {
    ts_code: formattedCode,
  };

  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const data = await tushareRequest<any>('daily', params);
  return data.items;
}

// 获取股票基本信息
export async function getTushareStockBasic(stockCode: string): Promise<any> {
  // 转换股票代码格式：SH600000 -> 600000.SH
  const formattedCode = stockCode.startsWith('SH')
    ? `${stockCode.slice(2)}.SH`
    : stockCode.startsWith('SZ')
      ? `${stockCode.slice(2)}.SZ`
      : stockCode;

  const params = { ts_code: formattedCode };
  const apiName = 'stock_basic';

  // 检查缓存
  const cachedData = getCache<{ items: any[] }>(apiName, params);
  if (cachedData) {
    return cachedData.items[0] || null;
  }

  // 缓存不存在或已过期，调用API
  const data = await tushareRequest<any>(apiName, params);

  // 设置缓存
  setCache(apiName, params, data);

  return data.items[0] || null;
}

// 获取股票行情数据
export async function getTushareStockQuote(stockCode: string): Promise<any> {
  // 转换股票代码格式：SH600000 -> 600000.SH
  const formattedCode = stockCode.startsWith('SH')
    ? `${stockCode.slice(2)}.SH`
    : stockCode.startsWith('SZ')
      ? `${stockCode.slice(2)}.SZ`
      : stockCode;

  const data = await tushareRequest<any>('daily', {
    ts_code: formattedCode,
    limit: 1,
  });

  return data.items[0] || null;
}

// 数据转换：Tushare格式到系统内部格式
export function convertTushareDailyToOHLCV(dailyData: any[]): any[] {
  return dailyData.map(item => ({
    timestamp: new Date(item.trade_date).getTime(),
    open: Math.round(item.open * 100), // 转换为分
    high: Math.round(item.high * 100), // 转换为分
    low: Math.round(item.low * 100),   // 转换为分
    close: Math.round(item.close * 100), // 转换为分
    volume: item.vol,                  // 成交量（股）
    amount: item.amount * 100,         // 成交额（分）
  }));
}

// 数据转换：Tushare格式到筹码分布数据格式
export function convertTushareToChipData(dailyData: any[], stockBasic: any): any {
  // 这里需要根据实际算法实现数据转换
  // 目前返回基础数据，后续会由WAD算法进行增量模拟
  return {
    stockCode: stockBasic.ts_code,
    stockName: stockBasic.name,
    dailyData: convertTushareDailyToOHLCV(dailyData),
  };
}
