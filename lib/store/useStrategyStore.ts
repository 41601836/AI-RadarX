// 策略决策核心引擎 - 基于 TradingAgents 多 Agent 共识机制
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { DataBridge } from './data-bridge';
import { defaultAIClient, AIAnalysisResult } from '../api/ai-inference/ai-client';
import { Logger, logger } from '../utils/logger';

// 创建专用的策略Logger实例
const strategyLogger = logger.withCategory('Strategy');


// 为 window 对象添加类型声明
declare global {
  interface Window {
    __strategyBackgroundTaskInterval?: NodeJS.Timeout;
    __outcomeTrackerInterval?: NodeJS.Timeout;
  }
}

// Agent 类型定义
export interface AgentVote {
  agentId: string;
  agentName: string;
  confidence: number; // 0-1
  direction: 'buy' | 'sell' | 'hold';
  score: number; // -1 到 1
  reasoning: string;
  timestamp: number;
  weights: {
    technical: number;
    fundamental: number;
    sentiment: number;
    chipAnalysis: number;
    risk: number;
  };
}

export interface ConsensusResult {
  stockCode: string;
  stockName: string;
  finalDecision: 'buy' | 'sell' | 'hold';
  confidence: number;
  totalScore: number;
  agentVotes: AgentVote[];
  timestamp: number;
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ReasoningStep {
  step: number;
  agentId: string;
  action: string;
  data: any;
  conclusion: string;
  timestamp: number;
}

export interface ThoughtLog {
  id: string;
  agent: string;
  message: string;
  timestamp: Date;
  type: 'reasoning' | 'analysis' | 'conclusion' | 'warning' | 'error';
  stockCode?: string;
  confidence?: number;
}

export interface MemoryEntry {
  id: string;
  stockCode: string;
  consensusResult: ConsensusResult;
  priceAtDecision: number; // 决策时的价格
  actualPriceAfter: number;
  priceChangePercent: number;
  isSuccessful: boolean;
  feedbackScore: number; // -1 到 1
  timestamp: number;
  actualTimestamp: number; // 实际决策执行时间
}

export interface StrategyState {
  // 核心状态
  agentVotes: Record<string, AgentVote[]>; // stockCode -> votes
  consensusResults: Record<string, ConsensusResult>; // stockCode -> result
  reasoningChain: Record<string, ReasoningStep[]>; // stockCode -> reasoning steps
  
  // 思考日志系统
  thoughtLogs: ThoughtLog[];
  maxThoughtLogSize: number;
  
  // 记忆系统
  decisionMemory: MemoryEntry[];
  maxMemorySize: number;
  
  // 权重配置（可调）
  agentWeights: {
    chipAnalysis: number;
    riskControl: number;
    technical: number;
    fundamental: number;
    sentiment: number;
  };
  
  // 权重微调记录
  weightAdjustmentHistory: WeightAdjustment[];
  maxWeightAdjustmentHistorySize: number;
  
  // Agent 表现跟踪
  agentPerformanceTracker: {
    [agentId: string]: AgentPerformance;
  };
  
  // 后台任务状态
  backgroundTaskStatus: {
    isRunning: boolean;
    lastRun: number;
    interval: number; // 毫秒
  };
  
  // 当前状态
  isProcessing: Record<string, boolean>; // stockCode -> processing status
  lastUpdate: Record<string, number>; // stockCode -> last update timestamp
  
  // Actions
  runConsensus: (stockCode: string, stockName: string) => Promise<void>;
  addAgentVote: (stockCode: string, vote: AgentVote) => void;
  updateConsensusResult: (stockCode: string, result: ConsensusResult) => void;
  addReasoningStep: (stockCode: string, step: ReasoningStep) => void;
  updateMemory: (entry: MemoryEntry) => void;
  updateAgentWeights: (weights: Partial<Record<keyof typeof defaultAgentWeights, number>>) => void;
  addThoughtLog: (log: Omit<ThoughtLog, 'id' | 'timestamp'>) => void;
  clearThoughtLogs: () => void;
  getThoughtLogsByStock: (stockCode: string) => ThoughtLog[];
  clearStockData: (stockCode: string) => void;
  clearAllMemory: () => void;
  getStockConsensus: (stockCode: string) => ConsensusResult | null;
  getStockReasoning: (stockCode: string) => ReasoningStep[];
  getAgentPerformance: (agentId: string) => number; // 返回 agent 表现评分
  startBackgroundTask: () => void;
  stopBackgroundTask: () => void;
  updateDecisionPerformance: () => Promise<void>;
  adjustAgentWeights: (agentId: string, adjustment: number, reason: string) => void;
  updateDecisionOutcome: (stockCode: string) => Promise<void>; // 5分钟盈亏追踪
  recalibrateWeights: () => void; // 权重自适应调整
  updateAgentPerformanceTracking: (memories: MemoryEntry[]) => void; // 更新 Agent 表现跟踪
}

export interface WeightAdjustment {
  id: string;
  agentId: string;
  agentName: string;
  oldWeight: number;
  newWeight: number;
  adjustment: number;
  reason: string;
  timestamp: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  consecutiveFailures: number;
  totalDecisions: number;
  successfulDecisions: number;
  averageScore: number;
  lastUpdated: number;
}

// 默认权重配置
const defaultAgentWeights = {
  chipAnalysis: 0.25, // 筹码分析权重
  riskControl: 0.25,   // 风险控制权重
  technical: 0.20,     // 技术分析权重
  fundamental: 0.20,  // 基本面权重
  sentiment: 0.15,    // 舆情分析权重
};

// 记忆系统配置
const MEMORY_CONFIG = {
  maxSize: 50,
  minConfidence: 0.6,
  successThreshold: 0.05, // 5% 盈利阈值
};

// 自定义 localStorage 存储
const safeLocalStorage: PersistStorage<any> = {
  getItem: (name: string): StorageValue<StrategyState> | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const item = localStorage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item) as StorageValue<StrategyState>;
        // 验证数据结构
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
          // 确保必要的数组存在
          const state = parsed.state;
          state.decisionMemory = Array.isArray(state.decisionMemory) ? state.decisionMemory : [];
          state.agentVotes = state.agentVotes || {};
          state.consensusResults = state.consensusResults || {};
          state.reasoningChain = state.reasoningChain || {};
          state.isProcessing = state.isProcessing || {};
          state.lastUpdate = state.lastUpdate || {};
          
