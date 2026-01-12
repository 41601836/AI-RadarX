'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface NorthboundTrendProps {
  data: Array<{
    timestamp: number;
    net_inflow: number;
  }>;
}

const NorthboundTrend: React.FC<NorthboundTrendProps> = ({ data }) => {
  // 格式化时间戳为小时:分钟
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{formatTime(payload[0].payload.timestamp)}</p>
          <p style={{ 
            margin: 0, 
            color: payload[0].value >= 0 ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold'
          }}>
            {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)} 亿元
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ color: '#FFD700', margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center' }}>北向资金</h3>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorNetInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNetOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime} 
              stroke="#999"
              tick={{ fill: '#999', fontSize: 12 }}
            />
            <YAxis 
              stroke="#999"
              tick={{ fill: '#999', fontSize: 12 }}
              tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="net_inflow" 
              stroke="#1890ff" 
              strokeWidth={2}
              fill={(entry) => entry.net_inflow >= 0 ? '#52c41a' : '#ff4d4f'}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NorthboundTrend;