// AI推理服务 - 聚合多维度数据用于AI分析
import { ApiResponse, successResponse } from '../common/response';
import { ApiError, internalServerError, stockCodeFormatError } from '../common/errors';
import { getTushareDailyData } from '../common/tushare';
import { fetchChipDistribution } from '../chip/distribution';
import { fetchOpinionSummary } from '../publicOpinion/summary';
import { fetchHeatFlowStockSeat } from '../heatFlow/stockSeat';
import { fetchTechIndicatorData } from '../techIndicator/indicator';
import { defaultAIClient } from './ai-client';

// 缓存管理
interface AIAnalysisCache {
  timestamp: number;
  data: any;
}

const aiAnalysisCache: Map<string, AIAnalysisCache> = new Map();
const CACHE_DURATION = 3 * 60 * 1000; // 3分钟缓存

// 全市场情绪接口
interface MarketSentiment {
  sentimentScore: number; // 全市场情绪评分(0-100)
  sentimentLevel: 'ice' | 'cold' | 'neutral' | 'hot' | 'boiling'; // 情绪等级：冰点、寒冷、中性、火热、沸点
  advanceDeclineRatio: number; // 涨跌停比
  volumeForecast: number; // 成交量预估
}

// 技术指标接口
export interface TechnicalIndicators {
  rsi6: number;
  rsi12: number;
  rsi24: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma30: number;
  ma60: number;
  macdDiff: number;
  macdDea: number;
  macdBar: number;
}

// 聚合数据接口
export interface AggregatedStockData {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  chipData: {
    concentration: number; // 筹码集中度评分(0-1)
    supportPrice: number; // 筹码支撑价
    resistancePrice: number; // 筹码压力价
    chipConcentrationScore: number; // 筹码集中度评分(0-100)
  };
  sentimentData: {
    opinionScore: number; // 舆情综合评分(0-100)
    positiveRatio: number; // 正面舆情占比
    hotEventsCount: number; // 热点事件数量
  };
  heatFlowData: {
    hotMoneyNetBuy: number; // 游资净买入(分)
    hotSeatsCount: number; // 活跃游资席位数量
    heatScore: number; // 游资热度评分(0-100)
  };
  marketSentiment: MarketSentiment; // 全市场情绪数据
  technicalIndicators: TechnicalIndicators; // 技术指标数据
  riskScore: number; // 风险分值(0-100)
}

// AI分析结果接口
export interface AIAnalysisResult {
  trendAnalysis: string; // 趋势研判
  mainIntention: string; // 主力意图
  operationRating: 'buy' | 'hold' | 'sell'; // 操作评级
  confidenceScore: number; // 置信度评分(0-100)
  riskWarning: string[]; // 风险预警
}

/**
 * AI推理服务 - 聚合多维度数据
 * @param stockCode 股票代码
 * @returns 聚合的股票数据
 */
export async function fetchAggregatedStockData(stockCode: string): Promise<AggregatedStockData> {
  // 参数验证
  if (!stockCode || !/^(SH|SZ)\d{6}$/.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误');
  }

  try {
    // 并行请求各维度数据
    const [chipData, sentimentData, heatFlowData, stockPriceData, techIndicatorData] = await Promise.all([
      fetchChipDistribution({ stockCode }),
      fetchOpinionSummary({ stockCode, timeRange: '7d' }),
      fetchHeatFlowStockSeat({ stockCode }),
      getTushareDailyData(stockCode, undefined, undefined),
      fetchTechIndicatorData({ stockCode })
    ]);

    // 计算筹码集中度评分 (0-100)
    const chipConcentrationScore = calculateChipConcentrationScore(chipData.data.chipConcentration);
    
    // 计算游资热度评分 (0-100)
    const heatScore = calculateHeatFlowScore(heatFlowData.data);

    // 模拟计算全市场情绪数据
    const marketSentiment = calculateMarketSentiment();

    // 获取最新的技术指标数据
    const latestIndicator = techIndicatorData.data.indicatorDataList[0] || {};
    
    // 提取技术指标值
      const technicalIndicators = {
        rsi6: latestIndicator.rsi?.rsi6 || 0,
        rsi12: latestIndicator.rsi?.rsi12 || 0,
        rsi24: latestIndicator.rsi?.rsi24 || 0,
        ma5: latestIndicator.ma?.ma5 || 0,
        ma10: latestIndicator.ma?.ma10 || 0,
        ma20: latestIndicator.ma?.ma20 || 0,
        // 根据实际类型定义，MA指标只有ma5, ma10, ma20
        ma30: 0, // 不支持的指标设为默认值
        ma60: 0, // 不支持的指标设为默认值
        macdDiff: latestIndicator.macd?.diff || 0,
        macdDea: latestIndicator.macd?.dea || 0,
        macdBar: latestIndicator.macd?.bar || 0
      };

    // 计算风险评分 (0-100)
    const riskScore = calculateRiskScore({
      chipConcentration: chipData.data.chipConcentration,
      sentimentScore: sentimentData.data.opinionScore,
      rsi: technicalIndicators.rsi24,
      macdBar: technicalIndicators.macdBar,
      heatScore
    });

    return {
      stockCode,
      stockName: chipData.data.stockName,
      currentPrice: stockPriceData[0]?.close || 0,
      chipData: {
        concentration: chipData.data.chipConcentration,
        supportPrice: chipData.data.supportPrice,
        resistancePrice: chipData.data.resistancePrice,
        chipConcentrationScore
      },
      sentimentData: {
        opinionScore: sentimentData.data.opinionScore,
        positiveRatio: sentimentData.data.positiveRatio,
        hotEventsCount: sentimentData.data.hotEvents?.length || 0
      },
      heatFlowData: {
        hotMoneyNetBuy: heatFlowData.data.totalNetBuy,
        hotSeatsCount: heatFlowData.data.hotSeatList?.length || 0,
        heatScore
      },
      marketSentiment,
      technicalIndicators,
      riskScore
    };
  } catch (error) {
    console.error('聚合数据失败:', error);
    throw internalServerError(error as Error, '聚合数据失败');
  }
}

/**
 * 调用AI模型进行智能分析
 * @param stockCode 股票代码
 * @returns AI分析结果
 */
export async function getAISmartAnalysis(stockCode: string): Promise<AIAnalysisResult> {
  // 检查缓存
  const cacheKey = `ai_analysis_${stockCode}`;
  const cached = aiAnalysisCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // 获取聚合数据
    const aggregatedData = await fetchAggregatedStockData(stockCode);

    // 调用大模型接口（这里是预留位置）
    const analysisResult = await callAIModel(aggregatedData);

    // 缓存结果
    aiAnalysisCache.set(cacheKey, {
      timestamp: Date.now(),
      data: analysisResult
    });

    return analysisResult;
  } catch (error) {
    console.error('AI分析失败:', error);
    throw internalServerError(error as Error, 'AI分析失败');
  }
}

/**
 * 调用大模型接口（支持真实推理或模拟推理）
 * @param data 聚合的股票数据
 * @returns AI分析结果
 */
async function callAIModel(data: AggregatedStockData): Promise<AIAnalysisResult> {
  try {
    // 生成AI提示词
    const prompt = defaultAIClient.generatePromptFromStockData(data);
    
    // 调用AI推理接口（根据环境变量自动切换真实或模拟）
    const aiResponse = await defaultAIClient.inferWithLLM({
      prompt,
      temperature: 0.1,
      maxTokens: 1000
    });
    
    // 解析AI响应为结构化结果
    return defaultAIClient.parseAIResponse(aiResponse.content);
  } catch (error) {
    console.error('AI模型调用失败，使用备用分析逻辑:', error);
    
    // 计算平均成本线（简化计算）
    const averageCostLine = (data.chipData.supportPrice + data.chipData.resistancePrice) / 2;
    
    // 简化的操作评级决策
    let operationRating: 'buy' | 'hold' | 'sell' = 'hold';
    let confidenceScore = 70;
    
    // 基于简单条件的决策
    if (data.sentimentData.opinionScore > 75 && data.heatFlowData.hotMoneyNetBuy > 0) {
      operationRating = 'buy';
      confidenceScore = 85;
    } else if (data.heatFlowData.hotMoneyNetBuy < -5000000) {
      operationRating = 'sell';
      confidenceScore = 80;
    }
    
    // 市场情绪分析
    const marketSentiment = data.marketSentiment;
    const marketSentimentAnalysis = {
      'ice': '全市场情绪处于冰点，风险较大。',
      'cold': '全市场情绪偏冷，谨慎操作。',
      'hot': '全市场情绪火热，机会较多。',
      'boiling': '全市场情绪沸腾，风险累积。',
      'neutral': '全市场情绪中性，均衡配置。'
    }[marketSentiment.sentimentLevel];
    
    // 生成静态的分析结果（备用逻辑）
    return {
      trendAnalysis: `${data.stockName}(${data.stockCode})当前市场情绪${marketSentimentAnalysis}`,
      mainIntention: '主力资金活跃度适中，股价在合理区间内运行。',
      operationRating,
      confidenceScore,
      riskWarning: [
        `【市场情绪分析】${marketSentimentAnalysis}`,
        '【操作建议】根据个人风险偏好制定交易策略',
        `【参考价格】平均成本线(${averageCostLine.toFixed(0)}分)`
      ]
    };
  }
}

