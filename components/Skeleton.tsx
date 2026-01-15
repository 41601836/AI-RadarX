'use client';

import React from 'react';

interface SkeletonProps {
  type?: 'rect' | 'text' | 'circle' | 'list' | 'chart';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export default function Skeleton({ 
  type = 'rect', 
  width = '100%', 
  height = '100%', 
  count = 1, 
  className = '' 
}: SkeletonProps) {
  // 渲染单个矩形骨架屏
  const renderRect = () => (
    <div 
      className={`skeleton rect ${className}`}
      style={{ width, height }}
    ></div>
  );

  // 渲染单个文本行骨架屏
  const renderText = () => (
    <div 
      className={`skeleton text ${className}`}
      style={{ width, height: height || '16px', marginBottom: '8px' }}
    ></div>
  );

  // 渲染圆形/头像骨架屏
  const renderCircle = () => (
    <div 
      className={`skeleton circle ${className}`}
      style={{ width, height, borderRadius: '50%' }}
    ></div>
  );

  // 渲染列表项骨架屏
  const renderList = () => (
    <div className={`skeleton list-item ${className}`}>
      <div className="skeleton circle" style={{ width: '40px', height: '40px', marginRight: '12px' }}></div>
      <div className="list-content">
        <div className="skeleton text" style={{ width: '70%', height: '16px', marginBottom: '8px' }}></div>
        <div className="skeleton text" style={{ width: '50%', height: '14px' }}></div>
      </div>
    </div>
  );

  // 渲染图表骨架屏
  const renderChart = () => (
    <div className={`skeleton chart ${className}`} style={{ width, height }}>
      {/* 图表标题 */}
      <div className="skeleton text" style={{ width: '30%', height: '20px', marginBottom: '16px' }}></div>
      {/* 图表内容 */}
      <div className="skeleton rect" style={{ width: '100%', height: 'calc(100% - 56px)', marginBottom: '12px' }}></div>
      {/* 图表图例 */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="skeleton rect" style={{ width: '12px', height: '12px', marginRight: '8px' }}></div>
          <div className="skeleton text" style={{ width: '60px', height: '14px' }}></div>
        </div>
        <div className="legend-item">
          <div className="skeleton rect" style={{ width: '12px', height: '12px', marginRight: '8px' }}></div>
          <div className="skeleton text" style={{ width: '60px', height: '14px' }}></div>
        </div>
      </div>
    </div>
  );

  // 根据类型渲染对应的骨架屏
  const renderSkeleton = () => {
    switch (type) {
      case 'rect':
        return renderRect();
      case 'text':
        return renderText();
      case 'circle':
        return renderCircle();
      case 'list':
        return renderList();
      case 'chart':
        return renderChart();
      default:
        return renderRect();
    }
  };

  // 渲染多个骨架屏
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}
      <style jsx>{`
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .rect {
          border-radius: 4px;
        }

        .text {
          border-radius: 2px;
        }

        .list-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          background-color: white;
          margin-bottom: 8px;
        }

        .list-content {
          flex: 1;
        }

        .chart {
          padding: 16px;
          border-radius: 8px;
          background-color: white;
        }

        .chart-legend {
          display: flex;
          gap: 24px;
        }

        .legend-item {
          display: flex;
          align-items: center;
        }
      `}</style>
    </>
  );
}