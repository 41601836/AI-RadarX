'use client';

// Dashboard 组件
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import WADChipDistribution from '../WADChipDistribution';
import { useStockContext } from '../../lib/context/StockContext';
import { formatNumberToFixed2, formatPercentToFixed2 } from '../../lib/utils/numberFormatter';
import MarketSentimentDashboard from '../MarketSentimentDashboard';

// 使用动态导入解决水合错误
const HeatFlowMonitor = dynamic(() => import('../HeatFlowMonitor'), {
  loading: () => <div className="panel loading"><div className="loading-spinner"></div><p>加载中...</p></div>,
  ssr: false
});

const PublicOpinionList = dynamic(() => import('../PublicOpinionList'), {
  loading: () => <div className="panel loading"><div className="loading-spinner"></div><p>加载中...</p></div>,
  ssr: false
});

// 市场指数类型定义
interface MarketIndex {
  name: string;
  value: string;
  change: string;
  percent: string;
  isPositive: boolean;
}

const Dashboard: React.FC = () => {
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  
  // 市场指数数据状态 - 强制校准为指定基准
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([
    {
      name: '上证指数', value: '4085.50', change: '0.00%', percent: '0.00%', isPositive: true
    },
    {
      name: '深证成指', value: '10256.78', change: '-0.45%', percent: '-0.45%', isPositive: false
    },
    {
      name: '创业板指', value: '2018.34', change: '+2.10%', percent: '+2.10%', isPositive: true
    },
    {
      name: '科创50', value: '856.78', change: '+1.56%', percent: '+1.56%', isPositive: true
    },
  ]);
  
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
  
  // 组件加载时获取数据并设置定时刷新
  useEffect(() => {
    // 初始加载数据
    updateMarketIndices();
    
    // 使用requestAnimationFrame优化数据更新
    let lastUpdateTime = Date.now();
    let animationFrameId: number;
    
    const updateData = () => {
      const now = Date.now();
      // 控制刷新频率为15秒
      if (now - lastUpdateTime >= 15000) {
        // 异步执行数据更新，避免阻塞UI线程
        Promise.all([
          Promise.resolve().then(updateMarketIndices)
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
      {/* 三行CSS Grid布局 */}
      <div className="dashboard-grid">
        {/* Top Row: Market Sentiment & Indices */}
        <div className="dashboard-top-row">
          {/* 市场情绪看板 */}
          <div className="panel market-sentiment">
            <MarketSentimentDashboard />
          </div>
          
          {/* 市场指数 */}
          <div className="panel market-indices">
            <h2>市场指数</h2>
            <div className="market-stats flex justify-between gap-4">
              {marketIndices.slice(0, 3).map((index, idx) => (
                <div key={idx} className="stat-card bg-gray-900 border border-gray-800 rounded-md p-4">
                  <span className="stat-label">{index.name}</span>
                  <span className="stat-value">{parseFloat(index.value).toFixed(2)}</span>
                  <span className={`stat-change ${index.isPositive ? 'positive' : 'negative'}`}>
                    {index.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Middle Row: Chip Distribution (Left) & Real-time Signal / Hot Money List (Right) */}
        <div className="dashboard-middle-row">
          {/* 左侧：筹码火焰图 */}
          <div className="panel chip-distribution">
            <h2>筹码分布监控</h2>
            <WADChipDistribution 
              symbol={currentTicker?.ts_code || "SH600000"} 
            />
          </div>
          
          {/* 右侧：实时信号/热钱列表 */}
          <div className="panel real-time-signal">
            <h2>热钱流向监控</h2>
            <HeatFlowMonitor 
              initialAlertLevel="high"
            />
          </div>
        </div>
        
        {/* Bottom Row: Quick Order / News */}
        <div className="dashboard-bottom-row">
          {/* 左侧：快速订单 */}
          <div className="panel quick-order">
            <h2>快速订单</h2>
            <div className="order-content">
              <p>快速订单功能正在开发中...</p>
            </div>
          </div>
          
          {/* 右侧：新闻 */}
          <div className="panel news-section">
            <h2>新闻资讯</h2>
            <PublicOpinionList 
              symbol={currentTicker?.ts_code || "SH600000"}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Dashboard 基础样式 */
        .dashboard {
          height: 100vh;
          overflow: hidden;
          background: #000;
          color: #ffffff;
          position: relative;
        }

        /* 三行CSS Grid布局 */
        .dashboard-grid {
          display: grid;
          grid-template-rows: auto 1fr auto;
          height: 100vh;
          gap: 16px;
          padding: 16px;
        }

        /* 面板基础样式 */
        .panel {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(22, 163, 74, 0.3);
          border-radius: 12px;
          padding: 16px;
          overflow: auto;
          display: flex;
          flex-direction: column;
        }
        
        /* 面板标题样式 */
        .panel h2, .panel h3 {
          color: #FFD700;
        }

        /* Top Row: Market Sentiment & Indices */
        .dashboard-top-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .market-sentiment {
          grid-column: span 2;
        }

        .market-indices {
          grid-column: span 2;
        }

        /* 市场指数样式 */
        .market-stats {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .stat-card {
          flex: 1;
          text-align: center;
          padding: 12px;
          background: rgba(51, 51, 51, 0.5);
          border-radius: 8px;
        }

        .stat-label {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .stat-change {
          display: block;
          font-size: 16px;
        }

        .positive {
          color: #00FF00;
        }

        .negative {
          color: #FF0000;
        }

        /* Middle Row: Chip Distribution & Real-time Signal */
        .dashboard-middle-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          flex: 1;
        }

        .chip-distribution {
          grid-column: span 1;
        }

        .real-time-signal {
          grid-column: span 1;
        }

        /* Bottom Row: Quick Order / News */
        .dashboard-bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .quick-order {
          grid-column: span 1;
        }

        .news-section {
          grid-column: span 1;
        }

        .order-content {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
        }

        /* 加载状态样式 */
        .loading {
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 4px solid #FFD700;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;