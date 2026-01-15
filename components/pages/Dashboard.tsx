'use client';

// Dashboard 组件
import React, { useEffect, useState, useRef } from 'react';

// 添加isMounted状态来解决Hydration警告
const useIsMounted = () => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
};
import dynamic from 'next/dynamic';
import WADChipDistribution from '../WADChipDistribution';
import SearchComponent from '../SearchComponent';
import ErrorBoundary from '../ErrorBoundary';
import DataHealth from '../DataHealth';
import IntelligenceBrief from '../IntelligenceBrief';
import ARadarPanel from '../ARadarPanel';
import SmartThresholdRadar from '../SmartThresholdRadar';
import Skeleton from '../Skeleton';
import { fetchHeatFlowAlertList, HeatFlowAlertItem } from '../../lib/api/heatFlow/alert';
import { StockBasicInfo } from '../../lib/api/market';
import { useStockContext } from '../../lib/context/StockContext';
import { 
  calculateEnhancedIntradayAnalysis, 
  EnhancedIntradayAnalysisResult,
  RealTimeIntradayStrengthCalculator
} from '../../lib/algorithms/intradayStrength';
import { OrderItem } from '../../lib/algorithms/largeOrder';
import { formatNumberToFixed2, formatPercentToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';
import { AIClient, defaultAIClient } from '../../lib/api/ai-inference/ai-client';

// 动态导入组件
const MarketPulse = dynamic(() => import('../MarketPulse'), { loading: () => <Skeleton />, ssr: false });
const StrategyPerformance = dynamic(() => import('../StrategyPerformance'), { loading: () => <Skeleton />, ssr: false });
const MarketScanner = dynamic(() => import('../MarketScanner'), { loading: () => <Skeleton />, ssr: false });

// RadarData 类型定义
interface RadarData {
  liquidity: number;
  sellingPressure: number;
  sentiment: number;
  volumePower: number;
  trendStrength: number;
  chipConcentration: number;
}

// 市场指数类型定义
interface MarketIndex {
  name: string;
  value: string;
  change: string;
  percent: string;
  isPositive: boolean;
}

// 持仓股票类型定义
interface PositionStock {
  name: string;
  code: string;
  price: string;
  change: string;
  percent: string;
  volume: string;
  isPositive: boolean;
}

// 热门赛道类型定义
interface HotTrack {
  name: string;
  score: number;
  change: number;
  stocks: string[];
}

// 关注股类型定义
interface WatchStock {
  code: string;
  name: string;
  price: string;
  change: string;
  percent: string;
  isPositive: boolean;
}

// 风险提示类型定义
interface RiskAlert {
  id: string;
  stockName: string;
  alertType: string;
  message: string;
}

// 功能卡片类型定义
interface FeatureCard {
  id: string;
  title: string;
  type: 'implemented' | 'pending';
  score?: number;
  thumbnail?: string;
  description: string;
}

const Dashboard: React.FC = () => {
  // 使用isMounted钩子解决Hydration警告
  const isMounted = useIsMounted();
  
  const [alertData, setAlertData] = useState<HeatFlowAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMarketData, setLoadingMarketData] = useState(true);
  const [loadingIntradayData, setLoadingIntradayData] = useState(true);
  const [updatingData, setUpdatingData] = useState(false);
  
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  
  // AI市场结论状态
  const [aiMarketConclusion, setAiMarketConclusion] = useState<string>("根据今日市场数据和AI分析，当前市场整体呈现震荡上行趋势，科技板块表现强势，金融板块相对稳定。");
  
  // 市场情绪指数
  const marketSentimentIndex = 78;
  
  // 热门赛道TOP5
  const hotTracks: HotTrack[] = [
    { name: '半导体', score: 92, change: +3.5, stocks: ['中芯国际', '紫光国微', '韦尔股份'] },
    { name: '人工智能', score: 89, change: +2.8, stocks: ['科大讯飞', '寒武纪', '海康威视'] },
    { name: '新能源', score: 85, change: +1.9, stocks: ['宁德时代', '比亚迪', '隆基绿能'] },
    { name: '生物医药', score: 78, change: -0.5, stocks: ['恒瑞医药', '药明康德', '智飞生物'] },
    { name: '高端制造', score: 75, change: +1.2, stocks: ['三一重工', '中联重科', '徐工机械'] },
  ];
  
  // 我的关注股列表
  const watchStocks: WatchStock[] = [
    { code: 'SH600000', name: '浦发银行', price: '8.50', change: '+0.50', percent: '+6.17%', isPositive: true },
    { code: 'SZ000001', name: '平安银行', price: '10.25', change: '-0.15', percent: '-1.44%', isPositive: false },
    { code: 'SH600036', name: '招商银行', price: '32.80', change: '+0.80', percent: '+2.50%', isPositive: true },
    { code: 'SZ300750', name: '宁德时代', price: '258.60', change: '+5.20', percent: '+2.06%', isPositive: true },
    { code: 'SH688981', name: '中芯国际', price: '45.20', change: '+1.80', percent: '+4.15%', isPositive: true },
  ];
  
  // 实时风险提示
  const riskAlerts: RiskAlert[] = [
    { id: '1', stockName: '浦发银行', alertType: '高位震荡', message: '股价已连续3日在高位震荡，注意回调风险' },
    { id: '2', stockName: '平安银行', alertType: '成交量异常', message: '今日成交量较昨日放大50%，需关注资金动向' },
  ];
  
  // 功能入口卡片
  const featureCards: FeatureCard[] = [
    { id: '1', title: '筹码分布', type: 'implemented', score: 85, description: '实时监控股票筹码分布情况' },
    { id: '2', title: '舆情分析', type: 'implemented', score: 79, description: '分析市场舆情对股票的影响' },
    { id: '3', title: '技术指标', type: 'pending', description: '多维度技术指标分析' },
    { id: '4', title: '资金流向', type: 'pending', description: '实时追踪资金流向' },
    { id: '5', title: '风险评估', type: 'pending', description: '智能风险评估系统' },
    { id: '6', title: '策略回测', type: 'pending', description: '量化策略回测工具' },
  ];
  
  // 市场指数数据状态 - 强制校准为指定基准
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([
    { name: '上证指数', value: '4085.50', change: '0.00%', percent: '0.00%', isPositive: true },
    { name: '深证成指', value: '10256.78', change: '-0.45%', percent: '-0.45%', isPositive: false },
    { name: '创业板指', value: '2018.34', change: '+2.10%', percent: '+2.10%', isPositive: true },
    { name: '科创50', value: '856.78', change: '+1.56%', percent: '+1.56%', isPositive: true },
  ]);
  
  // 智能阈值雷达图数据状态
  const [radarData, setRadarData] = useState<RadarData>({
    liquidity: 55,       // 流动性 - 触发流动性警报
    sellingPressure: 75, // 抛压 - 触发筹码危险
    sentiment: 85,       // 情绪 - 触发情绪危急
    volumePower: 60,     // 量能强度
    trendStrength: 65,   // 趋势强度
    chipConcentration: 50 // 筹码集中度
  });
  
  // 分时强度相关状态
  const [intradayAnalysisResult, setIntradayAnalysisResult] = useState<EnhancedIntradayAnalysisResult | null>(null);
  const [intradayHistory, setIntradayHistory] = useState<EnhancedIntradayAnalysisResult[]>([]);
  const strengthCalculatorRef = React.useRef<RealTimeIntradayStrengthCalculator | null>(null);
  
  // 获取游资预警数据
  const fetchAlertData = async () => {
    try {
      setUpdatingData(true);
      setLoadingAlerts(true);
      const response = await fetchHeatFlowAlertList({
        pageNum: 1,
        pageSize: 10,
        alertLevel: 'high' // 只显示高级别的预警
      });
      setAlertData(response?.data?.list || []);
    } catch (error) {
      console.error('Error fetching heat flow alerts:', error);
    } finally {
      setLoadingAlerts(false);
      // 添加一个延迟，让跑马灯效果能够显示
      setTimeout(() => {
        setUpdatingData(false);
      }, 2000);
    }
  };

  // 获取AI市场结论
  const fetchAIMarketConclusion = async () => {
    try {
      const prompt = "请用一句话概括当前A股市场的整体态势，重点关注主要指数表现和热点板块。";
      const aiResponse = await defaultAIClient.inferWithLLM({
        prompt,
        temperature: 0.1,
        maxTokens: 50
      });
      setAiMarketConclusion(aiResponse.content);
    } catch (error) {
      console.error('Error fetching AI market conclusion:', error);
    }
  };
  
  // 模拟雷达图数据更新函数 - 提高安全概率，减少误报
  const updateRadarData = () => {
    if (!isMounted) return;
    setRadarData(prevData => ({
      // 流动性：70%概率>60分（安全），30%概率<60分（警报）
      liquidity: Math.random() > 0.3 ? 60 + Math.random() * 40 : 20 + Math.random() * 40,
      // 抛压：70%概率<70分（安全），30%概率>70分（警报）
      sellingPressure: Math.random() > 0.3 ? 30 + Math.random() * 40 : 70 + Math.random() * 30,
      // 情绪：70%概率在30-80分之间（安全），30%概率在危险区域
      sentiment: Math.random() > 0.3 
        ? 30 + Math.random() * 50 
        : Math.random() > 0.5 ? 10 + Math.random() * 20 : 80 + Math.random() * 20,
      // 量能强度：70%概率>40分（安全），30%概率<40分（警报）
      volumePower: Math.random() > 0.3 ? 40 + Math.random() * 60 : 10 + Math.random() * 30,
      // 趋势强度：70%概率>40分（安全），30%概率<40分（警报）
      trendStrength: Math.random() > 0.3 ? 40 + Math.random() * 60 : 10 + Math.random() * 30,
      // 筹码集中度：70%概率>30分（安全），30%概率<30分（警报）
      chipConcentration: Math.random() > 0.3 ? 30 + Math.random() * 70 : 10 + Math.random() * 20
    }));
    setLoadingMarketData(false);
  };
  
  // 模拟市场指数更新函数
  const updateMarketIndices = () => {
    if (!isMounted) return;
    setMarketIndices(prevIndices => {
      // 创建新的指数数组
      return prevIndices.map((index, idx) => {
        // 只更新上证指数（第一个索引）
        if (idx === 0) {
          // 强制校准基准价格：4085.50点
          const basePrice = 4085.50;
          // 波动范围：±1.5%
          const maxChange = basePrice * 0.015;
          // 随机波动
          const randomChange = (Math.random() - 0.5) * maxChange * 2;
          // 计算新价格
          const newPrice = basePrice + randomChange;
          // 使用数字格式化工具格式化价格，保留两位小数
          const formattedPrice = formatNumberToFixed2(newPrice);
          // 计算涨跌幅
          const changePercent = randomChange / basePrice * 100;
          // 使用数字格式化工具格式化百分比
          const formattedChange = formatPercentToFixed2(changePercent);
          // 判断涨跌
          const isPositive = randomChange >= 0;
          // 返回新的上证指数数据
          return {
            ...index,
            value: formattedPrice,
            change: formattedChange,
            isPositive
          };
        }
        // 其他指数保持不变
        return index;
      });
    });
    setLoadingMarketData(false);
  };
  
  // 计算分时强度
  const calculateIntradayStrength = () => {
    if (!isMounted || !strengthCalculatorRef.current) {
      // 初始化强度计算器
      if (isMounted) {
        strengthCalculatorRef.current = new RealTimeIntradayStrengthCalculator(10, true, true);
      }
      return;
    }
    
    const calculator = strengthCalculatorRef.current;
    // 模拟生成实时数据点（在实际应用中，这应该从API获取）
    const mockDataPoint = {
      timestamp: Date.now(),
      high: 100 + Math.random() * 10,
      low: 100 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: Math.random() * 1000000
    };
    
    // 添加数据点
    calculator.addPriceData(mockDataPoint);
    
    // 获取分析结果
    const results = calculator.getStrengthHistory();
    
    if (results.length > 0) {
      setIntradayAnalysisResult(results[results.length - 1]);
      setIntradayHistory(results.slice(-30)); // 保留最近30个数据点
      setLoadingIntradayData(false);
    }
  };
  
  // 组件加载时获取数据并设置定时刷新
  useEffect(() => {
    // 初始加载数据
    fetchAlertData();
    fetchAIMarketConclusion(); // 初始获取AI市场结论
    
    // 只有在客户端挂载后才执行随机计算
    if (isMounted) {
      updateRadarData();
      updateMarketIndices();
      calculateIntradayStrength();
      
      // 使用requestAnimationFrame优化数据更新
      let lastUpdateTime = Date.now();
      let lastAiUpdateTime = Date.now(); // AI市场结论更新时间
      let animationFrameId: number;
      
      const updateData = () => {
        const now = Date.now();
        // 控制刷新频率为15秒
        if (now - lastUpdateTime >= 15000) {
          // 异步执行数据更新，避免阻塞UI线程
          Promise.all([
            fetchAlertData(),
            Promise.resolve().then(updateRadarData),
            Promise.resolve().then(updateMarketIndices),
            Promise.resolve().then(calculateIntradayStrength)
          ]);
          lastUpdateTime = now;
        }
        
        // AI市场结论每30秒更新一次
        if (now - lastAiUpdateTime >= 30000) {
          fetchAIMarketConclusion();
          lastAiUpdateTime = now;
        }
        
        // 继续请求下一帧
        animationFrameId = requestAnimationFrame(updateData);
      };
      
      // 启动动画循环
      animationFrameId = requestAnimationFrame(updateData);
      
      // 组件卸载时清除动画帧
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [currentTicker, isMounted]);

  return (
    <div className="h-screen overflow-auto flex flex-col bg-[#F5F7FA] text-gray-800 font-sans">
      {/* 页面标题 */}
      <div className="bg-white shadow-sm p-4 mb-4">
        <h1 className="text-2xl font-bold">AI-RadarX Dashboard (F1)</h1>
      </div>

      {/* 上半部分：AI看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* 左侧：AI核心结论 + 市场情绪指数 + 热门赛道TOP5 */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI市场结论 */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-lg font-semibold mb-2 text-[#00CCFF]">AI市场结论</h2>
          <p className="text-gray-700 leading-relaxed">{aiMarketConclusion}</p>
        </div>

          {/* 市场情绪指数 + 热门赛道TOP5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 市场情绪指数 */}
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-lg font-semibold mb-3 text-blue-600">市场情绪指数</h2>
              {loadingMarketData ? (
                // 市场情绪指数骨架屏
                <div className="flex flex-col items-center">
                  <div className="w-full bg-gray-200 rounded-full h-6 mb-2 animate-pulse"></div>
                  <div className="w-20 h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-6 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${marketSentimentIndex}%` }}
                    ></div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-gray-800">{marketSentimentIndex}</div>
                  <div className="text-sm text-gray-500">{marketSentimentIndex > 70 ? '乐观' : marketSentimentIndex > 40 ? '中性' : '悲观'}</div>
                </div>
              )}
            </div>

            {/* 热门赛道TOP5 */}
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-lg font-semibold mb-3 text-blue-600">热门赛道 TOP5</h2>
              {loadingMarketData ? (
                // 热门赛道骨架屏
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-8"></div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-12"></div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-1 font-semibold">赛道</th>
                        <th className="text-center py-2 px-1 font-semibold">评分</th>
                        <th className="text-center py-2 px-1 font-semibold">涨跌幅</th>
                        <th className="text-right py-2 px-1 font-semibold">龙头股</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotTracks.map((track, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-1 font-medium">{track.name}</td>
                          <td className="py-2 px-1 text-center font-mono tabular-nums">{track.score}</td>
                          <td className={`py-2 px-1 text-center font-mono tabular-nums ${track.change >= 0 ? 'text-[#00FF94]' : 'text-[#FF0066]'}`}>
                            {track.change >= 0 ? '+' : ''}{track.change}%
                          </td>
                          <td className="py-2 px-1 text-right text-gray-600">{track.stocks.join('、')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：我的关注股列表 + 实时风险提示 */}
        <div className="space-y-4">
          {/* 我的关注股列表 */}
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
            <h2 className="text-lg font-semibold mb-3 text-blue-600">我的关注股</h2>
            {loadingMarketData ? (
              // 关注股列表骨架屏
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2">
                    <div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-16 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {watchStocks.map((stock, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{stock.name}</div>
                      <div className="text-xs text-gray-500">{stock.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold">{stock.price}</div>
                      <div className={`text-xs font-mono tabular-nums ${stock.isPositive ? 'text-[#00FF94]' : 'text-[#FF0066]'}`}>
                        {stock.change} ({stock.percent})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 实时风险提示 */}
          <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
            <h2 className="text-lg font-semibold mb-3 text-blue-600">实时风险提示</h2>
            {loadingMarketData ? (
              // 风险提示骨架屏
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="flex items-start p-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse mr-3 mt-1"></div>
                    <div>
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-40 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {riskAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start p-2 rounded bg-red-50 border-l-4 border-red-400">
                    <div className="mr-3 mt-1 text-red-500 animate-pulse">⚠️</div>
                    <div>
                      <div className="font-medium">{alert.stockName} - {alert.alertType}</div>
                      <div className="text-sm text-gray-600">{alert.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 中间部分：功能入口卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {featureCards.map((card, index) => (
          <div 
            key={card.id} 
            className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${card.type === 'pending' ? 'opacity-70' : ''}`}
          >
            {card.type === 'implemented' ? (
              <div className="relative overflow-hidden rounded-md mb-3 h-32 bg-gradient-to-r from-blue-50 to-indigo-50">
                {/* 模拟ECharts缩略图背景 */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-full flex items-end justify-between">
                    <div className="w-1/5 h-3/4 bg-blue-400 rounded-t"></div>
                    <div className="w-1/5 h-1/2 bg-blue-500 rounded-t"></div>
                    <div className="w-1/5 h-2/3 bg-blue-600 rounded-t"></div>
                    <div className="w-1/5 h-1/3 bg-blue-700 rounded-t"></div>
                    <div className="w-1/5 h-4/5 bg-blue-800 rounded-t"></div>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-md">
                  <span className="text-2xl font-bold font-mono text-blue-600">{card.score}</span>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-md mb-3 h-32 bg-gray-100 flex items-center justify-center">
                {/* 占位图标 */}
                <div className="text-4xl text-gray-400">🔄</div>
                {/* 即将上线水印 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="text-4xl font-bold text-gray-400 transform -rotate-12">即将上线</div>
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold mb-1">{card.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{card.description}</p>
            {card.type === 'implemented' && (
              <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                查看详情
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto bg-white shadow-inner p-4 text-center text-sm text-gray-500">
        <p>AI-RadarX © 2024 | 实时数据更新中...</p>
      </div>
    </div>
  );
};

export default Dashboard;