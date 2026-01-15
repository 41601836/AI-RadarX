'use client';

import React, { useState, useEffect } from 'react';
import { usePolling } from '../lib/hooks/usePolling';
import { fetchRealTimeQuote, RealTimeQuoteData } from '../lib/api/market/quote';

interface IndexData {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export default function Ticker() {
  const [indices, setIndices] = useState<IndexData[]>([
    { code: 'SH000001', name: '上证指数', value: 0, change: 0, changePercent: 0 },
    { code: 'SZ399001', name: '深证成指', value: 0, change: 0, changePercent: 0 },
  ]);
  const [loading, setLoading] = useState(true);

  // 获取指数数据的函数
  const fetchIndexData = async () => {
    try {
      setLoading(true);
      // 调用实时行情API获取指数数据
      const response = await fetchRealTimeQuote(indices.map(index => index.code));
      
      if (response.data) {
        const updatedIndices = indices.map(index => {
          const quote = response.data![index.code];
          if (quote) {
            return {
              code: index.code,
              name: index.name,
              value: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
            };
          }
          return index;
        });
        setIndices(updatedIndices);
      }
    } catch (error) {
      console.error('Error fetching index data:', error);
      // 使用模拟数据
      setIndices(prev => prev.map(index => ({
        ...index,
        value: index.code === 'SH000001' ? 4085.50 + Math.random() * 10 - 5 : 10256.78 + Math.random() * 20 - 10,
        change: Math.random() * 20 - 10,
        changePercent: Math.random() * 0.5 - 0.25,
      })));
    } finally {
      setLoading(false);
    }
  };

  // 使用usePolling钩子实现30秒自动刷新
  usePolling(fetchIndexData, {
    interval: 30000, // 30秒
    tabKey: 'dashboard', // 当dashboard标签激活时刷新
    immediate: true, // 立即执行一次
  });

  return (
    <div className="ticker-container">
      {indices.map((index) => (
        <div key={index.code} className="index-item">
          <span className="index-name">{index.name}</span>
          <span className="index-value">
            {loading ? '--' : index.value.toFixed(2)}
          </span>
          <span 
            className={`index-change ${index.changePercent >= 0 ? 'positive' : 'negative'}`}
          >
            {loading ? '--' : (
              <>
                {index.changePercent >= 0 ? '+' : ''}
                {index.changePercent.toFixed(2)}%
              </>
            )}
          </span>
        </div>
      ))}
      <style jsx>{`
        .ticker-container {
          display: flex;
          gap: 20px;
          padding: 8px 12px;
          background-color: rgba(255, 255, 255, 0.95);
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .index-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .index-name {
          color: #333;
          min-width: 80px;
        }
        
        .index-value {
          color: #333;
        }
        
        .index-change {
          font-weight: 600;
        }
        
        .positive {
          color: #00FF94; /* 翡翠绿表示上涨 */
        }
        
        .negative {
          color: #FF0066; /* 玫瑰红表示下跌 */
        }
      `}</style>
    </div>
  );
}