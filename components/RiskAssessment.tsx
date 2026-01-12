// 风险评估组件
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAccountRiskAssessment, AccountRiskAssessmentData, PositionRiskItem } from '../lib/api/risk/assessment';
import { usePolling } from '../lib/hooks/usePolling';
import { formatNumberToFixed2, formatNumberWithUnit, formatPercentToFixed2 } from '../lib/utils/numberFormatter';

interface RiskAssessmentProps {
  accountId?: string;
}

export default function RiskAssessment({ accountId }: RiskAssessmentProps) {
  // 状态管理
  const [riskData, setRiskData] = useState<AccountRiskAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // 获取风险评估数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchAccountRiskAssessment();
      
      if (response.code === 200 && response.data) {
        setRiskData(response.data);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        setError(response.msg || '获取风险评估数据失败');
      }
    } catch (err) {
      console.error('Error fetching risk assessment data:', err);
      setError('获取风险评估数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [accountId]);
  
  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // 使用全局轮询钩子，当不在仪表盘页面时自动停止
  usePolling(fetchData, {
    interval: 60000, // 每60秒更新一次数据
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: false // 不立即执行，依赖上面的初始加载
  });
  
  // 获取风险等级的中文名称和样式类名
  const getRiskLevelInfo = (level: 'low' | 'medium' | 'high') => {
    const riskMap = {
      low: { text: '低风险', className: 'text-green-400', color: '#a6e3a1' },
      medium: { text: '中风险', className: 'text-yellow-400', color: '#f9e2af' },
      high: { text: '高风险', className: 'text-red-400', color: '#f38ba8' }
    };
    return riskMap[level];
  };
  
  if (loading) {
    return (
      <div className="risk-assessment">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(137, 220, 235, 0.3);
            border-top: 4px solid #89dceb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="risk-assessment">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchData}>重试</button>
        </div>
        
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 16px;
          }
          
          .error-message {
            color: #f38ba8;
            font-size: 14px;
          }
          
          .retry-button {
            background: #89dceb;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
          }
          
          .retry-button:hover {
            background: #74c7ec;
          }
        `}</style>
      </div>
    );
  }
  
  if (!riskData) {
    return (
      <div className="risk-assessment">
        <div className="no-data">
          <p>暂无风险评估数据</p>
        </div>
        
        <style jsx>{`
          .no-data {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #94a3b8;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="risk-assessment">
      {/* 组件头部 */}
      <div className="component-header">
        <div>
          <h3>账户风险评估</h3>
          <p className="last-update">最后更新: {lastUpdate}</p>
        </div>
        <div className="account-id">
          账户ID: {riskData.accountId}
        </div>
      </div>
      
      {/* 账户概览 */}
      <div className="account-overview">
        <div className="overview-item">
          <div className="item-label">总市值</div>
          <div className="item-value">{formatNumberWithUnit(riskData.totalMarketValue / 100)}</div>
        </div>
        
        <div className="overview-item">
          <div className="item-label">可用资金</div>
          <div className="item-value">{formatNumberWithUnit(riskData.totalAvailableFunds / 100)}</div>
        </div>
      </div>
      
      {/* 风险指标 */}
      <div className="risk-indicators">
        <div className="indicator-card">
          <div className="indicator-label">VaR值 (95%)</div>
          <div className="indicator-value">{formatNumberWithUnit(riskData.varValue / 100)}</div>
          <div className="indicator-desc">日最大潜在损失</div>
        </div>
        
        <div className="indicator-card">
          <div className="indicator-label">尾部风险值</div>
          <div className="indicator-value">{formatNumberWithUnit(riskData.cvarValue / 100)}</div>
          <div className="indicator-desc">极端市场条件下的潜在损失</div>
        </div>
        
        <div className="indicator-card">
          <div className="indicator-label">夏普比率</div>
          <div className="indicator-value">{formatNumberToFixed2(riskData.sharpRatio)}</div>
          <div className="indicator-desc">风险调整后收益</div>
        </div>
        
        <div className="indicator-card">
          <div className="indicator-label">最大回撤</div>
          <div className="indicator-value">{formatPercentToFixed2(riskData.maxDrawdown * 100)}</div>
          <div className="indicator-desc">历史最大跌幅</div>
        </div>
      </div>
      
      {/* 持仓风险列表 */}
      <div className="position-risk-section">
        <h4>持仓风险列表</h4>
        <div className="position-risk-list">
          {riskData.positionRiskList.length > 0 ? (
            riskData.positionRiskList.map((position) => {
              const riskInfo = getRiskLevelInfo(position.riskLevel);
              return (
                <div key={position.stockCode} className="position-risk-item">
                  <div className="position-info">
                    <div className="stock-name">{position.stockName}</div>
                    <div className="stock-code">{position.stockCode}</div>
                    <div className="position-ratio">
                      持仓占比: {formatPercentToFixed2(position.positionRatio * 100)}
                    </div>
                  </div>
                  
                  <div className="risk-info">
                    <div className={`risk-level ${riskInfo.className}`} style={{ color: riskInfo.color }}>
                      {riskInfo.text}
                    </div>
                  </div>
                  
                  <div className="price-info">
                    <div className="stop-loss">
                      止损价: {formatNumberToFixed2(position.stopLossPrice / 100)}元
                    </div>
                    <div className="stop-profit">
                      止盈价: {formatNumberToFixed2(position.stopProfitPrice / 100)}元
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-position-data">
              <p>暂无持仓数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 风险预警 */}
      {riskData.riskWarning.length > 0 && (
        <div className="risk-warning-section">
          <h4>风险预警</h4>
          <div className="risk-warning-list">
            {riskData.riskWarning.map((warning, index) => (
              <div key={index} className="warning-item">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">{warning}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 样式 */}
      <style jsx>{`
        .risk-assessment {
          background: #000;
          border: 1px solid #333;
          padding: 16px;
          color: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .component-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #333;
        }
        
        .component-header h3 {
          margin: 0;
          font-size: 18px;
          color: #89dceb;
        }
        
        .last-update {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .account-id {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .account-overview {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .overview-item {
          flex: 1;
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          border-radius: 4px;
          text-align: center;
        }
        
        .item-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        
        .item-value {
          font-size: 20px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .risk-indicators {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .indicator-card {
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          border-radius: 4px;
          text-align: center;
          transition: border-color 0.2s;
        }
        
        .indicator-card:hover {
          border-color: #89dceb;
        }
        
        .indicator-label {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        
        .indicator-value {
          font-size: 18px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 4px;
        }
        
        .indicator-desc {
          font-size: 12px;
          color: #666;
        }
        
        .position-risk-section {
          margin-bottom: 24px;
        }
        
        .position-risk-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #FFD700;
        }
        
        .position-risk-list {
          max-height: 200px;
          overflow-y: auto;
        }
        
        .position-risk-item {
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 4px;
          transition: border-color 0.2s;
        }
        
        .position-risk-item:hover {
          border-color: #89dceb;
        }
        
        .position-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        
        .stock-name {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .stock-code {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .position-ratio {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .risk-info {
          margin-bottom: 12px;
        }
        
        .risk-level {
          font-size: 14px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        
        .price-info {
          display: flex;
          gap: 16px;
        }
        
        .stop-loss, .stop-profit {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .no-position-data {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .risk-warning-section {
          margin-bottom: 16px;
        }
        
        .risk-warning-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #FFD700;
        }
        
        .risk-warning-list {
          max-height: 150px;
          overflow-y: auto;
        }
        
        .warning-item {
          background: #2a0000;
          border: 1px solid #660000;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        
        .warning-icon {
          font-size: 16px;
          margin-top: 2px;
        }
        
        .warning-content {
          font-size: 14px;
          color: #f38ba8;
          line-height: 1.5;
        }
        
        /* 滚动条样式 */
        .position-risk-list::-webkit-scrollbar,
        .risk-warning-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .position-risk-list::-webkit-scrollbar-track,
        .risk-warning-list::-webkit-scrollbar-track {
          background: #000;
        }
        
        .position-risk-list::-webkit-scrollbar-thumb,
        .risk-warning-list::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        
        .position-risk-list::-webkit-scrollbar-thumb:hover,
        .risk-warning-list::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}