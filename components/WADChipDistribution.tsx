// WAD 筹码分布监控组件
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchChipDistribution, ChipDistributionData as ApiChipDistributionData } from '../lib/api/chip/distribution';
import { fetchTechIndicatorData, TechIndicatorParams } from '../lib/api/techIndicator/indicator';
import { fetchLargeOrderRealTime } from '../lib/api/largeOrder/realTime';

// 防抖函数
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface ChipDistributionData {
  price: number;
  volume: number;
  percentage: number;
}

interface WADIndicatorData {
  timestamp: number;
  wad: number;
  signal?: number;
}

interface LargeOrderSummary {
  totalAmount: number;
  netInflow: number;
  ratio: number;
  signal: string;
}

export default function WADChipDistribution({ symbol = 'SH600000' }: { symbol?: string }) {
  const [chipData, setChipData] = useState<ChipDistributionData[]>([]);
  const [wadData, setWadData] = useState<WADIndicatorData[]>([]);
  const [largeOrderSummary, setLargeOrderSummary] = useState<LargeOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  // 添加支撑位、压力位和建议止损位状态
  const [supportPrice, setSupportPrice] = useState<number | null>(null);
  const [resistancePrice, setResistancePrice] = useState<number | null>(null);
  const [suggestedStopLoss, setSuggestedStopLoss] = useState<number | null>(null);
  
  // 呼吸灯效果状态
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceBlink, setPriceBlink] = useState<'none' | 'up' | 'down'>('none');

  // 从API获取数据
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 并行调用API获取筹码分布、WAD指标和特大单数据
    const [chipResponse, techResponse, largeOrderResponse] = await Promise.all([
      fetchChipDistribution({ stockCode: symbol }),
      fetchTechIndicatorData({ 
        stockCode: symbol, 
        indicatorTypes: ['wad'],
        days: 30
      }),
      fetchLargeOrderRealTime({ stockCode: symbol })
    ]);
    
    // 转换筹码分布数据格式以匹配组件需求，添加空值检查
    const transformedChipData = chipResponse?.data?.chipDistribution?.map(chip => ({
      price: chip.price,
      volume: chip.price * chip.chipRatio, // 估算成交量
      percentage: chip.chipRatio
    })) || [];
    
    // 转换WAD指标数据格式以匹配组件需求，添加空值检查
    const transformedWadData = techResponse?.data?.indicatorDataList?.map(item => ({
      timestamp: new Date(item.time).getTime(),
      wad: item.wad?.wad || 0,
      signal: item.wad?.signal
    })) || [];
    
    // 转换特大单数据格式以匹配组件需求，添加空值检查
    const largeOrderData = largeOrderResponse?.data;
    const transformedLargeOrderSummary: LargeOrderSummary | null = largeOrderData ? {
      totalAmount: largeOrderData.totalLargeOrderAmount || 0,
      netInflow: largeOrderData.largeOrderNetInflow || 0,
      ratio: largeOrderData.largeOrderRatio || 0,
      signal: largeOrderData.abnormalSignal?.[0]?.signalDesc || '无异常信号'
    } : null;
    
    // 从API响应获取支撑位和压力位，添加空值检查
    const apiSupportPrice = chipResponse?.data?.supportPrice || null;
    const apiResistancePrice = chipResponse?.data?.resistancePrice || null;
      
      setChipData(transformedChipData);
      setWadData(transformedWadData);
      setLargeOrderSummary(transformedLargeOrderSummary);
      setSupportPrice(apiSupportPrice);
      setResistancePrice(apiResistancePrice);
      
      // 检测价格变化并触发呼吸灯效果
      // 使用支撑位和压力位的中间价作为当前价格参考
      const currentPrice = apiSupportPrice !== null && apiResistancePrice !== null 
        ? (apiSupportPrice + apiResistancePrice) / 2 
        : null;
      
      if (lastPrice !== null && currentPrice !== null) {
        if (currentPrice > lastPrice) {
          setPriceBlink('up');
          setTimeout(() => setPriceBlink('none'), 500);
        } else if (currentPrice < lastPrice) {
          setPriceBlink('down');
          setTimeout(() => setPriceBlink('none'), 500);
        }
      }
      
      // 更新最后价格
      setLastPrice(currentPrice);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching WAD chip distribution data:', error);
      // 发生错误时使用模拟数据作为降级方案
      const mockChipData = generateMockChipDistribution();
      const mockWadData = generateMockWADData();
      
      // 计算模拟的支撑位和压力位
      const averageCost = calculateAverageCost(mockChipData);
      const mockSupportPrice = averageCost * 0.95;
      const mockResistancePrice = averageCost * 1.05;
      
      setChipData(mockChipData);
      setWadData(mockWadData);
      setLargeOrderSummary(null);
      setSupportPrice(mockSupportPrice);
      setResistancePrice(mockResistancePrice);
    } finally {
      setLoading(false);
    }
  };

  // 使用防抖函数包装fetchData，实现5秒防抖
  const debouncedFetchData = useCallback(debounce(fetchData, 5000), [symbol]);

  useEffect(() => {
    debouncedFetchData();
    
    // 设置定时刷新（每60秒，符合全局限制）
    const interval = setInterval(fetchData, 60000);
    
    // 组件卸载时清除定时器
    return () => {
      clearInterval(interval);
    };
  }, [symbol, debouncedFetchData]);
  
  // 当支撑位或压力位变化时，计算建议止损位
  useEffect(() => {
    if (!supportPrice || !resistancePrice) return;
    
    // 建议止损位计算逻辑：
    // 1. 当存在支撑位时，建议止损位设置在支撑位下方2%
    // 2. 当支撑位不明确时，使用压力位和当前价格的比例来计算
    const stopLossBelowSupport = supportPrice * 0.98;
    
    // 获取最新的WAD指标值，用于调整止损位
    const latestWadValue = wadData.at(-1)?.wad || 0;
    
    // 根据WAD指标调整止损位：如果WAD指标为负（资金流出），则适当降低止损位
    let adjustedStopLoss = stopLossBelowSupport;
    if (latestWadValue < 0) {
      adjustedStopLoss = stopLossBelowSupport * 0.99;
    }
    
    setSuggestedStopLoss(adjustedStopLoss);
  }, [supportPrice, resistancePrice, wadData]);

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
                {wadData.slice(-5).map((item, index) => (
                  <div key={index} className="chart-bar">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <div className="bar" style={{ height: `${Math.abs(item.wad) / 1000}px` }}></div>
                    <span>{item.wad.toFixed(2)}</span>
                  </div>
                ))}
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
              {chipData.map((item, index) => (
                <div key={index} className="chip-bar">
                  <span className="price-label">{item.price / 100}元</span>
                  <div 
                    className="bar" 
                    style={{ 
                      width: `${item.percentage * 100}%`,
                      height: '20px'
                    }}
                  ></div>
                  <span className="percent-label">{item.percentage.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 特大单监控区域 */}
        {largeOrderSummary && (
          <div className="large-order-container">
            <h4>特大单监控</h4>
            <div className="large-order-summary">
              <div className="summary-item">
                <span className="label">大单总金额:</span>
                <span className="value">{(largeOrderSummary.totalAmount / 100000000).toFixed(2)}亿元</span>
              </div>
              <div className="summary-item">
                <span className="label">大单净流入:</span>
                <span className={`value ${largeOrderSummary.netInflow > 0 ? 'positive' : 'negative'}`}>
                  {(largeOrderSummary.netInflow / 100000000).toFixed(2)}亿元
                </span>
              </div>
              <div className="summary-item">
                <span className="label">大单占比:</span>
                <span className="value">{(largeOrderSummary.ratio * 100).toFixed(2)}%</span>
              </div>
              <div className="summary-item">
                <span className="label">主力意图:</span>
                <span className="value signal">{largeOrderSummary.signal}</span>
              </div>
            </div>
          </div>
        )}

        {/* 关键指标区域 */}
        <div className="key-indicators">
          <div className="indicator">
            <span className="label">平均成本:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {calculateAverageCost(chipData) / 100}元
            </span>
          </div>
          <div className="indicator">
            <span className="label">筹码集中度:</span>
            <span className="value">{calculateConcentration(chipData).toFixed(2)}%</span>
          </div>
          <div className="indicator">
            <span className="label">WAD 指标:</span>
            <span className="value">{wadData.at(-1)?.wad?.toFixed(2) || '0'}</span>
            <span className="value">{wadData.at(-1)?.timestamp ? new Date(wadData.at(-1)?.timestamp!).toLocaleString() : '-'}</span>
          </div>
          <div className="metric-line trend">
            <div className="metric-label">趋势信号:</div>
            <span className={`value ${(wadData.at(-1)?.wad || 0) > 0 ? 'positive' : 'negative'}`}>
              {(wadData.at(-1)?.wad || 0) > 0 ? '流入' : '流出'}
            </span>
          </div>
          <div className="indicator">
            <span className="label">支撑位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {supportPrice ? (supportPrice / 100).toFixed(2) : '0.00'}元
            </span>
          </div>
          <div className="indicator">
            <span className="label">压力位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {resistancePrice ? (resistancePrice / 100).toFixed(2) : '0.00'}元
            </span>
          </div>
          <div className="indicator stop-loss">
            <span className="label">建议止损位:</span>
            <span className={`value ${priceBlink === 'up' ? 'price-blink-up' : priceBlink === 'down' ? 'price-blink-down' : ''}`}>
              {suggestedStopLoss ? (suggestedStopLoss / 100).toFixed(2) : '0.00'}元
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wad-chip-monitor {
          background: #1e1e2e;
          border-radius: 8px;
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
          background: #2a2a3a;
          color: #ffffff;
          border: 1px solid #3a3a4a;
          border-radius: 4px;
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
          color: #c4a7e7;
        }

        .wad-chart, .chip-chart, .large-order-summary {
          background: #2a2a3a;
          border-radius: 4px;
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
        }

        .indicator .label {
          font-size: 12px;
          color: #94a3b8;
        }

        .indicator .value {
          font-size: 14px;
          font-weight: 500;
        }

        .indicator .value.positive {
          color: #a6e3a1;
        }

        .indicator .value.negative {
          color: #f38ba8;
        }
        
        /* 呼吸灯效果样式 */
        @keyframes priceBreatheUp {
          0% { background-color: rgba(166, 227, 161, 0); }
          50% { background-color: rgba(166, 227, 161, 0.3); }
          100% { background-color: rgba(166, 227, 161, 0); }
        }
        
        @keyframes priceBreatheDown {
          0% { background-color: rgba(243, 139, 168, 0); }
          50% { background-color: rgba(243, 139, 168, 0.3); }
          100% { background-color: rgba(243, 139, 168, 0); }
        }
        
        .price-blink-up {
          animation: priceBreatheUp 0.5s ease-in-out;
        }
        
        .price-blink-down {
          animation: priceBreatheDown 0.5s ease-in-out;
        }
        
        .indicator.stop-loss .label {
          font-weight: bold;
        }
        
        .indicator.stop-loss .value {
          color: #f38ba8;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

// 模拟生成筹码分布数据
function generateMockChipDistribution(): ChipDistributionData[] {
  const data: ChipDistributionData[] = [];
  const basePrice = 850; // 8.50元
  const totalVolume = 10000000;
  
  for (let i = -10; i <= 10; i++) {
    const price = basePrice + i * 10; // 价格区间：7.50-9.50元，步长0.10元
    const volume = Math.max(500000, Math.random() * 2000000 * (1 - Math.abs(i) / 15));
    data.push({
      price,
      volume,
      percentage: volume / totalVolume
    });
  }
  
  return data;
}

// 模拟生成WAD指标数据
function generateMockWADData(): WADIndicatorData[] {
  const data: WADIndicatorData[] = [];
  const now = Date.now();
  let wad = 0;
  
  for (let i = 30; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    wad += (Math.random() - 0.5) * 500;
    data.push({
      timestamp,
      wad
    });
  }
  
  return data;
}

// 计算平均成本
function calculateAverageCost(data: ChipDistributionData[]): number {
  if (data.length === 0) return 0;
  const total = data.reduce((acc, item) => acc + (item.price * item.volume), 0);
  const totalVolume = data.reduce((acc, item) => acc + item.volume, 0);
  return total / totalVolume;
}

// 计算筹码集中度（前20%价格区间的筹码占比）
function calculateConcentration(data: ChipDistributionData[]): number {
  if (data.length === 0) return 0;
  
  // 按价格排序
  const sortedData = [...data].sort((a, b) => a.price - b.price);
  
  // 计算总筹码
  const totalVolume = sortedData.reduce((acc, item) => acc + item.volume, 0);
  
  // 计算前20%价格区间的筹码占比
  const targetRange = totalVolume * 0.2;
  let accumulatedVolume = 0;
  let concentration = 0;
  
  for (const item of sortedData) {
    accumulatedVolume += item.volume;
    concentration += item.percentage;
    if (accumulatedVolume >= targetRange) {
      break;
    }
  }
  
  return concentration;
}