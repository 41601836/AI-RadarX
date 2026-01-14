// AI客户端 - 支持多模型提供商的统一接口
import { AggregatedStockData, AIAnalysisResult } from './index';
import { Logger, logger } from '../../utils/logger';

// 创建AI专用Logger实例
const aiLogger = logger.withCategory('AI');


// AI模型配置接口
export interface AIModelConfig {
  provider: 'openai' | 'deepseek' | 'simulate';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// AI推理请求接口
export interface AIInferenceRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI推理响应接口
export interface AIInferenceResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number; // 毫秒
}

// AI客户端类
export class AIClient {
  private config: AIModelConfig;
  private lastRequestTime: Map<string, number> = new Map(); // 用于速率限制的请求时间记录
  private readonly RATE_LIMIT = 1000; // 速率限制：每个API Key每秒最多1个请求

  constructor(config: AIModelConfig) {
    // 智能降级逻辑：如果API Key或Base URL缺失，自动切换到模拟模式
    this.config = {
      ...config
    };

    // 如果provider不是simulate，但API Key缺失，自动降级
    if (this.config.provider !== 'simulate') {
      if (!this.config.apiKey) {
        aiLogger.warn('AI_API_KEY环境变量缺失，自动降级到模拟模式');
        this.config.provider = 'simulate';
      } else if (!this.config.baseUrl) {
        aiLogger.warn('AI_API_BASE_URL环境变量缺失，使用默认值');
      }
    }
  }

