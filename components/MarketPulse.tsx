'use client';

// 全市场监控带组件
import React, { useState, useEffect, useMemo } from 'react';
import { formatNumberToFixed2, formatPercentToFixed2 } from '@/lib/utils/numberFormatter';
import { usePolling } from '../lib/hooks/usePolling';

// 涨跌停数据类型
interface ADData {
  advanceCount: number;    // 上涨家数
  declineCount: number;    // 下跌家数
  limitUpCount: number;    // 涨停家数
  limitDownCount: number;  // 跌停家数
  adRatio: number;         // 涨跌停比
  bombBoardCount: number;  // 炸板家数
  bombBoardRate: number;   // 炸板率（%）
}

// 成交量预估数据类型
interface VolumeForecast {
  currentVolume: number;   // 当前成交量（亿）
  yesterdayVolume: number; // 昨日成交量（亿）
  forecastVolume: number;  // 全天预估成交量（亿）
  growthRate: number;      // 预估增长率（%）
}

// 板块热力数据类型
interface SectorHeatItem {
  sectorName: string;      // 板块名称
  heatValue: number;       // 热力值（0-100）
  change: number;          // 涨跌幅（%）
  fundFlow: number;        // 资金流向（亿）
}

// 板块联动关系数据类型
interface SectorLinkage {
  sourceSector: string;    // 源板块名称
  targetSector: string;    // 目标板块名称
  correlation: number;     // 联动强度（-100 到 100）
  lagTime: number;         // 滞后时间（分钟）
}

// 板块联动矩阵数据类型
interface SectorLinkageMatrix {
  sectors: string[];       // 板块列表
  linkageData: SectorLinkage[]; // 联动关系数据
}

