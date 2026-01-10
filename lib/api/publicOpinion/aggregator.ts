// 新闻聚合器，负责聚合来自多个来源的新闻并进行情感分析
import { ApiResponse } from '../common/response';
import { ApiError, ErrorCode } from '../common/errors';
import { OpinionHotEvent, OpinionSummaryData } from './summary';
import { formatDateTime } from '../common/utils'; // 导入通用工具函数

// 新闻来源类型
export enum NewsSource {
  TUSHARE = 'tushare',
  CAILIANSHEN = 'cailianshen',
  SINA = 'sina',
  EASTMONEY = 'eastmoney'
}

// 原始新闻数据接口
export interface RawNewsData {
  source: NewsSource; // 新闻来源
  id: string; // 新闻ID
  title: string; // 新闻标题
  content: string; // 新闻内容
  publishTime: string; // 发布时间（yyyy-MM-dd HH:mm:ss）
  url?: string; // 新闻链接
  stockCodes: string[]; // 相关股票代码
  sourceSpecificData?: any; // 来源特定数据
}

// 情感分析结果接口
export interface SentimentAnalysisResult {
  score: number; // 情感得分（0-100，越高越正面）
  polarity: 'positive' | 'negative' | 'neutral'; // 情感极性
  confidence: number; // 置信度（0-1）
  keywords: string[]; // 关键词
}

// 标准化新闻数据接口
export interface StandardizedNewsData extends RawNewsData {
  sentiment: SentimentAnalysisResult; // 情感分析结果
  influenceScore: number; // 影响力评分（0-100）
}

// 新闻聚合器类
export class NewsAggregator {
  private static readonly TUSHARE_NEWS_API = '/api/v1/news/tushare';
  private static readonly CAILIANSHEN_API = '/api/v1/news/cailianshen';
  
  // 单例模式实现
  private static instance: NewsAggregator;
  
  private constructor() {
    // 私有构造函数，防止外部实例化
  }
  
  // 获取单例实例
  public static getInstance(): NewsAggregator {
    if (!NewsAggregator.instance) {
      NewsAggregator.instance = new NewsAggregator();
    }
    return NewsAggregator.instance;
  }
  
  // 聚合多个来源的新闻数据
  public async aggregateNews(
    stockCode: string,
    timeRange: string = '7d'
  ): Promise<StandardizedNewsData[]> {
    // 验证参数
    if (!stockCode || !/^(SH|SZ)\d{6}$/.test(stockCode)) {
      throw new ApiError(ErrorCode.STOCK_CODE_FORMAT_ERROR, '股票代码格式错误');
    }
    
    // 聚合所有来源的新闻
    const allNews = await Promise.all([
      this.fetchFromTushare(stockCode, timeRange),
      this.fetchFromCailianShen(stockCode, timeRange),
      // 可以添加更多来源
    ]);
    
    // 合并并去重新闻
    const mergedNews = this.mergeAndDeduplicate(allNews.flat());
    
    // 进行情感分析
    const analyzedNews = await this.analyzeSentiment(mergedNews);
    
    // 计算影响力评分
    const scoredNews = analyzedNews.map(news => ({
      ...news,
      influenceScore: this.calculateInfluenceScore(news)
    }));
    
    // 按时间排序
    return scoredNews.sort((a, b) => {
      return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
    });
  }
  
  // 从Tushare获取新闻数据
  private async fetchFromTushare(
    stockCode: string,
    timeRange: string
  ): Promise<RawNewsData[]> {
    try {
      // 这里应该调用Tushare的新闻API，现在返回模拟数据
      console.info('Fetching news from Tushare');
      
      // 模拟Tushare新闻数据
      return [
        {
          source: NewsSource.TUSHARE,
          id: `tushare-${Date.now()}-1`,
          title: `${stockCode}发布2025年年度财报，净利润同比增长5%`,
          content: `${stockCode}今日发布2025年年度财报，公司实现营业收入1000亿元，净利润50亿元，同比增长5%。公司表示，业绩增长主要得益于业务结构优化和成本控制。`,
          publishTime: formatDateTime(new Date(Date.now() - 3600000)),
          stockCodes: [stockCode],
          sourceSpecificData: {
            category: 'finance',
            importance: 8
          }
        },
        {
          source: NewsSource.TUSHARE,
          id: `tushare-${Date.now()}-2`,
          title: `${stockCode}获得国家科技进步奖`,
          content: `${stockCode}研发的新产品获得国家科技进步奖，这将进一步提升公司的技术竞争力和市场影响力。`,
          publishTime: formatDateTime(new Date(Date.now() - 7200000)),
          stockCodes: [stockCode],
          sourceSpecificData: {
            category: 'technology',
            importance: 9
          }
        }
      ];
    } catch (error) {
      console.error('Failed to fetch news from Tushare:', error);
      return [];
    }
  }
  
