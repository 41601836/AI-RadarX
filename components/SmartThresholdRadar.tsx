// 智能阈值雷达图组件（集成分时强度算法）
'use client';

import React, { useEffect, useState } from 'react';
import { calculateEnhancedIntradayAnalysis, calculateIntradayStrength, calculateAbsorptionStrength } from '../lib/algorithms/intradayStrength';

// 雷达图数据接口
export interface RadarData {
  [key: string]: number;
}

const SmartThresholdRadar: React.FC<{ stockCode?: string }> = ({ stockCode = 'SH600000' }) => {
  // 生成测试数据
  const generateTestData = () => {
    const priceData = [];
    const orderData = [];
    const now = Date.now();
    let currentPrice = 100;
    
    // 生成30分钟的价格数据
    for (let i = 0; i < 30; i++) {
      const timestamp = now - i * 60000;
      const change = (Math.random() - 0.5) * 2;
      const newPrice = currentPrice + change;
      
      priceData.push({
        timestamp,
        high: newPrice + Math.random() * 0.5,
        low: newPrice - Math.random() * 0.5,
        close: newPrice,
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
      
      // 生成一些订单数据
      for (let j = 0; j < 5; j++) {
        orderData.push({
          tradeTime: new Date(timestamp).toISOString(),
          tradePrice: newPrice + (Math.random() - 0.5) * 0.5,
          tradeVolume: Math.floor(Math.random() * 10000) + 1000,
          tradeDirection: Math.random() > 0.5 ? 'buy' : 'sell'
        });
      }
      
      currentPrice = newPrice;
    }
    
    return { priceData, orderData };
  };
  
  const [radarData, setRadarData] = useState<RadarData>({});
  
  useEffect(() => {
    // 生成测试数据
    const { priceData, orderData } = generateTestData();
    
    // 计算分时强度
    const strengthResults = calculateIntradayStrength({
      priceData,
      orderData,
      windowSize: 5,
      useVolumeWeight: true,
      useWAD: true
    });
    
    // 计算承接力度
    const absorptionResults = calculateAbsorptionStrength({
      priceData,
      orderData,
      timeWindow: 10,
      useLargeOrders: true
    });
    
    // 计算增强的分时分析
    const enhancedResults = calculateEnhancedIntradayAnalysis({
      priceData,
      orderData,
      strengthWindow: 5,
      absorptionWindow: 10,
      useWAD: true,
      useLargeOrders: true
    });
    
    // 获取最新的分析结果
    const latestResult = enhancedResults.length > 0 ? enhancedResults[enhancedResults.length - 1] : null;
    
    // 构建雷达图数据
    const newRadarData: RadarData = {
      '分时强度': latestResult?.intradayStrength.compositeScore || 50,
      '承接力度': (latestResult?.absorptionStrength.strength || 0.5) * 100,
      '成交量因子': (latestResult?.intradayStrength.volumeFactor || 0.5) * 100,
      '价格因子': ((latestResult?.intradayStrength.priceFactor || 0) + 1) * 50,
      '特大单因子': (latestResult?.absorptionStrength.largeOrderFactor || 0.5) * 100,
      '综合得分': latestResult?.combinedScore || 50
    };
    
    setRadarData(newRadarData);
  }, [stockCode]);
  return (
    <div className="smart-threshold-radar">
      <div className="radar-header">
        <h4>智能雷达图 - {stockCode}</h4>
        <p className="analysis-type">分时强度分析</p>
      </div>
      <div className="radar-content">
        {/* 雷达图图形区域 */}
        <div className="radar-chart-container">
          <svg className="radar-chart" viewBox="0 0 300 300">
            {/* 雷达图背景网格 */}
            <defs>
              <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#333" strokeWidth="0.5" />
              </pattern>
            </defs>
            <circle cx="150" cy="150" r="120" fill="url(#grid-pattern)" />
            
            {/* 雷达图轴线 */}
            {Object.entries(radarData).map(([key, value], index) => {
              const angle = (index / Object.keys(radarData).length) * 2 * Math.PI;
              const x1 = 150;
              const y1 = 150;
              const x2 = x1 + 120 * Math.cos(angle - Math.PI / 2);
              const y2 = y1 + 120 * Math.sin(angle - Math.PI / 2);
              return (
                <line
                  key={`axis-${key}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#555"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* 雷达图数据多边形 */}
            <polygon
              points={Object.entries(radarData).map(([key, value], index) => {
                const angle = (index / Object.keys(radarData).length) * 2 * Math.PI;
                const radius = (value / 100) * 120;
                const x = 150 + radius * Math.cos(angle - Math.PI / 2);
                const y = 150 + radius * Math.sin(angle - Math.PI / 2);
                return `${x},${y}`;
              }).join(' ')}
              fill="rgba(243, 139, 168, 0.3)"
              stroke="#f38ba8"
              strokeWidth="2"
            />
            
            {/* 雷达图数据点 */}
            {Object.entries(radarData).map(([key, value], index) => {
              const angle = (index / Object.keys(radarData).length) * 2 * Math.PI;
              const radius = (value / 100) * 120;
              const x = 150 + radius * Math.cos(angle - Math.PI / 2);
              const y = 150 + radius * Math.sin(angle - Math.PI / 2);
              return (
                <circle
                  key={`point-${key}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#ffffff"
                  stroke="#f38ba8"
                  strokeWidth="2"
                />
              );
            })}
            
            {/* 雷达图标签 */}
            {Object.entries(radarData).map(([key, value], index) => {
              const angle = (index / Object.keys(radarData).length) * 2 * Math.PI;
              const radius = 135;
              const x = 150 + radius * Math.cos(angle - Math.PI / 2);
              const y = 150 + radius * Math.sin(angle - Math.PI / 2);
              return (
                <text
                  key={`label-${key}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="500"
                >
                  {key}
                </text>
              );
            })}
          </svg>
        </div>
        
        {/* 数值说明列表区域 */}
        <div className="radar-info-separator"></div>
        <div className="radar-info-list">
          {Object.entries(radarData).map(([key, value]) => (
            <div key={key} className="radar-info-item">
              <div className="info-label">{key}</div>
              <div className="info-value">{value.toFixed(1)}</div>
              <div className="info-bar">
                <div 
                  className="bar-fill" 
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
          <div className="radar-summary">
            <div className="summary-item">
              <span className="label">综合信号:</span>
              <span className="value">
                {Object.values(radarData).length > 0 
                  ? (Object.values(radarData).reduce((sum, val) => sum + val, 0) / Object.values(radarData).length).toFixed(1) 
                  : '50.0'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .smart-threshold-radar {
          background: #000000;
          border: 1px solid #333333;
          border-radius: 0;
          padding: 16px;
          color: #ffffff;
          width: 100%;
          height: 500px;
        }
        
        .radar-header {
          margin-bottom: 16px;
          border-bottom: 1px solid #333333;
          padding-bottom: 8px;
        }
        
        .radar-header h4 {
          margin: 0;
          font-size: 14px;
          color: #89dceb;
          font-weight: 500;
        }
        
        .analysis-type {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #94a3b8;
        }
        
        .radar-content {
          height: calc(100% - 48px);
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        
        /* 雷达图图形容器 */
        .radar-chart-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .radar-chart {
          width: 100%;
          height: 100%;
          max-width: 350px;
          max-height: 350px;
        }
        
        /* 分隔线 */
        .radar-info-separator {
          height: 1px;
          background: #333333;
          margin: 0 -16px;
        }
        
        /* 数值说明列表 */
        .radar-info-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 4px;
        }
        
        .radar-info-item {
          background: #111111;
          border: 1px solid #333333;
          border-radius: 0;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }
        
        .info-bar {
          height: 4px;
          background: #222222;
          border: 1px solid #444444;
          border-radius: 0;
          overflow: hidden;
        }
        
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #f38ba8, #c4a7e7);
          transition: width 0.5s ease;
        }
        
        /* 总结部分 */
        .radar-summary {
          grid-column: 1 / -1;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #333333;
          display: flex;
          justify-content: center;
        }
        
        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .summary-item .label {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .summary-item .value {
          font-size: 16px;
          font-weight: 600;
          color: #a6e3a1;
        }
      `}</style>
    </div>
  );
};

export default SmartThresholdRadar;