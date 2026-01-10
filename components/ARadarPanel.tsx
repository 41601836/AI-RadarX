'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 动态导入雷达图组件
const SmartThresholdRadar = dynamic(() => import('./SmartThresholdRadar'), { ssr: false });

// Radar类型定义
type RadarType = 'emotion' | 'stock';

// 情绪雷达数据类型
interface EmotionRadarData {
  liquidity: number;
  sellingPressure: number;
  sentiment: number;
  volumePower: number;
  trendStrength: number;
  chipConcentration: number;
}

// 个股雷达数据类型
interface StockRadarData {
  priceStrength: number;
  volumeStrength: number;
  trendStrength: number;
  chipStrength: number;
  fundStrength: number;
  newsStrength: number;
}

const ARadarPanel: React.FC = () => {
  // 状态管理
  const [radarType, setRadarType] = useState<RadarType>('emotion');
  const [currentEmotionData, setCurrentEmotionData] = useState<EmotionRadarData>({
    liquidity: 75,
    sellingPressure: 50,
    sentiment: 65,
    volumePower: 80,
    trendStrength: 70,
    chipConcentration: 60
  });
  const [currentStockData, setCurrentStockData] = useState<StockRadarData>({
    priceStrength: 75,
    volumeStrength: 82,
    trendStrength: 68,
    chipStrength: 90,
    fundStrength: 78,
    newsStrength: 65
  });

  // 平滑过渡函数
  const smoothTransition = (targetData: any, currentData: any) => {
    const newData = { ...currentData };
    for (const key in targetData) {
      if (currentData.hasOwnProperty(key)) {
        const diff = targetData[key] - currentData[key];
        newData[key] = currentData[key] + diff * 0.2; // 20% 的变化率，实现平滑过渡
      }
    }
    return newData;
  };

  // 生成随机波动的目标数据
  const generateTargetData = (baseData: any) => {
    const newData = { ...baseData };
    for (const key in newData) {
      if (newData.hasOwnProperty(key)) {
        // 在基础值的 ±10% 范围内随机波动
        const variation = newData[key] * 0.1;
        newData[key] = Math.max(0, Math.min(100, newData[key] + (Math.random() - 0.5) * variation * 2));
      }
    }
    return newData;
  };

  // 定期更新雷达图数据，实现平滑过渡
  useEffect(() => {
    const emotionBase = {
      liquidity: 75,
      sellingPressure: 50,
      sentiment: 65,
      volumePower: 80,
      trendStrength: 70,
      chipConcentration: 60
    };

    const stockBase = {
      priceStrength: 75,
      volumeStrength: 82,
      trendStrength: 68,
      chipStrength: 90,
      fundStrength: 78,
      newsStrength: 65
    };

    let emotionTarget = generateTargetData(emotionBase);
    let stockTarget = generateTargetData(stockBase);

    const updateInterval = setInterval(() => {
      // 更新情绪雷达数据
      setCurrentEmotionData(prev => {
        const newData = smoothTransition(emotionTarget, prev);
        // 如果接近目标值，生成新的目标数据
        const isClose = Object.keys(newData).every(key => {
          return Math.abs(newData[key as keyof EmotionRadarData] - emotionTarget[key as keyof EmotionRadarData]) < 0.1;
        });
        if (isClose) {
          emotionTarget = generateTargetData(emotionBase);
        }
        return newData;
      });

      // 更新个股雷达数据
      setCurrentStockData(prev => {
        const newData = smoothTransition(stockTarget, prev);
        // 如果接近目标值，生成新的目标数据
        const isClose = Object.keys(newData).every(key => {
          return Math.abs(newData[key as keyof StockRadarData] - stockTarget[key as keyof StockRadarData]) < 0.1;
        });
        if (isClose) {
          stockTarget = generateTargetData(stockBase);
        }
        return newData;
      });
    }, 500); // 每500毫秒更新一次，实现平滑过渡

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div className="a-radar-panel panel">
      {/* 雷达类型切换按钮 */}
      <div className="radar-type-switcher">
        <button 
          className={`radar-switch-btn ${radarType === 'emotion' ? 'active' : ''}`}
          onClick={() => setRadarType('emotion')}
        >
          情绪雷达
        </button>
        <button 
          className={`radar-switch-btn ${radarType === 'stock' ? 'active' : ''}`}
          onClick={() => setRadarType('stock')}
        >
          个股雷达
        </button>
      </div>
      
      {/* 雷达图显示区域 */}
      <div className="radar-content">
        <h3>{radarType === 'emotion' ? '市场情绪雷达' : '个股表现雷达'}</h3>
        <div className="radar-chart-container">
          {radarType === 'emotion' ? (
            <SmartThresholdRadar data={currentEmotionData as any} />
          ) : (
            <SmartThresholdRadar data={currentStockData as any} />
          )}
        </div>
      </div>
      
      {/* 雷达图数据说明 */}
      <div className="radar-data-info">
        <h4>数据说明</h4>
        {radarType === 'emotion' ? (
          <ul className="data-description">
            <li>流动性: {currentEmotionData.liquidity.toFixed(1)}分</li>
            <li>抛压: {currentEmotionData.sellingPressure.toFixed(1)}分</li>
            <li>情绪: {currentEmotionData.sentiment.toFixed(1)}分</li>
            <li>量能强度: {currentEmotionData.volumePower.toFixed(1)}分</li>
            <li>趋势强度: {currentEmotionData.trendStrength.toFixed(1)}分</li>
            <li>筹码集中度: {currentEmotionData.chipConcentration.toFixed(1)}分</li>
          </ul>
        ) : (
          <ul className="data-description">
            <li>价格强度: {currentStockData.priceStrength.toFixed(1)}%</li>
            <li>量能强度: {currentStockData.volumeStrength.toFixed(1)}%</li>
            <li>趋势强度: {currentStockData.trendStrength.toFixed(1)}%</li>
            <li>筹码强度: {currentStockData.chipStrength.toFixed(1)}%</li>
            <li>资金强度: {currentStockData.fundStrength.toFixed(1)}%</li>
            <li>消息强度: {currentStockData.newsStrength.toFixed(1)}%</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default ARadarPanel;