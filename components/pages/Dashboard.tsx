'use client';

// Dashboard 组件
import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import WADChipDistribution from '../WADChipDistribution';
import SearchComponent from '../SearchComponent';
import ErrorBoundary from '../ErrorBoundary';
import DataHealth from '../DataHealth';
import IntelligenceBrief from '../IntelligenceBrief';
import ARadarPanel from '../ARadarPanel';
import SmartThresholdRadar from '../SmartThresholdRadar';
import PublicOpinionList from '../PublicOpinionList';
import RiskAssessment from '../RiskAssessment';
import TechIndicatorPanel from '../TechIndicatorPanel';
import MarketSentimentDashboard from '../MarketSentimentDashboard';
import HeatFlowMonitor from '../HeatFlowMonitor';
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

// 简单的Skeleton组件
const Skeleton = () => (
  <div className="skeleton">
    <style jsx>{`
      .skeleton {
        background: #1e293b;
        border-radius: 4px;
        height: 200px;
        width: 100%;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
    `}</style>
  </div>
);

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

const Dashboard: React.FC = () => {
  const [alertData, setAlertData] = useState<HeatFlowAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [updatingData, setUpdatingData] = useState(false);
  
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  
  // 市场指数数据状态 - 强制校准为指定基准
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([
    { name: '上证指数', value: '4085.50', change: '0.00%', percent: '0.00%', isPositive: true },
    { name: '深证成指', value: '10256.78', change: '-0.45%', percent: '-0.45%', isPositive: false },
    { name: '创业板指', value: '2018.34', change: '+2.10%', percent: '+2.10%', isPositive: true },
    { name: '科创50', value: '856.78', change: '+1.56%', percent: '+1.56%', isPositive: true },
  ]);
  
  // 持仓股票数据状态
  const [portfolioStocks, setPortfolioStocks] = useState<PositionStock[]>([
    { name: '浦发银行', code: 'SH600000', price: '8.50', change: '+0.50', percent: '+6.17%', volume: '10,000股', isPositive: true },
    { name: '平安银行', code: 'SZ000001', price: '10.25', change: '-0.15', percent: '-1.44%', volume: '5,000股', isPositive: false },
    { name: '招商银行', code: 'SH600036', price: '32.80', change: '+0.80', percent: '+2.50%', volume: '2,000股', isPositive: true },
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
  
  // 模拟雷达图数据更新函数 - 提高安全概率，减少误报
  const updateRadarData = () => {
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
  };
  
  // 模拟市场指数更新函数
  const updateMarketIndices = () => {
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
  };
  
  // 计算分时强度
  const calculateIntradayStrength = () => {
    if (!strengthCalculatorRef.current) {
      // 初始化强度计算器
      strengthCalculatorRef.current = new RealTimeIntradayStrengthCalculator(10, true, true);
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
    }
  };
  
  // 组件加载时获取数据并设置定时刷新
  useEffect(() => {
    // 初始加载数据
    fetchAlertData();
    updateRadarData();
    updateMarketIndices();
    calculateIntradayStrength();
    
    // 使用requestAnimationFrame优化数据更新
    let lastUpdateTime = Date.now();
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
      // 继续请求下一帧
      animationFrameId = requestAnimationFrame(updateData);
    };
    
    // 启动动画循环
    animationFrameId = requestAnimationFrame(updateData);
    
    // 组件卸载时清除动画帧
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentTicker]);

  return (
    <div className="dashboard">
      {/* 市场情绪看板作为主要内容 */}
      <div className="market-sentiment-section">
        <MarketSentimentDashboard />
      </div>
      
      {/* 四栏布局：左侧市场状态、中间主内容、右侧雷达面板、最右侧情报简报 */}
      <div className="dashboard-main four-column-layout">
        {/* 左侧F1: MARKET_STATUS面板 */}
        <aside className="dashboard-market-status">
          <MarketScanner />
        </aside>

        {/* 左侧主内容 */}
        <main className="dashboard-content">
          <div className="content-grid">
            {/* 左上角：市场概览 */}
            <div className="panel market-overview">
              <h2>市场概览</h2>
              <div className="market-stats">
                {marketIndices.map((index, idx) => (
                  <div key={idx} className="stat-card">
                    <span className="stat-label">{index.name}</span>
                    <span className="stat-value">{parseFloat(index.value).toFixed(2)}</span>
                    <span className={`stat-change ${index.isPositive ? 'positive' : 'negative'}`}>
                      {index.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右上角：我的持仓 */}
            <div className="panel portfolio">
              <h2>我的持仓</h2>
              <div className="portfolio-info">
                <div className="portfolio-stat">
                  <span className="stat-label">总市值</span>
                  <span className="stat-value">1,000,000.00</span>
                </div>
                <div className="portfolio-stat">
                  <span className="stat-label">可用资金</span>
                  <span className="stat-value">500,000.00</span>
                </div>
                <div className="portfolio-stocks">
                  {portfolioStocks.map((stock, idx) => (
                    <div key={idx} className="position-item">
                      <span className="position-name">{stock.name}</span>
                      <span className="position-code">{stock.code}</span>
                      <span className="position-price">{stock.price}</span>
                      <span className={`position-change ${stock.isPositive ? 'positive' : 'negative'}`}>
                        {stock.change} ({stock.percent})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 左下角：筹码分布监控 */}
            <div className="panel wad-chip-monitor">
              <h2>筹码分布监控</h2>
              <WADChipDistribution 
                symbol={currentTicker?.ts_code || "SH600000"} 
              />
            </div>

            {/* 右下角：分时强度分析 */}
            <div className="panel intraday-strength">
              <h2>分时强度分析</h2>
              {intradayAnalysisResult ? (
                <div className="intraday-analysis">
                  <div className="analysis-header">
                    <span className="analysis-title">实时强度:</span>
                    <span className="analysis-value">{intradayAnalysisResult.intradayStrength.strength.toFixed(2)}</span>
                  </div>
                  <div className="analysis-details">
                    <div className="detail-item">
                      <span className="detail-label">WAD:</span>
                      <span className="detail-value">{intradayAnalysisResult.intradayStrength.wadFactor?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">大单因子:</span>
                      <span className="detail-value">{intradayAnalysisResult.absorptionStrength.largeOrderFactor?.toFixed(2) || '1.00'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">价格动量:</span>
                      <span className="detail-value">{intradayAnalysisResult.intradayStrength.priceFactor.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="loading-message">加载中...</div>
              )}
            </div>

            {/* 热钱流向监控 */}
            <div className="panel heat-flow-monitor">
              <h2>热钱流向监控</h2>
              <HeatFlowMonitor 
                initialAlertLevel="high"
              />
            </div>
            
            {/* 舆情监控 */}
            <div className="panel public-opinion-monitor">
              <h2>舆情监控</h2>
              <PublicOpinionList 
                symbol={currentTicker?.ts_code || "SH600000"}
              />
            </div>
            
            {/* 风险评估 */}
            <div className="panel risk-assessment">
              <h2>账户风险评估</h2>
              <RiskAssessment />
            </div>
            
            {/* 技术指标 */}
            <div className="panel tech-indicator">
              <h2>技术指标分析</h2>
              <TechIndicatorPanel 
                symbol={currentTicker?.ts_code || "SH600000"}
              />
            </div>
          </div>
        </main>

        {/* 右侧雷达面板 */}
        <div className="dashboard-radar-panel">
          <ARadarPanel />
          <SmartThresholdRadar 
            stockCode={currentTicker?.ts_code || "SH600000"}
            marketData={{ volumeRatio: Math.random() * 1.5 }} 
            largeOrderData={{ sellPressure: Math.random() }} 
            publicOpinion={{ sentimentScore: Math.random() * 100 }} 
          />
        </div>

        {/* 最右侧AI选股情报简报侧边栏 */}
        <aside className="dashboard-sidebar">
          <IntelligenceBrief 
            alertStatus={{ 
              isAlert: radarData.liquidity < 60 || radarData.sellingPressure > 70, 
              alertType: radarData.liquidity < 60 ? 'ABNORMAL_VOLUME' : 'SUDDEN_DUMP'
            }} 
          />
        </aside>
      </div>

      <style jsx>{`
        /* Dashboard 基础样式 */
        .dashboard {
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #000;
          color: #ffffff;
          position: relative;
        }

        /* 主容器 */
        .dashboard-main {
          display: grid;
          grid-template-columns: 1.5fr 2.5fr 5fr 3fr;
          grid-template-rows: 1fr;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        /* 左侧市场状态面板 */
        .market-sentiment-section {
        height: 400px;
        border-bottom: 1px solid #333;
      }

      .dashboard-market-status {
        border-right: 1px solid #333;
        padding: 16px;
        overflow-y: auto;
        background: #000;
        height: calc(100vh - 400px);
        position: relative;
      }

        /* 左侧主内容 */
        .dashboard-content {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 16px;
          height: calc(100vh - 400px);
          position: relative;
        }

        /* 内容网格布局 */
        .content-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 16px;
          height: 100%;
          overflow: hidden;
        }

        /* 面板基础样式 */
        .panel {
          background: #000;
          border: 1px solid #333;
          padding: 16px;
          overflow: auto;
          display: flex;
          flex-direction: column;
        }
        
        /* 面板标题样式 */
        .panel h2, .panel h3 {
          color: #FFD700;
        }

        /* 特定面板样式 */
        .market-overview, .portfolio {
          grid-row: span 1;
        }

        .wad-chip-monitor, .intraday-strength {
          grid-row: span 1;
        }

        .heat-flow-monitor {
          grid-row: span 1;
          grid-column: span 2;
        }
        
        .public-opinion-monitor {
          grid-row: span 1;
          grid-column: span 2;
        }
        
        .risk-assessment {
          grid-row: span 1;
          grid-column: span 2;
        }
        
        .tech-indicator {
          grid-row: span 1;
          grid-column: span 2;
        }

        /* 右侧雷达面板 */
        .dashboard-radar-panel {
          border-left: 1px solid #333;
          padding: 16px;
          overflow-y: auto;
          background: #000;
          height: calc(100vh - 400px);
          position: relative;
        }

        /* 最右侧情报流 */
        .dashboard-sidebar {
          border-left: 1px solid #333;
          padding: 16px;
          overflow-y: auto;
          background: #000;
          height: calc(100vh - 400px);
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;