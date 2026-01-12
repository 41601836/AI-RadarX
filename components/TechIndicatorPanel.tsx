// 技术指标面板组件
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchTechIndicatorData, TechIndicatorParams, TechIndicatorData, IndicatorDataItem } from '../lib/api/techIndicator/techindicatordata';
import { usePolling } from '../lib/hooks/usePolling';
import { useStockContext } from '../lib/context/StockContext';
import { formatNumberToFixed2, formatNumberWithUnit, formatPercentToFixed2 } from '../lib/utils/numberFormatter';

interface TechIndicatorPanelProps {
  symbol?: string;
  initialCycleType?: 'day' | 'week' | 'month' | '60min';
  initialIndicatorTypes?: string[];
  initialDays?: number;
}

export default function TechIndicatorPanel({
  symbol = 'SH600000',
  initialCycleType = 'day',
  initialIndicatorTypes = ['ma', 'macd', 'rsi'],
  initialDays = 60
}: TechIndicatorPanelProps) {
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  const currentSymbol = currentTicker?.ts_code || symbol;
  
  // 状态管理
  const [indicatorData, setIndicatorData] = useState<TechIndicatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // 筛选和周期状态
  const [cycleType, setCycleType] = useState<'day' | 'week' | 'month' | '60min'>(initialCycleType);
  const [indicatorTypes, setIndicatorTypes] = useState<string[]>(initialIndicatorTypes);
  const [days, setDays] = useState(initialDays);
  
  // 获取技术指标数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: TechIndicatorParams = {
        stockCode: currentSymbol,
        cycleType,
        indicatorTypes: indicatorTypes.join(','),
        days
      };
      
      const data = await fetchTechIndicatorData(params);
      setIndicatorData(data);
      setLastUpdate(new Date().toLocaleString());
    } catch (err) {
      setError('获取技术指标数据失败');
      console.error('技术指标数据获取错误:', err);
    } finally {
      setLoading(false);
    }
  }, [currentSymbol, cycleType, indicatorTypes, days]);
  
  // 使用轮询钩子实现定时刷新
  usePolling(fetchData, { interval: 15000, immediate: true });
  
  // 处理筛选条件变化
  const handleCycleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCycleType(e.target.value as 'day' | 'week' | 'month' | '60min');
  };
  
  const handleDaysChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDays(parseInt(e.target.value, 10));
  };
  
  const handleIndicatorTypeChange = (type: string) => {
    setIndicatorTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // 获取最新数据点
  const latestData = indicatorData?.items[indicatorData.items.length - 1] || null;
  
  // 渲染加载状态
  if (loading) {
    return (
      <div className="tech-indicator-panel">
        <div className="loading-container">
          <p>加载技术指标数据中...</p>
        </div>
        
        <style jsx>{`
          .tech-indicator-panel {
            background: #000000;
            border: 1px solid #333;
            padding: 16px;
            color: #ffffff;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #94a3b8;
          }
        `}</style>
      </div>
    );
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <div className="tech-indicator-panel">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchData}>重试</button>
        </div>
        
        <style jsx>{`
          .tech-indicator-panel {
            background: #000000;
            border: 1px solid #333;
            padding: 16px;
            color: #ffffff;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .error-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #f38ba8;
            gap: 16px;
          }
          
          button {
            background: #1e1e2e;
            color: #ffffff;
            border: 1px solid #444;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          
          button:hover {
            border-color: #89dceb;
          }
        `}</style>
      </div>
    );
  }
  
  // 渲染无数据状态
  if (!indicatorData || !indicatorData.items || indicatorData.items.length === 0) {
    return (
      <div className="tech-indicator-panel">
        <div className="no-data">
          <p>暂无技术指标数据</p>
        </div>
        
        <style jsx>{`
          .tech-indicator-panel {
            background: #000000;
            border: 1px solid #333;
            padding: 16px;
            color: #ffffff;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .no-data {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #94a3b8;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="tech-indicator-panel">
      {/* 组件头部 */}
      <div className="component-header">
        <div>
          <h3>技术指标 - {indicatorData.stockName} ({indicatorData.stockCode})</h3>
          <p className="last-update">最后更新: {lastUpdate}</p>
        </div>
      </div>
      
      {/* 筛选条件 */}
      <div className="filter-container">
        <div className="filter-group">
          <label>周期类型:</label>
          <select 
            value={cycleType} 
            onChange={handleCycleTypeChange}
          >
            <option value="day">日线</option>
            <option value="week">周线</option>
            <option value="month">月线</option>
            <option value="60min">60分钟线</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>统计天数:</label>
          <select 
            value={days} 
            onChange={handleDaysChange}
          >
            <option value="30">30天</option>
            <option value="60">60天</option>
            <option value="90">90天</option>
            <option value="120">120天</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>指标类型:</label>
          <div className="indicator-type-checkboxes">
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={indicatorTypes.includes('ma')} 
                onChange={() => handleIndicatorTypeChange('ma')}
              />
              <span>MA</span>
            </label>
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={indicatorTypes.includes('macd')} 
                onChange={() => handleIndicatorTypeChange('macd')}
              />
              <span>MACD</span>
            </label>
            <label className="checkbox-item">
              <input 
                type="checkbox" 
                checked={indicatorTypes.includes('rsi')} 
                onChange={() => handleIndicatorTypeChange('rsi')}
              />
              <span>RSI</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* K线数据概览 */}
      {latestData && (
        <div className="kline-overview">
          <div className="overview-item">
            <div className="item-label">开盘价</div>
            <div className="item-value">{formatNumberToFixed2(latestData.openPrice / 100)}元</div>
          </div>
          
          <div className="overview-item">
            <div className="item-label">收盘价</div>
            <div className="item-value">{formatNumberToFixed2(latestData.closePrice / 100)}元</div>
          </div>
          
          <div className="overview-item">
            <div className="item-label">最高价</div>
            <div className="item-value">{formatNumberToFixed2(latestData.highPrice / 100)}元</div>
          </div>
          
          <div className="overview-item">
            <div className="item-label">最低价</div>
            <div className="item-value">{formatNumberToFixed2(latestData.lowPrice / 100)}元</div>
          </div>
          
          <div className="overview-item">
            <div className="item-label">成交量</div>
            <div className="item-value">{formatNumberWithUnit(latestData.volume)}</div>
          </div>
        </div>
      )}
      
      {/* 技术指标详情 */}
      <div className="indicator-details">
        {/* MA指标 */}
        {indicatorTypes.includes('ma') && latestData?.ma && (
          <div className="indicator-card">
            <div className="indicator-header">
              <h4>均线指标 (MA)</h4>
            </div>
            
            <div className="ma-values">
              {latestData.ma.ma5 && (
                <div className="ma-item">
                  <div className="ma-label">MA5</div>
                  <div className="ma-value">{formatNumberToFixed2(latestData.ma.ma5 / 100)}元</div>
                </div>
              )}
              
              {latestData.ma.ma10 && (
                <div className="ma-item">
                  <div className="ma-label">MA10</div>
                  <div className="ma-value">{formatNumberToFixed2(latestData.ma.ma10 / 100)}元</div>
                </div>
              )}
              
              {latestData.ma.ma20 && (
                <div className="ma-item">
                  <div className="ma-label">MA20</div>
                  <div className="ma-value">{formatNumberToFixed2(latestData.ma.ma20 / 100)}元</div>
                </div>
              )}
              
              {latestData.ma.ma30 && (
                <div className="ma-item">
                  <div className="ma-label">MA30</div>
                  <div className="ma-value">{formatNumberToFixed2(latestData.ma.ma30 / 100)}元</div>
                </div>
              )}
              
              {latestData.ma.ma60 && (
                <div className="ma-item">
                  <div className="ma-label">MA60</div>
                  <div className="ma-value">{formatNumberToFixed2(latestData.ma.ma60 / 100)}元</div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* MACD指标 */}
        {indicatorTypes.includes('macd') && latestData?.macd && (
          <div className="indicator-card">
            <div className="indicator-header">
              <h4>MACD指标</h4>
            </div>
            
            <div className="macd-values">
              {latestData.macd.diff !== undefined && (
                <div className="macd-item">
                  <div className="macd-label">DIFF</div>
                  <div className="macd-value">{formatNumberToFixed2(latestData.macd.diff)}</div>
                </div>
              )}
              
              {latestData.macd.dea !== undefined && (
                <div className="macd-item">
                  <div className="macd-label">DEA</div>
                  <div className="macd-value">{formatNumberToFixed2(latestData.macd.dea)}</div>
                </div>
              )}
              
              {latestData.macd.bar !== undefined && (
                <div className="macd-item">
                  <div className="macd-label">BAR</div>
                  <div className={`macd-value ${latestData.macd.bar > 0 ? 'positive' : latestData.macd.bar < 0 ? 'negative' : ''}`}>
                    {formatNumberToFixed2(latestData.macd.bar)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* RSI指标 */}
        {indicatorTypes.includes('rsi') && latestData?.rsi && (
          <div className="indicator-card">
            <div className="indicator-header">
              <h4>RSI指标</h4>
            </div>
            
            <div className="rsi-values">
              {latestData.rsi.rsi6 !== undefined && (
                <div className="rsi-item">
                  <div className="rsi-label">RSI6</div>
                  <div className={`rsi-value ${latestData.rsi.rsi6 > 70 ? 'overbought' : latestData.rsi.rsi6 < 30 ? 'oversold' : ''}`}>
                    {formatNumberToFixed2(latestData.rsi.rsi6)}
                  </div>
                </div>
              )}
              
              {latestData.rsi.rsi12 !== undefined && (
                <div className="rsi-item">
                  <div className="rsi-label">RSI12</div>
                  <div className={`rsi-value ${latestData.rsi.rsi12 > 70 ? 'overbought' : latestData.rsi.rsi12 < 30 ? 'oversold' : ''}`}>
                    {formatNumberToFixed2(latestData.rsi.rsi12)}
                  </div>
                </div>
              )}
              
              {latestData.rsi.rsi24 !== undefined && (
                <div className="rsi-item">
                  <div className="rsi-label">RSI24</div>
                  <div className={`rsi-value ${latestData.rsi.rsi24 > 70 ? 'overbought' : latestData.rsi.rsi24 < 30 ? 'oversold' : ''}`}>
                    {formatNumberToFixed2(latestData.rsi.rsi24)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 图表区域 */}
      <div className="chart-container">
        <h4>指标图表</h4>
        <div className="chart-placeholder">
          <p>图表展示区域</p>
        </div>
      </div>
      
      <style jsx>{`
        .tech-indicator-panel {
          background: #000000;
          border: 1px solid #333;
          padding: 16px;
          color: #ffffff;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .component-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .component-header h3 {
          margin: 0;
          font-size: 18px;
          color: #89dceb;
        }
        
        .last-update {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .filter-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          padding: 12px;
          background: #1a1a2e;
          border-radius: 4px;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .filter-group label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .filter-group select {
          background: #000;
          color: #fff;
          border: 1px solid #444;
          padding: 8px;
          border-radius: 4px;
        }
        
        .indicator-type-checkboxes {
          display: flex;
          gap: 16px;
        }
        
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        
        .kline-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #1a1a2e;
          border-radius: 4px;
        }
        
        .overview-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .item-label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .item-value {
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .indicator-details {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 24px;
        }
        
        .indicator-card {
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          margin-bottom: 16px;
          border-radius: 4px;
          transition: border-color 0.2s;
        }
        
        .indicator-card:hover {
          border-color: #89dceb;
        }
        
        .indicator-header {
          margin-bottom: 16px;
        }
        
        .indicator-header h4 {
          margin: 0;
          font-size: 16px;
          color: #FFD700;
        }
        
        .ma-values {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .ma-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 80px;
        }
        
        .ma-label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .ma-value {
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .macd-values {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .macd-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 80px;
        }
        
        .macd-label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .macd-value {
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .macd-value.positive {
          color: #a6e3a1;
        }
        
        .macd-value.negative {
          color: #f38ba8;
        }
        
        .rsi-values {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .rsi-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 80px;
        }
        
        .rsi-label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .rsi-value {
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .rsi-value.overbought {
          color: #f38ba8;
        }
        
        .rsi-value.oversold {
          color: #a6e3a1;
        }
        
        .chart-container {
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          border-radius: 4px;
          text-align: center;
        }
        
        .chart-container h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #FFD700;
        }
        
        .chart-placeholder {
          padding: 40px 20px;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .indicator-details::-webkit-scrollbar {
          width: 8px;
        }
        
        .indicator-details::-webkit-scrollbar-track {
          background: #000;
        }
        
        .indicator-details::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        
        .indicator-details::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
