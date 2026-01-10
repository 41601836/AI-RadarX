'use client';

import React, { useState } from 'react';
import { useUserStore, PortfolioPosition } from '../../lib/store/user-portfolio';

// 历史盈亏数据类型定义
interface ProfitLossHistory {
  date: string;
  value: number;
}

// 编辑表单数据类型
type EditFormData = {
  averagePrice: number;
  shares: number;
};

const Assets: React.FC = () => {
  // 从用户存储中获取持仓和资产信息
  const { positions, availableCash, totalMarketValue, totalProfitLoss, totalProfitLossRate, updatePosition } = useUserStore();
  
  // 编辑状态
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({ averagePrice: 0, shares: 0 });
  
  // 模拟历史盈亏数据
  const profitLossHistory: ProfitLossHistory[] = [
    { date: '2024-01-01', value: 0 },
    { date: '2024-01-02', value: 5000 },
    { date: '2024-01-03', value: -2000 },
    { date: '2024-01-04', value: 8000 },
    { date: '2024-01-05', value: 12000 },
    { date: '2024-01-06', value: 7000 },
    { date: '2024-01-07', value: 15000 },
    { date: '2024-01-08', value: 18000 },
    { date: '2024-01-09', value: 16000 },
    { date: '2024-01-10', value: 20000 },
  ];
  
  // 处理编辑按钮点击
  const handleEditClick = (position: PortfolioPosition) => {
    setEditingPosition(position.stockCode);
    setEditFormData({
      averagePrice: position.averagePrice,
      shares: position.shares
    });
  };
  
  // 处理表单字段变化
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  // 处理保存编辑
  const handleSaveEdit = () => {
    if (editingPosition) {
      // 更新持仓信息
      updatePosition(editingPosition, editFormData);
      // 关闭编辑模式
      setEditingPosition(null);
    }
  };
  
  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingPosition(null);
  };

  return (
    <div className="assets-page">
      <div className="page-header">
        <h2>账户资产</h2>
      </div>

      <div className="assets-container">
        {/* 资产概览卡片 */}
        <div className="overview-cards">
          <div className="asset-card">
            <div className="card-header">
              <h3>总市值</h3>
            </div>
            <div className="card-value">{totalMarketValue.toFixed(2)}</div>
          </div>
          
          <div className="asset-card">
            <div className="card-header">
              <h3>可用资金</h3>
            </div>
            <div className="card-value">{availableCash.toFixed(2)}</div>
          </div>
          
          <div className={`asset-card ${totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header">
              <h3>总盈亏</h3>
            </div>
            <div className="card-value">
              {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toFixed(2)}
            </div>
          </div>
          
          <div className={`asset-card ${totalProfitLossRate >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header">
              <h3>总盈亏率</h3>
            </div>
            <div className="card-value">
              {totalProfitLossRate >= 0 ? '+' : ''}{totalProfitLossRate.toFixed(2)}%
            </div>
          </div>
        </div>
        
        {/* 盈亏曲线图 */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>盈亏趋势</h3>
          </div>
          <div className="chart-content">
            {/* 简单的模拟图表 */}
            <div className="chart-placeholder">
              <svg width="100%" height="300" viewBox="0 0 800 300">
                <defs>
                  <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a6e3a1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a6e3a1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* 网格线 */}
                <g className="grid">
                  <line x1="50" y1="50" x2="750" y2="50" stroke="#313244" strokeWidth="1" />
                  <line x1="50" y1="100" x2="750" y2="100" stroke="#313244" strokeWidth="1" />
                  <line x1="50" y1="150" x2="750" y2="150" stroke="#313244" strokeWidth="1" />
                  <line x1="50" y1="200" x2="750" y2="200" stroke="#313244" strokeWidth="1" />
                  <line x1="50" y1="250" x2="750" y2="250" stroke="#313244" strokeWidth="1" />
                </g>
                
                {/* Y轴标签 */}
                <g className="y-axis">
                  <text x="30" y="50" fill="#94a3b8" fontSize="12" textAnchor="end">20000</text>
                  <text x="30" y="100" fill="#94a3b8" fontSize="12" textAnchor="end">15000</text>
                  <text x="30" y="150" fill="#94a3b8" fontSize="12" textAnchor="end">10000</text>
                  <text x="30" y="200" fill="#94a3b8" fontSize="12" textAnchor="end">5000</text>
                  <text x="30" y="250" fill="#94a3b8" fontSize="12" textAnchor="end">0</text>
                </g>
                
                {/* 数据线 */}
                <path
                  d={`M 50,250 L 130,240 L 210,260 L 290,230 L 370,210 L 450,235 L 530,205 L 610,190 L 690,195 L 750,185`}
                  stroke="#a6e3a1"
                  strokeWidth="2"
                  fill="none"
                />
                
                {/* 填充区域 */}
                <path
                  d={`M 50,250 L 130,240 L 210,260 L 290,230 L 370,210 L 450,235 L 530,205 L 610,190 L 690,195 L 750,185 L 750,250 L 50,250 Z`}
                  fill="url(#profitGradient)"
                />
              </svg>
            </div>
          </div>
          
          {/* 持仓详情 */}
          <div className="positions-container">
            <div className="positions-header">
              <h3>持仓详情</h3>
            </div>
            {positions.length === 0 ? (
              <div className="no-positions">暂无持仓</div>
            ) : (
              <div className="positions-list">
                {positions.map(position => (
                  <div key={position.stockCode} className="position-item">
                    <div className="position-info">
                      <div className="stock-info">
                        <span className="stock-code">{position.stockCode}</span>
                        <span className="stock-name">{position.stockName}</span>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditClick(position)}
                          title="编辑持仓"
                        >
                          📝
                        </button>
                      </div>
                      
                      {editingPosition === position.stockCode ? (
                        // 编辑表单
                        <div className="edit-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`averagePrice-${position.stockCode}`}>成本价：</label>
                              <input
                                type="number"
                                id={`averagePrice-${position.stockCode}`}
                                name="averagePrice"
                                value={editFormData.averagePrice}
                                onChange={handleFormChange}
                                className="form-input"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor={`shares-${position.stockCode}`}>持仓股数：</label>
                              <input
                                type="number"
                                id={`shares-${position.stockCode}`}
                                name="shares"
                                value={editFormData.shares}
                                onChange={handleFormChange}
                                className="form-input"
                                step="1"
                                min="0"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button 
                              className="save-btn"
                              onClick={handleSaveEdit}
                            >
                              保存
                            </button>
                            <button 
                              className="cancel-btn"
                              onClick={handleCancelEdit}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 持仓详情
                        <div className="position-details">
                          <div className="detail-item">
                            <span className="detail-label">持仓股数：</span>
                            <span className="detail-value">{position.shares.toFixed(0)}股</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">成本价：</span>
                            <span className="detail-value">{position.averagePrice.toFixed(2)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">当前价：</span>
                            <span className="detail-value">{position.currentPrice.toFixed(2)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">市值：</span>
                            <span className="detail-value">{position.marketValue.toFixed(2)}</span>
                          </div>
                          <div className={`detail-item ${position.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                            <span className="detail-label">盈亏：</span>
                            <span className="detail-value">
                              {position.profitLoss >= 0 ? '+' : ''}{position.profitLoss.toFixed(2)}
                            </span>
                          </div>
                          <div className={`detail-item ${position.profitLossRate >= 0 ? 'positive' : 'negative'}`}>
                            <span className="detail-label">盈亏率：</span>
                            <span className="detail-value">
                              {position.profitLossRate >= 0 ? '+' : ''}{position.profitLossRate.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      <style jsx>{`
        .assets-page {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h2 {
          margin: 0;
          font-size: 24px;
          color: #c4a7e7;
          font-weight: 500;
        }

        .assets-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .overview-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .asset-card {
          background-color: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          border: 1px solid #2a2a3a;
          transition: transform 0.2s;
        }

        .asset-card:hover {
          transform: translateY(-2px);
        }

        .asset-card.positive {
          border-color: #a6e3a1;
          background-color: rgba(166, 227, 161, 0.1);
        }

        .asset-card.negative {
          border-color: #f38ba8;
          background-color: rgba(243, 139, 168, 0.1);
        }

        .card-header {
          margin-bottom: 16px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }

        .card-value {
          font-size: 32px;
          font-weight: 600;
          color: #cdd6f4;
        }

        .chart-container {
          background-color: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #2a2a3a;
        }

        .chart-header {
          margin-bottom: 20px;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 18px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .chart-content {
          height: 300px;
        }

        .chart-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .grid line {
          stroke-dasharray: 5 5;
        }

        .y-axis text {
          font-size: 12px;
        }

        .positions-container {
          background-color: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #2a2a3a;
        }

        .positions-header {
          margin-bottom: 20px;
        }

        .positions-header h3 {
          margin: 0;
          font-size: 18px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .no-positions {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
        }

        .positions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .position-item {
          background-color: #2a2a3a;
          border-radius: 8px;
          padding: 16px;
        }

        .position-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stock-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .stock-code {
          color: #cdd6f4;
          font-weight: 500;
        }

        .stock-name {
          color: #cdd6f4;
        }

        .position-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-item {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .detail-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .detail-value {
          color: #cdd6f4;
          font-size: 14px;
          font-weight: 500;
        }

        .detail-item.positive .detail-value {
          color: #a6e3a1;
        }

        .detail-item.negative .detail-value {
          color: #f38ba8;
        }
        
        /* 编辑按钮样式 */
        .edit-btn {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
          color: #94a3b8;
        }
        
        .edit-btn:hover {
          color: #89dceb;
        }
        
        /* 编辑表单样式 */
        .edit-form {
          background-color: #1e1e2e;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #313244;
          margin-top: 12px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          color: #cdd6f4;
          font-size: 14px;
          font-weight: 500;
        }
        
        .form-input {
          padding: 8px 12px;
          border: 1px solid #313244;
          border-radius: 4px;
          background-color: #2a2a3a;
          color: #cdd6f4;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #89dceb;
        }
        
        .form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .save-btn {
          padding: 8px 16px;
          background-color: #89dceb;
          color: #1e1e2e;
          border: 1px solid #89dceb;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .save-btn:hover {
          background-color: #a6e3a1;
          border-color: #a6e3a1;
        }
        
        .cancel-btn {
          padding: 8px 16px;
          background-color: #313244;
          color: #cdd6f4;
          border: 1px solid #313244;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .cancel-btn:hover {
          background-color: #2a2a3a;
          border-color: #89dceb;
        }
      `}</style>
    </div>
  );
};

export default Assets;