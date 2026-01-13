// WAD 筹码分布监控组件
'use client';

import React, { useEffect, useMemo } from 'react';
import { useChipStore, calculateAverageCost, calculateConcentration } from '../lib/store/chip-store';
import { formatNumberToFixed2, formatNumberWithUnit } from '../lib/utils/numberFormatter';

export default function WADChipDistribution({ symbol = 'SH600000' }: { symbol?: string }) {
  // 从Store获取状态
  const {
    tacticalState,
    loading,
    lastUpdate,
    setStockCode,
    startPolling,
    stopPolling
  } = useChipStore();
  
  // 解构状态以便使用
  const { 
    chipData, 
    wadData, 
    largeOrderSummary, 
    supportPrice, 
    resistancePrice, 
    suggestedStopLoss, 
    lastPrice, 
    priceBlink 
  } = tacticalState;

  // 组件挂载时设置股票代码并开始轮询
  useEffect(() => {
    setStockCode(symbol);
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [symbol, setStockCode, startPolling, stopPolling]);
  
  // 使用useMemo缓存计算结果
  const averageCost = useMemo(() => calculateAverageCost(chipData), [chipData]);
  const concentration = useMemo(() => calculateConcentration(chipData), [chipData]);
  const latestWadValue = useMemo(() => wadData.at(-1)?.wad || 0, [wadData]);
  const latestWadTimestamp = useMemo(() => wadData.at(-1)?.timestamp, [wadData]);
  
  // 转换筹码分布数据格式以匹配组件需求
  const transformedChipData = useMemo(() => {
    return chipData.map(chip => ({
      price: chip.price,
      volume: chip.price * chip.chipRatio, // 估算成交量
      percentage: chip.chipRatio
    })) || [];
  }, [chipData]);

  if (loading) {
    return (
      <div className="wad-chip-monitor">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 12px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(137, 220, 235, 0.3);
            border-top: 4px solid #89dceb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wad-chip-monitor">
      <div className="monitor-header">
        <div>
          <h3>WAD 筹码分布监控 - {symbol}</h3>
          <p className="last-update">最后更新: {lastUpdate}</p>
        </div>
        <div className="monitor-controls">
          <select defaultValue="1d">
            <option value="1d">日线</option>
            <option value="1w">周线</option>
            <option value="1m">月线</option>
          </select>
        </div>
      </div>
      
      <div className="monitor-content">
        {/* WAD指标图表区域 */}
        <div className="wad-chart-container">
          <h4>WAD 指标</h4>
          <div className="wad-chart">
            {/* 这里可以集成Chart.js或其他图表库 */}
            <div className="chart-placeholder">
              <div className="chart-title">WAD 指标走势图</div>
              <div className="chart-data">
                {wadData && wadData.length > 0 ? (
                  wadData.slice(-5).map((item, index) => (
                    <div key={index} className="chart-bar">
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      <div className="bar" style={{ height: `${Math.abs(item.wad) / 1000}px` }}></div>
                      <span>{formatNumberToFixed2(item.wad)}</span>
                    </div>
                  ))
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100px' }}></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 筹码分布图区域 */}
        <div className="chip-distribution-container">
          <h4>筹码分布</h4>
          <div className="chip-chart">
            <div className="chip-title">价格区间 - 筹码占比</div>
            <div className="chip-bars">
              {transformedChipData && transformedChipData.length > 0 ? (
                transformedChipData.slice(0, 10).map((item, index) => (
                  <div key={index} className="chip-bar">
                    <span className="price-label">{item.price / 100}元</span>
                    <div 
                      className="bar" 
                      style={{ 
                        width: `${item.percentage * 100}%`,
                        height: '20px'
                      }}
                    ></div>
                    <span className="percent-label">{formatNumberToFixed2(item.percentage * 100)}%</span>
                  </div>
                ))
              ) : (
                <div className="skeleton" style={{ width: '100%', height: '200px' }}></div>
              )}
            </div>
          </div>
        </div>

        {/* 特大单监控区域 */}
        {largeOrderSummary && (
          <div className="large-order-container">
            <h4>特大单监控</h4>
            <div className="large-order-summary">
              <div className="summary-item">
                <span className="label">总净买入:</span>
                <span className="value">{formatNumberWithUnit(largeOrderSummary.totalNetBuy)}</span>
              </div>
              <div className="summary-item">
                <span className="label">总净卖出:</span>
                <span className="value">{formatNumberWithUnit(largeOrderSummary.totalNetSell)}</span>
              </div>
              <div className="summary-item">
                <span className="label">特大单数量:</span>
                <span className="value">{largeOrderSummary.largeOrderCount}</span>
              </div>
              <div className="summary-item">
                <span className="label">平均订单大小:</span>
                <span className="value">{formatNumberWithUnit(largeOrderSummary.averageOrderSize)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 关键指标区域 */}
        <div className="key-indicators">
          <div className="indicator">
            <span className="label">平均成本:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {formatNumberToFixed2(averageCost / 100)}元
            </span>
          </div>
          <div className="indicator">
            <span className="label">筹码集中度:</span>
            <span className="value">{formatNumberToFixed2(concentration * 100)}%</span>
          </div>
          <div className="indicator">
            <span className="label">WAD 指标:</span>
            <span className="value">{formatNumberToFixed2(latestWadValue)}</span>
          </div>
          <div className="metric-line trend">
            <div className="metric-label">趋势信号:</div>
            <span className={`value ${latestWadValue > 0 ? 'positive' : 'negative'}`}>
              {latestWadValue > 0 ? '流入' : '流出'}
            </span>
          </div>
          <div className="indicator">
            <span className="label">支撑位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {supportPrice ? formatNumberToFixed2(supportPrice / 100) : '0.00'}元
            </span>
          </div>
          <div className="indicator">
            <span className="label">压力位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {resistancePrice ? formatNumberToFixed2(resistancePrice / 100) : '0.00'}元
            </span>
          </div>
          <div className="indicator stop-loss">
            <span className="label">建议止损位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {suggestedStopLoss ? formatNumberToFixed2(suggestedStopLoss / 100) : '0.00'}元
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wad-chip-monitor {
          background: #000;
          border: 1px solid #333;
          padding: 16px;
          color: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .monitor-header h3 {
          margin: 0;
          font-size: 18px;
          color: #89dceb;
        }
        
        .last-update {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .monitor-controls select {
          background: #000;
          color: #ffffff;
          border: 1px solid #333;
          padding: 4px 8px;
        }

        .monitor-content {
          flex: 1;
          overflow-y: auto;
        }

        .wad-chart-container, .chip-distribution-container, .large-order-container {
          margin-bottom: 24px;
        }

        .wad-chart-container h4, .chip-distribution-container h4, .large-order-container h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #FFD700;
        }

        .wad-chart, .chip-chart, .large-order-summary {
          background: #000;
          border: 1px solid #333;
          padding: 12px;
        }

        .chart-placeholder, .chip-title {
          margin-bottom: 12px;
        }

        .chart-title, .chip-title {
          font-size: 12px;
          color: #94a3b8;
        }

        .chart-data, .chip-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chart-bar, .chip-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-bar span, .chip-bar .price-label, .chip-bar .percent-label {
          font-size: 12px;
          color: #94a3b8;
          width: 80px;
        }

        .chart-bar .bar, .chip-bar .bar {
          flex: 1;
          background: #89dceb;
          border-radius: 2px;
        }

        .chip-bar .price-label {
          text-align: right;
        }

        .chip-bar .percent-label {
          width: 50px;
        }

        .large-order-summary {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #3a3a4a;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-item .label {
          font-size: 12px;
          color: #94a3b8;
        }

        .summary-item .value {
          font-size: 14px;
          font-weight: 500;
        }

        .summary-item .value.signal {
          color: #f9e2af;
          font-weight: bold;
        }

        .key-indicators {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: #2a2a3a;
          padding: 12px;
          border-radius: 4px;
        }

        .indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        .indicator .label, .metric-line .metric-label {
          font-size: 12px;
          color: #94a3b8;
        }

        .indicator .value, .metric-line .value {
          font-size: 14px;
          font-weight: 500;
        }

        .indicator.stop-loss .value {
          color: #ef4444;
        }

        .metric-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          grid-column: 1 / -1;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        .skeleton {
          background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .positive {
          color: #10b981;
        }

        .negative {
          color: #ef4444;
        }

        .price-blink-up {
          animation: blink-up 0.5s ease-in-out;
        }

        .price-blink-down {
          animation: blink-down 0.5s ease-in-out;
        }

        @keyframes blink-up {
          0%, 100% { color: #ffffff; }
          50% { color: #10b981; }
        }

        @keyframes blink-down {
          0%, 100% { color: #ffffff; }
          50% { color: #ef4444; }
        }
      `}</style>
    </div>
  );
}