/**
 * 计算筹码集中度评分 (0-100)
 * @param concentration 筹码集中度(0-1)
 * @returns 评分(0-100)
 */
function calculateChipConcentrationScore(concentration: number): number {
  // 筹码越集中分数越高 (0-1转0-100)
  return Math.round(concentration * 100);
}

/**
 * 计算全市场情绪数据
 * @returns 全市场情绪数据
 */
function calculateMarketSentiment(): MarketSentiment {
  // 随机生成情绪评分 (0-100)
  const sentimentScore = Math.round(Math.random() * 100);
  
  // 根据情绪评分确定情绪等级
  let sentimentLevel: 'ice' | 'cold' | 'neutral' | 'hot' | 'boiling' = 'neutral';
  if (sentimentScore < 20) {
    sentimentLevel = 'ice';
  } else if (sentimentScore < 40) {
    sentimentLevel = 'cold';
  } else if (sentimentScore < 70) {
    sentimentLevel = 'neutral';
  } else if (sentimentScore < 90) {
    sentimentLevel = 'hot';
  } else {
    sentimentLevel = 'boiling';
  }
  
  // 随机生成涨跌停比 (0-5)
  const advanceDeclineRatio = parseFloat((Math.random() * 5).toFixed(1));
  
  // 随机生成成交量预估 (5000-15000亿)
  const volumeForecast = Math.round(5000 + Math.random() * 10000);
  
  return {
    sentimentScore,
    sentimentLevel,
    advanceDeclineRatio,
    volumeForecast
  };
}

/**
 * 计算游资热度评分 (0-100)
 * @param heatFlowData 游资数据
 * @returns 评分(0-100)
 */
function calculateHeatFlowScore(heatFlowData: any): number {
  // 基于净买入和活跃席位数量计算热度
  const netBuyScore = Math.min(Math.abs(heatFlowData.totalNetBuy) / 100000000 * 50, 50); // 净买入最高50分
  const seatsScore = Math.min(heatFlowData.hotSeatList.length * 5, 50); // 活跃席位最高50分
  return Math.round(netBuyScore + seatsScore);
}

/**
 * 计算风险评分 (0-100)
 * @param params 风险参数
 * @returns 风险评分(0-100)
 */
interface RiskScoreParams {
  chipConcentration: number;
  sentimentScore: number;
  rsi: number;
  macdBar: number;
  heatScore: number;
}

function calculateRiskScore(params: RiskScoreParams): number {
  const { chipConcentration, sentimentScore, rsi, macdBar, heatScore } = params;
  
  // 筹码集中度风险（越高越集中，风险越低）
  const chipRisk = Math.max(0, 100 - chipConcentration * 100);
  
  // 舆情风险（评分越低，风险越高）
  const sentimentRisk = Math.max(0, 100 - sentimentScore);
  
  // RSI风险（超买超卖都增加风险）
  let rsiRisk = 0;
  if (rsi > 70) {
    rsiRisk = (rsi - 70) * 2; // 超买增加风险
  } else if (rsi < 30) {
    rsiRisk = (30 - rsi) * 1.5; // 超卖增加风险
  }
  
  // MACD风险（柱状图绝对值越大，风险越高）
  const macdRisk = Math.min(Math.abs(macdBar) * 0.1, 30);
  
  // 游资热度风险（热度越高，风险越高）
  const heatRisk = Math.min(heatScore * 0.8, 40);
  
  // 加权计算总风险（权重可根据实际情况调整）
  const totalRisk = (
    chipRisk * 0.2 +
    sentimentRisk * 0.2 +
    rsiRisk * 0.2 +
    macdRisk * 0.2 +
    heatRisk * 0.2
  );
  
  // 确保风险评分在0-100之间
  return Math.max(0, Math.min(100, Math.round(totalRisk)));
}

/**
 * API路由处理函数
 * @param req 请求对象
 * @param res 响应对象
 */
export async function handleAISmartAnalysis(req: any, res: any) {
  try {
    const { stockCode } = req.query;
    const result = await getAISmartAnalysis(stockCode as string);
    res.status(200).json(successResponse(result));
  } catch (error) {
    const apiError = error as ApiError;
    res.status(apiError.code || 500).json({
      code: apiError.code || 500,
      msg: apiError.message,
      requestId: apiError.requestId,
      timestamp: Date.now()
    });
  }
}