          // 限制记忆大小
          if (state.decisionMemory.length > MEMORY_CONFIG.maxSize) {
            state.decisionMemory = state.decisionMemory
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, MEMORY_CONFIG.maxSize);
          }
          
          return parsed;
        }
      }
      return null;
    } catch (error) {
      console.error('读取策略数据失败:', error);
      return null;
    }
  },
  
  setItem: (name: string, value: StorageValue<StrategyState>) => {
    try {
      if (typeof window === 'undefined') return;
      
      // 在存储前清理过期数据
      if (value && typeof value === 'object' && 'state' in value) {
        const state = value.state;
        
        // 清理过期的处理状态（超过1小时）
        const oneHourAgo = Date.now() - 3600000;
        Object.keys(state.isProcessing).forEach(stockCode => {
          if (state.lastUpdate[stockCode] < oneHourAgo) {
            delete state.isProcessing[stockCode];
            delete state.lastUpdate[stockCode];
          }
        });
      }
      
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error('存储策略数据失败:', error);
    }
  },
  
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  }
};

// 默认状态
const defaultState: Omit<StrategyState, keyof { [K in keyof StrategyState as StrategyState[K] extends Function ? K : never]: any }> = {
  agentVotes: {},
  consensusResults: {},
  reasoningChain: {},
  thoughtLogs: [],
  maxThoughtLogSize: 100,
  decisionMemory: [],
  maxMemorySize: MEMORY_CONFIG.maxSize,
  agentWeights: { ...defaultAgentWeights },
  
  // 新增字段
  weightAdjustmentHistory: [],
  maxWeightAdjustmentHistorySize: 100,
  
  agentPerformanceTracker: {},
  
  backgroundTaskStatus: {
    isRunning: false,
    lastRun: 0,
    interval: 60000, // 默认1分钟执行一次
  },
  
  isProcessing: {},
  lastUpdate: {},
};

