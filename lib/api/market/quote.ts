// 实时行情数据处理模块
import { ApiResponse } from '../common/response';
import { ApiError, ErrorCode } from '../common/errors';
import { apiGet } from '../common/fetch';
import * as tushareApi from '../common/tushare';

// 实时行情数据接口
export interface RealTimeQuoteData {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  preClose: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volumeRatio?: number;
  turnoverRate?: number;
}

// 流动性相关数据接口
export interface LiquidityData {
  currentTurnover: number;      // 当日成交额（亿）
  fiveDayAvgTurnover: number;   // 5日平均成交额（亿）
  volumeRatio: number;          // 量比
  timestamp: number;
}

// 量能强度相关数据接口
export interface VolumePowerData {
  currentVolume: number;        // 当前成交量
  avgVolume: number;            // 平均成交量
  volumeAccumulation: number;   // 成交量累积趋势（-1到1）
  timestamp: number;
}

/**
 * 从实时行情数据源获取数据
 * @param symbols 股票代码列表
 * @returns 实时行情数据
 */
export async function fetchRealTimeQuote(symbols: string[]): Promise<ApiResponse<Record<string, RealTimeQuoteData>>> {
  try {
    const response = await apiGet<Record<string, RealTimeQuoteData>>('/market/quote', {
      symbols: symbols.join(','),
    });
    return response;
  } catch (error) {
    console.error('Error fetching real-time quote:', error);
    // 如果实时接口调用失败，返回错误
    throw error;
  }
}

/**
 * 从Tushare获取历史成交量数据
 * @param symbol 股票代码
 * @param days 天数
 * @returns 历史成交量数据
 */
export async function fetchHistoricalVolume(symbol: string, days: number = 10): Promise<ApiResponse<{ volume: number; amount: number }[]>> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const formattedEndDate = endDate.toISOString().split('T')[0].replace(/-/g, '');
    const formattedStartDate = startDate.toISOString().split('T')[0].replace(/-/g, '');
    
    const dailyData = await tushareApi.getTushareDailyData(symbol, formattedStartDate, formattedEndDate);
    
    const volumeData = dailyData.map(item => ({
      volume: item.vol,
      amount: item.amount,
    }));
    
    return {
      code: ErrorCode.SUCCESS,
      msg: '操作成功',
      data: volumeData,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching historical volume from Tushare:', error);
    throw error;
  }
}

/**
 * 计算5日平均成交量
 * @param symbol 股票代码
 * @returns 5日平均成交量数据
 */
export async function calculateFiveDayAvgTurnover(symbol: string): Promise<number> {
  try {
    const response = await fetchHistoricalVolume(symbol, 5);
    const volumeData = response.data;
    
    if (!volumeData || volumeData.length === 0) {
      return 0;
    }
    
    const totalAmount = volumeData.reduce((sum, item) => sum + item.amount, 0);
    return totalAmount / volumeData.length / 100000000; // 转换为亿元
  } catch (error) {
    console.error('Error calculating five-day average turnover:', error);
    return 0;
  }
}

/**
 * 获取流动性数据，优先使用实时接口，失败时回退到Tushare
 * @param symbol 股票代码
 * @returns 流动性数据
 */
