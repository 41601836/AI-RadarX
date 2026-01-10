// 智能阈值雷达图组件
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { NotificationContext } from './NotificationCenter';

// 全局变量：记录本次会话中已报警的指标
const hasAlertedThisSession = new Set();

// 雷达图维度类型
export type RadarDimension = 
  | 'turnover'       // 成交额（亿）
  | 'explosionRate'  // 炸板率（%）
  | 'profitTaking'   // 获利盘（%）
  | 'lhasaRatio'     // 拉萨天团占比（%）
  | 'volumeRatio'    // 量比
  | 'amplitude';     // 振幅（%）;

// 雷达图数据接口
export interface RadarData {
  [key: string]: number;
  turnover: number;       // 成交额（亿）
  explosionRate: number;  // 炸板率（%）
  profitTaking: number;   // 获利盘（%）
  lhasaRatio: number;     // 拉萨天团占比（%）
  volumeRatio: number;    // 量比
  amplitude: number;      // 振幅（%）
}

// 雷达图维度配置
export interface RadarDimensionConfig {
  key: RadarDimension;
  label: string;
  unit: string;
  max: number;
  min: number;
  threshold: number | { min: number; max: number };
  alertType?: string;
  isCritical?: boolean;
}

// 雷达图配置接口
export interface RadarConfig {
  dimensions: RadarDimensionConfig[];
}

// 警报类型
export const ALERT_TYPES = {
  LIQUIDITY_ALARM: 'LIQUIDITY_ALARM',
  SENTIMENT_CRITICAL: 'SENTIMENT_CRITICAL',
  CHIP_DANGER: 'CHIP_DANGER',
  RETAIL_STAMPEDE: 'RETAIL_STAMPEDE'
};

interface SmartThresholdRadarProps {
  data: RadarData;
  config?: RadarConfig;
}

