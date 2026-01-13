// AI客户端 - 支持多模型提供商的统一接口
import { AggregatedStockData, AIAnalysisResult } from './index';

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

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  /**
   * 标准的LLM推理接口
   * @param request 推理请求参数
   * @returns 推理响应
   */
  async inferWithLLM(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    const startTime = Date.now();

    try {
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
      console.error('AI推理失败:', error);
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
    return `请分析以下股票数据并提供专业的投资建议：

股票信息：
- 股票代码：${data.stockCode}
- 股票名称：${data.stockName}
- 当前价格：${data.currentPrice}分

筹码分布数据：
- 筹码集中度：${data.chipData.concentration}
- 支撑价：${data.chipData.supportPrice}分
- 压力价：${data.chipData.resistancePrice}分
- 筹码集中度评分：${data.chipData.chipConcentrationScore}分

舆情数据：
- 舆情综合评分：${data.sentimentData.opinionScore}分
- 正面舆情占比：${data.sentimentData.positiveRatio}
- 热点事件数量：${data.sentimentData.hotEventsCount}

游资流向数据：
- 游资净买入：${data.heatFlowData.hotMoneyNetBuy}分
- 活跃游资席位数量：${data.heatFlowData.hotSeatsCount}
- 游资热度评分：${data.heatFlowData.heatScore}分

全市场情绪数据：
- 情绪评分：${data.marketSentiment.sentimentScore}分
- 情绪等级：${data.marketSentiment.sentimentLevel}
- 涨跌停比：${data.marketSentiment.advanceDeclineRatio}
- 成交量预估：${data.marketSentiment.volumeForecast}亿

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
    // 这里实现解析逻辑，将AI的自然语言响应转换为结构化的AIAnalysisResult
    // 为了简化，这里使用模拟数据
    return {
      trendAnalysis: '基于当前数据，股票处于震荡上行趋势。',
      mainIntention: '主力资金小幅流入，有试盘迹象。',
      operationRating: 'hold',
      confidenceScore: 75,
      riskWarning: [
        '注意市场情绪变化',
        '关注主力资金流向',
        '设置止损位控制风险'
      ]
    };
  }
}

// 创建默认的AI客户端实例
export const defaultAIClient = new AIClient({
  provider: process.env.AI_PROVIDER as 'openai' | 'deepseek' | 'simulate' || 'simulate',
  apiKey: process.env.AI_API_KEY,
  baseUrl: process.env.AI_BASE_URL,
  model: process.env.AI_MODEL,
});
