'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useStockContext } from '../../lib/context/StockContext';

// 动态导入 ECharts 组件，禁用 SSR
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export const AIAnalysisPanel: React.FC = () => {
    const { currentTicker } = useStockContext();

    if (!currentTicker) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-black bg-opacity-40 p-4 gap-4 overflow-y-auto custom-scrollbar">
            {/* 顶部标题区 */}
            <div className="flex justify-between items-center bg-zinc-900/50 backdrop-blur-md p-4 rounded-xl border border-zinc-800 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                        <span className="text-xl font-bold text-blue-400">AI</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {currentTicker.name}
                            <span className="text-sm font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{currentTicker.symbol}</span>
                        </h2>
                        <p className="text-sm text-zinc-400">多智能体协同分析引擎 v3.2</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-rose-500">{(currentTicker as any).price?.toFixed(2) || '---'}</div>
                    <div className="text-sm font-mono text-rose-400">
                        {(currentTicker as any).changePercent?.toFixed(2) || '0.00'}%
                        <span className="ml-2">({(currentTicker as any).change?.toFixed(2) || '0.00'})</span>
                    </div>
                </div>
            </div>

            {/* 四宫格网格 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Q1: 技术面 - 增强K线 */}
                <QuadrantContainer title="技术面：AI 形态识别" agent="Technical Analyst">
                    <KLineChart />
                </QuadrantContainer>

                {/* Q2: 筹码面 - 资金动向 */}
                <QuadrantContainer title="筹码面：获利盘分布" agent="Chip Analyst">
                    <ChipChart />
                </QuadrantContainer>

                {/* Q3: 情绪/基本面 - 综合评分 */}
                <QuadrantContainer title="多维评分：智能体共识" agent="Consensus Engine">
                    <RadarChart />
                </QuadrantContainer>

                {/* Q4: 风险/决策 - 策略预警 */}
                <QuadrantContainer title="系统建议：风险与决策" agent="Risk Controller">
                    <DecisionPanel />
                </QuadrantContainer>
            </div>
        </div>
    );
};

// 辅助子组件：象限容器
const QuadrantContainer: React.FC<{ title: string; agent: string; children: React.ReactNode }> = ({ title, agent, children }) => (
    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 flex flex-col transition-all hover:border-zinc-700">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800/50 pb-2">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                {title}
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                AGENT: {agent}
            </span>
        </div>
        <div className="flex-1 min-h-[200px]">
            {children}
        </div>
    </div>
);

// Q1: K线图 (Mock)
const KLineChart = () => {
    const option = {
        backgroundColor: 'transparent',
        grid: { left: '8%', right: '4%', bottom: '15%', top: '5%' },
        xAxis: {
            type: 'category',
            data: ['01-20', '01-21', '01-22', '01-23', '01-26', '01-27', '02-02'],
            axisLine: { lineStyle: { color: '#313244' } },
            axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#1e1e2e' } },
            axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        series: [{
            type: 'candlestick',
            data: [
                [20, 34, 10, 38], [34, 35, 30, 44], [35, 33, 22, 42], [33, 40, 30, 41],
                [40, 38, 33, 45], [38, 42, 35, 48], [42, 45, 40, 50]
            ],
            itemStyle: {
                color: '#f43f5e',
                color0: '#10b981',
                borderColor: '#f43f5e',
                borderColor0: '#10b981'
            },
            markPoint: {
                data: [
                    { name: 'Buy', value: 'BUY', coord: ['01-23', 30], itemStyle: { color: '#f43f5e' } }
                ]
            }
        }]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

// Q2: 筹码图 (Mock)
const ChipChart = () => {
    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '15%', right: '5%', bottom: '5%', top: '5%' },
        xAxis: { type: 'value', show: false },
        yAxis: {
            type: 'category',
            data: ['10元', '15元', '20元', '25元', '30元', '35元', '40元'],
            axisLine: { show: false },
            axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        series: [{
            type: 'bar',
            data: [15, 23, 44, 12, 5, 8, 2],
            itemStyle: {
                color: (params: any) => params.dataIndex < 3 ? '#10b981' : '#f43f5e',
                borderRadius: [0, 4, 4, 0]
            },
            label: { show: true, position: 'right', color: '#94a3b8', fontSize: 9, formatter: '{c}%' }
        }]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

// Q3: 雷达图 (Mock)
const RadarChart = () => {
    const option = {
        backgroundColor: 'transparent',
        radar: {
            indicator: [
                { name: '技术面', max: 100 },
                { name: '基本面', max: 100 },
                { name: '资金流', max: 100 },
                { name: '舆情', max: 100 },
                { name: '行业景气', max: 100 }
            ],
            splitArea: { show: false },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
            name: { textStyle: { color: '#94a3b8', fontSize: 10 } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [85, 72, 91, 65, 88],
                name: 'AI综合评估',
                areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                lineStyle: { color: '#3b82f6', width: 2 },
                itemStyle: { color: '#3b82f6' }
            }]
        }]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

// Q4: 决策面板
const DecisionPanel = () => (
    <div className="h-full flex flex-col gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-rose-400 font-bold">最终评级</span>
                <span className="text-[10px] text-rose-300 opacity-70">置信度: 89%</span>
            </div>
            <div className="text-2xl font-black text-rose-500">强力买入 (Strong Buy)</div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">建议止损</div>
                <div className="text-sm font-bold text-emerald-400">18.45 (-5.2%)</div>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">建议仓位</div>
                <div className="text-sm font-bold text-blue-400">40% 中仓</div>
            </div>
        </div>

        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-xs text-blue-400 font-bold mb-1">AI 深度洞察</div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
                该股近期放量突破阻力位，且筹码分布显示主力资金已完成换手。基本面结合半导体板块逻辑面共振，建议在回调至均线处积极布局。
            </p>
        </div>
    </div>
);