// 创建策略 store
export const useStrategyStore = create<StrategyState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // 核心方法：运行多 Agent 共识
      runConsensus: async (stockCode: string, stockName: string) => {
        const state = get();
        
        // 检查是否正在处理
        if (state.isProcessing[stockCode]) {
          console.log(`[${stockCode}] 正在处理中，跳过重复请求`);
          return;
        }
        
        // 设置处理状态
        set((prevState) => ({
          ...prevState,
          isProcessing: {
            ...prevState.isProcessing,
            [stockCode]: true,
          },
          lastUpdate: {
            ...prevState.lastUpdate,
            [stockCode]: Date.now(),
          },
        }));
        
        try {
          console.log(`[${stockCode}] 开始多 Agent 共识分析...`);
          
          // 步骤1：数据收集 - 添加思考日志
          get().addThoughtLog({
            agent: '系统',
            message: `开始对 ${stockCode} (${stockName}) 进行多维度分析`,
            type: 'analysis',
            stockCode,
          });
          
          await get().addReasoningStep(stockCode, {
            step: 1,
            agentId: 'system',
            action: 'data_collection',
            data: { stockCode, stockName },
            conclusion: '开始收集多维度数据',
            timestamp: Date.now(),
          });
          
          // 步骤2：并行调用各 Agent 分析（优化性能）
          get().addThoughtLog({
            agent: '系统',
            message: '并行调用各专业 Agent 进行分析...',
            type: 'reasoning',
            stockCode,
          });
          
          // 获取统一的股票数据
          const bridge = new DataBridge(stockCode);
          const unifiedData = await bridge.getAllData();
          
          // 基于统一数据生成 AI 分析决策
          const aiDecision = await defaultAIClient.generateDecision(unifiedData);
          
          // 从 AI 决策中派生出各个 Agent 的投票
          const agentPromises = [
            // 筹码分析专家
            Promise.resolve({
              agentId: 'chip_analysis',
              agentName: '筹码分析专家',
              confidence: Math.min(0.9, aiDecision.confidenceScore / 100 + 0.2),
              direction: aiDecision.operationRating,
              score: aiDecision.operationRating === 'buy' ? 0.8 : aiDecision.operationRating === 'sell' ? -0.8 : 0,
              reasoning: `筹码分布分析: ${aiDecision.trendAnalysis}`,
              timestamp: Date.now(),
              weights: {
                technical: 0.2,
                fundamental: 0.1,
                sentiment: 0.1,
                chipAnalysis: 0.6,
                risk: 0.0,
              },
            }),
            // 风险控制专家
            Promise.resolve({
              agentId: 'risk_control',
              agentName: '风险控制专家',
              confidence: Math.min(0.95, aiDecision.confidenceScore / 100 + 0.15),
              direction: aiDecision.operationRating,
              score: aiDecision.operationRating === 'buy' ? 0.7 : aiDecision.operationRating === 'sell' ? -0.9 : 0,
              reasoning: `风险评估: ${aiDecision.riskWarning.join('; ')}`,
              timestamp: Date.now(),
              weights: {
                technical: 0.0,
                fundamental: 0.0,
                sentiment: 0.0,
                chipAnalysis: 0.0,
                risk: 1.0,
              },
            }),
            // 技术分析专家
            Promise.resolve({
              agentId: 'technical',
              agentName: '技术分析专家',
              confidence: Math.min(0.85, aiDecision.confidenceScore / 100 + 0.15),
              direction: aiDecision.operationRating,
              score: aiDecision.operationRating === 'buy' ? 0.75 : aiDecision.operationRating === 'sell' ? -0.75 : 0,
              reasoning: `技术指标分析: ${aiDecision.trendAnalysis}`,
              timestamp: Date.now(),
              weights: {
                technical: 0.7,
                fundamental: 0.1,
                sentiment: 0.1,
                chipAnalysis: 0.1,
                risk: 0.0,
              },
            }),
            // 基本面分析专家
            Promise.resolve({
              agentId: 'fundamental',
              agentName: '基本面分析专家',
              confidence: Math.min(0.85, aiDecision.confidenceScore / 100 + 0.15),
              direction: aiDecision.operationRating,
              score: aiDecision.operationRating === 'buy' ? 0.7 : aiDecision.operationRating === 'sell' ? -0.7 : 0,
              reasoning: `基本面分析: ${aiDecision.mainIntention}`,
              timestamp: Date.now(),
              weights: {
                technical: 0.1,
                fundamental: 0.6,
                sentiment: 0.1,
                chipAnalysis: 0.1,
                risk: 0.1,
              },
            }),
            // 舆情分析专家
            Promise.resolve({
              agentId: 'sentiment',
              agentName: '舆情分析专家',
              confidence: Math.min(0.8, aiDecision.confidenceScore / 100 + 0.15),
              direction: aiDecision.operationRating,
              score: aiDecision.operationRating === 'buy' ? 0.6 : aiDecision.operationRating === 'sell' ? -0.6 : 0,
              reasoning: `舆情分析: ${aiDecision.mainIntention}`,
              timestamp: Date.now(),
              weights: {
                technical: 0.1,
                fundamental: 0.1,
                sentiment: 0.6,
                chipAnalysis: 0.1,
                risk: 0.1,
              },
            }),
          ].map(promise => promise.then(vote => {
            get().addThoughtLog({
              agent: vote.agentName,
              message: `${vote.reasoning.substring(0, 100)}...`,
              type: vote.score < -0.5 ? 'warning' : vote.direction === 'buy' ? 'analysis' : 'analysis',
              stockCode,
              confidence: vote.confidence,
            });
            return vote;
          }));
          
          
          // 等待所有 Agent 分析完成
          const agentResults = await Promise.all(agentPromises);
          const agentVotes = agentResults.filter(vote => vote !== null) as AgentVote[];
          
          // 步骤3：收集各 Agent 投票并添加到状态
          agentVotes.forEach(vote => {
            get().addAgentVote(stockCode, vote);
          });
          
          // 步骤4：计算共识结果
          get().addThoughtLog({
            agent: '系统',
            message: '开始计算多 Agent 共识结果...',
            type: 'reasoning',
            stockCode,
          });
          
          const consensusResult = calculateConsensus(stockCode, stockName, agentVotes, state.agentWeights);
          
          // 添加共识结论日志
          get().addThoughtLog({
            agent: '共识引擎',
            message: `最终决策: ${consensusResult.finalDecision.toUpperCase()}, 置信度: ${(consensusResult.confidence * 100).toFixed(1)}%`,
            type: 'conclusion',
            stockCode,
            confidence: consensusResult.confidence,
          });
          
          // 更新共识结果
          get().updateConsensusResult(stockCode, consensusResult);
          
          // 步骤5：添加推理链总结
          await get().addReasoningStep(stockCode, {
            step: agentVotes.length + 1,
            agentId: 'consensus',
            action: 'final_decision',
            data: { consensusResult },
            conclusion: `多 Agent 共识完成: ${consensusResult.finalDecision}`,
            timestamp: Date.now(),
          });
          
          // 步骤6：记录决策记忆
          try {
            // 获取当前价格作为决策时价格
            const bridge = new DataBridge(stockCode);
            const marketData = await bridge.getData('quote');
            const priceAtDecision = marketData.currentPrice || 0;
            
            // 创建记忆条目
            const memoryEntry: MemoryEntry = {
              id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              stockCode,
              consensusResult,
              priceAtDecision,
              actualPriceAfter: priceAtDecision, // 初始化为当前价格，后续会更新
              priceChangePercent: 0, // 初始化为0，后续会更新
              isSuccessful: false, // 初始化为false，后续会评估
              feedbackScore: 0, // 初始化为0，后续会评估
              timestamp: Date.now(),
              actualTimestamp: Date.now(),
            };
            
            // 更新记忆
            get().updateMemory(memoryEntry);
          } catch (error) {
            console.error(`[${stockCode}] 创建决策记忆失败:`, error);
            get().addThoughtLog({
              agent: '系统',
              message: `创建决策记忆失败: ${error instanceof Error ? error.message : String(error)}`,
              type: 'warning',
              stockCode,
            });
          }
          
          console.log(`[${stockCode}] 共识分析完成:`, consensusResult);
          
        } catch (error) {
          console.error(`[${stockCode}] 共识分析失败:`, error);
          
          // 添加错误日志
          get().addThoughtLog({
            agent: '系统',
            message: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
            type: 'error',
            stockCode,
          });
          
          // 添加错误步骤
          await get().addReasoningStep(stockCode, {
            step: 999,
            agentId: 'system',
            action: 'error',
            data: { error: error instanceof Error ? error.message : String(error) },
            conclusion: `共识分析失败: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: Date.now(),
          });
        } finally {
          // 清除处理状态
          set((prevState) => {
            const newIsProcessing = { ...prevState.isProcessing };
            const newLastUpdate = { ...prevState.lastUpdate };
            delete newIsProcessing[stockCode];
            delete newLastUpdate[stockCode];
            
            return {
              ...prevState,
              isProcessing: newIsProcessing,
              lastUpdate: newLastUpdate,
            };
          });
        }
      },
      
      // 添加 Agent 投票
      addAgentVote: (stockCode: string, vote: AgentVote) => {
        set((state) => ({
          ...state,
          agentVotes: {
            ...state.agentVotes,
            [stockCode]: [
              ...(state.agentVotes[stockCode] || []),
              vote,
            ],
          },
        }));
      },
      
      // 更新共识结果
      updateConsensusResult: (stockCode: string, result: ConsensusResult) => {
        set((state) => ({
          ...state,
          consensusResults: {
            ...state.consensusResults,
            [stockCode]: result,
          },
        }));
      },
      
      // 添加推理步骤
      addReasoningStep: async (stockCode: string, step: ReasoningStep) => {
        set((state) => ({
          ...state,
          reasoningChain: {
            ...state.reasoningChain,
            [stockCode]: [
              ...(state.reasoningChain[stockCode] || []),
              step,
            ],
          },
        }));
      },
      
      // 更新记忆
      updateMemory: (entry: MemoryEntry) => {
        set((state) => {
          const newMemory = [...state.decisionMemory, entry];
          
          // 保持记忆大小限制
          if (newMemory.length > state.maxMemorySize) {
            newMemory.sort((a, b) => b.timestamp - a.timestamp);
            newMemory.splice(state.maxMemorySize);
          }
          
          return {
            ...state,
            decisionMemory: newMemory,
          };
        });
      },
      
      // 更新 Agent 权重
      updateAgentWeights: (weights: Partial<typeof defaultAgentWeights>) => {
        set((state) => ({
          ...state,
          agentWeights: {
            ...state.agentWeights,
            ...weights,
          },
        }));
      },
      
      // 清除股票数据
      clearStockData: (stockCode: string) => {
        set((state) => {
          const newAgentVotes = { ...state.agentVotes };
          const newConsensusResults = { ...state.consensusResults };
          const newReasoningChain = { ...state.reasoningChain };
          const newIsProcessing = { ...state.isProcessing };
          const newLastUpdate = { ...state.lastUpdate };
          
          delete newAgentVotes[stockCode];
          delete newConsensusResults[stockCode];
          delete newReasoningChain[stockCode];
          delete newIsProcessing[stockCode];
          delete newLastUpdate[stockCode];
          
          return {
            ...state,
            agentVotes: newAgentVotes,
            consensusResults: newConsensusResults,
            reasoningChain: newReasoningChain,
            isProcessing: newIsProcessing,
            lastUpdate: newLastUpdate,
          };
        });
      },
      
      // 清除所有记忆
      clearAllMemory: () => {
        set((state) => ({
          ...state,
          decisionMemory: [],
        }));
      },
      
      // 添加思考日志
      addThoughtLog: (log: Omit<ThoughtLog, 'id' | 'timestamp'>) => {
        set((state) => {
          const newLog: ThoughtLog = {
            ...log,
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
          };
          
          const newLogs = [...state.thoughtLogs, newLog];
          
          // 保持日志大小限制
          if (newLogs.length > state.maxThoughtLogSize) {
            newLogs.splice(0, newLogs.length - state.maxThoughtLogSize);
          }
          
          return {
            ...state,
            thoughtLogs: newLogs,
          };
        });
      },
      
      // 清除思考日志
      clearThoughtLogs: () => {
        set((state) => ({
          ...state,
          thoughtLogs: [],
        }));
      },
      
      // 获取指定股票的思考日志
      getThoughtLogsByStock: (stockCode: string) => {
        const state = get();
        return state.thoughtLogs.filter(log => log.stockCode === stockCode);
      },
      
      // 获取股票共识结果
      getStockConsensus: (stockCode: string) => {
        return get().consensusResults[stockCode] || null;
      },
      
      // 获取股票推理链
      getStockReasoning: (stockCode: string) => {
        return get().reasoningChain[stockCode] || [];
      },
      
      // 获取 Agent 表现评分
      getAgentPerformance: (agentId: string) => {
        const state = get();
        const relevantMemories = state.decisionMemory.filter(
          memory => memory.consensusResult.agentVotes.some(vote => vote.agentId === agentId)
        );
        
        if (relevantMemories.length === 0) return 0;
        
        const totalScore = relevantMemories.reduce((sum, memory) => sum + memory.feedbackScore, 0);
        return totalScore / relevantMemories.length;
      },
      
      // 启动后台任务
      startBackgroundTask: () => {
        const state = get();
        if (state.backgroundTaskStatus.isRunning) return;
        
        set(prevState => ({
          ...prevState,
          backgroundTaskStatus: {
            ...prevState.backgroundTaskStatus,
            isRunning: true,
          },
        }));
        
        // 立即执行一次
        get().updateDecisionPerformance();
        
        // 设置定时任务：1分钟更新决策表现
        const interval = setInterval(() => {
          get().updateDecisionPerformance();
        }, state.backgroundTaskStatus.interval);
        
        // 保存interval ID以便后续停止
        if (typeof window !== 'undefined') {
          window.__strategyBackgroundTaskInterval = interval;
        }
        
        // 设置5分钟盈亏追踪任务
        const outcomeInterval = setInterval(() => {
          const state = get();
          // 遍历所有有共识结果的股票
          Object.keys(state.consensusResults).forEach(stockCode => {
            get().updateDecisionOutcome(stockCode);
          });
        }, 300000); // 5分钟
        
        if (typeof window !== 'undefined') {
          window.__outcomeTrackerInterval = outcomeInterval;
        }
      },
      
      // 停止后台任务
      stopBackgroundTask: () => {
        if (typeof window !== 'undefined' && window.__strategyBackgroundTaskInterval) {
          clearInterval(window.__strategyBackgroundTaskInterval);
          delete window.__strategyBackgroundTaskInterval;
        }
        
        // 停止盈亏追踪任务
        if (typeof window !== 'undefined' && window.__outcomeTrackerInterval) {
          clearInterval(window.__outcomeTrackerInterval);
          delete window.__outcomeTrackerInterval;
        }
        
        set(prevState => ({
          ...prevState,
          backgroundTaskStatus: {
            ...prevState.backgroundTaskStatus,
            isRunning: false,
          },
        }));
      },
      
      // 更新决策表现
      updateDecisionPerformance: async () => {
        const state = get();
        const { decisionMemory } = state;
        
        if (decisionMemory.length === 0) {
          set(prevState => ({
            ...prevState,
            backgroundTaskStatus: {
              ...prevState.backgroundTaskStatus,
              lastRun: Date.now(),
            },
          }));
          return;
        }
        
        try {
          // 更新每个决策的实际表现
          const updatedMemories = await Promise.all(decisionMemory.map(async (memory) => {
            try {
              const bridge = new DataBridge(memory.stockCode);
              const marketData = await bridge.getData('quote');
              const actualPriceAfter = marketData.currentPrice || 0;
              
              // 计算价格变化百分比
              const priceChangePercent = memory.priceAtDecision > 0 
                ? ((actualPriceAfter - memory.priceAtDecision) / memory.priceAtDecision) * 100 
                : 0;
              
              // 评估决策是否成功
              const { finalDecision } = memory.consensusResult;
              let isSuccessful = false;
              let feedbackScore = 0;
              
              if (finalDecision === 'buy' && priceChangePercent >= MEMORY_CONFIG.successThreshold) {
                isSuccessful = true;
                feedbackScore = 1;
              } else if (finalDecision === 'sell' && priceChangePercent <= -MEMORY_CONFIG.successThreshold) {
                isSuccessful = true;
                feedbackScore = 1;
              } else if (finalDecision === 'hold' && Math.abs(priceChangePercent) < MEMORY_CONFIG.successThreshold) {
                isSuccessful = true;
                feedbackScore = 0.5;
              } else {
                isSuccessful = false;
                feedbackScore = -1;
              }
              
              return {
                ...memory,
                actualPriceAfter,
                priceChangePercent,
                isSuccessful,
                feedbackScore,
              };
            } catch (error) {
              console.error(`更新决策记忆失败 (${memory.stockCode}):`, error);
              return memory;
            }
          }));
          
          // 更新记忆
          set(prevState => ({
            ...prevState,
            decisionMemory: updatedMemories,
            backgroundTaskStatus: {
              ...prevState.backgroundTaskStatus,
              lastRun: Date.now(),
            },
          }));
          
          // 更新Agent表现跟踪
          get().updateAgentPerformanceTracking(updatedMemories);
          
          // 执行权重自适应调整
          get().recalibrateWeights();
          
        } catch (error) {
          console.error('更新决策表现失败:', error);
          get().addThoughtLog({
            agent: '系统',
            message: `更新决策表现失败: ${error instanceof Error ? error.message : String(error)}`,
            type: 'warning',
          });
          
          set(prevState => ({
            ...prevState,
            backgroundTaskStatus: {
              ...prevState.backgroundTaskStatus,
              lastRun: Date.now(),
            },
          }));
        }
      },
      
      // 调整Agent权重
      adjustAgentWeights: (agentId: string, adjustment: number, reason: string) => {
        const state = get();
        const agentNameMap: Record<string, string> = {
          'chip_analysis': '筹码分析专家',
          'risk_control': '风险控制专家',
          'technical': '技术分析专家',
          'fundamental': '基本面分析专家',
          'sentiment': '舆情分析专家',
        };
        
        const agentName = agentNameMap[agentId] || agentId;
        const oldWeight = state.agentWeights[agentId as keyof typeof state.agentWeights] || 0;
        const newWeight = Math.max(0.05, Math.min(0.5, oldWeight + adjustment));
        
        // 创建权重调整记录
        const weightAdjustment: WeightAdjustment = {
          id: `weight_adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agentId,
          agentName,
          oldWeight,
          newWeight,
          adjustment,
          reason,
          timestamp: Date.now(),
        };
        
        // 更新权重和记录
        set(prevState => {
          const newHistory = [...prevState.weightAdjustmentHistory, weightAdjustment];
          
          // 保持记录大小限制
          if (newHistory.length > prevState.maxWeightAdjustmentHistorySize) {
            newHistory.splice(0, newHistory.length - prevState.maxWeightAdjustmentHistorySize);
          }
          
          return {
            ...prevState,
            agentWeights: {
              ...prevState.agentWeights,
              [agentId]: newWeight,
            },
            weightAdjustmentHistory: newHistory,
          };
        });
        
        // 添加日志
        get().addThoughtLog({
          agent: '系统',
          message: `调整${agentName}权重: ${(oldWeight * 100).toFixed(1)}% → ${(newWeight * 100).toFixed(1)}%, 原因: ${reason}`,
          type: 'analysis',
        });
      },
      
      // 5分钟盈亏追踪
      updateDecisionOutcome: async (stockCode: string) => {
        const state = get();
        const consensusResult = state.consensusResults[stockCode];
        if (!consensusResult) return;
        
        try {
          // 获取当前价格
          const bridge = new DataBridge(stockCode);
          const marketData = await bridge.getData('quote');
          const currentPrice = marketData.currentPrice || 0;
          
          // 查找对应的记忆条目
          const memoryEntry = state.decisionMemory.find(
            entry => entry.stockCode === stockCode && entry.consensusResult.timestamp === consensusResult.timestamp
          );
          
          if (memoryEntry) {
            const priceAtDecision = memoryEntry.priceAtDecision;
            const priceChangePercent = priceAtDecision > 0 
              ? ((currentPrice - priceAtDecision) / priceAtDecision) * 100 
              : 0;
            
            // 评估决策是否成功
            const { finalDecision } = memoryEntry.consensusResult;
            let isSuccessful = false;
            let feedbackScore = 0;
            
            if (finalDecision === 'buy' && priceChangePercent >= MEMORY_CONFIG.successThreshold) {
              isSuccessful = true;
              feedbackScore = 1;
            } else if (finalDecision === 'sell' && priceChangePercent <= -MEMORY_CONFIG.successThreshold) {
              isSuccessful = true;
              feedbackScore = 1;
            } else if (finalDecision === 'hold' && Math.abs(priceChangePercent) < MEMORY_CONFIG.successThreshold) {
              isSuccessful = true;
              feedbackScore = 0.5;
            } else {
              isSuccessful = false;
              feedbackScore = -1;
            }
            
            // 更新记忆条目
            const updatedMemory = {
              ...memoryEntry,
              actualPriceAfter: currentPrice,
              priceChangePercent,
              isSuccessful,
              feedbackScore,
              actualTimestamp: Date.now(),
            };
            get().updateMemory(updatedMemory);
            
            // 添加盈亏日志
            const logType = isSuccessful ? 'conclusion' : priceChangePercent >= 0 ? 'analysis' : 'warning';
            get().addThoughtLog({
              agent: '盈亏追踪',
              message: `虚拟盈亏: ${stockCode} ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%, 决策${isSuccessful ? '成功' : '失败'}`,
              type: logType,
              stockCode,
            });
            
            // 更新Agent表现跟踪
            get().updateAgentPerformanceTracking([updatedMemory]);
            
            // 执行权重自适应调整
            get().recalibrateWeights();
          } else {
            // 如果没有记忆条目，创建一个新的
            const newMemoryEntry: MemoryEntry = {
              id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              stockCode,
              consensusResult,
              priceAtDecision: marketData.currentPrice || 0,
              actualPriceAfter: marketData.currentPrice || 0,
              priceChangePercent: 0,
              isSuccessful: false,
              feedbackScore: 0,
              timestamp: Date.now(),
              actualTimestamp: Date.now(),
            };
            get().updateMemory(newMemoryEntry);
          }
        } catch (error) {
          console.error(`更新决策盈亏失败 (${stockCode}):`, error);
          get().addThoughtLog({
            agent: '系统',
            message: `更新决策盈亏失败 (${stockCode}): ${error instanceof Error ? error.message : String(error)}`,
            type: 'error',
          });
        }
      },
      
      // 权重自适应调整
      recalibrateWeights: () => {
        const state = get();
        const { agentPerformanceTracker, agentWeights } = state;
        
        // 遍历每个 Agent
        Object.keys(agentWeights).forEach(agentId => {
          const performance = agentPerformanceTracker[agentId];
          if (!performance || performance.totalDecisions < 10) return; // 样本太少不调整
          
          const winRate = performance.successfulDecisions / performance.totalDecisions;
          const currentWeight = agentWeights[agentId as keyof typeof agentWeights];
          
          // 1. 检测连续失败
          if (performance.consecutiveFailures >= 3) {
            get().adjustAgentWeights(
              agentId, 
              -0.08, 
              `连续${performance.consecutiveFailures}次预测失误，大幅降低权重`
            );
            
            // 添加日志记录
            get().addThoughtLog({
              agent: '系统',
              message: `Agent ${agentId} 连续${performance.consecutiveFailures}次预测失误，已自动下調权重至 ${(Math.max(0.05, currentWeight - 0.08) * 100).toFixed(1)}%`,
              type: 'warning'
            });
          }
          // 2. 胜率 > 60% 且权重未达上限，增加权重
          else if (winRate > 0.6 && currentWeight < 0.4) {
            get().adjustAgentWeights(
              agentId, 
              0.05, 
              `胜率达 ${(winRate * 100).toFixed(1)}% (近${performance.totalDecisions}次)，表现优异`
            );
          }
          // 3. 胜率 < 40% 且权重未达下限，减少权重
          else if (winRate < 0.4 && currentWeight > 0.1) {
            get().adjustAgentWeights(
              agentId, 
              -0.05, 
              `胜率仅 ${(winRate * 100).toFixed(1)}% (近${performance.totalDecisions}次)，表现不佳`
            );
          }
        });
      },
      
      // 更新 Agent 表现跟踪
      updateAgentPerformanceTracking: (memories: MemoryEntry[]) => {
        const state = get();
        const tracker = { ...state.agentPerformanceTracker };
        
        // 只处理最近的记忆，避免重复计算或计算量过大
        // 这里简化处理：重新计算所有记忆
        // 在实际生产中，应该只处理新增的记忆
        
        // 重置计数器
        Object.keys(state.agentWeights).forEach(agentId => {
          tracker[agentId] = {
            agentId,
            agentName: agentId, // 简化，实际应获取名称
            consecutiveFailures: 0,
            totalDecisions: 0,
            successfulDecisions: 0,
            averageScore: 0,
            lastUpdated: Date.now(),
          };
        });
        
        memories.forEach(memory => {
          const { consensusResult, isSuccessful } = memory;
          
          consensusResult.agentVotes.forEach(vote => {
            const agentId = vote.agentId;
            if (!tracker[agentId]) return;
            
            tracker[agentId].totalDecisions++;
            
            // 判断 Agent 的建议是否与最终结果一致且成功
            // 或者 Agent 的建议本身就是正确的（即使最终决策错误）
            // 这里简化：如果 Agent 建议方向与价格变动方向一致，则视为成功
            
            let agentCorrect = false;
            if (vote.direction === 'buy' && memory.priceChangePercent > 0) agentCorrect = true;
            else if (vote.direction === 'sell' && memory.priceChangePercent < 0) agentCorrect = true;
            else if (vote.direction === 'hold' && Math.abs(memory.priceChangePercent) < MEMORY_CONFIG.successThreshold) agentCorrect = true;
            
            if (agentCorrect) {
              tracker[agentId].successfulDecisions++;
              tracker[agentId].consecutiveFailures = 0;
            } else {
              tracker[agentId].consecutiveFailures++;
            }
          });
        });
        
        set(prevState => ({
          ...prevState,
          agentPerformanceTracker: tracker,
        }));
      },
    }),
    {
      name: 'ai-trading-terminal-strategy-store',
      version: 1,
      storage: safeLocalStorage,
      partialize: (state) => ({
        agentWeights: state.agentWeights,
        weightAdjustmentHistory: state.weightAdjustmentHistory,
        decisionMemory: state.decisionMemory,
      }),
    }
  )
);

