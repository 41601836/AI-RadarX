import { api } from './client';
import { FinancialUnitConverter } from '../utils/data-converter';

// 市场数据类型定义
export interface StockQuote {
  symbol: string;
  name: string;
  price: number; // 当前价格（元）
  open: number; // 开盘价（元）
  high: number; // 最高价（元）
  low: number; // 最低价（元）
  volume: number; // 成交量（股）
  amount: number; // 成交额（元）
  preClose: number; // 昨收价（元）
  change: number; // 涨跌额（元）
  changePercent: number; // 涨跌幅（%）
  turnover: number; // 换手率（%）
  volumeRatio: number; // 量比
  turnoverRate: number; // 换手率
  timestamp: number; // 时间戳
}

export interface MarketTrend {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface MarketIndices {
  shIndex: {
    value: number;
    change: number;
    changePercent: number;
  };
  szIndex: {
    value: number;
    change: number;
    changePercent: number;
  };
  cyIndex: {
    value: number;
    change: number;
    changePercent: number;
  };
  byIndex: {
    value: number;
    change: number;
    changePercent: number;
  };
}

export interface StockBasicInfo {
  ts_code: string; // TS代码
  symbol: string; // 股票代码
  name: string; // 股票名称
  area: string; // 地区
  industry: string; // 行业
  market: string; // 市场
  list_date: string; // 上市日期
}

export interface WatchlistStock {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number;
  addedDate: string;
}

export interface StockDetailInfo extends StockQuote {
  marketCap: number; // 市值（元）
  pe: number; // 市盈率
  pb: number; // 市净率
  eps: number; // 每股收益（元）
  dividendYield: number; // 股息率（%）
  weekHigh52: number; // 52周最高价（元）
  weekLow52: number; // 52周最低价（元）
  shares: number; // 流通股数（股）
  turnoverValue: number; // 成交额（元）
}

// 市场服务类
export class MarketService {
  // 获取单个股票实时行情
  static async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await api.get<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>(`/market/quote/${symbol}`);
      const data = response.data;
      
      // 检查data是否存在
      if (!data) {
        throw new Error(`获取股票 ${symbol} 行情数据失败: 数据为空`);
      }
      
