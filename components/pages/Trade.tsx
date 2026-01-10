'use client';

import React from 'react';

const Trade: React.FC = () => {
  return (
    <div className="trade-page">
      <div className="module-under-development">
        <div className="development-icon">🚧</div>
        <h2>交易终端模块部署中</h2>
        <p>该功能正在紧张开发中，敬请期待...</p>
        <div className="loading-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <style jsx>{`
        .trade-page {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #11111b;
        }

        .module-under-development {
          text-align: center;
          padding: 48px;
          background: #1e1e2e;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          border: 1px solid #313244;
        }

        .development-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }

        .module-under-development h2 {
          margin: 0 0 16px 0;
          font-size: 28px;
          color: #c4a7e7;
          font-weight: 500;
        }

        .module-under-development p {
          margin: 0 0 32px 0;
          color: #94a3b8;
          font-size: 16px;
        }

        .loading-indicator {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .loading-indicator span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #89dceb;
          animation: loading 1.4s infinite ease-in-out both;
        }

        .loading-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .loading-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes loading {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1.0);
          }
        }
      `}</style>
    </div>
  );
};

export default Trade;