// 模拟各 Agent 分析
async function simulateChipAnalysisAgent(stockCode: string, weight: number): Promise<AgentVote> {
  // 模拟筹码分析
  const analysis = await analyzeChipDistribution(stockCode);
  
  return {
    agentId: 'chip_analysis',
    agentName: '筹码分析专家',
    confidence: 0.75,
    direction: analysis.direction,
    score: analysis.score,
    reasoning: analysis.reasoning,
    timestamp: Date.now(),
    weights: {
      technical: 0.2,
      fundamental: 0.1,
      sentiment: 0.1,
      chipAnalysis: 0.6,
      risk: 0.0,
    },
  };
}

async function simulateRiskControlAgent(stockCode: string, weight: number): Promise<AgentVote | null> {
  // 风险控制专家，权重较低但强制参与
  const risk = await assessRisk(stockCode);
  
  if (risk.extremeRisk) {
    // 极端风险情况下，风险控制专家拥有否决权
    return {
      agentId: 'risk_control',
      agentName: '风险控制专家',
      confidence: 0.9,
      direction: 'sell',
      score: -0.8,
      reasoning: `风险过高: ${risk.reason}`,
      timestamp: Date.now(),
      weights: {
        technical: 0.0,
        fundamental: 0.0,
        sentiment: 0.0,
        chipAnalysis: 0.0,
        risk: 1.0,
      },
    };
  }
  
  return {
    agentId: 'risk_control',
    agentName: '风险控制专家',
    confidence: 0.6,
    direction: risk.direction,
    score: risk.score,
    reasoning: risk.reasoning,
    timestamp: Date.now(),
    weights: {
      technical: 0.1,
      fundamental: 0.2,
      sentiment: 0.1,
      chipAnalysis: 0.1,
      risk: 0.5,
    },
  };
}

