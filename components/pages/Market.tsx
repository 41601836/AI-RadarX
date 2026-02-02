'use client';

import React, { useState, useEffect } from 'react';
import { StockSidebar } from '../market/StockSidebar';
import { MacroPanel } from '../market/MacroPanel';
import { SectorHeatmap } from '../market/SectorHeatmap';
import { AIAnalysisPanel } from '../market/AIAnalysisPanel';
import { useStockContext } from '../../lib/context/StockContext';
import { useMarketStore } from '../../lib/store/useMarketStore';

const Market: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { currentTicker } = useStockContext();
  const { startRealtimeUpdates, stopRealtimeUpdates, marketData } = useMarketStore();

  useEffect(() => {
    setMounted(true);
    // 启动默认热门股票的实时更新
    const defaultSymbols = ['sh000001', 'sh600519', 'sz300750', 'sh601318', 'sz000858'];
    startRealtimeUpdates(defaultSymbols);

    return () => stopRealtimeUpdates();
  }, [startRealtimeUpdates, stopRealtimeUpdates]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 overflow-hidden pt-14">
      {/* 左侧侧边栏 - 股票列表 */}
      <StockSidebar />

      {/* 右侧主展示区 */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">

        {/* 顶部宏观指数栏 (始终显示) */}
        <MacroPanel />

        {/* 内容动态区 */}
        <main className="flex-1 overflow-hidden relative">
          {!currentTicker ? (
            /* 默认视图：板块热力图 */
            <div className="h-full flex flex-col animate-in fade-in duration-700">
              <div className="flex-1">
                <SectorHeatmap />
              </div>

              {/* 推荐或引导信息 */}
              <div className="p-8 bg-zinc-900/20 border-t border-zinc-800/50">
                <div className="max-w-2xl mx-auto text-center space-y-4">
                  <h2 className="text-xl font-bold text-zinc-100 italic">"在浩如烟海的数据中，AI 为你照亮前路。"</h2>
                  <p className="text-sm text-zinc-500">
                    点击左侧列表中的任意股票，立即开启该股的 <span className="text-blue-400 font-bold">AI 六维情报分析</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* 深度分析视图：四宫格面板 */
            <div className="h-full animate-in slide-in-from-right-4 duration-500 ease-out">
              <AIAnalysisPanel />
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Market;