'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStrategyStore } from '../lib/store/useStrategyStore';
import { useUserStore } from '../lib/store/user-portfolio';
import { exportAndDownloadPostMortem } from '../lib/utils/exporter';

// 用于检查组件是否已在客户端挂载的钩子
const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  return hasMounted;
};

interface StrategyConsoleProps {
  stockCode?: string;
  maxLogs?: number;
}

interface LogEntry {
  agent: string;
  message: string;
  timestamp: Date;
  type?: string;
  confidence?: number;
}

const StrategyConsole: React.FC<StrategyConsoleProps> = ({ 
  stockCode, 
  maxLogs = 50 
}) => {
  const { thoughtLogs, getThoughtLogsByStock } = useStrategyStore();
  // 使用钩子检查组件是否已在客户端挂载
  const hasMounted = useHasMounted();
  
  // 获取相关的日志数据
  const logs = stockCode 
    ? getThoughtLogsByStock(stockCode).map(log => ({
        id: log.id,
        agent: log.agent,
        message: log.message,
        timestamp: log.timestamp,
        type: log.type,
        confidence: log.confidence,
        stockCode: log.stockCode
      }))
    : thoughtLogs.map(log => ({
        id: log.id,
        agent: log.agent,
        message: log.message,
        timestamp: log.timestamp,
        type: log.type,
        confidence: log.confidence,
        stockCode: log.stockCode
      }));
  const [displayedLogs, setDisplayedLogs] = useState<Array<{ 
    agent: string; 
    message: string; 
    timestamp: Date; 
    fullMessage: string;
    type?: string;
    confidence?: number;
  }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const consoleBodyRef = useRef<HTMLDivElement>(null);

  // 打字机效果实现
  useEffect(() => {
    // 只处理新加入的日志
    if (displayedLogs.length < logs.length) {
      const newIndex = displayedLogs.length;
      const currentLog = logs[newIndex];
      
      // 重置字符索引以开始显示新日志
      setCurrentIndex(newIndex);
      setCharIndex(0);
      
      const typeWriter = () => {
        // 确保currentIndex仍然指向新日志（防止并发更新）
        if (currentIndex === newIndex && charIndex < currentLog.message.length) {
          setCharIndex(charIndex + 1);
          setTimeout(typeWriter, 20); // 打字机速度
        } else if (currentIndex === newIndex && charIndex >= currentLog.message.length) {
          // 当前日志完全显示后，添加到显示列表
          setDisplayedLogs(prev => [...prev, {
            ...currentLog,
            fullMessage: currentLog.message
          }]);
          setCharIndex(0);
        }
      };
      
      typeWriter();
    }
  }, [logs, displayedLogs.length, currentIndex, charIndex]);

  // 自动滚动到底部
  useEffect(() => {
    if (consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  // 获取Agent对应的颜色
  const getAgentColor = (agent: string) => {
    const agentColors: Record<string, string> = {
      '系统': '#c4a7e7',
      '共识引擎': '#89dceb',
      '筹码分析': '#10b981',
      '风险控制': '#ef4444',
      '技术分析': '#8b5cf6',
      '基本面': '#06b6d4',
      '舆情分析': '#f59e0b'
    };
    return agentColors[agent] || '#94a3b8';
  };

  // 获取日志类型的样式
  const getLogTypeStyle = (type?: string, confidence?: number) => {
    switch (type) {
      case 'warning':
        return { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
      case 'error':
        return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
      case 'conclusion':
        return { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
      case 'analysis':
        return { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' };
      default:
        return { color: '#94a3b8', bgColor: 'transparent' };
    }
  };

  return (
    <div className="strategy-console">
      <div className="console-header">
          <span className="console-title">AI 多智能体会诊终端</span>
          <div className="flex gap-4 items-center">
            <button 
              className="export-button"
              onClick={() => exportAndDownloadPostMortem(logs.map(log => ({...log, timestamp: new Date(log.timestamp)})), useUserStore.getState().positions)}
            >
              导出复盘报告
            </button>
            <div className="console-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      <div className="console-body" ref={consoleBodyRef}>
        {/* 显示已完成的日志 */}
        {displayedLogs.map((log, index) => {
          const typeStyle = getLogTypeStyle(log.type, log.confidence);
          return (
            <div 
              key={index} 
              className="log-entry"
              style={{ 
                backgroundColor: typeStyle.bgColor,
                borderLeft: `3px solid ${typeStyle.color}`,
                marginBottom: '4px'
              }}
            >
              <div className="log-header">
                <span 
                  className="log-agent" 
                  style={{ color: '#00CCFF' }}
                >
                  [{log.agent}]
                </span>
                {log.confidence && (
                  <span className="log-confidence">
                    ({Math.round(log.confidence * 100)}%)
                  </span>
                )}
                <span className="log-time">{hasMounted ? log.timestamp.toLocaleTimeString() : ''}</span>
              </div>
              <div className="log-content">
                <span className="log-message">{log.fullMessage}</span>
              </div>
              {/* 推理块下方的微型按钮 */}
              <div className="log-actions">
                <button className="action-button" title="复制">COPY</button>
                <button className="action-button" title="导出">EXPORT</button>
                <button className="action-button" title="反馈">FEEDBACK</button>
              </div>
            </div>
          );
        })}
        
        {/* 正在输入的日志 */}
        {currentIndex < logs.length && (
          <div 
            className="log-entry"
            style={{ 
              backgroundColor: getLogTypeStyle(logs[currentIndex].type, logs[currentIndex].confidence).bgColor,
              borderLeft: `3px solid ${getLogTypeStyle(logs[currentIndex].type, logs[currentIndex].confidence).color}`,
              padding: '8px 12px',
              marginBottom: '4px'
            }}
          >
            <span 
              className="log-agent" 
              style={{ color: getAgentColor(logs[currentIndex].agent) }}
            >
              [{logs[currentIndex].agent}]
            </span>
            <span className="log-message">
              {logs[currentIndex].message.substring(0, charIndex)}
            </span>
            <span className="typing-cursor">|</span>
            <span className="log-time">{hasMounted ? logs[currentIndex].timestamp.toLocaleTimeString() : ''}</span>
          </div>
        )}
        
        {/* 当所有日志显示完毕，显示完成状态 */}
        {currentIndex >= logs.length && logs.length > 0 && (
          <div className="console-footer">
            <span className="footer-text">会诊完成</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .strategy-console {
          background: #0A0A0A;
          border: 1px solid rgba(255,255,255,0.1);
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .console-header {
          background: #000;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .console-title {
          color: #00CCFF;
          font-size: 14px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace !important;
        }

        .console-dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #313244;
          animation: pulse 1.5s infinite;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.5s;
        }

        .dot:nth-child(3) {
          animation-delay: 1s;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
            background: #89dceb;
            box-shadow: 0 0 10px rgba(137, 220, 235, 0.8);
            transform: scale(1.1);
          }
        }

        .console-body {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px;
          line-height: 1.5;
          background-color: #0A0A0A;
        }

        /* 自定义滚动条 */
        .console-body::-webkit-scrollbar {
          width: 6px;
        }

        .console-body::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }

        .console-body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
        }

        .console-body::-webkit-scrollbar-thumb:hover {
          background: rgba(0,204,255,0.5);
        }

        .log-entry {
          margin-bottom: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: #000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .log-header {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 6px 10px;
          background-color: rgba(0,204,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .log-agent {
          font-weight: 700;
          color: #00CCFF !important;
          font-family: 'JetBrains Mono', monospace !important;
        }

        .log-message {
          color: #FFFFFF !important;
          flex: 1;
          word-break: break-word;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px;
          line-height: 1.5;
        }

        .log-content {
          padding: 10px;
        }

        .log-time {
          color: rgba(255,255,255,0.5);
          font-size: 11px;
          white-space: nowrap;
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace !important;
        }

        .log-actions {
          display: flex;
          gap: 2px;
          padding: 4px 10px;
          background-color: rgba(255,255,255,0.02);
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .action-button {
          background-color: #000;
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 2px 6px;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace !important;
        }

        .action-button:hover {
          background-color: rgba(0,204,255,0.1);
          color: #00CCFF;
          border-color: rgba(0,204,255,0.5);
        }

        .typing-cursor {
          color: #89dceb;
          font-weight: 700;
          animation: blink 1s infinite;
          margin-left: 2px;
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        .console-footer {
          margin-top: 20px;
          padding-top: 10px;
          display: flex;
          justify-content: center;
        }

        .footer-text {
          color: #10b981;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
        
        .export-button {
          background: transparent;
          border: none;
          color: #89dceb;
          font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          transition: all 0.3s ease;
          text-shadow: 0 0 10px rgba(137, 220, 235, 0.8);
        }
        
        .export-button:hover {
          color: #c4a7e7;
          text-shadow: 0 0 15px rgba(196, 167, 231, 0.9);
        }
      `}</style>
    </div>
  );
};

export default StrategyConsole;