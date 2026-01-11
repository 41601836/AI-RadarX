// 智能阈值雷达图组件（集成分时强度算法）
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { calculateIntradayStrengthAxis, calculateChipDistributionAxis } from '../lib/algorithms/radarCalculations';
import type { OrderItem } from '../lib/algorithms/largeOrder';
import type { ChipDistributionItem } from '../lib/algorithms/chipDistribution';
import { useVisibilityObserver } from '../lib/hooks/useVisibilityObserver';
import { formatNumberToFixed2 } from '../lib/utils/numberFormatter';

// 定义雷达图数据接口
export interface RadarData {
  '流动性'?: number;
  '抛压'?: number;
  '情绪'?: number;
  '量能'?: number;
  '分时强度'?: number;
  '筹码集中'?: number;
  '分时量比'?: number;
  '换手变动'?: number;
  '卖压强度'?: number;
  '趋势强度'?: number;
  '资金强度'?: number;
  '消息强度'?: number;
}

// 定义组件属性接口
interface SmartThresholdRadarProps {
  stockCode?: string;
  // 直接接收计算好的雷达图数据
  liquidity?: number;       // 流动性（来自分时强度）
  sellingPressure?: number; // 抛压（来自分时强度）
  sentiment?: number;       // 情绪（来自分时强度）
  volumePower?: number;     // 量能（来自分时强度）
  intradayStrength?: number; // 分时强度（来自intradayStrength.ts）
  chipConcentration?: number; // 筹码集中（来自chipDistribution.ts）
  
  // 原始数据（可选，如果没有提供计算结果，可以使用这些数据内部计算）
  data?: RadarData;
  marketData?: {
    volumeRatio: number;
  };
  largeOrderData?: {
    sellPressure: number;
  };
  publicOpinion?: {
    sentimentScore: number;
  };
  priceData?: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>;
  orderData?: OrderItem[];
  chipData?: ChipDistributionItem[];
  currentPrice?: number;
}

const SmartThresholdRadar: React.FC<SmartThresholdRadarProps> = ({
  stockCode = 'SH600000',
  // 使用新的props
  liquidity,
  sellingPressure,
  sentiment,
  volumePower,
  intradayStrength,
  chipConcentration,
  
  // 原始数据
  data,
  marketData,
  largeOrderData,
  publicOpinion,
  priceData = [],
  orderData = [],
  chipData = [],
  currentPrice = 0
}) => {
  const [radarData, setRadarData] = useState<RadarData>({
    '流动性': 50,
    '抛压': 50,
    '情绪': 50,
    '量能': 50,
    '分时强度': 50,
    '筹码集中': 50
  });
  
  // 可见性检测
  const [containerRef, isVisible] = useVisibilityObserver();
  
  useEffect(() => {
    if (!isVisible) return;
    
    // 如果提供了完整的data对象，直接使用
    if (data) {
      setRadarData(data);
    } else {
      // 优先使用直接传入的计算结果
      const hasComputedResults = liquidity !== undefined || 
                                sellingPressure !== undefined || 
                                sentiment !== undefined || 
                                volumePower !== undefined || 
                                intradayStrength !== undefined || 
                                chipConcentration !== undefined;
      
      if (hasComputedResults) {
        // 使用直接传入的计算结果构建雷达图
        const newRadarData: RadarData = {
          '流动性': liquidity !== undefined ? Math.min(100, Math.max(0, liquidity)) : 
                   marketData?.volumeRatio ? Math.min(100, Math.max(0, marketData.volumeRatio * 100)) : 50,
          '抛压': sellingPressure !== undefined ? Math.min(100, Math.max(0, sellingPressure)) : 
                 largeOrderData?.sellPressure ? Math.min(100, Math.max(0, largeOrderData.sellPressure * 100)) : 50,
          '情绪': sentiment !== undefined ? Math.min(100, Math.max(0, sentiment)) : 
                 publicOpinion?.sentimentScore ? Math.min(100, Math.max(0, publicOpinion.sentimentScore)) : 50,
          '量能': volumePower !== undefined ? Math.min(100, Math.max(0, volumePower)) : 60,
          '分时强度': intradayStrength !== undefined ? Math.min(100, Math.max(0, intradayStrength)) : 
                     calculateIntradayStrengthAxis({
                       priceData,
                       orderData
                     }),
          '筹码集中': chipConcentration !== undefined ? Math.min(100, Math.max(0, chipConcentration)) : 
                     calculateChipDistributionAxis({
                       chipData,
                       currentPrice
                     })
        };
        
        setRadarData(newRadarData);
      } else {
        // 否则使用原始数据进行内部计算
        // 计算分时强度
        const intradayStrengthScore = calculateIntradayStrengthAxis({
          priceData,
          orderData
        });
        
        // 计算筹码集中度
        const chipConcentrationScore = calculateChipDistributionAxis({
          chipData,
          currentPrice
        });
        
        // 使用真实计算数据构建雷达图
        const newRadarData: RadarData = {
          '流动性': marketData?.volumeRatio ? Math.min(100, Math.max(0, marketData.volumeRatio * 100)) : 50,
          '抛压': largeOrderData?.sellPressure ? Math.min(100, Math.max(0, largeOrderData.sellPressure * 100)) : 50,
          '情绪': publicOpinion?.sentimentScore ? Math.min(100, Math.max(0, publicOpinion.sentimentScore)) : 50,
          '量能': 60, // 默认值，后续可替换为真实量能数据
          '分时强度': intradayStrengthScore,
          '筹码集中': chipConcentrationScore
        };
        
        setRadarData(newRadarData);
      }
    }
  }, [isVisible, stockCode, data, marketData, largeOrderData, publicOpinion, priceData, orderData, chipData, currentPrice, 
       liquidity, sellingPressure, sentiment, volumePower, intradayStrength, chipConcentration]);
  return (
    <div className="smart-threshold-radar" ref={containerRef}>
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
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a2e" strokeWidth="0.3" />
              </pattern>
              {/* 呼吸发光效果 */}
              <filter id="breath-glow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
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
                  stroke="#313244"
                  strokeWidth="0.8"
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
              fill="rgba(243, 139, 168, 0.2)"
              stroke="#f38ba8"
              strokeWidth="3"
              filter="url(#breath-glow)"
              className="radar-polygon"
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
                  r="5"
                  fill="#ffffff"
                  stroke="#f38ba8"
                  strokeWidth="3"
                  filter="url(#breath-glow)"
                  className="radar-point"
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
              <div className="info-value">{formatNumberToFixed2(value)}</div>
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
                  ? formatNumberToFixed2(Object.values(radarData).reduce((sum, val) => sum + val, 0) / Object.values(radarData).length) 
                  : '50.00'}
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
          height: 600px;
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
          font-size: 13px;
          color: #94a3b8;
        }
        
        .radar-content {
          height: calc(100% - 48px);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        /* 雷达图图形容器 */
        .radar-chart-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 350px;
        }
        
        .radar-chart {
          width: 100%;
          height: 100%;
          max-width: 400px;
          max-height: 400px;
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
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
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
          font-size: 13px;
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
        
        /* 移除呼吸动画以减少性能开销 */
        .radar-polygon {
          filter: url(#breath-glow) drop-shadow(0 0 4px rgba(243, 139, 168, 0.6));
          stroke-width: 3;
        }
        
        .radar-point {
          filter: url(#breath-glow) drop-shadow(0 0 4px rgba(243, 139, 168, 0.6));
          stroke-width: 3;
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