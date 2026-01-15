'use client';

import React, { useEffect, useState } from 'react';
import { usePolling } from '../lib/hooks/usePolling';
import { useStockContext } from '../lib/context/StockContext';
import { StockBasicInfo, fetchStockBasicList } from '../lib/api/market';
import Skeleton from './Skeleton';

// 定义股票评分接口
interface StockScore {
  stock: StockBasicInfo;
  score: number;
  dimensions: {
    liquidity: number;
    volumePower: number;
    priceStrength: number;
    sentiment: number;
    sellPressure: number;
    chipConcentration: number;
  };
  currentPrice?: number;
  changePercent?: number;
}

const MarketScanner: React.FC = () => {
  const [topStocks, setTopStocks] = useState<StockScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentTicker } = useStockContext();

  // 计算六维评分的函数
  const calculateSixDimensionScore = (stock: StockBasicInfo): StockScore['dimensions'] => {
    // 模拟六维评分计算，实际应基于真实API数据
    const dimensions = {
      liquidity: Math.random() * 100, // 流动性
      volumePower: Math.random() * 100, // 量能
      priceStrength: Math.random() * 100, // 价格强度
      sentiment: Math.random() * 100, // 情绪
      sellPressure: Math.random() * 100, // 抛压
      chipConcentration: Math.random() * 100 // 筹码集中度
    };
    return dimensions;
  };

  // 计算综合评分
  const calculateTotalScore = (dimensions: StockScore['dimensions']): number => {
    // 等权重计算综合评分
    const scores = Object.values(dimensions);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  // 寻找Top Alpha股票的函数
  const findTopAlpha = async () => {
    try {
      setLoading(true);
      // 从Tushare获取股票基本信息
      const response = await fetchStockBasicList();
      
      if (response?.code === 200 && response?.data?.list) {
        // 计算每只股票的六维评分
        const stocksWithScores: StockScore[] = response.data.list.map((stock: StockBasicInfo) => {
          const dimensions = calculateSixDimensionScore(stock);
          const score = calculateTotalScore(dimensions);
          
          // 模拟当前价格和涨幅
          const currentPrice = 10 + Math.random() * 90;
          const changePercent = (Math.random() - 0.5) * 20;
          
          return {
            stock,
            score,
            dimensions,
            currentPrice,
            changePercent
          };
        });
        
        // 按评分降序排序，取前5只
        const top5 = stocksWithScores
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        setTopStocks(top5);
      }
    } catch (error) {
      console.error('获取股票数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 雷达缩略图组件
  const RadarThumbnail: React.FC<{ dimensions: StockScore['dimensions'] }> = ({ dimensions }) => {
    const values = Object.values(dimensions);
    const points = values.map((value, index) => {
      const angle = (index / values.length) * 2 * Math.PI;
      const radius = (value / 100) * 40;
      const x = 50 + radius * Math.cos(angle - Math.PI / 2);
      const y = 50 + radius * Math.sin(angle - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100" height="100" viewBox="0 0 100 100" className="radar-thumbnail">
        {/* 雷达图背景网格 */}
        <circle cx="50" cy="50" r="30" fill="none" stroke="#333" strokeWidth="1" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="#333" strokeWidth="1" />
        <circle cx="50" cy="50" r="10" fill="none" stroke="#333" strokeWidth="1" />
        
        {/* 雷达图轴线 */}
        {values.map((_, index) => {
          const angle = (index / values.length) * 2 * Math.PI;
          const x = 50 + 50 * Math.cos(angle - Math.PI / 2);
          const y = 50 + 50 * Math.sin(angle - Math.PI / 2);
          return (
            <line
              key={index}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="#555"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* 雷达图数据多边形 */}
        <polygon
          points={points}
          fill="rgba(243, 139, 168, 0.3)"
          stroke="#f38ba8"
          strokeWidth="2"
        />
        
        {/* 雷达图数据点 */}
        {values.map((value, index) => {
          const angle = (index / values.length) * 2 * Math.PI;
          const radius = (value / 100) * 40;
          const x = 50 + radius * Math.cos(angle - Math.PI / 2);
          const y = 50 + radius * Math.sin(angle - Math.PI / 2);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="#ffffff"
              stroke="#f38ba8"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    );
  };

  // 点击股票时切换全站数据
  const handleStockClick = (stock: StockBasicInfo) => {
    setCurrentTicker(stock);
  };

  // 组件加载时获取Top Alpha股票
  useEffect(() => {
    findTopAlpha();
  }, []);
  
  // 使用usePolling钩子替代requestAnimationFrame，实现休眠模式
  usePolling(findTopAlpha, {
    interval: 30000, // 每30秒更新一次数据
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: false // 不立即执行，依赖上面的初始加载
  });

  return (
    <div className="market-scanner">
      <div className="scanner-header">
        <h3>F1: MARKET_STATUS</h3>
        <div className="refresh-btn" onClick={findTopAlpha}>
          {loading ? '加载中...' : '刷新'}
        </div>
      </div>
      
      <div className="scanner-list">
        {loading ? (
          <div className="skeleton-container">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="stock-item skeleton">
                <div className="stock-rank">{index + 1}</div>
                <div className="stock-info">
                  <Skeleton type="text" width="80px" height="14px" />
                  <Skeleton type="text" width="60px" height="12px" className="mt-2" />
                </div>
                <div className="stock-price-info">
                  <Skeleton type="text" width="60px" height="16px" />
                  <Skeleton type="text" width="50px" height="14px" className="mt-2" />
                </div>
                <div className="stock-radar">
                  <Skeleton type="circle" width="80px" height="80px" />
                </div>
              </div>
            ))}
          </div>
        ) : topStocks.length === 0 ? (
          <div className="no-data">暂无数据</div>
        ) : (
          topStocks.map((stockScore, index) => {
            const { stock, currentPrice, changePercent } = stockScore;
            return (
              <div
                key={stock.ts_code}
                className="stock-item"
                onClick={() => handleStockClick(stock)}
              >
                <div className="stock-rank">{index + 1}</div>
                <div className="stock-info">
                  <div className="stock-code">{stock.ts_code}</div>
                  <div className="stock-name">{stock.name}</div>
                </div>
                <div className="stock-price-info">
                  <div className="current-price">
                    {currentPrice ? currentPrice.toFixed(2) : '--'}
                  </div>
                  <div className={`change-percent ${changePercent && changePercent > 0 ? 'positive' : changePercent && changePercent < 0 ? 'negative' : ''}`}>
                    {changePercent ? (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%' : '--'}
                  </div>
                </div>
                <div className="stock-radar">
                  <RadarThumbnail dimensions={stockScore.dimensions} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .market-scanner {
          background: #11111b;
          color: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #333;
        }

        .scanner-header h3 {
          margin: 0;
          font-size: 16px;
          color: #89dceb;
        }

        .refresh-btn {
          background: #313244;
          color: #cdd6f4;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .refresh-btn:hover {
          background: #45475a;
        }

        .scanner-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .stock-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #333;
          transition: background 0.2s;
        }

        .stock-item:hover {
          background: #1e1e2e;
        }

        .stock-rank {
          width: 20px;
          font-size: 14px;
          font-weight: bold;
          color: #f38ba8;
          margin-right: 12px;
        }

        .stock-info {
          flex: 1;
        }

        .stock-code {
          font-size: 14px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .stock-name {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .stock-price-info {
          text-align: right;
          margin-right: 12px;
        }

        .current-price {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
        }

        .change-percent {
          font-size: 12px;
          font-weight: 500;
        }

        .positive {
          color: #00FF94;
        }

        .negative {
          color: #FF0066;
        }

        .stock-radar {
          width: 80px;
          height: 80px;
        }

        .radar-thumbnail {
          width: 80px;
          height: 80px;
        }

        .loading, .no-data {
          text-align: center;
          padding: 20px;
          color: #94a3b8;
        }

        .skeleton-container {
          padding: 8px 0;
        }

        .skeleton {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default MarketScanner;