export default function SmartThresholdRadar({
  data,
  config
}: SmartThresholdRadarProps) {
  const notificationCenter = React.useContext(NotificationContext);
  const [dimensions, setDimensions] = useState<RadarDimensionConfig[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const lastNotifiedLevels = useRef<Map<string, boolean>>(new Map());

  // 默认雷达图配置
  const defaultConfig: RadarConfig = {
    dimensions: [
      {
        key: 'turnover',
        label: '成交额',
        unit: '亿',
        max: 20000,
        min: 0,
        threshold: 7000, // < 7000亿触发警报
        alertType: ALERT_TYPES.LIQUIDITY_ALARM,
        isCritical: true
      },
      {
        key: 'explosionRate',
        label: '炸板率',
        unit: '%',
        max: 100,
        min: 0,
        threshold: 50, // > 50%触发警报
        alertType: ALERT_TYPES.SENTIMENT_CRITICAL,
        isCritical: true
      },
      {
        key: 'profitTaking',
        label: '获利盘',
        unit: '%',
        max: 100,
        min: 0,
        threshold: { min: 20, max: 90 }, // <20% 或 >90%触发警报
        alertType: ALERT_TYPES.CHIP_DANGER,
        isCritical: true
      },
      {
        key: 'lhasaRatio',
        label: '拉萨天团占比',
        unit: '%',
        max: 100,
        min: 0,
        threshold: 30, // > 30%触发警报
        alertType: ALERT_TYPES.RETAIL_STAMPEDE,
        isCritical: true
      },
      {
        key: 'volumeRatio',
        label: '量比',
        unit: '',
        max: 10,
        min: 0,
        threshold: 5
      },
      {
        key: 'amplitude',
        label: '振幅',
        unit: '%',
        max: 30,
        min: 0,
        threshold: 15
      }
    ]
  };

  // 合并配置
  const radarConfig = config || defaultConfig;

  // 检查阈值并生成警报
  useEffect(() => {
    const newAlerts: string[] = [];
    const updatedDimensions = [...radarConfig.dimensions];

    updatedDimensions.forEach((dim, index) => {
      const value = data[dim.key];
      let isAlert = false;

      // 检查阈值条件
      if (typeof dim.threshold === 'number') {
        if (dim.key === 'turnover') {
          // 成交额 < 7000亿触发警报
          isAlert = value < dim.threshold;
        } else {
          // 其他维度：值 > 阈值触发警报
          isAlert = value > dim.threshold;
        }
      } else {
        // 范围阈值：< min 或 > max 触发警报
        isAlert = value < dim.threshold.min || value > dim.threshold.max;
      }

      // 获取之前的警报状态
      const wasAlert = lastNotifiedLevels.current.get(dim.key) || false;
      
      // 只有当风险等级从非警报变为警报时，才发送通知，且本次会话中未报警过
      if (isAlert && dim.alertType && !wasAlert && !hasAlertedThisSession.has(dim.key)) {
        newAlerts.push(dim.alertType);
        // 将该指标添加到已报警集合中
        hasAlertedThisSession.add(dim.key);
        // 发送通知 - 暂时注释掉
        /*if (notificationCenter?.addNotification) {
          // 强制所有数值格式化为两位数小数
          const formattedValue = value.toFixed(2);
          notificationCenter.addNotification({
            type: 'warning',
            title: `雷达图警报: ${dim.label}`,
            message: `当前值 ${formattedValue}${dim.unit} 触发 ${dim.alertType} 警报`,
            autoClose: true,
            duration: 8000
          });
        }*/
      } else if (isAlert && dim.alertType && hasAlertedThisSession.has(dim.key)) {
        // 记录报警被抑制的日志
        console.log(`[Radar] Alert suppressed for key: ${dim.key}`);
      }
      
      // 更新最后通知状态
      lastNotifiedLevels.current.set(dim.key, isAlert);

      updatedDimensions[index] = {
        ...dim,
        isCritical: isAlert
      };
    });

    setDimensions(updatedDimensions);
    setAlerts(newAlerts);
  }, [JSON.stringify(data), radarConfig, notificationCenter]);

  // 计算雷达图点坐标
  const calculatePointCoordinate = (value: number, dim: RadarDimensionConfig, index: number) => {
    const { max, min } = dim;
    const normalizedValue = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const x = 50 + normalizedValue * 50 * Math.cos(angle);
    const y = 50 + normalizedValue * 50 * Math.sin(angle);
    return { x, y };
  };

  // 生成雷达图多边形路径
  const generatePolygonPath = () => {
    const points = dimensions.map((dim, index) => {
      const value = data[dim.key];
      const { x, y } = calculatePointCoordinate(value, dim, index);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  // 生成网格线路径
  const generateGridPath = (level: number) => {
    const points = dimensions.map((_, index) => {
      const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
      const x = 50 + (level * 50) * Math.cos(angle);
      const y = 50 + (level * 50) * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  // 检查数据是否有效
  const isDataValid = data && Object.values(data).every(value => typeof value === 'number' && !isNaN(value));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '20px',
      backgroundColor: '#1e1e2e',
      borderRadius: '12px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px'
      }}>
        {isDataValid ? (
          <svg width="400" height="400" viewBox="0 0 100 100">
            {/* 绘制网格线 */}
            {[0.25, 0.5, 0.75, 1].map((level, index) => (
              <polygon
                key={`grid-${index}`}
                points={generateGridPath(level)}
                fill="none"
                stroke="#444"
                strokeWidth="0.5"
              />
            ))}

            {/* 绘制轴线 */}
            {dimensions.map((dim, index) => {
              const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
              const xEnd = 50 + 55 * Math.cos(angle);
              const yEnd = 50 + 55 * Math.sin(angle);
              const isCritical = dim.isCritical;

              return (
                <line
                  key={`axis-${index}`}
                  x1="50"
                  y1="50"
                  x2={xEnd}
                  y2={yEnd}
                  stroke={isCritical ? '#ff4444' : '#888'}
                  strokeWidth={isCritical ? '2' : '0.8'}
                />
              );
            })}

            {/* 绘制数据多边形 */}
            <polygon
              points={generatePolygonPath()}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />

            {/* 绘制数据点 */}
            {dimensions.map((dim, index) => {
              const value = data[dim.key];
              const { x, y } = calculatePointCoordinate(value, dim, index);
              const isCritical = dim.isCritical;

              return (
                <circle
                  key={`point-${index}`}
                  cx={x}
                  cy={y}
                  r={isCritical ? '3' : '2'}
                  fill={isCritical ? '#ff4444' : '#3b82f6'}
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}

            {/* 绘制维度标签 */}
            {dimensions.map((dim, index) => {
              const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
              const x = 50 + 65 * Math.cos(angle);
              const y = 50 + 65 * Math.sin(angle);
              const isCritical = dim.isCritical;

              return (
                <text
                  key={`label-${index}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isCritical ? '#ff4444' : '#fff'}
                  fontSize="3"
                  fontWeight={isCritical ? 'bold' : 'normal'}
                >
                  {dim.label}
                </text>
              );
            })}
          </svg>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            color: '#89dceb',
            fontSize: '18px',
            fontWeight: '500'
          }}>
            {/* 加载动画 */}
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(137, 220, 235, 0.3)',
              borderTop: '3px solid #89dceb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }} />
            <span>正在扫描波段...</span>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        maxWidth: '400px'
      }}>
        {dimensions.map((dim) => {
          const value = data[dim.key];
          const isCritical = dim.isCritical;

          return (
            <div key={dim.key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 15px',
              backgroundColor: isCritical ? 'rgba(255, 68, 68, 0.1)' : '#2a2a3a',
              borderRadius: '6px',
              borderLeft: isCritical ? '4px solid #ff4444' : 'none'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#bbb',
                fontWeight: '500'
              }}>{dim.label}</span>
              <span style={{
                fontSize: '16px',
                color: isCritical ? '#ff4444' : '#fff',
                fontWeight: '600'
              }}>
                {value.toFixed(2)}{dim.unit}
              </span>
              {isCritical && (
                <span style={{
                  marginLeft: '10px',
                  fontSize: '14px'
                }}>
                  ⚠️
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}