async function simulateTechnicalAgent(stockCode: string, weight: number): Promise<AgentVote> {
  const analysis = await analyzeTechnicalIndicators(stockCode);
  
  return {
    agentId: 'technical',
    agentName: '技术分析专家',
    confidence: 0.7,
    direction: analysis.direction,
    score: analysis.score,
    reasoning: analysis.reasoning,
    timestamp: Date.now(),
    weights: {
      technical: 0.7,
      fundamental: 0.1,
      sentiment: 0.1,
      chipAnalysis: 0.1,
      risk: 0.0,
    },
  };
}

async function simulateFundamentalAgent(stockCode: string, weight: number): Promise<AgentVote> {
  const analysis = await analyzeFundamentals(stockCode);
  
  return {
    agentId: 'fundamental',
    agentName: '基本面分析专家',
    confidence: 0.8,
    direction: analysis.direction,
    score: analysis.score,
    reasoning: analysis.reasoning,
    timestamp: Date.now(),
    weights: {
      technical: 0.1,
      fundamental: 0.6,
      sentiment: 0.1,
      chipAnalysis: 0.1,
      risk: 0.1,
    },
  };
}

async function simulateSentimentAgent(stockCode: string, weight: number): Promise<AgentVote> {
  const analysis = await analyzeSentiment(stockCode);
  
  return {
    agentId: 'sentiment',
    agentName: '舆情分析专家',
    confidence: 0.65,
    direction: analysis.direction,
    score: analysis.score,
    reasoning: analysis.reasoning,
    timestamp: Date.now(),
    weights: {
      technical: 0.1,
      fundamental: 0.1,
      sentiment: 0.6,
      chipAnalysis: 0.1,
      risk: 0.1,
    },
  };
}

