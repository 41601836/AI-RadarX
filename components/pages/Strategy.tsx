'use client';

import React, { useState, useEffect } from 'react';
import { useStrategyStore } from '../../lib/store/useStrategyStore';
import { useUserStore } from '../../lib/store/user-portfolio';
import { useStockContext } from '../../lib/context/StockContext';
import DecisionBadge from '../DecisionBadge';
import StrategyConsole from '../StrategyConsole';
import { StockBasicInfo } from '../../lib/api/market';

const Strategy: React.FC = () => {
  // 添加客户端仅渲染模式
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 在组件挂载前不渲染任何内容
  if (!mounted) return null;
  
  const { 
    runConsensus, 
    getStockConsensus, 
    isProcessing, 
    agentVotes,
    consensusResults,
    clearStockData 
  } = useStrategyStore();
  
  // 添加用户状态管理和股票上下文
  const { setActiveTab } = useUserStore();
  const { setCurrentTicker } = useStockContext();
  
  const [stockCode, setStockCode] = useState('000001'); // 默认股票代码
  const [stockName, setStockName] = useState('平安银行'); // 默认股票名称
  
  // 获取当前股票的共识结果
  const currentConsensus = getStockConsensus(stockCode);
  const isCalculating = isProcessing[stockCode] || false;
  const currentVotes = agentVotes[stockCode] || [];
  
  // 定义决策日志数据
  const decisionLogs: any[] = [];

  return (
    <div className="strategy-page">
      {/* 左侧：策略配置 */}
      <div className="left-panel">
        <div className="panel-card">
          <h3>策略配置</h3>
          <div className="config-section">
            <label>风险偏好</label>
            <div className="risk-slider">
              <input type="range" min="1" max="10" defaultValue="5" />
              <div className="risk-labels">
                <span>保守</span>
                <span>稳健</span>
                <span>激进</span>
              </div>
            </div>
          </div>
          
          <div className="config-section">
            <label>持仓周期</label>
            <div className="period-options">
              <button className="period-btn active">短线</button>
              <button className="period-btn">中线</button>
              <button className="period-btn">长线</button>
            </div>
          </div>
          
          <div className="config-section">
            <label>关注板块</label>
            <div className="sector-tags">
              <span className="sector-tag">科技</span>
              <span className="sector-tag">医药</span>
              <span className="sector-tag">新能源</span>
              <span className="sector-tag">金融</span>
            </div>
          </div>
          
          <button 
            className={`analyze-btn ${isCalculating ? 'calculating' : ''}`}
            onClick={() => runConsensus(stockCode, stockName)}
            disabled={isCalculating}
          >
            {isCalculating ? '分析中...' : '开始AI会诊'}
          </button>
          
          {isCalculating && (
            <div className="pulse-overlay">
              <div className="pulse-animation">
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
                <div className="pulse-center">AI 分析中...</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 中间：核心决策看板 */}
      <div className="middle-panel">
        {/* 总指挥结论 */}
        <div className="conclusion-card">
          <h3>AI 多智能体会诊结论</h3>
          <div className="conclusion-content">
            <div className="overall-decision">
              <span 
                className={`decision-label ${currentConsensus?.finalDecision === 'buy' ? 'bullish' : currentConsensus?.finalDecision === 'sell' ? 'bearish' : 'neutral'}`}
                onClick={() => {
                  if (currentConsensus && currentConsensus.finalDecision === 'buy') {
                    // 设置全局当前股票
                    const currentStock: StockBasicInfo = {
                      ts_code: stockCode,
                      symbol: stockCode,
                      name: stockName,
                      area: '',
                      industry: '',
                      market: '',
                      list_date: '',
                    };
                    setCurrentTicker(currentStock);
                    // 切换到交易页面
                    setActiveTab('trade');
                  }
                }}
              >
                {currentConsensus ? (
                  currentConsensus.finalDecision === 'buy' ? '积极看多' : 
                  currentConsensus.finalDecision === 'sell' ? '积极看空' : '观望等待'
                ) : '等待分析'}
              </span>
              <span className="confidence-score">
                {currentConsensus ? `${(currentConsensus.confidence * 100).toFixed(1)}%` : '--'}
              </span>
            </div>
            <p className="decision-desc">
              {currentConsensus ? currentConsensus.reasoning : '点击"开始AI会诊"按钮启动多智能体分析...'}
            </p>
            
            <div className="agent-decisions">
              {currentVotes.map((vote) => (
                <DecisionBadge 
                  key={vote.agentId}
                  agent={vote.agentName} 
                  decision={vote.direction === 'buy' ? 'bullish' : vote.direction === 'sell' ? 'bearish' : 'neutral'} 
                  confidence={Math.round(vote.confidence * 100)} 
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* 思考链控制台 */}
        <div className="console-container">
          <StrategyConsole stockCode={stockCode} />
        </div>
      </div>
      
      {/* 右侧：历史决策回测 */}
      <div className="right-panel">
        <div className="panel-card">
          <h3>历史回测表现</h3>
          <div className="performance-metrics">
            <div className="metric-item">
              <span className="metric-label">总收益</span>
              <span className="metric-value positive">+24.5%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">最大回撤</span>
              <span className="metric-value negative">-8.2%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">胜率</span>
              <span className="metric-value positive">68%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">平均盈亏比</span>
              <span className="metric-value positive">2.3:1</span>
            </div>
          </div>
          
          <div className="chart-placeholder">
            <div className="chart-title">收益曲线</div>
            <div className="chart-skeleton">
              {/* 简单的收益曲线骨架图 */}
              <div className="skeleton-line"></div>
            </div>
          </div>
          
          <div className="recent-trades">
            <h4>近期决策</h4>
            <div className="trade-item">
              <span className="trade-date">2026-01-12</span>
              <span className="trade-decision bullish">看多</span>
              <span className="trade-result positive">+3.2%</span>
            </div>
            <div className="trade-item even">
              <span className="trade-date">2026-01-11</span>
              <span className="trade-decision bearish">看空</span>
              <span className="trade-result positive">+1.8%</span>
            </div>
            <div className="trade-item">
              <span className="trade-date">2026-01-10</span>
              <span className="trade-decision bullish">看多</span>
              <span className="trade-result negative">-0.5%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .strategy-page {
          height: 100%;
          background: #11111b;
          display: grid;
          grid-template-columns: 300px 1fr 350px;
          gap: 20px;
          padding: 20px;
          overflow: hidden;
        }

        /* 面板通用样式 */
        .left-panel, .middle-panel, .right-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel-card {
          background: rgba(30, 30, 46, 0.7);
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        }

        h3 {
          color: #c4a7e7;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 20px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* 左侧面板样式 */
        .config-section {
          margin-bottom: 24px;
        }

        .config-section label {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .risk-slider {
          margin-bottom: 16px;
        }

        .risk-slider input {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
          outline: none;
          -webkit-appearance: none;
          box-shadow: 0 0 10px rgba(137, 220, 235, 0.3);
        }

        .risk-slider input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #89dceb;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(137, 220, 235, 0.8);
          transition: all 0.3s ease;
        }

        .risk-slider input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(137, 220, 235, 1);
        }

        .risk-labels {
          display: flex;
          justify-content: space-between;
          color: #6b7280;
          font-size: 12px;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .period-options {
          display: flex;
          gap: 8px;
        }

        .period-btn {
          flex: 1;
          padding: 10px 12px;
          background: linear-gradient(135deg, rgba(49, 50, 68, 0.7), rgba(71, 85, 105, 0.5));
          border-radius: 6px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .period-btn:hover {
          background: rgba(71, 85, 105, 0.8);
          box-shadow: 0 0 15px rgba(137, 220, 235, 0.3);
        }

        .period-btn.active {
          background: linear-gradient(135deg, #89dceb, #c4a7e7);
          color: #0f172a;
          font-weight: 600;
          box-shadow: 0 0 20px rgba(137, 220, 235, 0.5);
          transform: translateY(-2px);
        }

        .sector-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sector-tag {
          padding: 8px 16px;
          background: linear-gradient(135deg, rgba(49, 50, 68, 0.7), rgba(71, 85, 105, 0.5));
          border-radius: 20px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sector-tag:hover {
          background: linear-gradient(135deg, #c4a7e7, #89dceb);
          color: #0f172a;
          box-shadow: 0 0 15px rgba(196, 167, 231, 0.5);
          transform: translateY(-2px);
        }

        .analyze-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #89dceb, #c4a7e7);
          border: none;
          border-radius: 8px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(137, 220, 235, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          animation: pulse 2s infinite;
        }

        .analyze-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 30px rgba(137, 220, 235, 0.6);
          animation: none;
        }

        .analyze-btn.calculating {
          animation: none;
          cursor: not-allowed;
          opacity: 0.8;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(137, 220, 235, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(137, 220, 235, 0.6);
          }
        }

        /* 脉冲动画效果 */
        .pulse-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .pulse-animation {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .pulse-ring {
          position: absolute;
          border: 2px solid #89dceb;
          border-radius: 50%;
          animation: pulseRing 2s infinite ease-out;
        }

        .pulse-ring:nth-child(1) {
          width: 200px;
          height: 200px;
          animation-delay: 0s;
        }

        .pulse-ring:nth-child(2) {
          width: 160px;
          height: 160px;
          animation-delay: 0.6s;
        }

        .pulse-ring:nth-child(3) {
          width: 120px;
          height: 120px;
          animation-delay: 1.2s;
        }

        .pulse-center {
          color: #89dceb;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          z-index: 10;
          text-shadow: 0 0 10px rgba(137, 220, 235, 0.5);
        }

        @keyframes pulseRing {
          0% {
            transform: scale(0.8);
            opacity: 1;
            border-color: rgba(137, 220, 235, 0.8);
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
            border-color: rgba(137, 220, 235, 0);
          }
        }

        /* 中间面板样式 */
        .conclusion-card {
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(15, 23, 42, 0.9));
          backdrop-filter: blur(10px);
        }

        .conclusion-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .overall-decision {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(16, 185, 129, 0.1);
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
          }
          to {
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.25);
          }
        }

        .decision-label {
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 18px;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }

        .decision-label:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.7);
        }

        .decision-label.bullish {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .decision-label.bearish {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .confidence-score {
          font-size: 28px;
          font-weight: 700;
          color: #89dceb;
          text-shadow: 0 0 15px rgba(137, 220, 235, 0.7);
          font-family: 'Courier New', monospace;
        }

        .decision-desc {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          background: rgba(15, 23, 42, 0.5);
          padding: 16px;
          border-radius: 8px;
          border-left: 3px solid #89dceb;
        }

        .agent-decisions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .console-container {
          flex: 1;
          min-height: 0;
        }

        /* 右侧面板样式 */
        .performance-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(49, 50, 68, 0.5), rgba(71, 85, 105, 0.3));
          border-radius: 8px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .metric-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #89dceb, #c4a7e7);
        }

        .metric-item:hover {
          box-shadow: 0 0 20px rgba(137, 220, 235, 0.3);
          transform: translateY(-2px);
        }

        .metric-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }

        .metric-value.positive {
          color: #10b981;
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
        }

        .metric-value.negative {
          color: #ef4444;
          text-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
        }

        .chart-placeholder {
          margin-bottom: 24px;
        }

        .chart-title {
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .chart-skeleton {
          height: 160px;
          background: linear-gradient(135deg, rgba(49, 50, 68, 0.7) 25%, rgba(71, 85, 105, 0.5) 50%, rgba(49, 50, 68, 0.7) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .chart-skeleton::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.1));
        }

        .skeleton-line {
          position: absolute;
          bottom: 40%;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #89dceb, transparent);
          box-shadow: 0 0 20px rgba(137, 220, 235, 0.7);
          animation: pulse 2s infinite;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        h4 {
          color: #c4a7e7;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .recent-trades {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .trade-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: linear-gradient(135deg, rgba(49, 50, 68, 0.3), rgba(71, 85, 105, 0.2));
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .trade-item.even {
          background: white/[0.02];
        }

        .trade-item:hover {
          box-shadow: 0 0 15px rgba(137, 220, 235, 0.2);
        }

        .trade-date {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
        }

        .trade-decision {
          padding: 6px 16px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .trade-decision.bullish {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1));
          color: #10b981;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }

        .trade-decision.bearish {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1));
          color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        .trade-result {
          font-size: 16px;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }

        .trade-result.positive {
          color: #10b981;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        .trade-result.negative {
          color: #ef4444;
          text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
};

export default Strategy;