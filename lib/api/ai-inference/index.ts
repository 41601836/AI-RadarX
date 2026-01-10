// AI推理服务 - 聚合多维度数据用于AI分析
import { ApiResponse, successResponse } from '../common/response';
import { ApiError, internalServerError, stockCodeFormatError } from '../common/errors';
import { getTushareDailyData } from '../common/tushare';
import { fetchChipDistribution } from '../chip/distribution';
import { fetchOpinionSummary } from '../publicOpinion/summary';
import { fetchHeatFlowStockSeat } from '../heatFlow/stockSeat';

// 缓存管理
interface AIAnalysisCache {
  timestamp: number;
  data: any;
}

const aiAnalysisCache: Map<string, AIAnalysisCache> = new Map();
const CACHE_DURATION = 3 * 60 * 1000; // 3分钟缓存

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
export async function getAggregatedStockData(stockCode: string): Promise<AggregatedStockData> {
  // 参数验证
  if (!stockCode || !/^(SH|SZ)\d{6}$/.test(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误');
  }

  try {
    // 并行请求各维度数据
    const [chipData, sentimentData, heatFlowData, stockPriceData] = await Promise.all([
      fetchChipDistribution({ stockCode }),
      fetchOpinionSummary({ stockCode, timeRange: '7d' }),
      fetchHeatFlowStockSeat({ stockCode }),
      getTushareDailyData(stockCode, undefined, undefined)
    ]);

    // 计算筹码集中度评分 (0-100)
    const chipConcentrationScore = calculateChipConcentrationScore(chipData.data.chipConcentration);
    
    // 计算游资热度评分 (0-100)
    const heatScore = calculateHeatFlowScore(heatFlowData.data);

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
        hotEventsCount: sentimentData.data.hotEvents.length
      },
      heatFlowData: {
        hotMoneyNetBuy: heatFlowData.data.totalNetBuy,
        hotSeatsCount: heatFlowData.data.hotSeatList.length,
        heatScore
      }
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
    const aggregatedData = await getAggregatedStockData(stockCode);

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
 * 调用大模型接口（预留实现位置）
 * @param data 聚合的股票数据
 * @returns AI分析结果
 */
async function callAIModel(data: AggregatedStockData): Promise<AIAnalysisResult> {
  // TODO: 集成真实的大模型接口（DeepSeek/GPT等）
  // 目前实现新的推理逻辑
  
  // 计算平均成本线（这里使用筹码支撑位和压力位的平均值作为示例）
  const averageCostLine = (data.chipData.supportPrice + data.chipData.resistancePrice) / 2;
  
  // 交叉验证逻辑：入场看舆情、持仓看流动性、离场看抛压与筹码
  const entryValidation = data.sentimentData.opinionScore > 70 && data.sentimentData.positiveRatio > 0.6;
  const holdValidation = data.heatFlowData.heatScore > 50 && data.heatFlowData.hotMoneyNetBuy > 0;
  const exitValidation = data.currentPrice > data.chipData.resistancePrice * 1.1 || 
                         data.heatFlowData.hotMoneyNetBuy < -10000000;
  
  // 操作评级决策
  let operationRating: 'buy' | 'hold' | 'sell' = 'hold';
  let trendAnalysis = '';
  let mainIntention = '';
  let riskWarning: string[] = [];
  
  // 基于交叉验证结果制定策略
  if (entryValidation && holdValidation && !exitValidation) {
    operationRating = 'buy';
    trendAnalysis = `${data.stockName}(${data.stockCode})当前趋势强劲，入场条件已满足。`;
    mainIntention = '主力资金持续流入，游资活跃度高，拉升意图明确。';
  } else if (holdValidation && !exitValidation) {
    operationRating = 'hold';
    trendAnalysis = `${data.stockName}(${data.stockCode})当前处于震荡整理阶段，持仓条件保持。`;
    mainIntention = '主力资金保持稳定，股价在合理区间内运行。';
  } else {
    operationRating = 'sell';
    trendAnalysis = `${data.stockName}(${data.stockCode})当前已达到离场条件，需及时止盈/止损。`;
    mainIntention = '主力资金开始流出，抛压明显，需警惕风险。';
  }
  
  // 止损/止盈建议（硬性执行语气）
  const stopLossPrice = averageCostLine * 0.9;
  const stopProfitPrice = averageCostLine * 1.2;
  
  if (operationRating === 'buy') {
    riskWarning.push(`【硬性执行】买入后严格执行止损：当股价跌破平均成本线(${averageCostLine}分)的90%即${stopLossPrice.toFixed(0)}分时，必须立即止损！`);
    riskWarning.push(`【硬性执行】设置止盈：当股价涨至平均成本线(${averageCostLine}分)的120%即${stopProfitPrice.toFixed(0)}分时，建议止盈离场！`);
  } else if (operationRating === 'hold') {
    riskWarning.push(`【硬性执行】持仓期间严格监控：当股价跌破平均成本线(${averageCostLine}分)的90%即${stopLossPrice.toFixed(0)}分时，必须立即止损！`);
    riskWarning.push(`【硬性执行】当股价涨至平均成本线(${averageCostLine}分)的120%即${stopProfitPrice.toFixed(0)}分时，建议止盈离场！`);
  } else {
    riskWarning.push(`【硬性执行】立即执行离场操作：当前股价已达到离场条件，必须严格执行卖出指令！`);
    riskWarning.push(`【硬性执行】参考价格：平均成本线(${averageCostLine}分)，当前股价(${data.currentPrice}分)。`);
  }
  
  // 基于交叉验证的额外风险提示
  if (!entryValidation) {
    riskWarning.push('舆情评分不足，入场需谨慎！');
  }
  if (!holdValidation) {
    riskWarning.push('流动性不足，持仓风险较大！');
  }
  if (exitValidation) {
    riskWarning.push('抛压明显，筹码松动，建议立即离场！');
  }
  
  // 置信度计算（基于交叉验证结果）
  let confidenceScore = 70;
  if (entryValidation && holdValidation && !exitValidation) {
    confidenceScore = 90;
  } else if (!exitValidation) {
    confidenceScore = 75;
  } else {
    confidenceScore = 85; // 离场信号置信度较高
  }
  
  return {
    trendAnalysis,
    mainIntention,
    operationRating,
    confidenceScore,
    riskWarning: riskWarning.filter(Boolean)
  };
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