// 核心共识计算算法
function calculateConsensus(
  stockCode: string,
  stockName: string,
  agentVotes: AgentVote[],
  weights: typeof defaultAgentWeights
): ConsensusResult {
  if (agentVotes.length === 0) {
    // 没有有效的 Agent 投票时返回 hold 决策
    return {
      stockCode,
      stockName,
      finalDecision: 'hold',
      confidence: 0.5,
      totalScore: 0,
      agentVotes: [],
      timestamp: Date.now(),
      reasoning: '没有有效的 Agent 投票，默认保持观望',
      riskLevel: 'medium',
    };
  }
  
  // 步骤1：检查风险控制否决权
  const riskControlVote = agentVotes.find(vote => vote.agentId === 'risk_control');
  if (riskControlVote && riskControlVote.score < -0.7) {
    return {
      stockCode,
      stockName,
      finalDecision: 'sell',
      confidence: riskControlVote.confidence,
      totalScore: riskControlVote.score,
      agentVotes,
      timestamp: Date.now(),
      reasoning: `风险控制否决: ${riskControlVote.reasoning}`,
      riskLevel: 'high',
    };
  }
  
  // 步骤2：加权计算总分（改进算法）
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let avgConfidence = 0;
  let consensusReasoning = [];
  let voteDirections = { buy: 0, sell: 0, hold: 0 };
  
  for (const vote of agentVotes) {
    // 动态权重调整：根据 Agent 历史表现调整权重
    const performanceMultiplier = calculateAgentPerformanceMultiplier(vote.agentId);
    const adjustedWeight = weights[vote.agentId as keyof typeof weights] * performanceMultiplier;
    
    totalWeightedScore += vote.score * adjustedWeight * vote.confidence;
    totalWeight += adjustedWeight;
    avgConfidence += vote.confidence;
    consensusReasoning.push(`${vote.agentName}: ${vote.reasoning}`);
    
    // 统计投票方向
    voteDirections[vote.direction]++;
  }
  
  // 步骤3：标准化处理
  const normalizedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  avgConfidence = avgConfidence / agentVotes.length;
  
  // 步骤4：智能决策阈值（考虑投票一致性）
  let finalDecision: 'buy' | 'sell' | 'hold';
  let riskLevel: 'low' | 'medium' | 'high';
  const totalVotes = agentVotes.length;
  
  // 共识度计算：如果多数 Agent 意见一致，提高置信度
  const consensusRatio = Math.max(voteDirections.buy, voteDirections.sell, voteDirections.hold) / totalVotes;
  const adjustedConfidence = Math.min(avgConfidence * (0.8 + consensusRatio * 0.4), 1.0);
  
  if (consensusRatio >= 0.6) {
    // 高度一致：使用宽松阈值
    if (normalizedScore > 0.2) {
      finalDecision = 'buy';
      riskLevel = normalizedScore > 0.6 ? 'high' : 'medium';
    } else if (normalizedScore < -0.2) {
      finalDecision = 'sell';
      riskLevel = 'high';
    } else {
      finalDecision = 'hold';
      riskLevel = 'low';
    }
  } else {
    // 分歧较大：使用严格阈值
    if (normalizedScore > 0.4) {
      finalDecision = 'buy';
      riskLevel = 'medium';
    } else if (normalizedScore < -0.4) {
      finalDecision = 'sell';
      riskLevel = 'high';
    } else {
      finalDecision = 'hold';
      riskLevel = consensusRatio < 0.4 ? 'high' : 'medium';
    }
  }
  
  // 步骤5：生成智能推理
  const consensusStrength = consensusRatio > 0.6 ? '高度一致' : consensusRatio > 0.4 ? '基本一致' : '存在分歧';
  const finalReasoning = `[${consensusStrength}] ${consensusReasoning.join('; ')}`;
  
  // 步骤6：计算目标价位和止损位（基于技术分析）
  const technicalVote = agentVotes.find(vote => vote.agentId === 'technical');
  let targetPrice: number | undefined;
  let stopLoss: number | undefined;
  
  if (technicalVote && (finalDecision === 'buy' || finalDecision === 'sell')) {
    // 简化的目标价位计算
    const basePrice = 850; // 模拟当前价格
    const volatility = 0.15; // 模拟波动率
    
    if (finalDecision === 'buy') {
      targetPrice = basePrice * (1 + Math.abs(normalizedScore) * volatility);
      stopLoss = basePrice * (1 - volatility * 0.5);
    } else {
      targetPrice = basePrice * (1 - Math.abs(normalizedScore) * volatility);
      stopLoss = basePrice * (1 + volatility * 0.5);
    }
  }
  
  return {
    stockCode,
    stockName,
    finalDecision,
    confidence: adjustedConfidence,
    totalScore: normalizedScore,
    agentVotes,
    timestamp: Date.now(),
    reasoning: finalReasoning,
    riskLevel,
    targetPrice,
    stopLoss,
  };
}

