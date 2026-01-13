// 数据适配层 - 统一数据源接口，严格处理单位转换
import { tushareRequest } from '../api/common/tushare';
import { fetchChipDistribution } from '../api/chip';
import { fetchRealTimeQuote } from '../api/market/quote';
import { fetchOpinionSummary } from '../api/publicOpinion';
import { fetchTechIndicatorData } from '../api/techIndicator';
import { fetchStockRiskAssessment } from '../api/risk';
import { FinancialUnitConverter as DataConverter } from '../utils/data-converter';

// 标准化数据类型定义
export interface StockQuoteData {
  stockCode: string;
  stockName: string;
  currentPrice: number; // 当前价格（元）
  changePercent: number; // 涨跌幅（%）
  volume: number; // 成交量（股）
  amount: number; // 成交额（元）
  turnover: number; // 换手率（%）
  timestamp: number;
}

export interface ChipDistributionData {
  stockCode: string;
  stockName: string;
  chipPeaks: ChipPeak[]; // 筹码峰数据
  supportLevels: number[]; // 支撑位（元）
  resistanceLevels: number[]; // 压力位（元）
  avgCost: number; // 平均成本（元）
  concentration: number; // 筹码集中度 0-1
  lastUpdate: number;
}

export interface ChipPeak {
  price: number; // 价格（元）
  volume: number; // 成交量（股）
  percentage: number; // 占总筹码比例（%）
  strength: number; // 峰强度 0-1
}

export interface PublicOpinionData {
  stockCode: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 到 1
  newsCount: number; // 新闻数量
  socialMentions: number; // 社交媒体提及次数
  volatilityScore: number; // 波动性评分 0-1
  lastUpdate: number;
}

export interface TechnicalIndicatorsData {
  stockCode: string;
  rsi: number; // RSI 指标 0-100
  macd: {
    dif: number;
    dea: number;
    macd: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  kdj: {
    k: number;
    d: number;
    j: number;
  };
  trend: 'bullish' | 'bearish' | 'sideways';
  signal: 'buy' | 'sell' | 'hold';
  lastUpdate: number;
}

export interface RiskAssessmentData {
  stockCode: string;
  var95: number; // 95% VaR（元）
  cvar95: number; // 95% CVaR（元）
  maxDrawdown: number; // 最大回撤（%）
  sharpeRatio: number; // 夏普比率
  beta: number; // Beta 系数
  volatility: number; // 波动率（%）
  liquidity: number; // 流动性评分 0-1
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdate: number;
}

// 统一数据接口
export interface UnifiedStockData {
  stockCode: string;
  stockName: string;
  quote: StockQuoteData;
  chip: ChipDistributionData;
  opinion: PublicOpinionData;
  technical: TechnicalIndicatorsData;
  risk: RiskAssessmentData;
  timestamp: number;
}

export { DataConverter };

// 数据适配器基类
abstract class DataAdapter {
  protected stockCode: string;
  
  constructor(stockCode: string) {
    this.stockCode = stockCode;
  }
  
  abstract fetchData(): Promise<any>;
  abstract transformData(rawData: any): any;
  
  async getData(): Promise<any> {
    const rawData = await this.fetchData();
    return this.transformData(rawData);
  }
}

// 行情数据适配器
class QuoteAdapter extends DataAdapter {
  async fetchData(): Promise<any> {
    // 调用现有的行情 API
    return await fetchRealTimeQuote([this.stockCode]);
  }
  
  transformData(rawData: any): StockQuoteData {
    // fetchRealTimeQuote 返回的是 Record<string, RealTimeQuoteData>
    const data = rawData.data?.[this.stockCode] || {};
    
    return {
      stockCode: this.stockCode,
      stockName: data.name || '未知',
      currentPrice: data.price || 0, // 已经是元
      changePercent: data.changePercent || 0,
      volume: data.volume || 0, // 已经是股
      amount: data.amount || 0, // 已经是元
      turnover: data.turnoverRate || 0,
      timestamp: Date.now(),
    };
  }
}

// 筹码分布适配器
class ChipAdapter extends DataAdapter {
  async fetchData(): Promise<any> {
    // 调用现有的筹码分布 API
    return await fetchChipDistribution({ stockCode: this.stockCode });
  }
  
