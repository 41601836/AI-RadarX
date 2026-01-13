import { api, FinancialUnitConverter } from './client';

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
      
      // 使用 FinancialUnitConverter 转换价格单位
      return {
        symbol: data.symbol,
        name: data.name,
        price: FinancialUnitConverter.centsToYuan(data.priceCents),
        open: FinancialUnitConverter.centsToYuan(data.openCents),
        high: FinancialUnitConverter.centsToYuan(data.highCents),
        low: FinancialUnitConverter.centsToYuan(data.lowCents),
        volume: FinancialUnitConverter.lotsToShares(data.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(data.amountCents),
        preClose: FinancialUnitConverter.centsToYuan(data.preCloseCents),
        change: FinancialUnitConverter.centsToYuan(data.changeCents),
        changePercent: data.changePercent,
        turnover: data.turnover,
        volumeRatio: data.volumeRatio,
        turnoverRate: data.turnoverRate,
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
      const data = response.data;
      
      const quotes: Record<string, StockQuote> = {};
      
      for (const [symbol, quoteData] of Object.entries(data)) {
        quotes[symbol] = {
          symbol: quoteData.symbol,
          name: quoteData.name,
          price: FinancialUnitConverter.centsToYuan(quoteData.priceCents),
          open: FinancialUnitConverter.centsToYuan(quoteData.openCents),
          high: FinancialUnitConverter.centsToYuan(quoteData.highCents),
          low: FinancialUnitConverter.centsToYuan(quoteData.lowCents),
          volume: FinancialUnitConverter.lotsToShares(quoteData.volumeLots),
          amount: FinancialUnitConverter.centsToYuan(quoteData.amountCents),
          preClose: FinancialUnitConverter.centsToYuan(quoteData.preCloseCents),
          change: FinancialUnitConverter.centsToYuan(quoteData.changeCents),
          changePercent: quoteData.changePercent,
          turnover: quoteData.turnover,
          volumeRatio: quoteData.volumeRatio,
          turnoverRate: quoteData.turnoverRate,
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
      const data = response.data;
      
      return data.map((item) => ({
        date: item.date,
        open: FinancialUnitConverter.centsToYuan(item.openCents),
        high: FinancialUnitConverter.centsToYuan(item.highCents),
        low: FinancialUnitConverter.centsToYuan(item.lowCents),
        close: FinancialUnitConverter.centsToYuan(item.closeCents),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents),
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
      
      return {
        shIndex: {
          value: data.shIndex.value,
          change: FinancialUnitConverter.centsToYuan(data.shIndex.changeCents),
          changePercent: data.shIndex.changePercent,
        },
        szIndex: {
          value: data.szIndex.value,
          change: FinancialUnitConverter.centsToYuan(data.szIndex.changeCents),
          changePercent: data.szIndex.changePercent,
        },
        cyIndex: {
          value: data.cyIndex.value,
          change: FinancialUnitConverter.centsToYuan(data.cyIndex.changeCents),
          changePercent: data.cyIndex.changePercent,
        },
        byIndex: {
          value: data.byIndex.value,
          change: FinancialUnitConverter.centsToYuan(data.byIndex.changeCents),
          changePercent: data.byIndex.changePercent,
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
      
      // 计算基本指标
      const latestKline = klineData[klineData.length - 1];
      const weekHigh52 = Math.max(...klineData.map(item => item.high));
      const weekLow52 = Math.min(...klineData.map(item => item.low));
      
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
      const detailData = response.data;
      
      return {
        ...quote,
        marketCap: FinancialUnitConverter.centsToBillions(detailData.marketCapCents),
        pe: detailData.pe,
        pb: detailData.pb,
        eps: FinancialUnitConverter.centsToYuan(detailData.epsCents),
        dividendYield: detailData.dividendYield,
        weekHigh52: FinancialUnitConverter.centsToYuan(weekHigh52),
        weekLow52: FinancialUnitConverter.centsToYuan(weekLow52),
        shares: FinancialUnitConverter.lotsToShares(detailData.sharesLots),
        turnoverValue: FinancialUnitConverter.centsToYuan(detailData.turnoverValueCents),
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
      const data = response.data;
      
      return data.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        currentPrice: FinancialUnitConverter.centsToYuan(item.currentPriceCents),
        changePercent: item.changePercent,
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        marketCap: FinancialUnitConverter.centsToBillions(item.marketCapCents),
        pe: item.pe,
        addedDate: item.addedDate,
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
      return response.data;
    } catch (error) {
      console.error(`搜索股票 ${keyword} 失败:`, error);
      throw error;
    }
  }
  
  // 获取热门股票列表
  static async getHotStocks(limit: number = 10): Promise<StockQuote[]> {
    try {
      const response = await api.get<Array<{ symbol: string; name: string; priceCents: number; openCents: number; highCents: number; lowCents: number; volumeLots: number; amountCents: number; preCloseCents: number; changeCents: number; changePercent: number; turnover: number; volumeRatio: number; turnoverRate: number; timestamp?: number }>>('/market/hot', { params: { limit } });
      const data = response.data;
      
      return data.map((item: typeof data[0]) => ({
        symbol: item.symbol,
        name: item.name,
        price: FinancialUnitConverter.centsToYuan(item.priceCents),
        open: FinancialUnitConverter.centsToYuan(item.openCents),
        high: FinancialUnitConverter.centsToYuan(item.highCents),
        low: FinancialUnitConverter.centsToYuan(item.lowCents),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents),
        change: FinancialUnitConverter.centsToYuan(item.changeCents),
        changePercent: item.changePercent,
        turnover: item.turnover,
        volumeRatio: item.volumeRatio,
        turnoverRate: item.turnoverRate,
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
      const data = response.data;
      
      return data.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        price: FinancialUnitConverter.centsToYuan(item.priceCents),
        open: FinancialUnitConverter.centsToYuan(item.openCents),
        high: FinancialUnitConverter.centsToYuan(item.highCents),
        low: FinancialUnitConverter.centsToYuan(item.lowCents),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents),
        change: FinancialUnitConverter.centsToYuan(item.changeCents),
        changePercent: item.changePercent,
        turnover: item.turnover,
        volumeRatio: item.volumeRatio,
        turnoverRate: item.turnoverRate,
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
      const data = response.data;
      
      return data.map((item: typeof data[0]) => ({
        symbol: item.symbol,
        name: item.name,
        price: FinancialUnitConverter.centsToYuan(item.priceCents),
        open: FinancialUnitConverter.centsToYuan(item.openCents),
        high: FinancialUnitConverter.centsToYuan(item.highCents),
        low: FinancialUnitConverter.centsToYuan(item.lowCents),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents),
        change: FinancialUnitConverter.centsToYuan(item.changeCents),
        changePercent: item.changePercent,
        turnover: item.turnover,
        volumeRatio: item.volumeRatio,
        turnoverRate: item.turnoverRate,
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
      const data = response.data;
      
      return data.map((item: typeof data[0]) => ({
        symbol: item.symbol,
        name: item.name,
        price: FinancialUnitConverter.centsToYuan(item.priceCents),
        open: FinancialUnitConverter.centsToYuan(item.openCents),
        high: FinancialUnitConverter.centsToYuan(item.highCents),
        low: FinancialUnitConverter.centsToYuan(item.lowCents),
        volume: FinancialUnitConverter.lotsToShares(item.volumeLots),
        amount: FinancialUnitConverter.centsToYuan(item.amountCents),
        preClose: FinancialUnitConverter.centsToYuan(item.preCloseCents),
        change: FinancialUnitConverter.centsToYuan(item.changeCents),
        changePercent: item.changePercent,
        turnover: item.turnover,
        volumeRatio: item.volumeRatio,
        turnoverRate: item.turnoverRate,
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