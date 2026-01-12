// 市场情绪看板组件
'use client';

import React, { useState, useEffect } from 'react';
import { usePolling } from '../lib/hooks/usePolling';
import { fetchMarketSentiment, MarketSentiment } from '../lib/api/market/sentiment';
import { formatNumberToFixed2, formatPercentToFixed2, formatNumberWithUnit } from '../lib/utils/numberFormatter';
import { ApiResponse } from '../lib/api/common/response';
import SentimentGauge from './SentimentGauge';
import NorthboundTrend from './NorthboundTrend';
import MarketBreadth from './MarketBreadth';

// 简单的Skeleton组件
const Skeleton = () => (  
  <div className="skeleton">
    <style jsx>{`
      .skeleton {
        background: #1e293b;
        border-radius: 4px;
        width: 100%;
        height: 100%;
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



// 主组件
const MarketSentimentDashboard: React.FC = () => {
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [loading, setLoading] = useState(true);

  // 使用usePolling Hook实现15秒自动刷新
  usePolling(() => {
    fetchMarketSentiment().then((response: ApiResponse<MarketSentiment>) => {
      setMarketSentiment(response.data);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to fetch market sentiment:', error);
      setLoading(false);
    });
  }, {
    interval: 15000,
    tabKey: 'dashboard',
    immediate: true
  });

  if (loading) {
    return (
      <div className="market-sentiment-dashboard">
        <div className="index-cards">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
        <div className="sentiment-section">
          <div className="sentiment-left">
            <Skeleton />
            <Skeleton />
          </div>
          <div className="sentiment-right">
            <Skeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="market-sentiment-dashboard">
      {/* 顶部：三大指数卡片 */}
      <div className="index-cards">
        {marketSentiment?.index_quotes.map((index) => (
          <div key={index.ts_code} className="index-card">
            <div className="index-name">{index.name}</div>
            <div className="index-price">{index.price.toFixed(2)}</div>
            <div className={`index-change ${index.change >= 0 ? 'positive' : 'negative'}`}>
              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.change_pct.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

      {/* 中部：情绪仪表盘和趋势图 */}
      <div className="sentiment-section">
        {/* 左侧：情绪仪表盘和涨跌分布 */}
        <div className="sentiment-left">
          <div className="sentiment-gauge-container">
            {marketSentiment?.sentiment_score && (
              <SentimentGauge sentimentScore={marketSentiment.sentiment_score.score} />
            )}
          </div>
          <div className="market-breadth-container">
            {marketSentiment?.market_breadth && (
              <MarketBreadth 
                data={[
                  { range: '-10% ~ -5%', count: Math.floor(marketSentiment.market_breadth.down * 0.2) },
                  { range: '-5% ~ -1%', count: Math.floor(marketSentiment.market_breadth.down * 0.8) },
                  { range: '-1% ~ 0%', count: marketSentiment.market_breadth.flat },
                  { range: '0% ~ 1%', count: Math.floor(marketSentiment.market_breadth.up * 0.6) },
                  { range: '1% ~ 5%', count: Math.floor(marketSentiment.market_breadth.up * 0.3) },
                  { range: '5% ~ 10%', count: Math.floor(marketSentiment.market_breadth.up * 0.1) },
                ]} 
              />
            )}
          </div>
        </div>

        {/* 右侧：北向资金趋势 */}
        <div className="sentiment-right">
          <div className="north-capital-container">
            {marketSentiment?.north_capital_trend && (
              <NorthboundTrend data={marketSentiment.north_capital_trend} />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .market-sentiment-dashboard {
          background: #000;
          color: #fff;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow: hidden;
        }

        /* 指数卡片 */
        .index-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .index-card {
          background: #111;
          border: 1px solid #333;
          padding: 16px;
          text-align: center;
        }

        .index-name {
          font-size: 16px;
          color: #999;
          margin-bottom: 8px;
        }

        .index-price {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .index-change {
          font-size: 18px;
          font-weight: bold;
        }

        .positive {
          color: #52c41a; /* 红涨 */
        }

        .negative {
          color: #ff4d4f; /* 绿跌 */
        }

        /* 情绪部分 */
        .sentiment-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          flex: 1;
          overflow: hidden;
        }

        .sentiment-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sentiment-gauge-container {
          background: #111;
          border: 1px solid #333;
          padding: 16px;
          text-align: center;
          flex: 1;
        }

        .sentiment-gauge {
          height: 150px;
        }

        .sentiment-description {
          margin-top: 16px;
          font-size: 18px;
          font-weight: bold;
        }

        .market-breadth-container {
          background: #111;
          border: 1px solid #333;
          padding: 16px;
          text-align: center;
          flex: 1;
        }

        .market-breadth-histogram {
          height: 150px;
        }

        .sentiment-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .north-capital-container {
          background: #111;
          border: 1px solid #333;
          padding: 16px;
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .north-capital-value {
          font-size: 24px;
          font-weight: bold;
          margin: 16px 0;
        }

        .north-capital-trend {
          flex: 1;
        }

        h3 {
          color: #FFD700;
          margin: 0 0 16px 0;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default MarketSentimentDashboard;
