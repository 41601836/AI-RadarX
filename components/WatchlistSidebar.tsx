'use client';
import React, { useState, useEffect } from 'react';
import { useStockContext } from '../lib/context/StockContext';
import { WatchlistStock } from '../lib/context/StockContext';

const WatchlistSidebar: React.FC = () => {
  const { currentTicker, setCurrentTicker, watchlist, addToWatchlist, removeFromWatchlist } = useStockContext();
  const [newStockInput, setNewStockInput] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 默认自选股数据
  const defaultWatchlist: WatchlistStock[] = [
    { ts_code: 'SH600000', symbol: '600000', name: '浦发银行', industry: '银行', area: '上海', market: '主板', list_date: '1999-11-10', currentPrice: 8.25, changePercent: 0.61 },
    { ts_code: 'SZ000001', symbol: '000001', name: '平安银行', industry: '银行', area: '深圳', market: '主板', list_date: '1991-04-03', currentPrice: 12.58, changePercent: -1.25 },
    { ts_code: 'SH601318', symbol: '601318', name: '中国平安', industry: '保险', area: '上海', market: '主板', list_date: '2007-03-01', currentPrice: 45.32, changePercent: 1.85 },
    { ts_code: 'SZ000858', symbol: '000858', name: '五粮液', industry: '饮料制造', area: '四川', market: '主板', list_date: '1998-04-27', currentPrice: 178.45, changePercent: 2.36 },
    { ts_code: 'SH600519', symbol: '600519', name: '贵州茅台', industry: '饮料制造', area: '贵州', market: '主板', list_date: '2001-08-27', currentPrice: 1850.00, changePercent: -0.52 },
  ];

  // 初始化自选股数据 - 使用useEffect确保只在客户端执行
  useEffect(() => {
    if (watchlist.length === 0) {
      // 使用默认数据
      defaultWatchlist.forEach(stock => {
        addToWatchlist(stock);
      });
    }
  }, [watchlist.length, addToWatchlist]);

  // 处理股票选择
  const handleStockClick = (stock: WatchlistStock) => {
    setCurrentTicker(stock);
  };

  // 处理添加股票
  const handleAddStock = () => {
    if (!newStockInput.trim()) return;

    // 简单的股票代码解析（支持SH600000或600000格式）
    let ts_code = newStockInput.trim();
    let symbol = ts_code;
    
    if (!ts_code.startsWith('SH') && !ts_code.startsWith('SZ')) {
      // 自动判断交易所
      const exchange = ts_code.startsWith('6') ? 'SH' : 'SZ';
      ts_code = `${exchange}${ts_code}`;
    } else {
      symbol = ts_code.slice(2);
    }

    // 创建新股票对象（模拟数据）
    const newStock: WatchlistStock = {
      ts_code,
      symbol,
      name: `股票${symbol}`,
      industry: '未知',
      area: '未知',
      market: '主板',
      list_date: '2020-01-01',
      currentPrice: Math.round((Math.random() * 100 + 10) * 100) / 100,
      changePercent: Math.round((Math.random() * 10 - 5) * 100) / 100,
    };

    addToWatchlist(newStock);
    setNewStockInput('');
  };

  // 处理删除股票
  const handleRemoveStock = (e: React.MouseEvent, stockCode: string) => {
    e.stopPropagation();
    removeFromWatchlist(stockCode);
  };

  return (
    <div className="w-64 h-screen bg-gray-900 text-gray-100 border-r border-cyan-900 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col">
      {/* 侧边栏标题 */}
      <div className="p-4 border-b border-cyan-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyan-900 opacity-10"></div>
        <h2 className="text-xl font-bold text-cyan-400 flex items-center relative z-10">
          <span className="mr-2">📊</span>
          自选股
          <div className="absolute -right-4 top-4 w-16 h-16 bg-cyan-500 rounded-full filter blur-xl opacity-30"></div>
        </h2>
      </div>

      {/* 添加股票输入框 */}
      <div className="p-3 border-b border-cyan-800">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="输入股票代码"
            value={newStockInput}
            onChange={(e) => setNewStockInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
            className="flex-1 bg-gray-800 border border-cyan-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 placeholder-gray-500"
          />
          <button
            onClick={handleAddStock}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded text-sm transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            +
          </button>
        </div>
      </div>

      {/* 自选股列表 */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.map((stock) => {
          const isSelected = currentTicker?.ts_code === stock.ts_code;
          const isPositive = (stock.changePercent || 0) >= 0;
          
          return (
            <div
              key={stock.ts_code}
              onClick={() => handleStockClick(stock)}
              className={`p-3 border-b border-cyan-900 cursor-pointer transition-all duration-300 hover:bg-gray-800/50 hover:border-cyan-700 ${isSelected ? 'bg-gray-800 border-cyan-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-white tracking-wide">{stock.symbol}</div>
                  <div className="text-sm text-cyan-300">{stock.name}</div>
                </div>
                <button
                  onClick={(e) => handleRemoveStock(e, stock.ts_code)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <div className="text-lg font-bold text-white">{stock.currentPrice?.toFixed(2)}</div>
                <div className={`text-sm font-medium ${isPositive ? 'text-red-400' : 'text-green-400'} animate-pulse`}>
                  {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </div>
              </div>
              {isSelected && (
                <div className="mt-2 h-0.5 bg-cyan-500 rounded-full animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部信息 */}
      <div className="p-3 border-t border-cyan-900 text-xs text-cyan-400 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <span className="text-cyan-500">💡</span>
          点击股票切换查看
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-cyan-500">➕</span>
          输入代码添加股票
        </div>
      </div>
    </div>
  );
};

export default WatchlistSidebar;