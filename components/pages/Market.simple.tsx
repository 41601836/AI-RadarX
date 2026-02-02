'use client';

import React, { useState, useEffect } from 'react';
import { useStockContext } from '../../lib/context/StockContext';
import { useMarketStore } from '../../lib/store/useMarketStore';

const Market: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    const { currentTicker, setCurrentTicker } = useStockContext();
    const { marketData, startRealtimeUpdates, stopRealtimeUpdates } = useMarketStore();

    useEffect(() => {
        setMounted(true);
        const defaultSymbols = ['sh000001', 'sh600519', 'sz300750'];
        startRealtimeUpdates(defaultSymbols);
        return () => stopRealtimeUpdates();
    }, [startRealtimeUpdates, stopRealtimeUpdates]);

    if (!mounted) return null;

    const stocks = marketData?.quotes ? Object.values(marketData.quotes) : [];

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-300">
            {/* 左侧列表 */}
            <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-4">
                <h2 className="text-lg font-bold mb-4 text-blue-400">股票列表</h2>
                <div className="space-y-2">
                    {stocks.length === 0 ? (
                        <div className="text-zinc-500 text-sm">加载中...</div>
                    ) : (
                        stocks.slice(0, 10).map((stock) => (
                            <div
                                key={stock.symbol}
                                onClick={() => setCurrentTicker(stock as any)}
                                className={`p-3 rounded cursor-pointer transition-colors ${currentTicker?.symbol === stock.symbol
                                        ? 'bg-blue-600/20 border border-blue-500'
                                        : 'bg-zinc-800 hover:bg-zinc-700'
                                    }`}
                            >
                                <div className="flex justify-between">
                                    <span className="font-medium">{stock.name || stock.symbol}</span>
                                    <span className={stock.changePercent >= 0 ? 'text-rose-500' : 'text-emerald-500'}>
                                        {(stock.changePercent || 0).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">{stock.symbol}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 p-8">
                {!currentTicker ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold mb-4">AI-RadarX 行情中心</h1>
                            <p className="text-zinc-500">点击左侧股票查看详情</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                            <h2 className="text-2xl font-bold mb-2">{currentTicker.name}</h2>
                            <div className="text-sm text-zinc-500 mb-4">{currentTicker.symbol}</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500">当前价格</div>
                                    <div className="text-2xl font-bold text-rose-500">
                                        {((currentTicker as any).price || 0).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500">涨跌幅</div>
                                    <div className={`text-2xl font-bold ${((currentTicker as any).changePercent || 0) >= 0 ? 'text-rose-500' : 'text-emerald-500'
                                        }`}>
                                        {((currentTicker as any).changePercent || 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-sm font-bold mb-2 text-blue-400">技术分析</h3>
                                <p className="text-xs text-zinc-500">K线图表区域</p>
                            </div>
                            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-sm font-bold mb-2 text-blue-400">筹码分布</h3>
                                <p className="text-xs text-zinc-500">筹码图表区域</p>
                            </div>
                            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-sm font-bold mb-2 text-blue-400">AI评分</h3>
                                <p className="text-xs text-zinc-500">雷达图表区域</p>
                            </div>
                            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-sm font-bold mb-2 text-rose-400">系统建议</h3>
                                <div className="text-lg font-bold text-rose-500">强力买入</div>
                                <p className="text-xs text-zinc-500 mt-2">置信度: 89%</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Market;