// 计算 Agent 表现乘数（基于历史记忆和表现）
function calculateAgentPerformanceMultiplier(agentId: string): number {
  try {
    const state = useStrategyStore.getState();
    const performance = state.agentPerformanceTracker[agentId];
    
    if (!performance || performance.totalDecisions === 0) {
      // 如果没有表现数据，使用默认值
      const defaultMap: Record<string, number> = {
        'chip_analysis': 1.0,
        'risk_control': 1.2, // 风险控制 Agent 权重略高
        'technical': 1.0,
        'fundamental': 1.1, // 基本面分析 Agent 权重稍高
        'sentiment': 0.9, // 舆情分析 Agent 权重稍低
      };
      return defaultMap[agentId] || 1.0;
    }
    
    // 基于成功率和平均分数计算表现乘数
    const successRate = performance.successfulDecisions / performance.totalDecisions;
    const averageScore = performance.averageScore;
    
    // 基础乘数（0.8-1.2范围）
    const baseMultiplier = 0.8 + (successRate * 0.4);
    
    // 分数调整（-0.1到+0.1范围）
    const scoreAdjustment = averageScore * 0.1;
    
    // 最终乘数（0.7-1.3范围）
    const finalMultiplier = Math.max(0.7, Math.min(1.3, baseMultiplier + scoreAdjustment));
    
    return finalMultiplier;
  } catch (error) {
    console.error(`计算 Agent 表现乘数失败 (${agentId}):`, error);
    return 1.0; // 出错时返回默认值
  }
}

