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
    <div className="assets-page border-zinc-800">
      <div className="page-header border-zinc-800">
        <h2 className="font-mono">账户资产</h2>
      </div>

      <div className="assets-container border-zinc-800">
        {/* 资产概览卡片 */}
        <div className="overview-cards border-zinc-800">
          <div className="asset-card border-zinc-800">
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">总市值</h3>
            </div>
            <div className="card-value font-mono">{totalMarketValue.toFixed(2)}</div>
          </div>
          
          <div className="asset-card border-zinc-800">
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">可用资金</h3>
            </div>
            <div className="card-value font-mono">{availableCash.toFixed(2)}</div>
          </div>
          
          <div className={`asset-card border-zinc-800 ${totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">总盈亏</h3>
            </div>
            <div className="card-value font-mono">
              {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toFixed(2)}
            </div>
          </div>
          
          <div className={`asset-card border-zinc-800 ${totalProfitLossRate >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">总盈亏率</h3>
            </div>
            <div className="card-value font-mono">
              {totalProfitLossRate >= 0 ? '+' : ''}{totalProfitLossRate.toFixed(2)}%
            </div>
          </div>
        </div>
        
        {/* 盈亏曲线图 */}
        <div className="chart-container border-zinc-800">
          <div className="chart-header border-zinc-800">
            <h3 className="font-mono">盈亏趋势</h3>
          </div>
          <div className="chart-content border-zinc-800">
            {/* 简单的模拟图表 */}
            <div className="chart-placeholder border-zinc-800">
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
          <div className="positions-container border-zinc-800">
            <div className="positions-header border-zinc-800">
              <h3 className="font-mono">持仓详情</h3>
            </div>
            {positions.length === 0 ? (
              <div className="no-positions border-zinc-800 font-mono">暂无持仓</div>
            ) : (
              <div className="positions-list border-zinc-800">
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

      </div>
    </div>
  );
};

export default Assets;