'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface MarketBreadthProps {
  data: Array<{
    range: string;
    count: number;
  }>;
}

const MarketBreadth: React.FC<MarketBreadthProps> = ({ data }) => {
  // 根据涨跌幅区间确定颜色
  const getColor = (range: string) => {
    if (range.includes('+')) return '#52c41a'; // 上涨为红色
    if (range.includes('-')) return '#ff4d4f'; // 下跌为绿色
    return '#faad14'; // 平盘为黄色
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: '#111', 
          border: '1px solid #333', 
          padding: '8px 12px', 
          borderRadius: '4px',
          color: '#fff'
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{payload[0].payload.range}</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`${payload[0].value} 只股票`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ color: '#FFD700', margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center' }}>涨跌分布</h3>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="range" 
              stroke="#999"
              tick={{ fill: '#999', fontSize: 12 }}
              tickFormatter={(value) => value}
            />
            <YAxis 
              stroke="#999"
              tick={{ fill: '#999', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.range)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarketBreadth;