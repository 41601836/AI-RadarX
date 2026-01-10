// 免费行情接口扫描器，对接腾讯等免费行情数据源
import { ApiResponse } from './response';
import { ApiError, ErrorCode } from './errors';

// 实时行情数据接口
export interface RealtimeStockData {
  stockCode: string; // 股票代码（如 SH600000）
  currentPrice: number; // 当前价格（分）
  openPrice: number; // 开盘价（分）
  closePrice: number; // 昨收价（分）
  highPrice: number; // 最高价（分）
  lowPrice: number; // 最低价（分）
  volume: number; // 成交量（股）
  amount: number; // 成交额（分）
  timestamp: number; // 时间戳（毫秒）
  change: number; // 涨跌额（分）
  changePercent: number; // 涨跌幅（%）
}

// 免费行情扫描器类
export class FreeScanner {
  private static readonly TENCENT_QUOTE_URL = 'http://qt.gtimg.cn/q';
  private static readonly SINA_QUOTE_URL = 'http://hq.sinajs.cn/list';
  
  // 单例模式实现
  private static instance: FreeScanner;
  
  private constructor() {
    // 私有构造函数，防止外部实例化
  }
  
  // 获取单例实例
  public static getInstance(): FreeScanner {
    if (!FreeScanner.instance) {
      FreeScanner.instance = new FreeScanner();
    }
    return FreeScanner.instance;
  }
  
  // 获取单个股票的实时行情（腾讯接口）
  public async getRealtimeQuote(stockCode: string): Promise<RealtimeStockData> {
    // 验证股票代码
    if (!stockCode || !/^(SH|SZ)\d{6}$/.test(stockCode)) {
      throw new ApiError(ErrorCode.STOCK_CODE_FORMAT_ERROR, '股票代码格式错误');
    }
    
    // 转换为腾讯接口需要的股票代码格式（如 sh600000）
    const qtStockCode = stockCode.toLowerCase();
    
    try {
      // 调用腾讯行情接口
      const response = await fetch(`${FreeScanner.TENCENT_QUOTE_URL}=${qtStockCode}`);
      const data = await response.text();
      
      // 解析腾讯接口返回的数据
      return this.parseTencentQuoteData(data, stockCode);
    } catch (error) {
      console.error('获取腾讯实时行情失败:', error);
      
      // 如果腾讯接口失败，尝试使用新浪接口
      return this.getRealtimeQuoteFromSina(stockCode);
    }
  }
  
  // 获取多个股票的实时行情
  public async getBatchRealtimeQuotes(stockCodes: string[]): Promise<RealtimeStockData[]> {
    if (!Array.isArray(stockCodes) || stockCodes.length === 0) {
      throw new ApiError(ErrorCode.BAD_REQUEST, '股票代码列表不能为空');
    }
    
    // 限制批量请求数量（避免接口限制）
    if (stockCodes.length > 50) {
      throw new ApiError(ErrorCode.BAD_REQUEST, '批量请求数量不能超过50个');
    }
    
    // 转换为腾讯接口需要的股票代码格式
    const qtStockCodes = stockCodes.map(code => code.toLowerCase()).join(',');
    
    try {
      // 调用腾讯批量行情接口
      const response = await fetch(`${FreeScanner.TENCENT_QUOTE_URL}=${qtStockCodes}`);
      const data = await response.text();
      
      // 解析腾讯批量接口返回的数据
      return this.parseTencentBatchQuoteData(data, stockCodes);
    } catch (error) {
      console.error('获取腾讯批量实时行情失败:', error);
      
      // 如果腾讯接口失败，尝试使用新浪接口
      return this.getBatchRealtimeQuotesFromSina(stockCodes);
    }
  }
  
