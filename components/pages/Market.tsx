'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore, WatchlistItem } from '../../lib/store/user-portfolio';

// 股票数据类型定义
interface StockItem {
  code: string;
  name: string;
  price: number;
  change: number;
  percent: number;
  volume: number;
  marketValue: number;
}

const Market: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStocks, setFilteredStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 从用户存储中获取自选股列表
  const { watchlist, addToWatchlist, removeFromWatchlist } = useUserStore();

  // 模拟股票数据
  const generateMockStocks = (): StockItem[] => {
    const mockStocks: StockItem[] = [
      { code: 'SH600000', name: '浦发银行', price: 8.50, change: 0.50, percent: 6.17, volume: 100000000, marketValue: 500000000000 },
      { code: 'SZ000001', name: '平安银行', price: 10.25, change: -0.15, percent: -1.44, volume: 50000000, marketValue: 400000000000 },
      { code: 'SH600036', name: '招商银行', price: 32.80, change: 0.80, percent: 2.50, volume: 20000000, marketValue: 1500000000000 },
      { code: 'SZ000858', name: '五粮液', price: 150.50, change: 2.30, percent: 1.55, volume: 10000000, marketValue: 700000000000 },
      { code: 'SH600519', name: '贵州茅台', price: 1800.00, change: -20.50, percent: -1.13, volume: 5000000, marketValue: 2200000000000 },
      { code: 'SZ002415', name: '海康威视', price: 35.20, change: 0.60, percent: 1.74, volume: 15000000, marketValue: 300000000000 },
    ];
    return mockStocks;
  };

  // 搜索功能
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStocks(stocks);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = stocks.filter(stock => 
      stock.code.toLowerCase().includes(lowerQuery) || 
      stock.name.toLowerCase().includes(lowerQuery)
    );
    setFilteredStocks(filtered);
  };

  // 切换自选股状态
  const toggleWatchlist = (stockCode: string, stockName: string) => {
    const isInWatchlist = watchlist.some(item => item.stockCode === stockCode);
    if (isInWatchlist) {
      removeFromWatchlist(stockCode);
    } else {
      addToWatchlist(stockCode, stockName);
    }
  };

  // 检查股票是否在自选股列表中
  const isInWatchlist = (stockCode: string): boolean => {
    return watchlist.some(item => item.stockCode === stockCode);
  };

  useEffect(() => {
    // 模拟异步获取股票数据
    const fetchStocks = async () => {
      setLoading(true);
      try {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockStocks = generateMockStocks();
        setStocks(mockStocks);
        setFilteredStocks(mockStocks);
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return (
    <div className="market-page">
      {/* 页面标题和搜索栏 */}
      <div className="page-header">
        <h2>市场行情</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="搜索股票代码或名称"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* 股票列表 */}
      <div className="stocks-container">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : filteredStocks.length === 0 ? (
          <div className="no-data">未找到匹配的股票</div>
        ) : (
          <div className="stocks-table-container">
            <table className="stocks-table">
              <thead>
                <tr>
                  <th>股票代码</th>
                  <th>股票名称</th>
                  <th>最新价</th>
                  <th>涨跌额</th>
                  <th>涨跌幅</th>
                  <th>成交量</th>
                  <th>市值</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => (
                  <tr key={stock.code} className={`stock-row ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                    <td className="stock-code">{stock.code}</td>
                    <td className="stock-name">{stock.name}</td>
                    <td className="stock-price">{stock.price.toFixed(2)}</td>
                    <td className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                    </td>
                    <td className={`stock-percent ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.percent.toFixed(2)}%
                    </td>
                    <td className="stock-volume">{(stock.volume / 10000).toFixed(2)}万</td>
                    <td className="stock-market-value">{(stock.marketValue / 100000000).toFixed(2)}亿</td>
                    <td className="stock-action">
                      <button
                        className={`watchlist-btn ${isInWatchlist(stock.code) ? 'active' : ''}`}
                        onClick={() => toggleWatchlist(stock.code, stock.name)}
                        title={isInWatchlist(stock.code) ? '从自选股中移除' : '加入自选股'}
                      >
                        {isInWatchlist(stock.code) ? '★' : '☆'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .market-page {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h2 {
          margin: 0;
          font-size: 24px;
          color: #c4a7e7;
          font-weight: 500;
        }

        .search-container {
          max-width: 300px;
        }

        .search-input {
          width: 100%;
          padding: 8px 16px;
          border-radius: 4px;
          border: 1px solid #313244;
          background-color: #1e1e2e;
          color: #cdd6f4;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #89dceb;
        }

        .stocks-container {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 20px;
          height: calc(100% - 100px);
        }

        .loading, .no-data {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
        }

        .stocks-table-container {
          overflow-x: auto;
          height: 100%;
        }

        .stocks-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .stocks-table th {
          background: #2a2a3a;
          color: #cdd6f4;
          padding: 12px;
          text-align: left;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 2px solid #313244;
        }

        .stocks-table td {
          padding: 12px;
          font-size: 14px;
          border-bottom: 1px solid #2a2a3a;
        }

        .stock-row {
          transition: background-color 0.2s;
        }

        .stock-row:hover {
          background-color: #2a2a3a;
        }

        .stock-code {
          color: #cdd6f4;
          font-weight: 500;
          width: 100px;
        }

        .stock-name {
          color: #cdd6f4;
          width: 120px;
        }

        .stock-price {
          color: #cdd6f4;
          text-align: right;
          width: 100px;
        }

        .stock-change {
          text-align: right;
          width: 100px;
        }

        .stock-percent {
          text-align: right;
          width: 100px;
          font-weight: 500;
        }

        .stock-volume {
          text-align: right;
          color: #94a3b8;
          width: 120px;
        }

        .stock-market-value {
          text-align: right;
          color: #94a3b8;
          width: 120px;
        }

        .stock-action {
          text-align: center;
          width: 80px;
        }

        .watchlist-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }

        .watchlist-btn:hover {
          color: #f9e2af;
        }

        .watchlist-btn.active {
          color: #f9e2af;
        }

        .positive {
          color: #a6e3a1;
        }

        .negative {
          color: #f38ba8;
        }
      `}</style>
    </div>
  );
};

export default Market;