      // 使用 FinancialUnitConverter 转换价格单位
      return {
        symbol: data.symbol || '',
        name: data.name || '未知',
        price: FinancialUnitConverter.centsToYuan(data.priceCents || 0),
        open: FinancialUnitConverter.centsToYuan(data.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(data.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(data.lowCents || 0),
        volume: FinancialUnitConverter.lotsToShares(data.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(data.amountCents || 0),
        preClose: FinancialUnitConverter.centsToYuan(data.preCloseCents || 0),
        change: FinancialUnitConverter.centsToYuan(data.changeCents || 0),
        changePercent: data.changePercent || 0,
        turnover: data.turnover || 0,
        volumeRatio: data.volumeRatio || 0,
        turnoverRate: data.turnoverRate || 0,
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error(`获取股票 ${symbol} 行情失败:`, error);
      throw error;
    }
  }
  
  // 批量获取多个股票实时行情
  static async getBatchStockQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    try {
      const response = await api.get<Record<string, { symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>(`/market/quotes/batch`, { params: { symbols: symbols.join(',') } });
      const data = response.data || {};
      
      const quotes: Record<string, StockQuote> = {};
      
      for (const [symbol, quoteData] of Object.entries(data)) {
        quotes[symbol] = {
          symbol: quoteData.symbol || '',
          name: quoteData.name || '未知',
          price: FinancialUnitConverter.centsToYuan(quoteData.priceCents || 0),
          open: FinancialUnitConverter.centsToYuan(quoteData.openCents || 0),
          high: FinancialUnitConverter.centsToYuan(quoteData.highCents || 0),
          low: FinancialUnitConverter.centsToYuan(quoteData.lowCents || 0),
          volume: FinancialUnitConverter.lotsToShares(quoteData.volumeLots || 0),
          amount: FinancialUnitConverter.centsToYuan(quoteData.amountCents || 0),
          preClose: FinancialUnitConverter.centsToYuan(quoteData.preCloseCents || 0),
          change: FinancialUnitConverter.centsToYuan(quoteData.changeCents || 0),
          changePercent: quoteData.changePercent || 0,
          turnover: quoteData.turnover || 0,
          volumeRatio: quoteData.volumeRatio || 0,
          turnoverRate: quoteData.turnoverRate || 0,
          timestamp: quoteData.timestamp || Date.now(),
        };
      }
      
      return quotes;
    } catch (error) {
      console.error(`批量获取股票行情失败:`, error);
      throw error;
    }
  }
  
  // 获取股票历史K线数据
  static async getStockKlineData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily', startDate?: string, endDate?: string): Promise<MarketTrend[]> {
    try {
      const params: any = { symbol, period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get<Array<{ date: string; openCents: number; highCents: number; lowCents: number; closeCents: number; volumeLots: number; amountCents: number }>>(`/market/kline`, { params });
      const data = response.data || [];
      
      return data.map((item) => ({
        date: item.date || '',
        open: FinancialUnitConverter.centsToYuan(item.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(item.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(item.lowCents || 0),
        close: FinancialUnitConverter.centsToYuan(item.closeCents || 0),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents || 0),
      }));
    } catch (error) {
      console.error(`获取股票 ${symbol} K线数据失败:`, error);
      throw error;
    }
  }
  
  // 获取市场指数数据
  static async getMarketIndices(): Promise<MarketIndices> {
    try {
      const response = await api.get<{
        shIndex: { value: number; changeCents: number; changePercent: number };
        szIndex: { value: number; changeCents: number; changePercent: number };
        cyIndex: { value: number; changeCents: number; changePercent: number };
        byIndex: { value: number; changeCents: number; changePercent: number };
      }>('/market/indices');
      const data = response.data;
      
      // 检查data是否存在
      if (!data) {
        throw new Error('获取市场指数数据失败: 数据为空');
      }
      
      return {
        shIndex: {
          value: data.shIndex?.value || 0,
          change: FinancialUnitConverter.centsToYuan(data.shIndex?.changeCents || 0),
          changePercent: data.shIndex?.changePercent || 0,
        },
        szIndex: {
          value: data.szIndex?.value || 0,
          change: FinancialUnitConverter.centsToYuan(data.szIndex?.changeCents || 0),
          changePercent: data.szIndex?.changePercent || 0,
        },
        cyIndex: {
          value: data.cyIndex?.value || 0,
          change: FinancialUnitConverter.centsToYuan(data.cyIndex?.changeCents || 0),
          changePercent: data.cyIndex?.changePercent || 0,
        },
        byIndex: {
          value: data.byIndex?.value || 0,
          change: FinancialUnitConverter.centsToYuan(data.byIndex?.changeCents || 0),
          changePercent: data.byIndex?.changePercent || 0,
        },
      };
    } catch (error) {
      console.error('获取市场指数数据失败:', error);
      throw error;
    }
  }
  
  // 获取股票基本信息
  static async getStockBasicInfo(symbol: string): Promise<StockBasicInfo> {
    try {
      const response = await api.get<StockBasicInfo>(`/market/stock/${symbol}/basic`);
      
      // 检查data是否存在
      if (!response.data) {
        throw new Error(`获取股票 ${symbol} 基本信息失败: 数据为空`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`获取股票 ${symbol} 基本信息失败:`, error);
      throw error;
    }
  }
  
  // 获取股票详细信息
  static async getStockDetailInfo(symbol: string): Promise<StockDetailInfo> {
    try {
      // 获取实时行情
      const quote = await this.getStockQuote(symbol);
      
      // 获取基本信息
      const basicInfo = await this.getStockBasicInfo(symbol);
      
      // 获取K线数据计算指标
      const klineData = await this.getStockKlineData(symbol, 'daily', 
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]);
      
      // 计算基本指标 - 确保klineData不为空
      const latestKline = Array.isArray(klineData) && klineData.length > 0 ? klineData[klineData.length - 1] : null;
      const weekHigh52 = Array.isArray(klineData) && klineData.length > 0 ? Math.max(...klineData.map(item => item.high)) : 0;
      const weekLow52 = Array.isArray(klineData) && klineData.length > 0 ? Math.min(...klineData.map(item => item.low)) : 0;
      
      // 获取其他指标
      const response = await api.get<{
        marketCapCents: number;
        pe: number;
        pb: number;
        epsCents: number;
        dividendYield: number;
        sharesLots: number;
        turnoverValueCents: number;
      }>(`/market/stock/${symbol}/details`);
      const detailData = (response.data || {}) as {
        marketCapCents: number;
        pe: number;
        pb: number;
        epsCents: number;
        dividendYield: number;
        sharesLots: number;
        turnoverValueCents: number;
      };
      
      return {
        ...quote,
        marketCap: FinancialUnitConverter.centsToBillions(detailData.marketCapCents || 0),
        pe: detailData.pe || 0,
        pb: detailData.pb || 0,
        eps: FinancialUnitConverter.centsToYuan(detailData.epsCents || 0),
        dividendYield: detailData.dividendYield || 0,
        weekHigh52: FinancialUnitConverter.centsToYuan(weekHigh52),
        weekLow52: FinancialUnitConverter.centsToYuan(weekLow52),
        shares: FinancialUnitConverter.lotsToShares(detailData.sharesLots || 0),
        turnoverValue: FinancialUnitConverter.centsToYuan(detailData.turnoverValueCents || 0),
      };
    } catch (error) {
      console.error(`获取股票 ${symbol} 详细信息失败:`, error);
      throw error;
    }
  }
  
  // 获取自选股列表
  static async getWatchlist(): Promise<WatchlistStock[]> {
    try {
      const response = await api.get<Array<{
        symbol: string;
        name: string;
        currentPriceCents: number;
        changePercent: number;
        volumeLots: number;
        marketCapCents: number;
        pe: number;
        addedDate: string;
      }>>('/market/watchlist');
      const data = response.data || [];
      
      return data.map((item) => ({
        symbol: item.symbol || '',
        name: item.name || '未知',
        currentPrice: FinancialUnitConverter.centsToYuan(item.currentPriceCents || 0),
        changePercent: item.changePercent || 0,
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        marketCap: FinancialUnitConverter.centsToBillions(item.marketCapCents || 0),
        pe: item.pe || 0,
        addedDate: item.addedDate || '',
      }));
    } catch (error) {
      console.error('获取自选股列表失败:', error);
      throw error;
    }
  }
  
  // 添加股票到自选股
  static async addToWatchlist(symbol: string): Promise<void> {
    try {
      await api.post('/market/watchlist', { symbol });
    } catch (error) {
      console.error(`添加股票 ${symbol} 到自选股失败:`, error);
      throw error;
    }
  }
  
  // 从自选股移除股票
  static async removeFromWatchlist(symbol: string): Promise<void> {
    try {
      await api.delete(`/market/watchlist/${symbol}`);
    } catch (error) {
      console.error(`从自选股移除股票 ${symbol} 失败:`, error);
      throw error;
    }
  }
  
  // 搜索股票
  static async searchStocks(keyword: string): Promise<StockBasicInfo[]> {
    try {
      const response = await api.get<StockBasicInfo[]>('/market/search', { params: { keyword } });
      // 强制早期返回，给 TS 绝对的安全感
      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }
      const safeData = response.data;
      return safeData.map(item => ({
        ts_code: item.ts_code || '',
        symbol: item.symbol || '',
        name: item.name || '未知',
        area: item.area || '',
        industry: item.industry || '',
        market: item.market || '',
        list_date: item.list_date || ''
      }));
    } catch (error) {
      console.error(`搜索股票 ${keyword} 失败:`, error);
      throw error;
    }
  }
  
  // 获取热门股票列表
  static async getHotStocks(limit: number = 10): Promise<StockQuote[]> {
    try {
      const response = await api.get<Array<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>('/market/hot', { params: { limit } });
      const data = response.data || [];
      
      return data.map((item: typeof data[0]) => ({
        symbol: item.symbol || '',
        name: item.name || '未知',
        price: FinancialUnitConverter.centsToYuan(item.priceCents || 0),
        open: FinancialUnitConverter.centsToYuan(item.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(item.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(item.lowCents || 0),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents || 0),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents || 0),
        change: FinancialUnitConverter.centsToYuan(item.changeCents || 0),
        changePercent: item.changePercent || 0,
        turnover: item.turnover || 0,
        volumeRatio: item.volumeRatio || 0,
        turnoverRate: item.turnoverRate || 0,
        timestamp: item.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('获取热门股票列表失败:', error);
      throw error;
    }
  }
  
  // 获取涨幅榜
  static async getGainers(limit: number = 10): Promise<StockQuote[]> {
    try {
      const response = await api.get<Array<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>('/market/gainers', { params: { limit } });
      const data = response.data || [];
      
      return data.map((item) => ({
        symbol: item.symbol || '',
        name: item.name || '未知',
        price: FinancialUnitConverter.centsToYuan(item.priceCents || 0),
        open: FinancialUnitConverter.centsToYuan(item.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(item.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(item.lowCents || 0),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents || 0),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents || 0),
        change: FinancialUnitConverter.centsToYuan(item.changeCents || 0),
        changePercent: item.changePercent || 0,
        turnover: item.turnover || 0,
        volumeRatio: item.volumeRatio || 0,
        turnoverRate: item.turnoverRate || 0,
        timestamp: item.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('获取涨幅榜失败:', error);
      throw error;
    }
  }
  
  // 获取跌幅榜
  static async getLosers(limit: number = 10): Promise<StockQuote[]> {
    try {
      const response = await api.get<Array<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>('/market/losers', { params: { limit } });
      // 强制早期返回，给 TS 绝对的安全感
      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }
      const safeData = response.data;
      
      return safeData.map((item) => ({
        symbol: item.symbol || '',
        name: item.name || '未知',
        price: FinancialUnitConverter.centsToYuan(item.priceCents || 0),
        open: FinancialUnitConverter.centsToYuan(item.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(item.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(item.lowCents || 0),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents || 0),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents || 0),
        change: FinancialUnitConverter.centsToYuan(item.changeCents || 0),
        changePercent: item.changePercent || 0,
        turnover: item.turnover || 0,
        volumeRatio: item.volumeRatio || 0,
        turnoverRate: item.turnoverRate || 0,
        timestamp: item.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('获取跌幅榜失败:', error);
      throw error;
    }
  }
  
  // 获取成交量榜
  static async getMostActive(limit: number = 10): Promise<StockQuote[]> {
    try {
      const response = await api.get<Array<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>('/market/most-active', { params: { limit } });
      // 强制早期返回，给 TS 绝对的安全感
      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }
      const safeData = response.data;
      
      return safeData.map((item) => ({
        symbol: item.symbol || '',
        name: item.name || '未知',
        price: FinancialUnitConverter.centsToYuan(item.priceCents || 0),
        open: FinancialUnitConverter.centsToYuan(item.openCents || 0),
        high: FinancialUnitConverter.centsToYuan(item.highCents || 0),
        low: FinancialUnitConverter.centsToYuan(item.lowCents || 0),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots || 0),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents || 0),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents || 0),
        change: FinancialUnitConverter.centsToYuan(item.changeCents || 0),
        changePercent: item.changePercent || 0,
        turnover: item.turnover || 0,
        volumeRatio: item.volumeRatio || 0,
        turnoverRate: item.turnoverRate || 0,
        timestamp: item.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('获取成交量榜失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const marketService = MarketService;