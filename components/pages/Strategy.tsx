'use client';

import React, { useState, useEffect } from 'react';
import { analyzeStock, TradePlan } from '@/lib/strategies/TradingAgentsAdapter';

const Strategy: React.FC = () => {
  const [stockCode, setStockCode] = useState('');
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
  }[]>([
    { name: '提取数据', status: 'pending' },
    { name: '技术分析', status: 'pending' },
    { name: '舆情分析', status: 'pending' },
    { name: '综合打分', status: 'pending' },
  ]);

  const handleStockAnalysis = async () => {
    if (!stockCode) return;
    
    setIsAnalyzing(true);
    setTradePlan(null);
    
    // Reset analysis steps
    setAnalysisSteps(analysisSteps.map(step => ({ ...step, status: 'pending' })));
    
    try {
      // Step 1: Fetch data
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '提取数据' ? { ...step, status: 'processing' } : step)
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '提取数据' ? { ...step, status: 'completed' } : step)
      );
      
      // Step 2: Technical analysis
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '技术分析' ? { ...step, status: 'processing' } : step)
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '技术分析' ? { ...step, status: 'completed' } : step)
      );
      
      // Step 3: Sentiment analysis
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '舆情分析' ? { ...step, status: 'processing' } : step)
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '舆情分析' ? { ...step, status: 'completed' } : step)
      );
      
      // Step 4:综合打分
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '综合打分' ? { ...step, status: 'processing' } : step)
      );
      
      // Call the analyzeStock function
      const result = await analyzeStock(stockCode);
      setTradePlan(result);
      
      setAnalysisSteps(prev => 
        prev.map(step => step.name === '综合打分' ? { ...step, status: 'completed' } : step)
      );
      
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisSteps(prev => 
        prev.map(step => ({ ...step, status: 'error' }))
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="strategy-page">
      <div className="strategy-container">
        <h1>策略管理</h1>
        
        {/* Tabs Section */}
        <div className="tabs">
          <div className="tab">策略列表</div>
          <div className="tab active">AI Agent Diagnosis</div>
          <div className="tab">回测分析</div>
        </div>
        
        {/* AI Agent Diagnosis Section */}
        <div className="ai-diagnosis-section">
          <div className="section-title">AI 智能诊断</div>
          
          <div className="diagnosis-layout">
            {/* Left Column: Stock Input */}
            <div className="left-column">
              <div className="input-section">
                <h3>选择/输入股票</h3>
                <input
                  type="text"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  placeholder="输入股票代码 (如: 600000)"
                  className="stock-input"
                  disabled={isAnalyzing}
                />
                <button 
                  onClick={handleStockAnalysis}
                  className="analyze-button"
                  disabled={isAnalyzing || !stockCode}
                >
                  {isAnalyzing ? '分析中...' : '开始分析'}
                </button>
                
                <div className="stock-suggestions">
                  <h4>热门股票</h4>
                  <div className="suggestion-list">
                    {['600000', '000001', '000858', '002415'].map(code => (
                      <div
                        key={code}
                        className="suggestion-item"
                        onClick={() => setStockCode(code)}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle Column: Analysis Workflow */}
            <div className="middle-column">
              <div className="workflow-section">
                <h3>Analyst Workflow</h3>
                <div className="workflow-steps">
                  {analysisSteps.map((step, index) => (
                    <div key={index} className="workflow-step">
                      <div className={`step-indicator ${step.status}`}>
                        {step.status === 'completed' && '✓'}
                        {step.status === 'processing' && '⏳'}
                        {step.status === 'error' && '✗'}
                        {step.status === 'pending' && (index + 1)}
                      </div>
                      <div className="step-name">{step.name}</div>
                      {index < analysisSteps.length - 1 && <div className="step-line"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Column: Trade Plan */}
            <div className="right-column">
              <div className="trade-plan-section">
                <h3>Trade Plan</h3>
                {tradePlan ? (
                  <div className="trade-plan-content">
                    <div className={`action-indicator ${tradePlan.action}`}>
                      {tradePlan.action === 'buy' ? '买入' : 
                       tradePlan.action === 'sell' ? '卖出' : '观望'}
                    </div>
                    <div className="confidence-section">
                      <div className="confidence-label">置信度</div>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill"
                          style={{ width: `${tradePlan.confidence * 100}%` }}
                        ></div>
                      </div>
                      <div className="confidence-value">{Math.round(tradePlan.confidence * 100)}%</div>
                    </div>
                    <div className="reason-section">
                      <div className="reason-label">理由</div>
                      <div className="reason-text">{tradePlan.reason}</div>
                    </div>
                    <div className="risk-section">
                      <div className="risk-label">风险等级</div>
                      <div className={`risk-badge ${tradePlan.riskLevel}`}>
                        {tradePlan.riskLevel === 'low' ? '低' : 
                         tradePlan.riskLevel === 'medium' ? '中' : '高'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-result">
                    {isAnalyzing ? '正在生成交易计划...' : '请输入股票代码开始分析'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .strategy-page {
          height: 100%;
          background: #11111b;
          color: #cdd6f4;
          padding: 20px;
          box-sizing: border-box;
        }

        .strategy-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        h1 {
          font-size: 32px;
          color: #c4a7e7;
          margin-bottom: 24px;
        }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 32px;
          border-bottom: 1px solid #313244;
        }

        .tab {
          padding: 12px 24px;
          background: #181825;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          transition: background 0.2s;
        }

        .tab:hover {
          background: #1e1e2e;
        }

        .tab.active {
          background: #242434;
          color: #89dceb;
          border-bottom: 2px solid #89dceb;
        }

        /* AI Diagnosis Section */
        .ai-diagnosis-section {
          background: #1e1e2e;
          border-radius: 12px;
          padding: 24px;
        }

        .section-title {
          font-size: 24px;
          margin-bottom: 24px;
          color: #a6e3a1;
        }

        .diagnosis-layout {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          height: 500px;
        }

        /* Columns */
        .left-column, .middle-column, .right-column {
          background: #242434;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #313244;
        }

        h3 {
          font-size: 18px;
          margin-bottom: 16px;
          color: #89dceb;
        }

        /* Left Column: Input Section */
        .input-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stock-input {
          padding: 12px;
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          color: #cdd6f4;
          font-size: 16px;
        }

        .stock-input:focus {
          outline: none;
          border-color: #89dceb;
        }

        .analyze-button {
          padding: 12px;
          background: #89dceb;
          color: #11111b;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .analyze-button:hover:not(:disabled) {
          background: #94e2d5;
        }

        .analyze-button:disabled {
          background: #313244;
          color: #45475a;
          cursor: not-allowed;
        }

        /* Stock Suggestions */
        .stock-suggestions {
          margin-top: 24px;
        }

        h4 {
          font-size: 14px;
          margin-bottom: 8px;
          color: #a6adc8;
        }

        .suggestion-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .suggestion-item {
          padding: 8px 16px;
          background: #181825;
          border: 1px solid #313244;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-item:hover {
          background: #313244;
          border-color: #45475a;
        }

        /* Middle Column: Workflow */
        .workflow-steps {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          justify-content: center;
          height: 80%;
        }

        .workflow-step {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
        }

        .step-indicator.pending {
          background: #313244;
          color: #a6adc8;
        }

        .step-indicator.processing {
          background: #f5c2e7;
          color: #11111b;
        }

        .step-indicator.completed {
          background: #a6e3a1;
          color: #11111b;
        }

        .step-indicator.error {
          background: #f38ba8;
          color: #11111b;
        }

        .step-name {
          font-size: 18px;
          color: #cdd6f4;
        }

        .step-line {
          width: 2px;
          height: 40px;
          background: #313244;
          margin-left: 20px;
        }

        /* Right Column: Trade Plan */
        .trade-plan-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 80%;
          justify-content: center;
        }

        .action-indicator {
          font-size: 36px;
          font-weight: bold;
          text-align: center;
          padding: 16px;
          border-radius: 12px;
        }

        .action-indicator.buy {
          background: #a6e3a1;
          color: #11111b;
        }

        .action-indicator.sell {
          background: #f38ba8;
          color: #11111b;
        }

        .action-indicator.hold {
          background: #f9e2af;
          color: #11111b;
        }

        .confidence-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .confidence-label, .reason-label, .risk-label {
          font-size: 14px;
          color: #a6adc8;
        }

        .confidence-bar {
          height: 8px;
          background: #181825;
          border-radius: 4px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #a6e3a1, #89dceb);
          transition: width 0.5s;
        }

        .confidence-value {
          text-align: right;
          color: #cdd6f4;
          font-weight: bold;
        }

        .reason-text {
          background: #181825;
          padding: 16px;
          border-radius: 8px;
          color: #cdd6f4;
          line-height: 1.6;
        }

        .risk-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
        }

        .risk-badge.low {
          background: #a6e3a1;
          color: #11111b;
        }

        .risk-badge.medium {
          background: #f9e2af;
          color: #11111b;
        }

        .risk-badge.high {
          background: #f38ba8;
          color: #11111b;
        }

        .no-result {
          text-align: center;
          color: #a6adc8;
          padding: 40px;
          height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .diagnosis-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .workflow-steps {
            flex-direction: row;
            height: auto;
          }
          
          .step-line {
            width: 40px;
            height: 2px;
            margin-left: 0;
            margin-top: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Strategy;