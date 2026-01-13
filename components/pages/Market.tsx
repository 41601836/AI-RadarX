'use client';

import React, { useState, useEffect } from 'react';
import { useStockContext } from '../../lib/context/StockContext';
import { useUserStore } from '../../lib/store/user-portfolio';
import RankingList, { RankingItem } from '../RankingList';

const Market: React.FC = () => {
  const [topGainers, setTopGainers] = useState<RankingItem[]>([]);
  const [topLosers, setTopLosers] = useState<RankingItem[]>([]);
  const [highTurnover, setHighTurnover] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 获取当前股票上下文
  const { setCurrentTicker } = useStockContext();
  // 获取用户状态管理
  const { setActiveTab, watchlist, addToWatchlist } = useUserStore();
  
  // 获取排行榜数据
  useEffect(() => {
    const fetchRankingData = async () => {
      setLoading(true);
      try {
        // 并行请求三个排行榜数据
        const [gainersRes, losersRes, turnoverRes] = await Promise.all([
          fetch('/api/v1/market/rank/top-gainers'),
          fetch('/api/v1/market/rank/top-losers'),
          fetch('/api/v1/market/rank/turnover')
        ]);
        
        // 解析响应数据
        const gainersData = await gainersRes.json();
        const losersData = await losersRes.json();
        const turnoverData = await turnoverRes.json();
        
        // 更新状态
        setTopGainers(gainersData.data || []);
        setTopLosers(losersData.data || []);
        setHighTurnover(turnoverData.data || []);
        
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankingData();
    
    // 每60秒刷新一次数据
    const interval = setInterval(fetchRankingData, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // 处理股票点击事件
  const handleStockClick = (stock: RankingItem) => {
    // 将股票添加到自选股
    addToWatchlist(stock.ts_code, stock.name);
    
    // 设置当前股票
    setCurrentTicker(stock);
    
    // 可选：切换到仪表盘页面
    // setActiveTab('dashboard');
    
    // 显示添加成功提示
    alert(`${stock.name}已添加到自选股！`);
  };

  return (
    <div className="market-page">
      <div className="market-header">
        <h1>市场行情</h1>
        <p>实时更新市场排行榜数据</p>
      </div>
      
      <div className="ranking-container">
        {loading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : (
          <>
            {/* 涨幅榜 */}
            <div className="ranking-item">
              <RankingList 
                title="涨幅榜" 
                icon="🚀" 
                data={topGainers} 
                onStockClick={handleStockClick} 
              />
            </div>
            
            {/* 跌幅榜 */}
            <div className="ranking-item">
              <RankingList 
                title="跌幅榜" 
                icon="📉" 
                data={topLosers} 
                onStockClick={handleStockClick} 
              />
            </div>
            
            {/* 成交额榜 */}
            <div className="ranking-item">
              <RankingList 
                title="巨量成交" 
                icon="💰" 
                data={highTurnover} 
                onStockClick={handleStockClick} 
              />
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .market-page {
          height: 100%;
          background: #11111b;
          color: #cdd6f4;
          overflow: hidden;
          padding: 16px;
        }

        .market-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #313244;
        }

        .market-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #FFD700;
        }

        .market-header p {
          margin: 4px 0 0 0;
          font-size: 14px;
          color: #94a3b8;
        }

        .ranking-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          height: calc(100% - 100px);
        }

        .ranking-item {
          height: 100%;
        }

        /* 加载指示器样式 */
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          grid-column: 1 / -1;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #313244;
          border-top: 3px solid #89dceb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 响应式布局 */
        @media (max-width: 1200px) {
          .ranking-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Market;