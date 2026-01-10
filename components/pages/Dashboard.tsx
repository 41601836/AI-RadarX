'use client';

// Dashboard 组件
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import WADChipDistribution from '../WADChipDistribution';
import SearchComponent from '../SearchComponent';
import ErrorBoundary from '../ErrorBoundary';
import DataHealth from '../DataHealth';
import IntelligenceBrief from '../IntelligenceBrief';
import { fetchHeatFlowAlertList, HeatFlowAlertItem } from '../../lib/api/heatFlow/alert';
import { StockBasicInfo } from '../../lib/api/market';
import { useStockContext } from '../../lib/context/StockContext';

// 动态导入组件
const SmartThresholdRadar = dynamic(() => import('../SmartThresholdRadar'), {
  loading: () => <Skeleton />,
  ssr: false
});

const StrategyPerformance = dynamic(() => import('../StrategyPerformance'), {
  loading: () => <Skeleton />,
  ssr: false
});

// RadarData 类型定义
interface RadarData {
  turnover: number;
  explosionRate: number;
  profitTaking: number;
  lhasaRatio: number;
  volumeRatio: number;
  amplitude: number;
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
  
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  
  // 市场指数数据状态
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([
    { name: '上证指数', value: '3,124.56', change: '+1.23%', isPositive: true },
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
    turnover: 6500,       // 成交额（亿）- 触发流动性警报
    explosionRate: 55,    // 炸板率（%）- 触发情绪危急
    profitTaking: 92,     // 获利盘（%）- 触发筹码危险
    lhasaRatio: 35,       // 拉萨天团占比（%）- 触发散户踩踏
    volumeRatio: 2.5,     // 量比
    amplitude: 12         // 振幅（%）
  });
  
  // 获取游资预警数据
  const fetchAlertData = async () => {
    try {
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
    }
  };

  // 模拟雷达图数据更新函数 - 提高安全概率，减少误报
  const updateRadarData = () => {
    setRadarData(prevData => ({
      // 成交额：70%概率>7000亿（安全），30%概率<7000亿（警报）
      turnover: Math.random() > 0.3 ? 7000 + Math.random() * 1500 : 5000 + Math.random() * 2000,
      // 炸板率：70%概率<50%（安全），30%概率>50%（警报）
      explosionRate: Math.random() > 0.3 ? 20 + Math.random() * 30 : 50 + Math.random() * 25,
      // 获利盘：70%概率在20-90%之间（安全），30%概率在危险区域
      profitTaking: Math.random() > 0.3 
        ? 20 + Math.random() * 70 
        : Math.random() > 0.5 ? 5 + Math.random() * 15 : 90 + Math.random() * 5,
      // 拉萨天团占比：70%概率<30%（安全），30%概率>30%（警报）
      lhasaRatio: Math.random() > 0.3 ? 10 + Math.random() * 20 : 30 + Math.random() * 15,
      // 量比：保持在0-5之间（安全）
      volumeRatio: Math.random() * 5,
      // 振幅：70%概率<15%（安全），30%概率>15%（警报）
      amplitude: Math.random() > 0.3 ? 5 + Math.random() * 10 : 15 + Math.random() * 10
    }));
  };

  useEffect(() => {
    fetchAlertData();
    updateRadarData();  // 初始加载时更新雷达图数据
    
    // 设置定时刷新（每15秒）
    const interval = setInterval(() => {
      fetchAlertData();
      updateRadarData();  // 同时更新雷达图数据
    }, 15000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      {/* 主要内容区域和侧边栏 */}
      <div className="dashboard-main">
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

            {/* 右下角：智能阈值雷达图 */}
            <div className="panel smart-radar">
              <h2>智能雷达图</h2>
              <ErrorBoundary moduleName="智能阈值雷达图">
                <SmartThresholdRadar data={radarData} />
              </ErrorBoundary>
            </div>

            {/* 底部：实时游资预警流 */}
            <div className="panel heat-flow-alerts">
              <h2>实时游资预警流</h2>
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

        {/* 右侧AI选股情报简报侧边栏 */}
        <aside className="dashboard-sidebar">
          <IntelligenceBrief />
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;