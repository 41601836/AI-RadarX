'use client';

// Dashboard 组件
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import WADChipDistribution from '../WADChipDistribution';
import SearchComponent from '../SearchComponent';
import ErrorBoundary from '../ErrorBoundary';
import DataHealth from '../DataHealth';
import IntelligenceBrief from '../IntelligenceBrief';
import ARadarPanel from '../ARadarPanel';
import MarketPulse from '../MarketPulse';
import { fetchHeatFlowAlertList, HeatFlowAlertItem } from '../../lib/api/heatFlow/alert';
import { StockBasicInfo } from '../../lib/api/market';
import { useStockContext } from '../../lib/context/StockContext';
// 导入分时强度算法
import { 
  calculateEnhancedIntradayAnalysis, 
  EnhancedIntradayAnalysisResult,
  RealTimeIntradayStrengthCalculator
} from '../../lib/algorithms/intradayStrength';
import { OrderItem } from '../../lib/algorithms/largeOrder';

// 动态导入组件
const StrategyPerformance = dynamic(() => import('../StrategyPerformance'), {
  loading: () => <Skeleton />,
  ssr: false
});

// 导入智能雷达图组件
import SmartThresholdRadar from '../SmartThresholdRadar';

// RadarData 类型定义
interface RadarData {
  liquidity: number;
  sellingPressure: number;
  sentiment: number;
  volumePower: number;
  trendStrength: number;
  chipConcentration: number;
}

// Skeleton 占位图组件
const Skeleton: React.FC = () => {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg h-full w-full flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );
};

// 市场指数类型定义
interface MarketIndex {
  name: string;
  value: string;
  change: string;
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
    { name: '上证指数', value: '4,085.50', change: '0.00%', isPositive: true },
    { name: '深证成指', value: '10,256.78', change: '-0.45%', isPositive: false },
    { name: '创业板指', value: '2,018.34', change: '+2.10%', isPositive: true },
    { name: '科创50', value: '856.78', change: '+1.56%', isPositive: true },
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
  
  // 生成模拟价格数据
  const generateMockPriceData = () => {
    const priceData = [];
    const now = Date.now();
    const basePrice = 100 + Math.random() * 20;
    
    for (let i = 0; i < 100; i++) {
      const timestamp = now - (100 - i) * 60000; // 每分钟一个数据点
      const priceChange = (Math.random() - 0.5) * 2;
      const price = basePrice + priceChange * i;
      const volume = 100000 + Math.random() * 1000000;
      
      priceData.push({
        timestamp,
        high: price + Math.random() * 0.5,
        low: price - Math.random() * 0.5,
        close: price,
        volume: Math.round(volume)
      });
    }
    
    return priceData;
  };
  
  // 生成模拟订单数据
  const generateMockOrderData = () => {
    const orderData: OrderItem[] = [];
    const now = Date.now();
    const basePrice = 100 + Math.random() * 20;
    
    for (let i = 0; i < 500; i++) {
      const timestamp = new Date(now - (500 - i) * 1000).toISOString(); // 每秒一个订单
      const price = basePrice + (Math.random() - 0.5) * 2;
      const volume = 100 + Math.random() * 10000;
      const direction = Math.random() > 0.5 ? 'buy' : 'sell';
      
      orderData.push({
        tradeTime: timestamp,
        tradePrice: price,
        tradeVolume: Math.round(volume),
        tradeAmount: Math.round(price * volume * 100), // 单位：分
        tradeDirection: direction
      });
    }
    
    return orderData;
  };
  
