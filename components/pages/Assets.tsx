'use client';

import React, { useState } from 'react';
import { useUserStore, PortfolioPosition } from '../../lib/store/user-portfolio';
import { 
  calculateRSI, 
  calculateMACD, 
  calculateKDJ,
  calculateBollingerBands
} from '../../lib/algorithms/technicalIndicators';
import { formatNumberToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';

// 健康度评分接口
export interface HealthScore {
  score: number; // 0-100的健康度评分
  factors: {
    rsi: number;
    macd: number;
    kdj: number;
    profitLoss: number;
    bollinger: number;
  };
}

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

// 生成模拟K线数据用于计算技术指标
const generateMockKlineData = (currentPrice: number, days: number = 30) => {
  const data = [];
  let price = currentPrice * (0.95 + Math.random() * 0.1); // 初始价格在当前价格的95%-105%之间
  
  for (let i = 0; i < days; i++) {
    const open = price;
    const high = open * (1 + Math.random() * 0.05);
    const low = open * (1 - Math.random() * 0.05);
    const close = low + (Math.random() * (high - low));
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({ open, high, low, close, volume });
    price = close; // 下一天的开盘价基于今天的收盘价
  }
  
  return data;
};

// 计算股票健康度评分
const calculateHealthScore = (position: PortfolioPosition): HealthScore => {
  // 生成模拟K线数据
  const klineData = generateMockKlineData(position.currentPrice);
  const closePrices = klineData.map(d => d.close);
  const highPrices = klineData.map(d => d.high);
  const lowPrices = klineData.map(d => d.low);
  const openPrices = klineData.map(d => d.open);
  
  // 计算技术指标
  const rsi = calculateRSI({ data: closePrices, period: 14 });
  const macd = calculateMACD({ data: closePrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  const kdj = calculateKDJ({ high: highPrices, low: lowPrices, close: closePrices, period: 9, kPeriod: 3, dPeriod: 3 });
  const bollinger = calculateBollingerBands({ close: closePrices, period: 20, standardDeviations: 2 });
  
  // 计算RSI因子 (RSI在30-70之间为健康，否则不健康)
  const latestRSI = rsi[rsi.length - 1] || 50;
  let rsiFactor = 0;
  if (latestRSI >= 30 && latestRSI <= 70) {
    rsiFactor = 20; // 满分20分
  } else if (latestRSI >= 20 && latestRSI <= 80) {
    rsiFactor = 15; // 15分
  } else {
    rsiFactor = 5; // 5分
  }
  
  // 计算MACD因子 (MACD柱状图在合理范围内为健康)
  const latestMACD = macd.histogram[macd.histogram.length - 1] || 0;
  let macdFactor = 0;
  if (Math.abs(latestMACD) < 0.5) {
    macdFactor = 20; // 满分20分
  } else if (Math.abs(latestMACD) < 1) {
    macdFactor = 15; // 15分
  } else {
    macdFactor = 5; // 5分
  }
  
  // 计算KDJ因子 (KDJ在20-80之间为健康)
  const latestK = kdj.k[kdj.k.length - 1] || 50;
  const latestD = kdj.d[kdj.d.length - 1] || 50;
  let kdjFactor = 0;
  if (latestK >= 20 && latestK <= 80 && latestD >= 20 && latestD <= 80) {
    kdjFactor = 20; // 满分20分
  } else if (latestK >= 10 && latestK <= 90 && latestD >= 10 && latestD <= 90) {
    kdjFactor = 15; // 15分
  } else {
    kdjFactor = 5; // 5分
  }
  
  // 计算盈亏因子 (盈利为健康，亏损较少为中等，亏损较多为不健康)
  let profitLossFactor = 0;
  if (position.profitLossRate >= 0) {
    profitLossFactor = 20; // 满分20分
  } else if (position.profitLossRate >= -5) {
    profitLossFactor = 15; // 15分
  } else if (position.profitLossRate >= -10) {
    profitLossFactor = 10; // 10分
  } else {
    profitLossFactor = 5; // 5分
  }
  
  // 计算布林带因子 (价格在布林带内为健康)
  const latestPrice = closePrices[closePrices.length - 1];
  const latestUpper = bollinger.upper[bollinger.upper.length - 1] || latestPrice * 1.1;
  const latestLower = bollinger.lower[bollinger.lower.length - 1] || latestPrice * 0.9;
  let bollingerFactor = 0;
  if (latestPrice >= latestLower && latestPrice <= latestUpper) {
    bollingerFactor = 20; // 满分20分
  } else {
    bollingerFactor = 10; // 10分
  }
  
  // 计算总评分
  const totalScore = rsiFactor + macdFactor + kdjFactor + profitLossFactor + bollingerFactor;
  
  return {
    score: totalScore,
    factors: {
      rsi: rsiFactor,
      macd: macdFactor,
      kdj: kdjFactor,
      profitLoss: profitLossFactor,
      bollinger: bollingerFactor
    }
  };
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
            <div className="card-value font-mono">{formatNumberToFixed2(totalMarketValue)}</div>
          </div>
          
          <div className="asset-card border-zinc-800">
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">可用资金</h3>
            </div>
            <div className="card-value font-mono">{formatNumberToFixed2(availableCash)}</div>
          </div>
          
          <div className={`asset-card border-zinc-800 ${totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">总盈亏</h3>
            </div>
            <div className="card-value font-mono">
              {totalProfitLoss >= 0 ? '+' : ''}{formatNumberToFixed2(totalProfitLoss)}
            </div>
          </div>
          
          <div className={`asset-card border-zinc-800 ${totalProfitLossRate >= 0 ? 'positive' : 'negative'}`}>
            <div className="card-header border-zinc-800">
              <h3 className="font-mono">总盈亏率</h3>
            </div>
            <div className="card-value font-mono">
              {totalProfitLossRate >= 0 ? '+' : ''}{formatNumberToFixed2(totalProfitLossRate)}%
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
            <div className="positions-list border-zinc-800">
              {/* 生成高密度占位数据矩阵 */}
              {positions.length === 0 ? (
                // 模拟持仓数据
                Array.from({ length: 20 }, (_, index) => ({
                  stockCode: `SH60000${index + 1}`,
                  stockName: `模拟股票${index + 1}`,
                  shares: Math.floor(Math.random() * 10000) + 1000,
                  averagePrice: Math.random() * 50 + 10,
                  currentPrice: Math.random() * 50 + 10,
                  marketValue: Math.random() * 1000000 + 100000,
                  profitLoss: Math.random() * 20000 - 10000,
                  profitLossRate: Math.random() * 20 - 10
                })).map(position => (
                  <div key={position.stockCode} className="position-item">
                    <div className="position-info">
                      <div className="stock-info">
                        <span className="stock-code">{position.stockCode}</span>
                        <span className="stock-name">{position.stockName}</span>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditClick(position as PortfolioPosition)}
                          title="编辑持仓"
                        >
                          📝
                        </button>
                      </div>
                       
                      {/* 持仓详情 */}
                    <div className="position-details">
                      <div className="detail-item">
                        <span className="detail-label">持仓股数：</span>
                        <span className="detail-value">{Math.round(position.shares)}股</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">成本价：</span>
                        <span className="detail-value">{formatNumberToFixed2(position.averagePrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">当前价：</span>
                        <span className="detail-value">{formatNumberToFixed2(position.currentPrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">市值：</span>
                        <span className="detail-value">{formatNumberWithUnit(position.marketValue)}</span>
                      </div>
                      <div className={`detail-item ${position.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        <span className="detail-label">盈亏：</span>
                        <span className="detail-value">
                          {position.profitLoss >= 0 ? '+' : ''}{formatNumberWithUnit(position.profitLoss)}
                        </span>
                      </div>
                      <div className={`detail-item ${position.profitLossRate >= 0 ? 'positive' : 'negative'}`}>
                        <span className="detail-label">盈亏率：</span>
                        <span className="detail-value">
                          {position.profitLossRate >= 0 ? '+' : ''}{formatNumberToFixed2(position.profitLossRate)}%
                        </span>
                      </div>
                      {/* 健康度评分 */}
                      <div className="detail-item">
                        <span className="detail-label">健康度：</span>
                        <span className="detail-value">
                          {(() => {
                            const healthScore = calculateHealthScore(position as PortfolioPosition);
                            const score = healthScore.score;
                            const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
                            return <span className={color}>{score}/100</span>;
                          })()}
                        </span>
                      </div>
                    </div>
                    </div>
                  </div>
                ))
              ) : (
                // 真实持仓数据
                positions.map(position => (
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
                              title="保存 (Ctrl+S)"
                            >
                              保存
                              <span className="shortcut">(Ctrl+S)</span>
                            </button>
                            <button 
                              className="cancel-btn"
                              onClick={handleCancelEdit}
                              title="取消 (Esc)"
                            >
                              取消
                              <span className="shortcut">(Esc)</span>
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
                          {/* 健康度评分 */}
                          <div className="detail-item">
                            <span className="detail-label">健康度：</span>
                            <span className="detail-value">
                              {(() => {
                                const healthScore = calculateHealthScore(position);
                                const score = healthScore.score;
                                const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
                                return <span className={color}>{score}/100</span>;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Assets;

const styles = `
  /* 资产页面专用样式 */
  .assets-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background-color: #000000;
  }

  .page-header {
    padding: 8px 16px;
    background-color: #000000;
    color: #00FF00;
    border-bottom: 1px solid #00FF00;
    font-weight: bold;
  }

  .assets-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 8px;
  }

  /* 资产概览卡片样式 */
  .overview-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }

  .asset-card {
    padding: 12px;
    background-color: #000000;
    border: 1px solid #00FF00;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .asset-card .card-header {
    font-size: 14px;
    color: #FFFFFF;
    text-transform: uppercase;
  }

  .asset-card .card-value {
    font-size: 24px;
    font-weight: bold;
  }

  /* 为总市值和总盈亏添加荧光高亮效果 */
  .asset-card:nth-child(1) .card-value { /* 总市值 */
    color: #00FFFF;
    text-shadow: 0 0 10px #00FFFF;
  }

  .asset-card:nth-child(3) .card-value { /* 总盈亏 */
    color: #FF00FF;
    text-shadow: 0 0 10px #FF00FF;
  }

  /* 盈亏趋势图表样式 */
  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .chart-header {
    padding: 8px;
    background-color: #000000;
    color: #00FF00;
    border: 1px solid #00FF00;
  }

  .chart-content {
    flex: 1;
    overflow: hidden;
  }

  /* 持仓详情样式 */
  .positions-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .positions-header {
    padding: 8px;
    background-color: #000000;
    color: #00FF00;
    border: 1px solid #00FF00;
  }

  .positions-list {
    flex: 1;
    overflow-y: auto;
  }

  .position-item {
    padding: 8px;
    border-bottom: 1px solid #333;
  }

  .position-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stock-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stock-code {
    font-weight: bold;
    color: #FFFFFF;
  }

  .stock-name {
    color: #CCCCCC;
  }

  .edit-btn {
    padding: 2px 6px;
    font-size: 12px;
    background-color: #000000;
    color: #00FF00;
    border: 1px solid #00FF00;
    cursor: pointer;
  }

  .edit-btn:hover {
    background-color: #00FF00;
    color: #000000;
  }

  .position-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    padding: 8px 0;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-label {
    font-size: 12px;
    color: #888888;
  }

  .detail-value {
    font-size: 14px;
    font-weight: bold;
    color: #FFFFFF;
  }

  /* 编辑表单样式 */
  .edit-form {
    padding: 8px;
    border: 1px solid #00FF00;
    background-color: #000000;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 8px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-input {
    padding: 4px 8px;
    background-color: #000000;
    color: #FFFFFF;
    border: 1px solid #00FF00;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .save-btn, .cancel-btn {
    padding: 4px 12px;
    font-size: 14px;
    cursor: pointer;
  }

  .save-btn {
    background-color: #000000;
    color: #00FF00;
    border: 1px solid #00FF00;
  }

  .save-btn:hover {
    background-color: #00FF00;
    color: #000000;
  }

  .cancel-btn {
    background-color: #000000;
    color: #FF0000;
    border: 1px solid #FF0000;
  }

  .cancel-btn:hover {
    background-color: #FF0000;
    color: #000000;
  }

  .shortcut {
    font-size: 12px;
    margin-left: 4px;
    color: #888888;
  }

  /* 上涨/下跌颜色 */
  .positive {
    color: #00FF00;
  }

  .negative {
    color: #FF0000;
  }
`;

// 创建样式标签并添加到文档头部
if (typeof window !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}