  transformData(rawData: any): ChipDistributionData {
    const data = rawData.data || {};
    
    // 处理筹码峰数据（严格单位转换）
    const chipPeaks = (data.chipPeakInfo?.peaks || []).map((peak: any) => ({
      price: DataConverter.convertChipPriceFromApi(Number(peak.price) || 0),
      volume: Number(peak.volume) || 0,
      percentage: Number(peak.ratio) || 0,
      strength: Number(peak.strength) || 0,
    }));
    
    // 处理支撑位和压力位
    const supportLevels = [DataConverter.convertChipPriceFromApi(data.supportPrice || 0)];
    const resistanceLevels = [DataConverter.convertChipPriceFromApi(data.resistancePrice || 0)];
    
    return {
      stockCode: this.stockCode,
      stockName: data.stockName || '未知',
      chipPeaks,
      supportLevels,
      resistanceLevels,
      avgCost: DataConverter.convertChipPriceFromApi(Number(data.mainCostPrice) || 0),
      concentration: Number(data.chipConcentration) || 0,
      lastUpdate: Date.now(),
    };
  }
}

// 舆情数据适配器
class OpinionAdapter extends DataAdapter {
  async fetchData(): Promise<any> {
    return await fetchOpinionSummary({ stockCode: this.stockCode });
  }
  
  transformData(rawData: any): PublicOpinionData {
    const data = rawData.data || {};
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    const sentimentScore = Number(data.opinionScore) || 50;
    
    if (sentimentScore > 60) {
      sentiment = 'bullish';
    } else if (sentimentScore < 40) {
      sentiment = 'bearish';
    }
    
    return {
      stockCode: this.stockCode,
      sentiment,
      sentimentScore: (sentimentScore - 50) / 50, // 转换为 -1 到 1
      newsCount: 0, // 接口未返回
      socialMentions: 0, // 接口未返回
      volatilityScore: 0, // 接口未返回
      lastUpdate: Date.now(),
    };
  }
}

// 技术指标适配器
class TechnicalAdapter extends DataAdapter {
  async fetchData(): Promise<any> {
    return await fetchTechIndicatorData({ stockCode: this.stockCode });
  }
  
  transformData(rawData: any): TechnicalIndicatorsData {
    const data = rawData.data || {};
    // 假设返回的是列表，取最新的
    const latest = data.indicatorDataList?.[data.indicatorDataList.length - 1] || {};
    
    return {
      stockCode: this.stockCode,
      rsi: Number(latest.rsi?.rsi6) || 50,
      macd: {
        dif: Number(latest.macd?.diff) || 0,
        dea: Number(latest.macd?.dea) || 0,
        macd: Number(latest.macd?.bar) || 0,
      },
      bollingerBands: {
        upper: 0, // 接口未返回
        middle: 0,
        lower: 0,
      },
      kdj: {
        k: 50, // 接口未返回
        d: 50,
        j: 50,
      },
      trend: 'sideways',
      signal: 'hold',
      lastUpdate: Date.now(),
    };
  }
}

// 风险评估适配器
class RiskAdapter extends DataAdapter {
  async fetchData(): Promise<any> {
    return await fetchStockRiskAssessment(this.stockCode);
  }
  
  transformData(rawData: any): RiskAssessmentData {
    const data = rawData.data || {};
    
    return {
      stockCode: this.stockCode,
      var95: DataConverter.centsToYuan(Number(data.var95Cents) || 0),
      cvar95: DataConverter.centsToYuan(Number(data.cvar95Cents) || 0),
      maxDrawdown: Number(data.maxDrawdown) || 0,
      sharpeRatio: Number(data.sharpeRatio) || 0,
      beta: Number(data.beta) || 1,
      volatility: Number(data.volatility) || 0,
      liquidity: Number(data.liquidity) || 0.5,
      riskLevel: data.riskLevel || 'medium',
      lastUpdate: Date.now(),
    };
  }
}

// 统一数据桥接器
export class DataBridge {
  private stockCode: string;
  private adapters: Map<string, DataAdapter>;
  