export async function getLiquidityData(symbol: string): Promise<LiquidityData> {
  try {
    // 优先调用实时行情接口
    const startTime = Date.now();
    const realTimeResponse = await fetchRealTimeQuote([symbol]);
    const calculationTime = Date.now() - startTime;
    
    // 检查延迟是否在要求范围内
    if (calculationTime > 300) {
      console.warn(`Real-time quote fetching exceeded latency requirement: ${calculationTime}ms`);
    }
    
    const realTimeData = realTimeResponse.data?.[symbol];
    if (realTimeData) {
      // 计算5日平均成交额
      const fiveDayAvgTurnover = await calculateFiveDayAvgTurnover(symbol);
      
      return {
        currentTurnover: realTimeData.amount / 100000000, // 转换为亿元
        fiveDayAvgTurnover,
        volumeRatio: realTimeData.volumeRatio || 1.0,
        timestamp: realTimeData.timestamp,
      };
    }
    
    throw new Error('Real-time data not available for symbol');
  } catch (error) {
    console.warn('Falling back to Tushare for liquidity data:', error);
    
    // 回退到Tushare获取数据
    const startTime = Date.now();
    try {
      const dailyData = await tushareApi.getTushareDailyData(symbol, undefined, undefined);
      const calculationTime = Date.now() - startTime;
      
      // 检查延迟是否在要求范围内
      if (calculationTime > 1000) {
        console.warn(`Tushare data fetching exceeded latency requirement: ${calculationTime}ms`);
      }
      
      if (dailyData && dailyData.length > 0) {
        // 最新数据
        const latestData = dailyData[0];
        // 计算5日平均成交额
        const fiveDayData = dailyData.slice(0, 5);
        const fiveDayAvgTurnover = fiveDayData.reduce((sum, item) => sum + item.amount, 0) / fiveDayData.length / 100000000;
        
        return {
          currentTurnover: latestData.amount / 100000000, // 转换为亿元
          fiveDayAvgTurnover,
          volumeRatio: 1.0, // Tushare数据可能没有量比，使用默认值
          timestamp: new Date(latestData.trade_date).getTime(),
        };
      }
      
      throw new Error('No data available from Tushare');
    } catch (tushareError) {
      console.error('Error fetching liquidity data from Tushare:', tushareError);
      
      // 直接抛出错误而不是返回默认值
      throw new Error('Failed to fetch liquidity data: ' + (tushareError instanceof Error ? tushareError.message : 'Unknown error'));
    }
  }
}

/**
 * 获取量能强度数据，优先使用实时接口，失败时回退到Tushare
 * @param symbol 股票代码
 * @returns 量能强度数据
 */
export async function getVolumePowerData(symbol: string): Promise<VolumePowerData> {
  try {
    // 优先调用实时行情接口
    const startTime = Date.now();
    const realTimeResponse = await fetchRealTimeQuote([symbol]);
    const calculationTime = Date.now() - startTime;
    
    // 检查延迟是否在要求范围内
    if (calculationTime > 300) {
      console.warn(`Real-time quote fetching exceeded latency requirement: ${calculationTime}ms`);
    }
    
    const realTimeData = realTimeResponse.data?.[symbol];
    if (realTimeData) {
      // 计算5日平均成交量
      const response = await fetchHistoricalVolume(symbol, 5);
      const volumeData = response.data || [];
      const avgVolume = volumeData.length > 0 
        ? volumeData.reduce((sum, item) => sum + item.volume, 0) / volumeData.length 
        : realTimeData.volume;
      
      // 简单计算成交量累积趋势（可以根据需要优化）
      const volumeAccumulation = realTimeData.volume > avgVolume ? 1.0 : -1.0;
      
      return {
        currentVolume: realTimeData.volume,
        avgVolume,
        volumeAccumulation,
        timestamp: realTimeData.timestamp,
      };
    }
    
    throw new Error('Real-time data not available for symbol');
  } catch (error) {
    console.warn('Falling back to Tushare for volume power data:', error);
    
    // 回退到Tushare获取数据
    const startTime = Date.now();
    try {
      const dailyData = await tushareApi.getTushareDailyData(symbol, undefined, undefined);
      const calculationTime = Date.now() - startTime;
      
      // 检查延迟是否在要求范围内
      if (calculationTime > 1000) {
        console.warn(`Tushare data fetching exceeded latency requirement: ${calculationTime}ms`);
      }
      
      if (dailyData && dailyData.length > 0) {
        // 最新数据
        const latestData = dailyData[0];
        // 计算5日平均成交量
        const fiveDayData = dailyData.slice(0, 5);
        const avgVolume = fiveDayData.reduce((sum, item) => sum + item.vol, 0) / fiveDayData.length;
        
        // 简单计算成交量累积趋势
        const volumeAccumulation = latestData.vol > avgVolume ? 1.0 : -1.0;
        
        return {
          currentVolume: latestData.vol,
          avgVolume,
          volumeAccumulation,
          timestamp: new Date(latestData.trade_date).getTime(),
        };
      }
      
      throw new Error('No data available from Tushare');
    } catch (tushareError) {
      console.error('Error fetching volume power data from Tushare:', tushareError);
      
      // 直接抛出错误而不是返回默认值
      throw new Error('Failed to fetch volume power data: ' + (tushareError instanceof Error ? tushareError.message : 'Unknown error'));
    }
  }
}