  // 计算分时强度
  const calculateIntradayStrength = () => {
    const priceData = generateMockPriceData();
    const orderData = generateMockOrderData();
    
    const results = calculateEnhancedIntradayAnalysis({
      priceData,
      orderData,
      strengthWindow: 5,
      absorptionWindow: 10,
      useWAD: true,
      useLargeOrders: true
    });
    
    if (results.length > 0) {
      setIntradayAnalysisResult(results[results.length - 1]);
      setIntradayHistory(results.slice(-30)); // 保留最近30个数据点
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
          // 格式化价格，保留两位小数
          const formattedPrice = newPrice.toFixed(2);
          // 计算涨跌幅
          const changePercent = (randomChange / basePrice * 100).toFixed(2);
          // 判断涨跌
          const isPositive = randomChange >= 0;
          // 格式化涨跌幅字符串
          const formattedChange = `${isPositive ? '+' : ''}${changePercent}%`;
          // 返回新的上证指数数据
          return {
            ...index,
            value: formattedPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ','), // 添加千位分隔符
            change: formattedChange,
            isPositive
          };
        }
        // 其他指数保持不变
        return index;
      });
    });
  };

  useEffect(() => {
    fetchAlertData();
    updateRadarData();  // 初始加载时更新雷达图数据
    updateMarketIndices(); // 初始加载时更新市场指数
    calculateIntradayStrength(); // 初始加载时计算分时强度
    
    // 设置定时刷新（每15秒）
    const interval = setInterval(() => {
      fetchAlertData();
      updateRadarData();  // 同时更新雷达图数据
      updateMarketIndices(); // 同时更新市场指数
      calculateIntradayStrength(); // 同时计算分时强度
    }, 15000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      {/* 四栏布局：左侧市场状态、中间主内容、右侧雷达面板、最右侧情报简报 */}
      <div className="dashboard-main four-column-layout">
        <style jsx>{`
          /* 跑马灯样式 */
          .updating-marquee {
            overflow: hidden;
            background-color: rgba(255, 153, 0, 0.1);
            border: 1px solid #ff9900;
            border-radius: 4px;
            margin-bottom: 12px;
            padding: 8px 0;
            white-space: nowrap;
            position: relative;
          }

          .marquee-content {
            display: inline-block;
            animation: marquee 10s linear infinite;
          }

          .marquee-text {
            display: inline-block;
            padding: 0 40px;
            color: #ff9900;
            font-weight: bold;
            font-size: 14px;
          }

          @keyframes marquee {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `}</style>
        {/* 左侧F1: MARKET_STATUS面板 */}
        <aside className="dashboard-market-status">
          <MarketPulse />
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
                    <span className="stat-value">{index.value}</span>
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
              <div className="portfolio-list">
                {portfolioStocks?.map((stock, idx) => (
                  <div key={idx} className="position-item">
                    <span className="stock-name">{stock.name}</span>
                    <span className="stock-code">{stock.code}</span>
                    <span className="stock-price">{stock.price}</span>
                    <span className={`stock-change ${stock.isPositive ? 'positive' : 'negative'}`}>
                      {stock.change}
                    </span>
                    <span className={`stock-percent ${stock.isPositive ? 'positive' : 'negative'}`}>
                      {stock.percent}
                    </span>
                    <span className="stock-volume">{stock.volume}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 左下角：WAD筹码分布监控 */}
            <div className="panel wad-chip-monitor">
              <ErrorBoundary moduleName="WAD筹码分布监控">
                <WADChipDistribution symbol={currentTicker?.ts_code || "SH600000"} />
              </ErrorBoundary>
            </div>
            
            {/* 右下角：分时强度分析 */}
            <div className="panel intraday-strength">
              <h2>分时强度分析</h2>
              {intradayAnalysisResult ? (
                <div className="intraday-strength-content">
                  <div className="strength-overview">
                    <div className="metric-card">
                      <span className="metric-label">分时强度</span>
                      <span className={`metric-value ${intradayAnalysisResult.intradayStrength.strength > 0 ? 'positive' : 'negative'}`}>
                        {intradayAnalysisResult.intradayStrength.strength.toFixed(2)}
                      </span>
                      <span className="metric-desc">
                        {intradayAnalysisResult.intradayStrength.strength > 0 ? '强势' : '弱势'}
                      </span>
                    </div>
                    
                    <div className="metric-card">
                      <span className="metric-label">承接力度</span>
                      <span className={`metric-value ${intradayAnalysisResult.absorptionStrength.strength > 0.5 ? 'positive' : 'neutral'}`}>
                        {intradayAnalysisResult.absorptionStrength.strength.toFixed(2)}
                      </span>
                      <span className="metric-desc">
                        {intradayAnalysisResult.absorptionStrength.absorptionLevel}
                      </span>
                    </div>
                    
                    <div className="metric-card">
                      <span className="metric-label">综合得分</span>
                      <span className={`metric-value ${intradayAnalysisResult.combinedScore > 50 ? 'positive' : 'negative'}`}>
                        {intradayAnalysisResult.combinedScore.toFixed(1)}
                      </span>
                      <span className="metric-desc">
                        {intradayAnalysisResult.signal}
                      </span>
                    </div>
                  </div>
                  
                  <div className="strength-details">
                    <h3>详细指标</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">成交量因子</span>
                        <span className="detail-value">{intradayAnalysisResult.intradayStrength.volumeFactor.toFixed(2)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">价格因子</span>
                        <span className={`detail-value ${intradayAnalysisResult.intradayStrength.priceFactor > 0 ? 'positive' : 'negative'}`}>
                          {intradayAnalysisResult.intradayStrength.priceFactor.toFixed(2)}
                        </span>
                      </div>
                      {intradayAnalysisResult.intradayStrength.wadFactor && (
                        <div className="detail-item">
                          <span className="detail-label">WAD因子</span>
                          <span className="detail-value">{intradayAnalysisResult.intradayStrength.wadFactor.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">价格稳定性</span>
                        <span className="detail-value">{intradayAnalysisResult.absorptionStrength.priceStability.toFixed(2)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">买卖盘比例</span>
                        <span className="detail-value">{intradayAnalysisResult.absorptionStrength.buySellRatio.toFixed(2)}</span>
                      </div>
                      {intradayAnalysisResult.absorptionStrength.largeOrderFactor && (
                        <div className="detail-item">
                          <span className="detail-label">特大单因子</span>
                          <span className="detail-value">{intradayAnalysisResult.absorptionStrength.largeOrderFactor.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="loading">加载分时强度数据中...</div>
              )}
            </div>

            {/* 底部：实时游资预警流 */}
            <div className="panel heat-flow-alerts">
              <h2>实时游资预警流</h2>
              
              {/* 数据更新中跑马灯效果 */}
              {updatingData && (
                <div className="updating-marquee">
                  <div className="marquee-content">
                    <span className="marquee-text">[数据更新中...]</span>
                    <span className="marquee-text">[数据更新中...]</span>
                    <span className="marquee-text">[数据更新中...]</span>
                  </div>
                </div>
              )}
              
              {loadingAlerts ? (
                <div className="loading">加载中...</div>
              ) : alertData?.length === 0 ? (
                <div className="no-data">暂无预警信息</div>
              ) : (
                <div className="alert-list">
                  {alertData?.map((alert) => (
                    <div key={alert.alertId} className={`alert-item alert-${alert.alertLevel}`}>
                      <div className="alert-header">
                        <span className="alert-stock">{alert.stockName} ({alert.stockCode})</span>
                        <span className="alert-level">
                          {alert.alertLevel === 'high' ? '⚠️ 高级' : alert.alertLevel === 'medium' ? '⚠️ 中级' : 'ℹ️ 低级'}
                        </span>
                      </div>
                      <div className="alert-content">
                        <span className="alert-type">{alert.alertType}</span>
                        <span className="alert-desc">{alert.alertDesc}</span>
                      </div>
                      <div className="alert-footer">
                        <span className="alert-time">{alert.alertTime}</span>
                        <div className="related-seats">
                          {alert.relatedSeats?.slice(0, 2).map((seat, index) => (
                            <span key={index} className="seat-tag">{seat}</span>
                          ))}
                          {alert.relatedSeats?.length > 2 && (
                            <span className="seat-more">+{alert.relatedSeats?.length - 2}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* 右侧雷达面板 */}
        <div className="dashboard-radar-panel">
          <ARadarPanel />
          <SmartThresholdRadar stockCode={currentTicker?.ts_code || "SH600000"} />
        </div>

        {/* 最右侧AI选股情报简报侧边栏 */}
        <aside className="dashboard-sidebar">
          <IntelligenceBrief 
            alertStatus={{ 
              isAlert: radarData.liquidity < 60 || radarData.sellingPressure > 70, // 示例条件：流动性不足或抛压过大
              alertType: radarData.liquidity < 60 ? 'ABNORMAL_VOLUME' : 'SUDDEN_DUMP'
            }} 
          />
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;