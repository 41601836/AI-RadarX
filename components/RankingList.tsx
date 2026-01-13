'use client';

import React from 'react';
import { formatNumberToFixed2, formatNumberWithUnit } from '../lib/utils/numberFormatter';

// 定义排行榜数据接口
interface RankingItem {
  ts_code: string;
  name: string;
  close: string;
  change: string;
  pct_change: string;
  volume: number;
  amount: string;
}

interface RankingListProps {
  title: string;
  icon: string;
  data: RankingItem[];
  onStockClick: (stock: RankingItem) => void;
}

const RankingList: React.FC<RankingListProps> = ({ title, icon, data, onStockClick }) => {
  // 格式化成交量显示
  const formatVolume = (volume: number): string => {
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(2) + '亿';
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(2) + '万';
    }
    return volume.toString();
  };

  // 格式化成交额显示
  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (num >= 100000000) {
      return (num / 100000000).toFixed(2) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return num.toFixed(2);
  };

  return (
    <div className="ranking-list-container">
      <div className="ranking-header">
        <span className="ranking-icon">{icon}</span>
        <h3 className="ranking-title">{title}</h3>
      </div>
      <div className="ranking-table">
        <div className="table-header">
          <div className="col rank">#</div>
          <div className="col name">股票</div>
          <div className="col price">价格</div>
          <div className="col change">涨跌幅</div>
          <div className="col volume">量</div>
        </div>
        <div className="table-body">
          {data.length > 0 ? (
            data.map((item, index) => {
              const pctChange = parseFloat(item.pct_change);
              const isPositive = pctChange >= 0;
              
              return (
                <div 
                  key={item.ts_code} 
                  className="table-row" 
                  onClick={() => onStockClick(item)}
                >
                  <div className="col rank">
                    {index + 1 < 10 ? '0' + (index + 1) : index + 1}
                  </div>
                  <div className="col name">
                    <div className="stock-name">{item.name}</div>
                    <div className="stock-code">{item.ts_code}</div>
                  </div>
                  <div className="col price">{item.close}</div>
                  <div className={`col change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : ''}{item.pct_change}%
                  </div>
                  <div className="col volume">{formatVolume(item.volume)}</div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <p>暂无数据</p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .ranking-list-container {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #313244;
        }

        .ranking-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #313244;
        }

        .ranking-icon {
          font-size: 24px;
          margin-right: 8px;
        }

        .ranking-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cdd6f4;
        }

        .ranking-table {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 0.5fr 2fr 1fr 1fr 1fr;
          gap: 8px;
          padding: 8px 0;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          border-bottom: 1px solid #313244;
        }

        .table-body {
          flex: 1;
          overflow-y: auto;
        }

        .table-row {
          display: grid;
          grid-template-columns: 0.5fr 2fr 1fr 1fr 1fr;
          gap: 8px;
          padding: 10px 0;
          cursor: pointer;
          transition: background-color 0.2s;
          border-bottom: 1px solid #313244;
        }

        .table-row:hover {
          background-color: rgba(49, 50, 68, 0.5);
        }

        .col {
          display: flex;
          align-items: center;
        }

        .col.rank {
          color: #94a3b8;
          font-size: 12px;
          justify-content: center;
        }

        .col.name {
          flex-direction: column;
          align-items: flex-start;
        }

        .stock-name {
          color: #cdd6f4;
          font-size: 14px;
          font-weight: 500;
        }

        .stock-code {
          color: #94a3b8;
          font-size: 12px;
        }

        .col.price {
          color: #cdd6f4;
          font-size: 14px;
          justify-content: flex-end;
        }

        .col.change {
          font-size: 14px;
          font-weight: 500;
          justify-content: flex-end;
        }

        .col.change.positive {
          color: #10b981;
        }

        .col.change.negative {
          color: #ef4444;
        }

        .col.volume {
          color: #94a3b8;
          font-size: 12px;
          justify-content: flex-end;
        }

        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          color: #94a3b8;
        }

        /* 滚动条样式 */
        .table-body::-webkit-scrollbar {
          width: 4px;
        }

        .table-body::-webkit-scrollbar-track {
          background: #1e1e2e;
        }

        .table-body::-webkit-scrollbar-thumb {
          background: #313244;
        }

        .table-body::-webkit-scrollbar-thumb:hover {
          background: #45475a;
        }
      `}</style>
    </div>
  );
};

export default RankingList;
export type { RankingItem };
