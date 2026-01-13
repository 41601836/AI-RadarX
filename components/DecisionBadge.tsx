'use client';

import React from 'react';

interface DecisionBadgeProps {
  agent: string;
  decision: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

const DecisionBadge: React.FC<DecisionBadgeProps> = ({ agent, decision, confidence }) => {
  const getDecisionColor = () => {
    switch (decision) {
      case 'bullish':
        return '#10b981'; // 绿色
      case 'bearish':
        return '#ef4444'; // 红色
      case 'neutral':
        return '#6b7280'; // 灰色
    }
  };

  const getDecisionText = () => {
    switch (decision) {
      case 'bullish':
        return '看多';
      case 'bearish':
        return '看空';
      case 'neutral':
        return '中性';
    }
  };

  return (
    <div className="decision-badge">
      <div className="agent-name">{agent}</div>
      <div className="decision-content">
        <span 
          className="decision-label" 
          style={{ backgroundColor: getDecisionColor() }}
        >
          {getDecisionText()}
        </span>
        <span className="confidence-score">{confidence}%</span>
      </div>

      <style jsx>{`
        .decision-badge {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .decision-badge:hover {
          border-color: #89dceb;
          box-shadow: 0 0 15px rgba(137, 220, 235, 0.3);
        }

        .agent-name {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .decision-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .decision-label {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
          transition: all 0.3s ease;
        }

        .decision-label:hover {
          transform: scale(1.05);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
        }

        .confidence-score {
          font-size: 14px;
          font-weight: 600;
          color: #89dceb;
          text-shadow: 0 0 5px rgba(137, 220, 235, 0.3);
        }
      `}</style>
    </div>
  );
};

export default DecisionBadge;