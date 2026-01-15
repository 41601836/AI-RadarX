'use client';

import React, { useEffect, useState } from 'react';
import { useStrategyStore, ConsensusResult } from '../lib/store/useStrategyStore';

const RiskNotification: React.FC = () => {
  const { consensusResults } = useStrategyStore();
  const [highRiskStocks, setHighRiskStocks] = useState<ConsensusResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // 监听风险等级变化
  useEffect(() => {
    // 检查所有共识结果，找出风险等级为high的股票
    const highRisk = Object.values(consensusResults).filter(result => result.riskLevel === 'high');
    
    if (highRisk.length > 0) {
      setHighRiskStocks(highRisk);
      setIsVisible(true);
    } else {
      setHighRiskStocks([]);
      setIsVisible(false);
    }
  }, [consensusResults]);

  // 跳转到风险控制模块
  const handleNavigateToRisk = () => {
    // 这里可以实现路由跳转逻辑
    console.log('跳转到风险控制模块');
    // 例如：router.push('/risk')
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-500/90 backdrop-blur-sm border border-red-400 rounded shadow-lg p-4 min-w-[300px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-xl">⚠️</span>
            <h3 className="text-white font-bold text-lg">高风险预警</h3>
          </div>
          <button 
            className="text-white hover:text-red-200 transition-colors"
            onClick={() => setIsVisible(false)}
          >
            ×
          </button>
        </div>
        
        <div className="text-white text-sm mb-4">
          <p>以下股票风险等级为高，建议及时关注：</p>
          <ul className="list-disc list-inside mt-2">
            {highRiskStocks.map(stock => (
              <li key={stock.stockCode}>
                {stock.stockCode} - {stock.stockName}
              </li>
            ))}
          </ul>
        </div>
        
        <button 
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-all duration-200 glow-red"
          onClick={handleNavigateToRisk}
        >
          前往风险控制
        </button>
      </div>

      <style jsx>{`
        .glow-red {
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
        }
      `}</style>
    </div>
  );
};

export default RiskNotification;