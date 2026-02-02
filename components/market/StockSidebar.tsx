'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMarketStore } from '../../lib/store/useMarketStore';
import { useStockContext } from '../../lib/context/StockContext';
import { formatNumberToFixed2 } from '../../lib/utils/numberFormatter';

export const StockSidebar: React.FC = () => {
    const { marketData, watchlist, startRealtimeUpdates, stopRealtimeUpdates } = useMarketStore();
    const { currentTicker, setCurrentTicker } = useStockContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'hot' | 'watchlist'>('hot');

    // 初始化数据
    useEffect(() => {
        const defaultSymbols = ['sh600519', 'sz300750', 'sh601318', 'sz000858', 'sh600036'];
        startRealtimeUpdates(defaultSymbols);

        return () => stopRealtimeUpdates();
    }, [startRealtimeUpdates, stopRealtimeUpdates]);

    // 模拟热门股票列表 - 添加安全检查
    const hotStocks = useMemo(() => {
        if (!marketData?.quotes) return [];
        return Object.values(marketData.quotes).sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 50);
    }, [marketData?.quotes]);

    const filteredStocks = useMemo(() => {
        const list = activeTab === 'hot'
            ? hotStocks
            : watchlist.map(w => marketData?.quotes?.[w.symbol] || { symbol: w.symbol, name: w.name, price: 0, changePercent: 0, amount: 0 });
        return list.filter(s =>
            s.symbol?.includes(searchTerm) ||
            (s.name && s.name.includes(searchTerm))
        );
    }, [activeTab, hotStocks, watchlist, marketData?.quotes, searchTerm]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-80">
            {/* 搜索栏 */}
            <div className="p-4 border-b border-zinc-800">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索代码/名称..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-2 pl-8 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                        className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            </div>

            {/* 选项卡 */}
            <div className="flex border-b border-zinc-800 text-xs font-bold uppercase tracking-wider">
                <button
                    className={`flex-1 py-3 transition-colors ${activeTab === 'hot' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    onClick={() => setActiveTab('hot')}
                >
                    热门推荐
                </button>
                <button
                    className={`flex-1 py-3 transition-colors ${activeTab === 'watchlist' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    onClick={() => setActiveTab('watchlist')}
                >
                    我的自选
                </button>
            </div>

            {/* 股票列表 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredStocks.map((stock) => (
                    <div
                        key={stock.symbol}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-zinc-900/50 ${currentTicker?.symbol === stock.symbol ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-zinc-900'
                            }`}
                        onClick={() => setCurrentTicker(stock as any)}
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-200">{stock.name || '未知'}</span>
                            <span className="text-xs text-zinc-500 font-mono">{stock.symbol}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-mono text-zinc-200">{(stock.price || 0).toFixed(2)}</span>
                            <span className={`text-xs font-mono ${(stock.changePercent || 0) >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {(stock.changePercent || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                ))}
                {filteredStocks.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 text-sm">
                        未找到匹配股票
                    </div>
                )}
            </div>
        </div>
    );
};
