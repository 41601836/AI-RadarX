'use client';

import React from 'react';

// 策略类型定义
interface Strategy {
  id: string;
  name: string;
  type: 'chip' | 'heatflow' | 'technical' | 'custom';
  status: 'active' | 'inactive';
  profitRate: number;
  winRate: number;
  description: string;
}

const Strategy: React.FC = () => {
  // 模拟策略列表
  const strategies: Strategy[] = [
    {
      id: '1',
      name: '筹码密集度策略',
      type: 'chip',
      status: 'active',
      profitRate: 25.5,
      winRate: 78,
      description: '基于筹码分布和集中度变化进行买卖决策'
    },
    {
      id: '2',
      name: '游资异动追踪',
      type: 'heatflow',
      status: 'active',
      profitRate: 32.8,
      winRate: 65,
      description: '监控游资席位异动，追踪热门个股'
    },
    {
      id: '3',
      name: '均线多头排列',
      type: 'technical',
      status: 'inactive',
      profitRate: 18.2,
      winRate: 72,
      description: '基于均线系统的多头排列信号'
    },
    {
      id: '4',
      name: '自定义趋势策略',
      type: 'custom',
      status: 'active',
      profitRate: 15.6,
      winRate: 68,
      description: '结合多种技术指标的自定义策略'
    }
  ];

  return (
    <div className="strategy-page">
      <div className="page-header">
        <h2>策略管理</h2>
      </div>

      <div className="strategies-container">
        <div className="strategies-list">
          {strategies.map(strategy => (
            <div key={strategy.id} className={`strategy-card strategy-${strategy.status}`}>
              <div className="strategy-header">
                <div className="strategy-info">
                  <h3 className="strategy-name">{strategy.name}</h3>
                  <div className="strategy-meta">
                    <span className={`strategy-type type-${strategy.type}`}>
                      {strategy.type === 'chip' && '筹码分析'}
                      {strategy.type === 'heatflow' && '游资追踪'}
                      {strategy.type === 'technical' && '技术指标'}
                      {strategy.type === 'custom' && '自定义'}
                    </span>
                    <span className={`strategy-status ${strategy.status}`}>
                      {strategy.status === 'active' ? '🟢 运行中' : '⚪ 已暂停'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="strategy-description">
                {strategy.description}
              </div>

              <div className="strategy-performance">
                <div className="performance-item">
                  <span className="performance-label">收益率</span>
                  <span className="performance-value">{strategy.profitRate.toFixed(2)}%</span>
                </div>
                <div className="performance-item">
                  <span className="performance-label">胜率</span>
                  <span className="performance-value">{strategy.winRate.toFixed(0)}%</span>
                </div>
              </div>

              <div className="strategy-actions">
                <button className="action-btn">
                  {strategy.status === 'active' ? '暂停' : '启动'}
                </button>
                <button className="action-btn">编辑</button>
                <button className="action-btn">详情</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .strategy-page {
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

        .strategies-container {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          height: calc(100% - 100px);
        }

        .strategies-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .strategy-card {
          background-color: #2a2a3a;
          border-radius: 8px;
          padding: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .strategy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .strategy-card.strategy-active {
          border-left: 4px solid #a6e3a1;
        }

        .strategy-card.strategy-inactive {
          border-left: 4px solid #94a3b8;
        }

        .strategy-header {
          margin-bottom: 12px;
        }

        .strategy-name {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .strategy-meta {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .strategy-type {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .type-chip {
          background-color: rgba(166, 227, 161, 0.2);
          color: #a6e3a1;
        }

        .type-heatflow {
          background-color: rgba(243, 139, 168, 0.2);
          color: #f38ba8;
        }

        .type-technical {
          background-color: rgba(249, 226, 175, 0.2);
          color: #f9e2af;
        }

        .type-custom {
          background-color: rgba(137, 220, 235, 0.2);
          color: #89dceb;
        }

        .strategy-status {
          font-size: 12px;
        }

        .strategy-status.active {
          color: #a6e3a1;
        }

        .strategy-status.inactive {
          color: #94a3b8;
        }

        .strategy-description {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .strategy-performance {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
        }

        .performance-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .performance-label {
          font-size: 12px;
          color: #94a3b8;
        }

        .performance-value {
          font-size: 18px;
          font-weight: 500;
          color: #cdd6f4;
        }

        .strategy-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid #313244;
          border-radius: 4px;
          background-color: #1e1e2e;
          color: #cdd6f4;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background-color: #313244;
          border-color: #89dceb;
        }
      `}</style>
    </div>
  );
};

export default Strategy;