'use client';

import React from 'react';

const MOCK_SECTORS = [
    { name: '半导体', change: 2.45, density: 0.8 },
    { name: '人工智能', change: 1.82, density: 0.9 },
    { name: '新能源车', change: -0.75, density: 0.7 },
    { name: '生物医药', change: 0.34, density: 0.6 },
    { name: '光伏设备', change: -1.23, density: 0.75 },
    { name: '证券', change: 0.12, density: 0.5 },
    { name: '银行', change: -0.05, density: 0.4 },
    { name: '房地产', change: -2.10, density: 0.85 },
    { name: '煤炭', change: 0.98, density: 0.65 },
    { name: '白酒', change: 1.15, density: 0.7 },
    { name: '军工', change: 0.56, density: 0.6 },
    { name: '通信', change: 2.15, density: 0.8 },
];

export const SectorHeatmap: React.FC = () => {
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    板块热力分布
                </h3>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-rose-500 rounded-sm"></span> 领涨
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> 领跌
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MOCK_SECTORS.map((sector) => {
                    const isPositive = sector.change >= 0;
                    const intensity = Math.min(Math.abs(sector.change) / 3, 1); // 0 to 1
                    const opacity = 0.2 + intensity * 0.6;
                    const bgStyle = isPositive
                        ? { backgroundColor: `rgba(244, 63, 94, ${opacity})`, borderColor: `rgba(244, 63, 94, 0.4)` }
                        : { backgroundColor: `rgba(16, 185, 129, ${opacity})`, borderColor: `rgba(16, 185, 129, 0.4)` };

                    return (
                        <div
                            key={sector.name}
                            style={bgStyle}
                            className="group relative rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(30,30,30,0.5)] flex flex-col justify-between overflow-hidden"
                        >
                            {/* 装饰性背景 */}
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 00.707-1.707l-9-9a.999.999 0 00-1.414 0l-9 9A1 1 0 003 13z" />
                                </svg>
                            </div>

                            <div className="relative z-10">
                                <div className="text-sm font-bold text-white mb-1">{sector.name}</div>
                                <div className="text-xs font-mono text-white/70">
                                    密度: {(sector.density * 100).toFixed(0)}%
                                </div>
                            </div>

                            <div className="relative z-10 mt-4 text-lg font-bold font-mono text-white">
                                {isPositive ? '+' : ''}{sector.change.toFixed(2)}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