  // 从财联社获取电报流数据（预留接口，当前返回模拟数据）
  private async fetchFromCailianShen(
    stockCode: string,
    timeRange: string
  ): Promise<RawNewsData[]> {
    try {
      // 这里应该实现财联社电报流的爬取逻辑
      console.info('Fetching news from CailianShen (reserved interface)');
      
      // 模拟财联社电报数据
      return [
        {
          source: NewsSource.CAILIANSHEN,
          id: `cailianshen-${Date.now()}-1`,
          title: `【财联社电报】${stockCode}：拟投资10亿元扩建生产线`,
          content: `${stockCode}晚间公告，公司拟投资10亿元扩建生产线，预计2026年下半年投产，投产后将年增产能100万吨。`,
          publishTime: formatDateTime(new Date(Date.now() - 1800000)),
          stockCodes: [stockCode],
          sourceSpecificData: {
            urgency: 'high',
            channel: 'main'
          }
        },
        {
          source: NewsSource.CAILIANSHEN,
          id: `cailianshen-${Date.now()}-2`,
          title: `【财联社早知道】行业利好政策将出台，${stockCode}受益`,
          content: `据财联社独家获悉，国家将出台行业利好政策，${stockCode}作为行业龙头，有望率先受益。`,
          publishTime: formatDateTime(new Date(Date.now() - 3600000 * 24)),
          stockCodes: [stockCode],
          sourceSpecificData: {
            urgency: 'medium',
            channel: 'morning'
          }
        }
      ];
    } catch (error) {
      console.error('Failed to fetch news from CailianShen:', error);
      return [];
    }
  }
  
  // 合并并去重新闻
  private mergeAndDeduplicate(newsList: RawNewsData[]): RawNewsData[] {
    const uniqueNewsMap = new Map<string, RawNewsData>();
    
    newsList.forEach(news => {
      // 使用新闻标题的哈希值作为去重键
      const key = `${news.source}-${news.title}`;
      if (!uniqueNewsMap.has(key)) {
        uniqueNewsMap.set(key, news);
      }
    });
    
    return Array.from(uniqueNewsMap.values());
  }
  
  // 通过LLM进行情感分析（预留接口，当前返回模拟结果）
  private async analyzeSentiment(newsList: RawNewsData[]): Promise<(RawNewsData & { sentiment: SentimentAnalysisResult })[]> {
    try {
      // 这里应该调用LLM进行情感分析
      console.info('Analyzing sentiment via LLM (reserved interface)');
      
      return newsList.map(news => {
        // 模拟情感分析结果
        let score = 50;
        let polarity: 'positive' | 'negative' | 'neutral' = 'neutral';
        
        // 基于关键词简单判断情感
        const positiveKeywords = ['增长', '获奖', '利好', '投资', '扩建', '受益'];
        const negativeKeywords = ['亏损', '下降', '风险', '违规', '处罚', '警告'];
        
        const text = `${news.title} ${news.content}`;
        const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;
        const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length;
        
        if (positiveCount > negativeCount) {
          score = 70 + Math.random() * 20;
          polarity = 'positive';
        } else if (negativeCount > positiveCount) {
          score = 10 + Math.random() * 20;
          polarity = 'negative';
        }
        
        return {
          ...news,
          sentiment: {
            score,
            polarity,
            confidence: 0.8 + Math.random() * 0.15,
            keywords: this.extractKeywords(text)
          }
        };
      });
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
      // 返回默认情感分析结果
      return newsList.map(news => ({
        ...news,
        sentiment: {
          score: 50,
          polarity: 'neutral',
          confidence: 0.5,
          keywords: []
        }
      }));
    }
  }
  
