'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStrategyStore } from '../lib/store/useStrategyStore';

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
        agent: log.agent,
        message: log.message,
        timestamp: log.timestamp,
        type: log.type,
        confidence: log.confidence
      }))
    : thoughtLogs.map(log => ({
        agent: log.agent,
        message: log.message,
        timestamp: log.timestamp,
        type: log.type,
        confidence: log.confidence
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
    if (currentIndex < logs.length) {
      const currentLog = logs[currentIndex];
      if (charIndex < currentLog.message.length) {
        const timer = setTimeout(() => {
          setCharIndex(charIndex + 1);
        }, 20); // 打字机速度
        return () => clearTimeout(timer);
      } else {
        // 当前日志完全显示后，添加到显示列表并开始下一条
        setDisplayedLogs(prev => [...prev, {
          ...currentLog,
          fullMessage: currentLog.message
        }]);
        setCurrentIndex(currentIndex + 1);
        setCharIndex(0);
      }
    }
  }, [charIndex, currentIndex, logs]);

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
        <div className="console-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
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
                padding: '8px 12px',
                marginBottom: '4px'
              }}
            >
              <span 
                className="log-agent" 
                style={{ color: getAgentColor(log.agent) }}
              >
                [{log.agent}]
              </span>
              <span className="log-message">{log.fullMessage}</span>
              {log.confidence && (
                <span className="log-confidence">
                  ({Math.round(log.confidence * 100)}%)
                </span>
              )}
              <span className="log-time">{hasMounted ? log.timestamp.toLocaleTimeString() : ''}</span>
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
          background: #0f172a;
          border-radius: 8px;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .console-header {
          background: #1e1e2e;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .console-title {
          color: #89dceb;
          font-size: 14px;
          font-weight: 600;
          text-shadow: 0 0 10px rgba(137, 220, 235, 0.5);
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
          padding: 16px;
          overflow-y: auto;
          font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.6;
          background: linear-gradient(180deg, #0f172a 0%, #1e1e2e 100%);
        }

        /* 自定义滚动条 */
        .console-body::-webkit-scrollbar {
          width: 8px;
        }

        .console-body::-webkit-scrollbar-track {
          background: #1e1e2e;
          border-radius: 4px;
        }

        .console-body::-webkit-scrollbar-thumb {
          background: #313244;
          border-radius: 4px;
        }

        .console-body::-webkit-scrollbar-thumb:hover {
          background: #475569;
          box-shadow: 0 0 10px rgba(137, 220, 235, 0.3);
        }

        .log-entry {
          margin-bottom: 12px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
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

        .log-agent {
          font-weight: 700;
          min-width: 100px;
          text-shadow: 0 0 5px currentColor;
        }

        .log-message {
          color: #e2e8f0;
          flex: 1;
          word-break: break-word;
        }

        .log-time {
          color: #6b7280;
          font-size: 11px;
          white-space: nowrap;
          margin-left: auto;
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
      `}</style>
    </div>
  );
};

export default StrategyConsole;