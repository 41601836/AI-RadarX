'use client';

import React, { useEffect, useState } from 'react';
import { useMarketStore } from '../../lib/store/useMarketStore';

const INDICES = [
    { symbol: 'sh000001', name: '上证指数' },
    { symbol: 'sz399001', name: '深证成指' },
    { symbol: 'sz399006', name: '创业板指' },
    { symbol: 'sh000300', name: '沪深300' },
    { symbol: 'sh000688', name: '科创50' },
];

export const MacroPanel: React.FC = () => {
    const { marketData, fetchQuotes } = useMarketStore();

    useEffect(() => {
        const symbols = INDICES.map(i => i.symbol);
        fetchQuotes(symbols);
        const timer = setInterval(() => fetchQuotes(symbols), 10000);
        return () => clearInterval(timer);
    }, [fetchQuotes]);

    return (
        <div className="flex bg-zinc-900 border-b border-zinc-800 overflow-x-auto py-2 px-4 gap-4 no-scrollbar">
            {INDICES.map((idx) => {
                const data = marketData?.quotes?.[idx.symbol];
                const changePercent = data?.changePercent || 0;
                const colorClass = changePercent >= 0 ? 'text-rose-500' : 'text-emerald-500';
                const bgClass = changePercent >= 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

                return (
                    <div
                        key={idx.symbol}
                        className={`flex-shrink-0 flex items-center gap-3 px-4 py-2 rounded-lg border ${bgClass} transition-all hover:scale-105`}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-400 font-medium">{idx.name}</span>
                            <span className="text-sm font-bold text-zinc-100 font-mono">
                                {data?.price?.toFixed(2) || '---'}
                            </span>
                        </div>
                        <div className={`text-xs font-bold font-mono px-2 py-1 rounded ${colorClass} bg-black/20`}>
                            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
