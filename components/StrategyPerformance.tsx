// StrategyPerformance 策略回测收益展示组件
'use client';

import React from 'react';
import { BacktestResult } from '../lib/algorithms/backtester';
import Skeleton from './Skeleton';

interface StrategyPerformanceProps {
  backtestResult: BacktestResult | null;
  loading: boolean;
}

export default function StrategyPerformance({ backtestResult, loading }: StrategyPerformanceProps) {
  if (loading) {
    return (
      <div className="strategy-performance">
        <div className="skeleton-container">
          <Skeleton type="text" width="200px" height="24px" className="mb-4" />
          <div className="metrics-skeleton">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="metric-skeleton">
                <Skeleton type="text" width="80px" height="16px" />
                <Skeleton type="text" width="60px" height="20px" className="mt-2" />
              </div>
            ))}
          </div>
          <Skeleton type="chart" width="100%" height="200px" className="mt-8" />
        </div>
        
        <style jsx>{`
          .skeleton-container {
            padding: 16px;
            height: 100%;
          }
          
          .metrics-skeleton {
            display: flex;
            gap: 20px;
            margin-top: 20px;
          }
          
          .metric-skeleton {
            flex: 1;
          }
        `}</style>
      </div>
    );
  }

  if (!backtestResult) {
    return (
      <div className="strategy-performance">
        <div className="empty-state">
          <p>请选择历史日期开始回测</p>
        </div>
      </div>
    );
  }

  const { 
    totalReturn, 
    annualReturn, 
    maxDrawdown, 
    sharpeRatio, 
    performanceData 
  } = backtestResult;

  return (
    <div className="strategy-performance">
      <div className="performance-header">
        <h3>策略回测收益分析</h3>
        <div className="date-range">
          <span>回测日期: {backtestResult.startDate} 至 {backtestResult.endDate}</span>
        </div>
      </div>
      
      <div className="performance-content">
        {/* 关键回测指标 */}
        <div className="performance-metrics">
          <div className="metric-item">
            <span className="metric-label">总收益率</span>
            <span className={`metric-value ${totalReturn >= 0 ? 'positive' : 'negative'}`}>
              {(totalReturn).toFixed(2)}%
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">年化收益率</span>
            <span className={`metric-value ${annualReturn >= 0 ? 'positive' : 'negative'}`}>
              {(annualReturn).toFixed(2)}%
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">最大回撤</span>
            <span className="metric-value negative">
              {(-maxDrawdown).toFixed(2)}%
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">夏普比率</span>
            <span className="metric-value">
              {sharpeRatio.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 收益曲线图表 */}
        <div className="performance-chart-container">
          <h4>模拟收益曲线</h4>
          <div className="performance-chart">
            <div className="chart-header">
              <span>累计收益率</span>
              <span>日期</span>
            </div>
            <div className="chart-content">
              <svg width="100%" height="300" viewBox="0 0 1000 300">
                {/* 坐标轴 */}
                <line x1="50" y1="250" x2="950" y2="250" stroke="#3a3a4a" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="250" stroke="#3a3a4a" strokeWidth="2" />
                
                {/* X轴刻度和标签 */}
                {performanceData.length > 0 && performanceData.slice(0, 10).map((data, index) => {
                  const x = 50 + (index * 90);
                  return (
                    <g key={index}>
                      <line x1={x} y1="250" x2={x} y2="255" stroke="#3a3a4a" strokeWidth="1" />
                      <text x={x} y="265" fontSize="10" textAnchor="middle" fill="#94a3b8">
                        {data.date.slice(-5)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y轴刻度和标签 */}
                {[0, 10, 20, 30, 40, 50].map((value, index) => {
                  const y = 250 - (index * 40);
                  return (
                    <g key={index}>
                      <line x1="45" y1={y} x2="50" y2={y} stroke="#3a3a4a" strokeWidth="1" />
                      <text x="35" y={y + 5} fontSize="10" textAnchor="end" fill="#94a3b8">
                        {value}%
                      </text>
                    </g>
                  );
                })}
                
                {/* 收益曲线 */}
                <polyline 
                  points={performanceData.map((data, index) => {
                    const x = 50 + (index * (900 / (performanceData.length - 1)));
                    const y = 250 - (data.return * 4); // 每1%对应4px
                    return `${x},${Math.max(50, Math.min(250, y))}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#89dceb"
                  strokeWidth="2"
                />
                
                {/* 填充区域 */}
                <polygon 
                  points={`50,250 ${performanceData.map((data, index) => {
                    const x = 50 + (index * (900 / (performanceData.length - 1)));
                    const y = 250 - (data.return * 4);
                    return `${x},${Math.max(50, Math.min(250, y))}`;
                  }).join(' ')} ${50 + (900 / (performanceData.length - 1)) * (performanceData.length - 1)},250`}
                  fill="rgba(137, 220, 235, 0.2)"
                  stroke="none"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 回测详情 */}
        <div className="performance-details">
          <h4>回测详情</h4>
          <div className="details-table">
            <div className="table-row header">
              <span>初始资金</span>
              <span>最终资金</span>
              <span>交易次数</span>
              <span>胜率</span>
            </div>
            <div className="table-row even">
              <span>¥{(backtestResult.initialCapital / 100).toFixed(2)}</span>
              <span>¥{(backtestResult.finalCapital / 100).toFixed(2)}</span>
              <span>{backtestResult.tradeRecords.length}</span>
              <span>
                {backtestResult.tradeRecords.length > 0 ? 
                  `${((backtestResult.tradeRecords.filter(record => record.action === 'sell').length / backtestResult.tradeRecords.length) * 100).toFixed(0)}%` : 
                  '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .strategy-performance {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 16px;
          color: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .performance-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        .performance-header h3 {
          margin: 0;
          font-size: 18px;
          color: #89dceb;
        }
        
        .date-range {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .performance-content {
          flex: 1;
          overflow-y: auto;
        }

        .performance-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .metric-item {
          background: rgba(42, 42, 58, 0.5);
          border-radius: 4px;
          padding: 12px;
          text-align: center;
        }

        .metric-label {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .metric-value {
          display: block;
          font-size: 18px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .metric-value.positive {
          color: #00FF94;
          text-shadow: 0 0 10px rgba(0, 255, 148, 0.5);
        }

        .metric-value.negative {
          color: #FF0066;
          text-shadow: 0 0 10px rgba(255, 0, 102, 0.3);
        }

        .performance-chart-container, .performance-details {
          margin-bottom: 24px;
        }

        .performance-chart-container h4, .performance-details h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #c4a7e7;
          padding-bottom: 6px;
          border-bottom: 1px solid #ffffff/10;
        }

        .performance-chart, .details-table {
          background: rgba(42, 42, 58, 0.3);
          border-radius: 4px;
          padding: 16px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 12px;
          color: #94a3b8;
        }

        .chart-content {
          width: 100%;
          height: 300px;
        }

        .details-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 10px 0;
        }

        .table-row > span {
          text-align: right;
        }

        .table-row > span:first-child {
          text-align: left;
        }

        .table-row.header {
          font-weight: bold;
          color: #c4a7e7;
        }

        .table-row.even {
          background: white/[0.02];
          border-radius: 4px;
        }

        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