// 更新Agent表现跟踪
function updateAgentPerformanceTracking(memories: MemoryEntry[]) {
  // 统计每个Agent的表现
  const agentStats: Record<string, { 
    total: number, 
    successful: number, 
    scores: number[] 
  }> = {};
  
  const agentNameMap: Record<string, string> = {
    'chip_analysis': '筹码分析专家',
    'risk_control': '风险控制专家',
    'technical': '技术分析专家',
    'fundamental': '基本面分析专家',
    'sentiment': '舆情分析专家',
  };
  
  // 遍历所有记忆条目
  memories.forEach(memory => {
    const { agentVotes } = memory.consensusResult;
    
    // 遍历每个Agent的投票
    agentVotes.forEach(vote => {
      const { agentId, score } = vote;
      
      // 初始化统计数据
      if (!agentStats[agentId]) {
        agentStats[agentId] = { total: 0, successful: 0, scores: [] };
      }
      
      // 更新统计数据
      agentStats[agentId].total++;
      if (memory.isSuccessful) {
        agentStats[agentId].successful++;
      }
      agentStats[agentId].scores.push(score);
    });
  });
  
  // 更新Store中的Agent表现跟踪
  useStrategyStore.setState(prevState => {
    const newTracker = { ...prevState.agentPerformanceTracker };
    
    Object.keys(agentStats).forEach(agentId => {
      const stats = agentStats[agentId];
      const averageScore = stats.scores.length > 0 
        ? stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length 
        : 0;
      
      newTracker[agentId] = {
        agentId,
        agentName: agentNameMap[agentId] || agentId,
        consecutiveFailures: stats.successful === 0 ? stats.total : 0, // 简单实现：如果没有成功，则连续失败次数等于总次数
        totalDecisions: stats.total,
        successfulDecisions: stats.successful,
        averageScore,
        lastUpdated: Date.now(),
      };
    });
    
    return { agentPerformanceTracker: newTracker };
  });
}

// 检查Agent表现并调整权重
function checkAgentPerformanceForWeightAdjustment() {
  const state = useStrategyStore.getState();
  const { agentPerformanceTracker } = state;
  
  // 遍历每个Agent的表现
  Object.values(agentPerformanceTracker).forEach(performance => {
    const { agentId, consecutiveFailures } = performance;
    
    // 如果连续失败3次，降低权重
    if (consecutiveFailures >= 3) {
      const adjustment = -0.05; // 降低5%的权重
      const reason = `连续${consecutiveFailures}次预测失败，降低权重`;
      
      // 调整权重
      useStrategyStore.getState().adjustAgentWeights(agentId, adjustment, reason);
      
      // 重置连续失败次数
      useStrategyStore.setState(prevState => ({
        agentPerformanceTracker: {
          ...prevState.agentPerformanceTracker,
          [agentId]: {
            ...prevState.agentPerformanceTracker[agentId],
            consecutiveFailures: 0,
          },
        },
      }));
    }
    // 如果连续成功5次，提高权重
    else if (performance.totalDecisions - performance.successfulDecisions === 0 && performance.totalDecisions >= 5) {
      const adjustment = 0.05; // 提高5%的权重
      const reason = `连续${performance.totalDecisions}次预测成功，提高权重`;
      
      // 调整权重
      useStrategyStore.getState().adjustAgentWeights(agentId, adjustment, reason);
    }
  });
}

// 模拟数据接口（后续集成真实 API）
async function analyzeChipDistribution(stockCode: string): Promise<{
  direction: 'buy' | 'sell' | 'hold';
  score: number;
  reasoning: string;
}> {
  // 模拟筹码分布分析
  // TODO: 集成真实的筹码分布 API
  const score = Math.random() * 2 - 1; // -1 到 1
  const direction = score > 0.3 ? 'buy' : score < -0.3 ? 'sell' : 'hold';
  
  return {
    direction,
    score,
    reasoning: `筹码分布分析: ${direction === 'buy' ? '主力吸筹' : direction === 'sell' ? '主力出货' : '横盘整理'}`,
  };
}

async function assessRisk(stockCode: string): Promise<{
  extremeRisk: boolean;
  direction: 'buy' | 'sell' | 'hold';
  score: number;
  reasoning: string;
  reason?: string;
}> {
  // 模拟风险评估
  // TODO: 集成真实的风险评估 API
  const extremeRisk = Math.random() < 0.1; // 10% 概率极端风险
  
  if (extremeRisk) {
    return {
      extremeRisk: true,
      direction: 'sell',
      score: -0.8,
      reasoning: '检测到极端风险信号',
      reason: '技术面破位 + 基本面恶化',
    };
  }
  
  const score = Math.random() * 2 - 1;
  const direction = score > 0 ? 'buy' : score < -0.2 ? 'sell' : 'hold';
  
  return {
    extremeRisk: false,
    direction,
    score,
    reasoning: `风险评估: ${direction === 'buy' ? '风险可控' : direction === 'sell' ? '存在风险' : '风险中性'}`,
  };
}

async function analyzeTechnicalIndicators(stockCode: string): Promise<{
  direction: 'buy' | 'sell' | 'hold';
  score: number;
  reasoning: string;
}> {
  // 模拟技术指标分析
  // TODO: 集成真实的技术指标 API
  const score = Math.random() * 2 - 1;
  const direction = score > 0.2 ? 'buy' : score < -0.2 ? 'sell' : 'hold';
  
  return {
    direction,
    score,
    reasoning: `技术分析: MACD金叉, RSI${score > 0 ? '超买' : score < -0.5 ? '超卖' : '中性'}`,
  };
}

async function analyzeFundamentals(stockCode: string): Promise<{
  direction: 'buy' | 'sell' | 'hold';
  score: number;
  reasoning: string;
}> {
  // 模拟基本面分析
  // TODO: 集成真实的基本面 API
  const score = Math.random() * 2 - 1;
  const direction = score > 0 ? 'buy' : score < -0.3 ? 'sell' : 'hold';
  
  return {
    direction,
    score,
    reasoning: `基本面分析: PE${score > 0 ? '合理' : '偏高'}, 营收增长${score > 0 ? '良好' : '放缓'}`,
  };
}

async function analyzeSentiment(stockCode: string): Promise<{
  direction: 'buy' | 'sell' | 'hold';
  score: number;
  reasoning: string;
}> {
  // 模拟舆情分析
  // TODO: 集成真实的舆情分析 API
  const score = Math.random() * 2 - 1;
  const direction = score > 0.1 ? 'buy' : score < -0.1 ? 'sell' : 'hold';
  
  return {
    direction,
    score,
    reasoning: `舆情分析: 市场情绪${score > 0 ? '乐观' : score < -0.5 ? '悲观' : '中性'}`,
  };
}

export default useStrategyStore;