  // 从新浪接口获取单个股票的实时行情
  private async getRealtimeQuoteFromSina(stockCode: string): Promise<RealtimeStockData> {
    // 转换为新浪接口需要的股票代码格式
    const sinaStockCode = this.convertToSinaStockCode(stockCode);
    
    try {
      const response = await fetch(`${FreeScanner.SINA_QUOTE_URL}=${sinaStockCode}`);
      const data = await response.text();
      
      // 解析新浪接口返回的数据
      return this.parseSinaQuoteData(data, stockCode);
    } catch (error) {
      console.error('获取新浪实时行情失败:', error);
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '无法获取实时行情数据');
    }
  }
  
  // 从新浪接口获取多个股票的实时行情
  private async getBatchRealtimeQuotesFromSina(stockCodes: string[]): Promise<RealtimeStockData[]> {
    // 转换为新浪接口需要的股票代码格式
    const sinaStockCodes = stockCodes.map(code => this.convertToSinaStockCode(code)).join(',');
    
    try {
      const response = await fetch(`${FreeScanner.SINA_QUOTE_URL}=${sinaStockCodes}`);
      const data = await response.text();
      
      // 解析新浪批量接口返回的数据
      return this.parseSinaBatchQuoteData(data, stockCodes);
    } catch (error) {
      console.error('获取新浪批量实时行情失败:', error);
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '无法获取实时行情数据');
    }
  }
  
  // 转换为新浪接口需要的股票代码格式
  private convertToSinaStockCode(stockCode: string): string {
    if (stockCode.startsWith('SH')) {
      return `sh${stockCode.substring(2)}`;
    } else if (stockCode.startsWith('SZ')) {
      return `sz${stockCode.substring(2)}`;
    }
    throw new ApiError(ErrorCode.STOCK_CODE_FORMAT_ERROR, '股票代码格式错误');
  }
  
  // 解析腾讯接口返回的单股票数据
  private parseTencentQuoteData(data: string, stockCode: string): RealtimeStockData {
    // 腾讯接口返回格式：var v_sh600000="1~浦发银行~600000~8.50~8.45~8.46~311383~311383~311383~149780~111265~10441~8513~18812~4147~3911~1568~1004~722~8.51~21782~8.50~67237~8.49~16840~8.48~28237~8.47~14577~8.52~13996~8.53~23527~8.54~26710~8.55~15623~2026-01-10~15:00:00~00`;
    
    // 提取引号内的数据
    const match = data.match(/"([^"]+)"/);
    if (!match) {
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '腾讯行情数据解析失败');
    }
    
    const quoteData = match[1].split('~');
    
    // 解析关键数据
    const currentPrice = Math.round(parseFloat(quoteData[3]) * 100); // 转换为分
    const openPrice = Math.round(parseFloat(quoteData[5]) * 100);
    const closePrice = Math.round(parseFloat(quoteData[4]) * 100);
    const highPrice = Math.round(parseFloat(quoteData[33]) * 100);
    const lowPrice = Math.round(parseFloat(quoteData[34]) * 100);
    const volume = parseInt(quoteData[6], 10);
    const amount = Math.round(parseFloat(quoteData[37]) * 100);
    const timestamp = new Date(`${quoteData[30]} ${quoteData[31]}`).getTime();
    const change = currentPrice - closePrice;
    const changePercent = parseFloat(quoteData[32]) || (change / closePrice) * 100;
    
    return {
      stockCode,
      currentPrice,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      volume,
      amount,
      timestamp,
      change,
      changePercent
    };
  }
  
  // 解析腾讯接口返回的多股票数据
  private parseTencentBatchQuoteData(data: string, stockCodes: string[]): RealtimeStockData[] {
    // 腾讯批量接口返回多条 var v_sh600000=...; 格式的数据
    const stockData: RealtimeStockData[] = [];
    
    // 按分号分割每条股票数据
    const stockDataStrs = data.split(';').filter(str => str.trim() !== '');
    
    // 解析每条股票数据
    for (let i = 0; i < stockDataStrs.length; i++) {
      try {
        const stockCode = stockCodes[i];
        if (stockCode) {
          const realtimeData = this.parseTencentQuoteData(stockDataStrs[i], stockCode);
          stockData.push(realtimeData);
        }
      } catch (error) {
        console.error(`解析股票数据失败: ${stockDataStrs[i]}`, error);
        // 忽略单条股票数据解析错误，继续处理其他股票
      }
    }
    
    return stockData;
  }
  
  // 解析新浪接口返回的单股票数据
  private parseSinaQuoteData(data: string, stockCode: string): RealtimeStockData {
    // 新浪接口返回格式：var hq_str_sh600000="浦发银行,8.46,8.45,8.50,8.52,8.43,8.50,8.51,311383200,2646809400,149780,8.50,111265,8.49,10441,8.48,8513,8.47,18812,8.46,4147,8.51,3911,8.52,1568,8.53,1004,8.54,722,8.55,2026-01-10,15:00:00,00";";
    
    // 提取引号内的数据
    const match = data.match(/"([^"]+)"/);
    if (!match) {
      throw new ApiError(ErrorCode.SERVICE_UNAVAILABLE, '新浪行情数据解析失败');
    }
    
    const quoteData = match[1].split(',');
    
    // 解析关键数据
    const closePrice = Math.round(parseFloat(quoteData[2]) * 100); // 昨收价
    const currentPrice = Math.round(parseFloat(quoteData[3]) * 100); // 当前价格
    const openPrice = Math.round(parseFloat(quoteData[1]) * 100); // 开盘价
    const highPrice = Math.round(parseFloat(quoteData[4]) * 100); // 最高价
    const lowPrice = Math.round(parseFloat(quoteData[5]) * 100); // 最低价
    const volume = parseInt(quoteData[8], 10); // 成交量
    const amount = Math.round(parseFloat(quoteData[9]) * 100); // 成交额
    const timestamp = new Date(`${quoteData[30]} ${quoteData[31]}`).getTime(); // 时间戳
    const change = currentPrice - closePrice; // 涨跌额
    const changePercent = (change / closePrice) * 100; // 涨跌幅
    
    return {
      stockCode,
      currentPrice,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      volume,
      amount,
      timestamp,
      change,
      changePercent
    };
  }
  
  // 解析新浪接口返回的多股票数据
  private parseSinaBatchQuoteData(data: string, stockCodes: string[]): RealtimeStockData[] {
    // 新浪批量接口返回多条 var hq_str_sh600000=...; 格式的数据
    const stockData: RealtimeStockData[] = [];
    
    // 按分号分割每条股票数据
    const stockDataStrs = data.split(';').filter(str => str.trim() !== '');
    
    // 解析每条股票数据
    for (let i = 0; i < stockDataStrs.length; i++) {
      try {
        const stockCode = stockCodes[i];
        if (stockCode) {
          const realtimeData = this.parseSinaQuoteData(stockDataStrs[i], stockCode);
          stockData.push(realtimeData);
        }
      } catch (error) {
        console.error(`解析股票数据失败: ${stockDataStrs[i]}`, error);
        // 忽略单条股票数据解析错误，继续处理其他股票
      }
    }
    
    return stockData;
  }
}

// 导出单例实例
export const freeScanner = FreeScanner.getInstance();
