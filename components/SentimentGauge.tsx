'use client';

import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, Legend, Tooltip } from 'recharts';

interface SentimentGaugeProps {
  sentimentScore: number;
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ sentimentScore }) => {
  const data = [
    {
      name: '情绪值',
      value: sentimentScore,
      fill: sentimentScore >= 80 ? '#ff4d4f' : // 过热/红色
            sentimentScore >= 60 ? '#ff7875' : // 偏热/浅红色
            sentimentScore >= 40 ? '#faad14' : // 中性/黄色
            sentimentScore >= 20 ? '#52c41a' : // 偏冷/浅绿色
            '#237804',                         // 冰点/深绿色
    },
  ];

  const levels = [
    { color: '#237804', name: '冰点 (0-20)', value: 20 },
    { color: '#52c41a', name: '偏冷 (20-40)', value: 40 },
    { color: '#faad14', name: '中性 (40-60)', value: 60 },
    { color: '#ff7875', name: '偏热 (60-80)', value: 80 },
    { color: '#ff4d4f', name: '过热 (80-100)', value: 100 },
  ];

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
          <p style={{ margin: 0 }}>{`${payload[0].name}: ${payload[0].value.toFixed(0)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ color: '#FFD700', margin: '0 0 16px 0', fontSize: '18px', textAlign: 'center' }}>市场情绪</h3>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="80%"
            barSize={10}
            data={levels}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              minAngle={15}
              background
              clockWise
              dataKey="value"
              cornerRadius={10}
            >
              {levels.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </RadialBar>
            <Legend
              iconType="circle"
              layout="horizontal"
              verticalAlign="bottom"
              formatter={(value, entry, index) => (
                <span style={{ color: '#fff', fontSize: '12px' }}>{levels[index].name}</span>
              )}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
          {sentimentScore.toFixed(0)}
        </span>
      </div>
    </div>
  );
};

export default SentimentGauge;