  // 提取关键词（简单实现，未来可替换为更高级的算法）
  private extractKeywords(text: string): string[] {
    // 简单提取股票代码和常见金融关键词
    const stockCodes = text.match(/(SH|SZ)\d{6}/g) || [];
    const financialKeywords = ['财报', '业绩', '投资', '扩建', '政策', '利好', '增长', '净利润'];
    
    const keywords = [...stockCodes];
    financialKeywords.forEach(keyword => {
      if (text.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    return keywords.slice(0, 5); // 最多返回5个关键词
  }
  
  // 计算新闻影响力评分
  private calculateInfluenceScore(news: RawNewsData & { sentiment: SentimentAnalysisResult }): number {
    let score = 50;
    
    // 基于来源调整评分
    const sourceFactor = {
      [NewsSource.CAILIANSHEN]: 1.2, // 财联社电报影响力较高
      [NewsSource.TUSHARE]: 1.0,     // Tushare正常影响力
      [NewsSource.SINA]: 0.9,        // 新浪较低影响力
      [NewsSource.EASTMONEY]: 0.95   // 东方财富中等影响力
    };
    
    // 基于情感极性调整评分
    const sentimentFactor = {
      'positive': 1.05,
      'negative': 1.05, // 负面新闻也有较高影响力
      'neutral': 0.9
    };
    
    // 基于发布时间调整评分（越新评分越高）
    const publishTime = new Date(news.publishTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - publishTime.getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0.5, 1 - hoursDiff / 72); // 72小时后影响力减半
    
    // 计算最终评分
    score *= sourceFactor[news.source] || 1.0;
    score *= sentimentFactor[news.sentiment.polarity] || 1.0;
    score *= timeFactor;
    
    // 确保评分在0-100之间
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  // 生成舆情摘要
  public async generateOpinionSummary(
    stockCode: string,
    timeRange: string = '7d'
  ): Promise<OpinionSummaryData> {
    const newsList = await this.aggregateNews(stockCode, timeRange);
    
    if (newsList.length === 0) {
      // 返回默认舆情摘要
      return {
        stockCode,
        stockName: '未知股票',
        opinionScore: 50,
        positiveRatio: 0.33,
        negativeRatio: 0.33,
        neutralRatio: 0.34,
        hotEvents: [],
        opinionTrend: []
      };
    }
    
    // 计算舆情综合评分
    const totalScore = newsList.reduce((sum, news) => sum + news.sentiment.score, 0);
    const opinionScore = Math.round(totalScore / newsList.length);
    
    // 计算情感占比
    const positiveCount = newsList.filter(news => news.sentiment.polarity === 'positive').length;
    const negativeCount = newsList.filter(news => news.sentiment.polarity === 'negative').length;
    const neutralCount = newsList.filter(news => news.sentiment.polarity === 'neutral').length;
    
    const totalCount = newsList.length;
    const positiveRatio = positiveCount / totalCount;
    const negativeRatio = negativeCount / totalCount;
    const neutralRatio = neutralCount / totalCount;
    
    // 生成热点事件
    const hotEvents = newsList
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 5)
      .map(news => ({
        eventId: news.id,
        eventTitle: news.title,
        eventTime: news.publishTime,
        eventInfluence: news.influenceScore,
        eventSentiment: news.sentiment.polarity
      }));
    
    // 生成舆情趋势（按天分组）
    const trendMap = new Map<string, { sum: number; count: number }>();
    
    newsList.forEach(news => {
      const date = news.publishTime.split(' ')[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { sum: 0, count: 0 });
      }
      
      const current = trendMap.get(date)!;
      current.sum += news.sentiment.score;
      current.count += 1;
    });
    
    const opinionTrend = Array.from(trendMap.entries())
      .map(([date, { sum, count }]) => ({
        time: date,
        score: Math.round(sum / count)
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    // 模拟股票名称
    const stockNameMap: Record<string, string> = {
      'SH600000': '浦发银行',
      'SH600036': '招商银行',
      'SZ000001': '平安银行',
      'SZ000858': '五粮液',
      'SZ002594': '比亚迪',
    };
    
    return {
      stockCode,
      stockName: stockNameMap[stockCode] || '未知股票',
      opinionScore,
      positiveRatio,
      negativeRatio,
      neutralRatio,
      hotEvents,
      opinionTrend
    };
  }
}

// 导出单例实例
export const newsAggregator = NewsAggregator.getInstance();