  // 请求去重缓存，避免同一时间重复请求相同数据
  private static pendingRequests: Map<string, Promise<UnifiedStockData>> = new Map();
  
  // 并发控制：最大同时请求数
  private static readonly MAX_CONCURRENT_REQUESTS = 20;
  private static activeRequests = 0;
  private static requestQueue: Array<() => Promise<void>> = [];
  
  constructor(stockCode: string) {
    this.stockCode = stockCode;
    this.adapters = new Map<string, DataAdapter>([
      ['quote', new QuoteAdapter(stockCode)],
      ['chip', new ChipAdapter(stockCode)],
      ['opinion', new OpinionAdapter(stockCode)],
      ['technical', new TechnicalAdapter(stockCode)],
      ['risk', new RiskAdapter(stockCode)],
    ]);
  }
  
  // 获取单个数据源
  async getData(source: 'quote' | 'chip' | 'opinion' | 'technical' | 'risk'): Promise<any> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`不支持的数据源: ${source}`);
    }
    
    try {
      return await adapter.getData();
    } catch (error) {
      console.error(`获取${source}数据失败:`, error);
      // 返回默认数据而不是抛出错误
      return this.getDefaultData(source);
    }
  }
  
  // 获取所有数据
  async getAllData(): Promise<UnifiedStockData> {
    // 检查缓存
    const cached = DataBridge.getCachedData(this.stockCode);
    if (cached) {
      return cached;
    }
    
    // 检查是否已有相同请求在进行中
    const pendingKey = `all_${this.stockCode}`;
    if (DataBridge.pendingRequests.has(pendingKey)) {
      return DataBridge.pendingRequests.get(pendingKey)!;
    }
    
    // 实现请求排队和并发控制
    const requestPromise = new Promise<UnifiedStockData>((resolve, reject) => {
      const executeRequest = async () => {
        if (DataBridge.activeRequests >= DataBridge.MAX_CONCURRENT_REQUESTS) {
          // 如果达到最大并发数，将请求加入队列
          DataBridge.requestQueue.push(executeRequest);
          return;
        }
        
        DataBridge.activeRequests++;
        
        try {
          const [quote, chip, opinion, technical, risk] = await Promise.all([
            this.getData('quote'),
            this.getData('chip'),
            this.getData('opinion'),
            this.getData('technical'),
            this.getData('risk'),
          ]);
          
          const unifiedData: UnifiedStockData = {
            stockCode: this.stockCode,
            stockName: quote.stockName || '未知',
            quote,
            chip,
            opinion,
            technical,
            risk,
            timestamp: Date.now(),
          };
          
          // 验证数据并缓存
          if (DataBridge.validateUnifiedData(unifiedData)) {
            DataBridge.setCachedData(this.stockCode, unifiedData);
          }
          
          resolve(unifiedData);
        } catch (error) {
          console.error(`获取${this.stockCode}数据失败:`, error);
          reject(error);
        } finally {
          DataBridge.activeRequests--;
          DataBridge.pendingRequests.delete(pendingKey);
          
          // 处理队列中的下一个请求
          if (DataBridge.requestQueue.length > 0) {
            const nextRequest = DataBridge.requestQueue.shift()!;
            nextRequest();
          }
        }
      };
      
      executeRequest();
    });
    
    // 记录待处理请求
    DataBridge.pendingRequests.set(pendingKey, requestPromise);
    
    return requestPromise;
  }
  
  // 批量获取多个股票的数据
  static async getBatchData(stockCodes: string[]): Promise<UnifiedStockData[]> {
    // 去重
    const uniqueStockCodes = [...new Set(stockCodes)];
    
    // 先检查缓存
    const results: UnifiedStockData[] = [];
    const needToFetch: string[] = [];
    
    uniqueStockCodes.forEach(code => {
      const cached = DataBridge.getCachedData(code);
      if (cached) {
        results.push(cached);
      } else {
        needToFetch.push(code);
      }
    });
    
    // 只获取需要的数据
    if (needToFetch.length > 0) {
      const promises = needToFetch.map(code => {
        const bridge = new DataBridge(code);
        return bridge.getAllData().catch(error => {
          console.error(`获取${code}数据失败:`, error);
          return null;
        });
      });
      
      const fetchedResults = await Promise.all(promises);
      const validResults = fetchedResults.filter(data => data !== null) as UnifiedStockData[];
      results.push(...validResults);
    }
    
    return results;
  }
  
  // 默认数据（当API失败时使用）
  private getDefaultData(source: string): any {
    const defaults = {
      quote: {
        stockCode: this.stockCode,
        stockName: '未知',
        currentPrice: 0,
        changePercent: 0,
        volume: 0,
        amount: 0,
        turnover: 0,
        timestamp: Date.now(),
      },
      chip: {
        stockCode: this.stockCode,
        stockName: '未知',
        chipPeaks: [],
        supportLevels: [],
        resistanceLevels: [],
        avgCost: 0,
        concentration: 0,
        lastUpdate: Date.now(),
      },
      opinion: {
        stockCode: this.stockCode,
        sentiment: 'neutral' as const,
        sentimentScore: 0,
        newsCount: 0,
        socialMentions: 0,
        volatilityScore: 0,
        lastUpdate: Date.now(),
      },
      technical: {
        stockCode: this.stockCode,
        rsi: 50,
        macd: { dif: 0, dea: 0, macd: 0 },
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        kdj: { k: 50, d: 50, j: 50 },
        trend: 'sideways' as const,
        signal: 'hold' as const,
        lastUpdate: Date.now(),
      },
      risk: {
        stockCode: this.stockCode,
        var95: 0,
        cvar95: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        beta: 1,
        volatility: 0,
        liquidity: 0.5,
        riskLevel: 'medium' as const,
        lastUpdate: Date.now(),
      },
    };
    
    return defaults[source as keyof typeof defaults];
  }
  
  // 数据验证
  static validateUnifiedData(data: UnifiedStockData): boolean {
    const validators = [
      DataConverter.validatePrice(data.quote.currentPrice),
      DataConverter.validateVolume(data.quote.volume),
      Array.isArray(data.chip.chipPeaks),
      typeof data.opinion.sentimentScore === 'number',
      typeof data.technical.rsi === 'number' && data.technical.rsi >= 0 && data.technical.rsi <= 100,
      typeof data.risk.var95 === 'number',
    ];
    
    return validators.every(Boolean);
  }
  
  // 数据缓存管理
  private static cache = new Map<string, { data: UnifiedStockData; expiryTime: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟
  
  static getCachedData(stockCode: string): UnifiedStockData | null {
    const cached = DataBridge.cache.get(stockCode);
    if (cached && Date.now() < cached.expiryTime) {
      return cached.data;
    }
    DataBridge.cache.delete(stockCode);
    return null;
  }
  
  static setCachedData(stockCode: string, data: UnifiedStockData): void {
    DataBridge.cache.set(stockCode, {
      data,
      expiryTime: Date.now() + DataBridge.CACHE_DURATION,
    });
  }
  
  static clearCache(): void {
    DataBridge.cache.clear();
  }
}

// 便捷函数
export async function getStockData(stockCode: string): Promise<UnifiedStockData> {
  // 先检查缓存
  const cached = DataBridge.getCachedData(stockCode);
  if (cached) {
    return cached;
  }
  
  // 获取新数据
  const bridge = new DataBridge(stockCode);
  const data = await bridge.getAllData();
  
  // 验证数据并缓存
  if (DataBridge.validateUnifiedData(data)) {
    DataBridge.setCachedData(stockCode, data);
  }
  
  return data;
}

export async function getBatchStockData(stockCodes: string[]): Promise<UnifiedStockData[]> {
  return await DataBridge.getBatchData(stockCodes);
}