const MarketPulse: React.FC = () => {
  // 解决水合冲突的挂载状态
  const [isMounted, setIsMounted] = useState(false);
  
  // 涨跌停数据
  const [adData, setADData] = useState<ADData>({
    advanceCount: 2350,
    declineCount: 1580,
    limitUpCount: 85,
    limitDownCount: 25,
    adRatio: 3.4,
    bombBoardCount: 30,
    bombBoardRate: 35.3 // 炸板率（%）
  });
  
  // 组件挂载时设置isMounted为true
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 成交量预估数据
  const [volumeForecast, setVolumeForecast] = useState<VolumeForecast>({
    currentVolume: 5800,
    yesterdayVolume: 7200,
    forecastVolume: 8900,
    growthRate: 23.6
  });

  // 板块联动矩阵数据
  const [sectorLinkageMatrix, setSectorLinkageMatrix] = useState<SectorLinkageMatrix>({
    sectors: ['人工智能', '新能源汽车', '半导体', '医药生物', '消费电子', '金融地产', '石油化工', '有色金属'],
    linkageData: [
      { sourceSector: '人工智能', targetSector: '半导体', correlation: 85, lagTime: 0 },
      { sourceSector: '新能源汽车', targetSector: '有色金属', correlation: 78, lagTime: 1 },
      { sourceSector: '半导体', targetSector: '人工智能', correlation: 82, lagTime: 0 },
      { sourceSector: '医药生物', targetSector: '消费电子', correlation: -35, lagTime: 2 },
      { sourceSector: '金融地产', targetSector: '石油化工', correlation: 45, lagTime: 1 },
      { sourceSector: '消费电子', targetSector: '半导体', correlation: 68, lagTime: 0 },
      { sourceSector: '石油化工', targetSector: '有色金属', correlation: 52, lagTime: 1 },
      { sourceSector: '有色金属', targetSector: '新能源汽车', correlation: 75, lagTime: 0 },
    ]
  });

  // 板块资金热力数据
  const [sectorHeatMatrix, setSectorHeatMatrix] = useState<SectorHeatItem[]>([
    { sectorName: '人工智能', heatValue: 95, change: 5.8, fundFlow: 125.6 },
    { sectorName: '新能源汽车', heatValue: 88, change: 4.2, fundFlow: 98.3 },
    { sectorName: '半导体', heatValue: 82, change: 3.5, fundFlow: 76.8 },
    { sectorName: '医药生物', heatValue: 75, change: 2.1, fundFlow: 54.2 },
    { sectorName: '消费电子', heatValue: 68, change: 1.5, fundFlow: 42.7 },
    { sectorName: '金融地产', heatValue: 55, change: -0.8, fundFlow: -12.3 },
    { sectorName: '石油化工', heatValue: 48, change: -1.2, fundFlow: -25.6 },
    { sectorName: '有色金属', heatValue: 42, change: -2.5, fundFlow: -41.8 }
  ]);

  // 使用全局轮询钩子，当不在仪表盘页面时自动停止
  usePolling(() => {
    // 更新涨跌停比数据
    setADData(prev => {
      const limitUp = Math.floor(Math.random() * 50) + 60;
      const limitDown = Math.floor(Math.random() * 20) + 10;
      const bombBoard = Math.floor(Math.random() * 40) + 10; // 10-50家炸板
      const bombBoardRate = parseFloat(((bombBoard / (limitUp || 1)) * 100).toFixed(2));
      return {
        ...prev,
        limitUpCount: limitUp,
        limitDownCount: limitDown,
        adRatio: parseFloat((limitUp / (limitDown || 1)).toFixed(2)),
        bombBoardCount: bombBoard,
        bombBoardRate: bombBoardRate
      };
    });

    // 更新成交量预估数据
    setVolumeForecast(prev => {
      const growthRate = (Math.random() - 0.5) * 20;
      const forecast = parseFloat((prev.yesterdayVolume * (1 + growthRate / 100)).toFixed(0));
      return {
        ...prev,
        forecastVolume: forecast,
        growthRate: parseFloat(growthRate.toFixed(2))
      };
    });

    // 更新板块资金热力数据
    setSectorHeatMatrix(prev => {
      return prev.map(sector => ({
        ...sector,
        heatValue: Math.min(Math.max(sector.heatValue + (Math.random() - 0.5) * 10, 0), 100),
        change: parseFloat((sector.change + (Math.random() - 0.5) * 1).toFixed(2)),
        fundFlow: parseFloat((sector.fundFlow + (Math.random() - 0.5) * 10).toFixed(2))
      }));
    });
  }, {
    interval: 30000, // 每30秒更新一次数据
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: true // 立即执行
  });

  // 获取热力颜色
  const getHeatColor = (value: number): string => {
    if (value >= 80) return '#ef4444'; // 红色
    if (value >= 60) return '#f59e0b'; // 橙色
    if (value >= 40) return '#eab308'; // 黄色
    if (value >= 20) return '#84cc16'; // 浅绿色
    return '#22c55e'; // 绿色
  };

  // 获取资金流向颜色
  const getFundFlowColor = (value: number): string => {
    return value >= 0 ? '#22c55e' : '#ef4444';
  };

  // 获取板块联动颜色
  const getLinkageColor = (correlation: number): string => {
    if (correlation >= 70) return '#ef4444'; // 强正相关 - 红色
    if (correlation >= 40) return '#f59e0b'; // 中度正相关 - 橙色
    if (correlation >= 10) return '#eab308'; // 弱正相关 - 黄色
    if (correlation >= -10) return '#6b7280'; // 弱相关 - 灰色
    if (correlation >= -40) return '#60a5fa'; // 弱负相关 - 浅蓝色
    if (correlation >= -70) return '#3b82f6'; // 中度负相关 - 蓝色
    return '#1d4ed8'; // 强负相关 - 深蓝色
  };

  // 获取板块联动强度的背景透明度
  const getLinkageOpacity = (correlation: number): number => {
    return Math.min(Math.abs(correlation) / 100, 0.8);
  };

  // 解决水合冲突，在客户端挂载后才渲染内容
  if (!isMounted) {
    return <div className="market-pulse-panel-placeholder" style={{ 
      backgroundColor: '#1e1e2e', 
      borderRadius: '12px', 
      padding: '20px', 
      color: '#fff', 
      height: '100%' 
    }} />;
  }

  return (
    <div className="market-pulse-panel" style={{
      backgroundColor: '#1e1e2e',
      borderRadius: '12px',
      padding: '20px',
      color: '#fff',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* 面板标题 */}
      <div className="panel-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: '#89dceb'
        }}>F1: MARKET_STATUS</h3>
        <div className="update-time" style={{
          fontSize: '12px',
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <div className="pulse-dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            animation: 'pulse 1.5s infinite'
          }}></div>
          <span>实时更新</span>
        </div>
      </div>

      {/* 涨跌停比 */}
      <div className="section" style={{
        marginBottom: '24px'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          color: '#bbb',
          fontWeight: '500'
        }}>涨跌停比 (A/D Ratio)</h4>
        <div className="ad-container" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div className="stat-card" style={{
            backgroundColor: '#2a2a3a',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div className="stat-value" style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#a6e3a1'
            }}>{formatNumberToFixed2(adData.adRatio)}</div>
            <div className="stat-label" style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '4px'
            }}>涨跌停比</div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <div className="mini-stat" style={{
              backgroundColor: '#2a2a3a',
              borderRadius: '6px',
              padding: '8px',
              textAlign: 'center'
            }}>
              <div className="mini-value" style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#a6e3a1'
              }}>{adData.limitUpCount}</div>
              <div className="mini-label" style={{
                fontSize: '13px',
                color: '#888'
              }}>涨停</div>
            </div>
            <div className="mini-stat" style={{
              backgroundColor: '#2a2a3a',
              borderRadius: '6px',
              padding: '8px',
              textAlign: 'center'
            }}>
              <div className="mini-value" style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#f38ba8'
              }}>{adData.limitDownCount}</div>
              <div className="mini-label" style={{
                fontSize: '13px',
                color: '#888'
              }}>跌停</div>
            </div>
          </div>
          {/* 炸板率 */}
          <div className="bomb-board-container" style={{
            gridColumn: '1 / -1',
            backgroundColor: '#2a2a3a',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div className="bomb-board-label" style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '4px'
            }}>炸板率</div>
            <div className={`bomb-board-rate ${adData.bombBoardRate > 50 ? 'high-danger' : adData.bombBoardRate > 30 ? 'medium-danger' : adData.bombBoardRate > 15 ? 'low-danger' : 'safe'}`} style={{
              fontSize: '24px',
              fontWeight: '700',
              color: adData.bombBoardRate > 50 ? '#ef4444' : adData.bombBoardRate > 30 ? '#f59e0b' : adData.bombBoardRate > 15 ? '#a6e3a1' : '#6b7280',
              animation: adData.bombBoardRate > 50 ? 'breathingHigh 0.8s infinite' : adData.bombBoardRate > 30 ? 'breathingMedium 1s infinite' : adData.bombBoardRate > 15 ? 'breathingLow 1.5s infinite' : 'none'
            }}>{formatPercentToFixed2(adData.bombBoardRate)}</div>
            <div className="bomb-board-count" style={{
              fontSize: '13px',
              color: '#666',
              marginTop: '4px'
            }}>{adData.bombBoardCount}家炸板</div>
          </div>
        </div>
        <div className="ad-detail" style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '12px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>上涨: {adData.advanceCount}</span>
          <span>下跌: {adData.declineCount}</span>
        </div>
      </div>

      {/* 成交量预估 */}
      <div className="section" style={{
        marginBottom: '24px'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          color: '#bbb',
          fontWeight: '500'
        }}>全天成交量预估</h4>
        <div className="volume-container" style={{
          backgroundColor: '#2a2a3a',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div className="volume-main" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <div className="volume-label" style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '4px'
              }}>全天预估</div>
              <div className="volume-value" style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#89dceb'
              }}>{volumeForecast.forecastVolume}亿</div>
            </div>
            <div className={`volume-growth ${volumeForecast.growthRate >= 0 ? 'positive' : 'negative'}`} style={{
              fontSize: '24px',
              fontWeight: '600',
              color: volumeForecast.growthRate >= 0 ? '#a6e3a1' : '#f38ba8'
            }}>
              {formatPercentToFixed2(volumeForecast.growthRate)}
            </div>
          </div>
          <div className="volume-details" style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>当前: {volumeForecast.currentVolume}亿</span>
            <span>昨日: {volumeForecast.yesterdayVolume}亿</span>
          </div>
        </div>
      </div>

      {/* 板块联动矩阵 */}
      <div className="section" style={{
        marginBottom: '24px'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          color: '#bbb',
          fontWeight: '500'
        }}>板块联动矩阵</h4>
        <div className="linkage-matrix-container" style={{
          backgroundColor: '#2a2a3a',
          borderRadius: '8px',
          padding: '12px',
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: '300px'
        }}>
          <table className="linkage-matrix" style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px'
          }}>
            <thead>
              <tr style={{
                height: '40px'
              }}>
                <th style={{
                  backgroundColor: '#1e1e2e',
                  color: '#fff',
                  padding: '8px',
                  textAlign: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2
                }}></th>
                {sectorLinkageMatrix.sectors.map((sector, index) => (
                  <th key={index} style={{
                    backgroundColor: '#1e1e2e',
                    color: '#fff',
                    padding: '8px',
                    textAlign: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2
                  }}>
                    {sector}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorLinkageMatrix.sectors.map((sourceSector, rowIndex) => (
                <tr key={rowIndex} style={{
                  height: '40px'
                }}>
                  <td style={{
                    backgroundColor: '#1e1e2e',
                    color: '#fff',
                    padding: '8px',
                    textAlign: 'center',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    fontWeight: '500'
                  }}>
                    {sourceSector}
                  </td>
                  {sectorLinkageMatrix.sectors.map((targetSector, colIndex) => {
                    // 找到对应的联动数据
                    const linkage = sectorLinkageMatrix.linkageData.find(
                      l => l.sourceSector === sourceSector && l.targetSector === targetSector
                    );
                    
                    // 如果是对角线或没有联动数据，显示空白
                    if (rowIndex === colIndex || !linkage) {
                      return (
                        <td key={colIndex} style={{
                          backgroundColor: '#1e1e2e',
                          padding: '4px',
                          textAlign: 'center'
                        }}></td>
                      );
                    }
                    
                    // 获取联动颜色和透明度
                    const linkageColor = getLinkageColor(linkage.correlation);
                    const linkageOpacity = getLinkageOpacity(linkage.correlation);
                    
                    return (
                      <td 
                        key={colIndex} 
                        style={{
                          backgroundColor: `${linkageColor}${Math.round(linkageOpacity * 255).toString(16).padStart(2, '0')}`,
                          color: linkageColor,
                          padding: '4px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title={`联动强度: ${linkage.correlation}%
滞后时间: ${linkage.lagTime}分钟`}
                      >
                        <div style={{
                          fontWeight: '600'
                        }}>
                          {linkage.correlation > 0 ? '+' : ''}{linkage.correlation}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="linkage-legend" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '12px',
          fontSize: '13px',
          color: '#666'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }}></div>
            <span>强正相关</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
            <span>中度正相关</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#6b7280', borderRadius: '2px' }}></div>
            <span>弱相关</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
            <span>中度负相关</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#1d4ed8', borderRadius: '2px' }}></div>
            <span>强负相关</span>
          </div>
        </div>
      </div>

      {/* 板块资金热力阵列 */}
      <div className="section">
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          color: '#bbb',
          fontWeight: '500'
        }}>板块资金热力阵列</h4>
        <div className="sector-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px'
        }}>
          {sectorHeatMatrix.map((sector, index) => (
            <div key={index} className="sector-item" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#2a2a3a',
              borderRadius: '6px',
              padding: '12px',
              borderLeft: `4px solid ${getHeatColor(sector.heatValue)}`
            }}>
              <div style={{
                flex: 1
              }}>
                <div className="sector-name" style={{
                  fontSize: '14px',
                  color: '#fff',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>{sector.sectorName}</div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  <span>涨跌幅: <span style={{ color: sector.change >= 0 ? '#22c55e' : '#ef4444' }}>{formatPercentToFixed2(sector.change)}</span></span>
                  <span>资金: <span style={{ color: getFundFlowColor(sector.fundFlow) }}>{sector.fundFlow >= 0 ? '+' : ''}{formatNumberToFixed2(sector.fundFlow)}亿</span></span>
                </div>
              </div>
              <div className="heat-indicator" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div className="heat-bar" style={{
                  width: '60px',
                  height: '8px',
                  backgroundColor: '#333',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${sector.heatValue}%`,
                    height: '100%',
                    backgroundColor: getHeatColor(sector.heatValue),
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div className="heat-value" style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: getHeatColor(sector.heatValue)
                }}>{sector.heatValue}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 样式 */}
      <style jsx>{`
        @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* 低风险呼吸灯动画 */
        @keyframes breathingLow {
        0%, 100% {
          color: #a6e3a1;
          text-shadow: 0 0 4px rgba(166, 227, 161, 0.5);
        }
        50% {
          color: #22c55e;
          text-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
        }
      }

        /* 中风险呼吸灯动画 */
        @keyframes breathingMedium {
        0%, 100% {
          color: #fbbf24;
          text-shadow: 0 0 4px rgba(251, 191, 36, 0.5);
        }
        50% {
          color: #f59e0b;
          text-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
        }
      }

        /* 高风险呼吸灯动画 */
        @keyframes breathingHigh {
        0%, 100% {
          color: #f38ba8;
          text-shadow: 0 0 4px rgba(243, 139, 168, 0.5);
        }
        50% {
          color: #ef4444;
          text-shadow: 0 0 14px rgba(239, 68, 68, 0.9);
        }
      }

        /* 自定义滚动条 */
        .market-pulse-panel::-webkit-scrollbar {
          width: 6px;
        }

        .market-pulse-panel::-webkit-scrollbar-track {
          background: #1e1e2e;
        }

        .market-pulse-panel::-webkit-scrollbar-thumb {
          background: #313244;
          border-radius: 3px;
        }

        .market-pulse-panel::-webkit-scrollbar-thumb:hover {
          background: #45475a;
        }
      `}</style>
    </div>
  );
};

export default MarketPulse;