  /**
   * 标准的LLM推理接口
   * @param request 推理请求参数
   * @returns 推理响应
   */
  async inferWithLLM(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    const startTime = Date.now();

    try {
      // 速率限制检查（仅对真实API调用有效）
      if (this.config.provider !== 'simulate') {
        const apiKey = this.config.apiKey || '';
        const now = Date.now();
        const lastTime = this.lastRequestTime.get(apiKey) || 0;
        const timeSinceLastRequest = now - lastTime;

        if (timeSinceLastRequest < this.RATE_LIMIT) {
          const waitTime = this.RATE_LIMIT - timeSinceLastRequest;
          aiLogger.info(`触发速率限制，等待${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime.set(apiKey, Date.now());
      }

      switch (this.config.provider) {
        case 'openai':
          return this.callOpenAI(request, startTime);
        case 'deepseek':
          return this.callDeepSeek(request, startTime);
        case 'simulate':
        default:
          return this.simulateInference(request, startTime);
      }
    } catch (error) {
      aiLogger.error('AI推理失败:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(request: AIInferenceRequest, startTime: number): Promise<AIInferenceResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API Key is required');
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const model = this.config.model || 'gpt-4o-mini';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional stock analyst. Provide concise and accurate analysis based on the given data.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature || 0.1,
        max_tokens: request.maxTokens || 1000,
        top_p: request.topP || 1,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: data.model,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeek(request: AIInferenceRequest, startTime: number): Promise<AIInferenceResponse> {
    if (!this.config.apiKey) {
      throw new Error('DeepSeek API Key is required');
    }

    const baseUrl = this.config.baseUrl || 'https://api.deepseek.com/v1';
    const model = this.config.model || 'deepseek-chat';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional stock analyst. Provide concise and accurate analysis based on the given data.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature || 0.1,
        max_tokens: request.maxTokens || 1000,
        top_p: request.topP || 1,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      model: data.model,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * 模拟推理（用于开发和测试）
   */
  private async simulateInference(request: AIInferenceRequest, startTime: number): Promise<AIInferenceResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    return {
      content: '这是模拟的AI推理结果。在真实环境中，这里会返回来自OpenAI或DeepSeek的实际推理内容。',
      model: 'simulate-ai-model',
      tokensUsed: {
        prompt: Math.floor(request.prompt.length / 4),
        completion: Math.floor(200 / 4),
        total: Math.floor((request.prompt.length + 200) / 4),
      },
      latency: Date.now() - startTime,
    };
  }

  /**
   * 将聚合的股票数据转换为AI提示词
   */
  generatePromptFromStockData(data: AggregatedStockData): string {
    // 单位转换：将分转换为元（保留两位小数）
    const currentPriceYuan = (data.currentPrice / 100).toFixed(2);
    const supportPriceYuan = (data.chipData.supportPrice / 100).toFixed(2);
    const resistancePriceYuan = (data.chipData.resistancePrice / 100).toFixed(2);
    const hotMoneyNetBuyYuan = (data.heatFlowData.hotMoneyNetBuy / 100).toFixed(2);

    return `请分析以下股票数据并提供专业的投资建议：

股票信息：
- 股票代码：${data.stockCode}
- 股票名称：${data.stockName}
- 当前价格：${currentPriceYuan}元

技术指标数据：
- RSI6：${data.technicalIndicators.rsi6.toFixed(2)}
- RSI12：${data.technicalIndicators.rsi12.toFixed(2)}
- RSI24：${data.technicalIndicators.rsi24.toFixed(2)}
- MA5：${(data.technicalIndicators.ma5 / 100).toFixed(2)}元
- MA10：${(data.technicalIndicators.ma10 / 100).toFixed(2)}元
- MA20：${(data.technicalIndicators.ma20 / 100).toFixed(2)}元
- MA30：${(data.technicalIndicators.ma30 / 100).toFixed(2)}元
- MA60：${(data.technicalIndicators.ma60 / 100).toFixed(2)}元
- MACD DIFF：${data.technicalIndicators.macdDiff.toFixed(4)}
- MACD DEA：${data.technicalIndicators.macdDea.toFixed(4)}
- MACD BAR：${data.technicalIndicators.macdBar.toFixed(4)}

筹码分布数据：
- 筹码集中度：${data.chipData.concentration.toFixed(4)}
- 支撑价：${supportPriceYuan}元
- 压力价：${resistancePriceYuan}元
- 筹码集中度评分：${data.chipData.chipConcentrationScore}分

舆情数据：
- 舆情综合评分：${data.sentimentData.opinionScore}分
- 正面舆情占比：${data.sentimentData.positiveRatio.toFixed(4)}
- 热点事件数量：${data.sentimentData.hotEventsCount}

游资流向数据：
- 游资净买入：${hotMoneyNetBuyYuan}元
- 活跃游资席位数量：${data.heatFlowData.hotSeatsCount}
- 游资热度评分：${data.heatFlowData.heatScore}分

全市场情绪数据：
- 情绪评分：${data.marketSentiment.sentimentScore}分
- 情绪等级：${data.marketSentiment.sentimentLevel}
- 涨跌停比：${data.marketSentiment.advanceDeclineRatio}
- 成交量预估：${data.marketSentiment.volumeForecast}亿

风险评分：
- 风险分值：${data.riskScore}分（0-100分，分值越高风险越大）

请提供：
1. 趋势研判（简洁明了）
2. 主力意图分析
3. 操作评级（buy/hold/sell）
4. 置信度评分（0-100）
5. 风险预警（至少3条）

格式要求：
趋势研判：<内容>
主力意图：<内容>
操作评级：<buy/hold/sell>
置信度评分：<数字>
风险预警：<预警1>、<预警2>、<预警3>`;
  }

  /**
   * 解析AI响应为结构化的分析结果
   */
  parseAIResponse(response: string): AIAnalysisResult {
    try {
      // 尝试从响应中提取结构化数据
      const trendMatch = response.match(/趋势研判：([^\n]+)/);
      const intentionMatch = response.match(/主力意图：([^\n]+)/);
      const ratingMatch = response.match(/操作评级：(buy|hold|sell)/i);
      const confidenceMatch = response.match(/置信度评分：(\d+)/);
      const riskMatch = response.match(/风险预警：([^\n]+)/);

      // 处理风险预警的分割
      let riskWarnings: string[] = [];
      if (riskMatch && riskMatch[1]) {
        riskWarnings = riskMatch[1].split('、').map(warning => warning.trim()).filter(Boolean);
      }

      // 如果所有必要字段都能解析到，返回结构化结果
      if (trendMatch && intentionMatch && ratingMatch && confidenceMatch) {
        return {
          trendAnalysis: trendMatch[1].trim(),
          mainIntention: intentionMatch[1].trim(),
          operationRating: ratingMatch[1].toLowerCase() as 'buy' | 'hold' | 'sell',
          confidenceScore: parseInt(confidenceMatch[1], 10),
          riskWarning: riskWarnings.length > 0 ? riskWarnings : ['未提供风险预警信息']
        };
      }

      // 如果解析失败，返回一个默认的结构化结果，但包含AI的原始响应
      aiLogger.warn('AI响应格式不符合预期，使用默认解析逻辑', { response });
      return {
        trendAnalysis: 'AI分析：' + response.substring(0, 100) + '...',
        mainIntention: 'AI未明确提供主力意图分析',
        operationRating: 'hold',
        confidenceScore: 50,
        riskWarning: ['AI响应格式异常', '请参考原始AI响应进行分析', '建议人工复核']
      };
    } catch (error) {
      aiLogger.error('解析AI响应失败', error instanceof Error ? error : new Error(String(error)));
      // 解析失败时返回默认的安全结果
      return {
        trendAnalysis: 'AI分析响应解析失败',
        mainIntention: '无法从AI响应中提取主力意图',
        operationRating: 'hold',
        confidenceScore: 30,
        riskWarning: ['AI响应解析错误', '建议重新获取分析', '请谨慎决策']
      };
    }
  }

  /**
   * 基于统一的股票数据生成AI决策
   * @param data 统一的股票数据
   * @returns AI决策结果
   */
  async generateDecision(data: any): Promise<AIAnalysisResult> {
    // 生成专业的量化分析提示词
    const prompt = this.generateQuantPromptFromUnifiedData(data);
    
    // 调用AI推理接口
    const aiResponse = await this.inferWithLLM({
      prompt,
      temperature: 0.1,
      maxTokens: 1500
    });
    
    // 解析AI响应
    return this.parseAIResponse(aiResponse.content);
  }

  /**
   * 生成量化专家风格的提示词
   * @param data 统一的股票数据
   * @returns AI提示词
   */
  private generateQuantPromptFromUnifiedData(data: any): string {
    // 提取关键数据
    const { stockCode, stockName, quote, chip, technical } = data;
    
    // 转换筹码峰数据为可读格式
    const chipPeaksInfo = chip.chipPeaks.map((peak: any, index: number) => 
      `[${index + 1}] 价格: ${peak.price.toFixed(2)}元, 占比: ${peak.percentage.toFixed(2)}%, 强度: ${peak.strength.toFixed(2)}`
    ).join('\n');
    
    // 转换技术指标
    const rsiValue = technical.rsi;
    const macdInfo = `DIFF: ${technical.macd.dif.toFixed(4)}, DEA: ${technical.macd.dea.toFixed(4)}, MACD: ${technical.macd.macd.toFixed(4)}`;
    
    // 构建专业的量化分析提示词
    return `作为专业的量化交易专家，请基于以下数据对${stockName}(${stockCode})进行深度分析：

【行情数据】
- 当前价格: ${quote.currentPrice.toFixed(2)}元
- 涨跌幅: ${quote.changePercent.toFixed(2)}%
- 成交量: ${quote.volume.toLocaleString()}股
- 成交额: ${quote.amount.toLocaleString()}元

【筹码分布】
- 平均成本: ${chip.avgCost.toFixed(2)}元
- 筹码集中度: ${(chip.concentration * 100).toFixed(2)}%
- 支撑位: ${chip.supportLevels.join('元, ')}元
- 压力位: ${chip.resistanceLevels.join('元, ')}元
- 筹码峰分布:
${chipPeaksInfo}

【技术指标】
- RSI: ${rsiValue.toFixed(2)}
- MACD: ${macdInfo}

请提供:
1. 趋势研判（基于筹码分布和技术指标）
2. 主力意图分析（基于筹码峰和成交量）
3. 操作评级（buy/hold/sell）
4. 置信度评分（0-100）
5. 风险预警（至少3条具体风险点）

格式要求：
趋势研判：<内容>
主力意图：<内容>
操作评级：<buy/hold/sell>
置信度评分：<数字>
风险预警：<预警1>、<预警2>、<预警3>`;
  }
}


// 创建默认的AI客户端实例
export const defaultAIClient = new AIClient({
  provider: process.env.AI_PROVIDER as 'openai' | 'deepseek' | 'simulate' || 'simulate',
  apiKey: process.env.AI_API_KEY,
  baseUrl: process.env.AI_BASE_URL,
  model: process.env.AI_MODEL,
});
