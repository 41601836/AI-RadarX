'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { calculateRadarDimensions } from '../lib/algorithms/radarCalculations';
import { usePolling } from '../lib/hooks/usePolling';

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

  // 使用全局轮询钩子，当不在仪表盘页面时自动停止
  usePolling(() => {
    // 数据变化阈值，只有超过这个值才更新，避免微小变化导致的频繁更新
    const DATA_CHANGE_THRESHOLD = 1.0;
    // 生成随机参数用于计算（实际应用中应从API获取真实数据）
    const radarParams = {
      // 基础参数
      currentTurnover: Math.random() * 100 + 10,
      fiveDayAvgTurnover: Math.random() * 80 + 10,
      volumeRatio: Math.random() * 3 + 0.5,
      sellOrderDepth: Math.random() * 1.5,
      profitTakingPercentage: Math.random() * 100,
      recentVolumeTrend: Math.random() * 2 - 1,
      explosionRate: Math.random() * 50,
      maxContinuationHeight: Math.random() * 10,
      marketIndexChange: Math.random() * 10 - 5,
      currentVolume: Math.random() * 10000000 + 1000000,
      avgVolume: Math.random() * 8000000 + 1000000,
      volumeAccumulation: Math.random() * 2 - 1,
      shortTermTrend: Math.random() * 2 - 1,
      mediumTermTrend: Math.random() * 2 - 1,
      longTermTrend: Math.random() * 2 - 1,
      volatility: Math.random(),
      
      // 分时强度参数
      intradayStrengthParams: {
        priceData: Array.from({ length: 10 }, (_, i) => ({
          timestamp: Date.now() - (10 - i) * 60000,
          high: Math.random() * 10 + 3000,
          low: Math.random() * 10 + 3000,
          close: Math.random() * 10 + 3000,
          volume: Math.random() * 10000000 + 1000000
        }))
      },
      
      // 筹码分布参数
      chipDistributionParams: {
        chipData: Array.from({ length: 10 }, (_, i) => ({
          price: 3000 + i * 10,
          percentage: Math.random() * 0.2,
          volume: Math.random() * 10000000
        })),
        currentPrice: 3050
      },
      
      // 偏离度参数
      deviationParams: {
        currentPrice: 3050,
        deviationDuration: Math.random() * 120,
        volatility: Math.random()
      }
    };

    // 使用真实算法计算情绪雷达数据
    const calculatedEmotionData = calculateRadarDimensions(radarParams);
    
    // 计算新的情绪雷达数据
    const newEmotionData = {
      liquidity: calculatedEmotionData.liquidity,
      sellingPressure: calculatedEmotionData.sellingPressure,
      sentiment: calculatedEmotionData.sentiment,
      volumePower: Math.random() * 100, // 模拟量能强度
      trendStrength: calculatedEmotionData.trendStrength,
      chipConcentration: Math.random() * 100 // 模拟筹码集中度
    };
    
    // 检查情绪雷达数据是否有显著变化
    setCurrentEmotionData(prev => {
      // 计算数据变化量
      const changes = Object.keys(prev).some(key => {
        const prevValue = prev[key as keyof EmotionRadarData];
        const newValue = newEmotionData[key as keyof EmotionRadarData];
        return Math.abs(newValue - prevValue) > DATA_CHANGE_THRESHOLD;
      });
      
      // 只有当数据变化超过阈值时才更新
      if (changes) {
        return smoothTransition(newEmotionData, prev);
      }
      return prev;
    });

    // 计算新的个股雷达数据
    const newStockData = {
      priceStrength: calculatedEmotionData.trendStrength, // 价格强度映射到趋势强度
      volumeStrength: Math.min(100, radarParams.volumeRatio * 100), // 量能强度映射到量比
      trendStrength: calculatedEmotionData.trendStrength, // 趋势强度
      chipStrength: Math.random() * 100, // 模拟筹码强度
      fundStrength: Math.min(100, (1 - radarParams.sellOrderDepth) * 100), // 资金强度映射到卖压强度的反向
      newsStrength: calculatedEmotionData.sentiment // 消息强度映射到情绪
    };
    
    // 检查个股雷达数据是否有显著变化
    setCurrentStockData(prev => {
      // 计算数据变化量
      const changes = Object.keys(prev).some(key => {
        const prevValue = prev[key as keyof StockRadarData];
        const newValue = newStockData[key as keyof StockRadarData];
        return Math.abs(newValue - prevValue) > DATA_CHANGE_THRESHOLD;
      });
      
      // 只有当数据变化超过阈值时才更新
      if (changes) {
        return smoothTransition(newStockData, prev);
      }
      return prev;
    });
  }, {
    interval: 2000, // 每2000毫秒更新一次，减少CPU占用
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: true // 立即执行
  });

  return (
    <div className="flex flex-col gap-4 p-5 bg-black rounded-lg max-w-4xl mx-auto border border-slate-700">
      {/* 雷达类型切换按钮 */}
      <div className="flex gap-3 justify-center">
        <button 
          className={`px-5 py-2 bg-black rounded-md cursor-pointer transition-all duration-300 ${radarType === 'emotion' ? 'bg-cyan-900/30 text-cyan-300' : 'text-slate-400 hover:bg-cyan-900/20 hover:text-cyan-300'}`}
          onClick={() => setRadarType('emotion')}
        >
          情绪雷达
        </button>
        <button 
          className={`px-5 py-2 bg-black rounded-md cursor-pointer transition-all duration-300 ${radarType === 'stock' ? 'bg-cyan-900/30 text-cyan-300' : 'text-slate-400 hover:bg-cyan-900/20 hover:text-cyan-300'}`}
          onClick={() => setRadarType('stock')}
        >
          个股雷达
        </button>
      </div>
      
      {/* 雷达图显示区域 */}
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-purple-300 text-xl">{radarType === 'emotion' ? '市场情绪雷达' : '个股表现雷达'}</h3>
        <div className="w-full max-w-3xl aspect-square flex justify-center items-center">
          {radarType === 'emotion' ? (
            <SmartThresholdRadar data={{
              '流动性': currentEmotionData.liquidity,
              '抛压': currentEmotionData.sellingPressure,
              '情绪': currentEmotionData.sentiment,
              '量能': currentEmotionData.volumePower,
              '分时强度': currentEmotionData.trendStrength,
              '筹码集中': currentEmotionData.chipConcentration
            }} />
          ) : (
            <SmartThresholdRadar data={{
              '分时量比': currentStockData.volumeStrength,
              '换手变动': currentEmotionData.liquidity,
              '卖压强度': currentEmotionData.sellingPressure,
              '趋势强度': currentStockData.trendStrength,
              '资金强度': currentStockData.fundStrength,
              '消息强度': currentStockData.newsStrength
            }} />
          )}
        </div>
      </div>
      
      {/* 雷达图数据说明 */}
      <div className="bg-slate-800/40 p-5 rounded-lg border border-slate-700">
        <h4 className="text-slate-400 text-sm mb-4 uppercase tracking-wider">数据说明</h4>
        {radarType === 'emotion' ? (
          <ul className="space-y-2 list-none p-0 m-0">
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="流动性" data-value={`${currentEmotionData.liquidity.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="抛压" data-value={`${currentEmotionData.sellingPressure.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="情绪" data-value={`${currentEmotionData.sentiment.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="量能强度" data-value={`${currentEmotionData.volumePower.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="趋势强度" data-value={`${currentEmotionData.trendStrength.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="筹码集中度" data-value={`${currentEmotionData.chipConcentration.toFixed(1)}分`}></li>
          </ul>
        ) : (
          <ul className="space-y-2 list-none p-0 m-0">
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="分时量比" data-value={`${currentStockData.volumeStrength.toFixed(1)}%`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="换手变动" data-value={`${currentEmotionData.liquidity.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="卖压强度" data-value={`${currentEmotionData.sellingPressure.toFixed(1)}分`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="趋势强度" data-value={`${currentStockData.trendStrength.toFixed(1)}%`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="资金强度" data-value={`${currentStockData.fundStrength.toFixed(1)}%`}></li>
            <li className="flex justify-between p-3 rounded-md transition-all duration-300 hover:bg-slate-700/30" data-label="消息强度" data-value={`${currentStockData.newsStrength.toFixed(1)}%`}></li>
          </ul>
        )}
      </div>
    </div>


  );
};

export default ARadarPanel;