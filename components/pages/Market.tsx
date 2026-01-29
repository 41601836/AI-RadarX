'use client';

import React, { useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { fetchStockBasicList, StockBasicInfo } from '../../lib/api/market';
import { RealTimeIntradayStrengthCalculator } from '../../lib/algorithms/intradayStrength';
import { formatNumberToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';
import { usePolling } from '../../lib/hooks/usePolling';
import { useStockContext } from '../../lib/context/StockContext';
import { useUserStore } from '../../lib/store/user-portfolio';
import { useStrategyStore } from '../../lib/store/useStrategyStore';
import { ConsensusResult } from '../../lib/store/useStrategyStore';
import { useMarketStore, WatchlistItem } from '../../lib/store/useMarketStore';

// 定义市场分类类型
interface MarketCategory {
  id: string;
  name: string;
  stocks: StockWithStrength[];
}

// 扩展StockBasicInfo接口，添加强度数据和AI共识结果
interface StockWithStrength extends StockBasicInfo {
  strength?: number;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  consensusResult?: ConsensusResult | null;
  isInWatchlist?: boolean;
}

const Market: React.FC = () => {
  // 添加客户端仅渲染模式
  const [mounted, setMounted] = useState(false);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStock, setProcessingStock] = useState<string | null>(null); // 记录当前正在处理的股票代码

  // 强度计算器实例
  const [strengthCalculators, setStrengthCalculators] = useState<Map<string, RealTimeIntradayStrengthCalculator>>(new Map());

  // 获取当前股票上下文
  const { setCurrentTicker } = useStockContext();
  // 获取用户状态管理
  const { setActiveTab } = useUserStore();
  // 获取策略Store
  const { getStockConsensus, runConsensus } = useStrategyStore();
  // 获取市场数据Store
  const {
    marketData,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    startRealtimeUpdates,
    stopRealtimeUpdates
  } = useMarketStore();

  // 处理股票点击事件 - 使用useCallback优化
  const handleStockClick = useCallback(async (stock: StockWithStrength) => {
    try {
      // 设置处理中状态
      setProcessingStock(stock.ts_code);

      // 1. 通过StockContext切换全局当前股票
      setCurrentTicker(stock);

      // 2. 切换到策略页面
      setActiveTab('strategy');

      // 3. 触发AI共识分析(自动推理)
      await runConsensus(stock.ts_code, stock.name);
    } catch (error) {
      console.error('处理股票点击事件失败:', error);
      // 设置错误信息
      setError(`处理股票 ${stock.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      // 清除处理中状态
      setProcessingStock(null);
    }
  }, [setCurrentTicker, setActiveTab, runConsensus]);

  // 处理自选股添加/移除
  const handleWatchlistToggle = useCallback((stock: StockWithStrength, e: React.MouseEvent) => {
    e.stopPropagation();
    const isInWatchlist = watchlist.some(item => item.symbol === stock.ts_code);

    if (isInWatchlist) {
      removeFromWatchlist(stock.ts_code);
    } else {
      addToWatchlist({
        symbol: stock.ts_code,
        name: stock.name,
        addedAt: Date.now()
      });
    }
  }, [watchlist, addToWatchlist, removeFromWatchlist]);

  // 处理闪电下单操作 - 使用useCallback优化
  const handleLightningTrade = useCallback((stock: StockWithStrength) => {
    console.log('Lightning trade for:', stock.ts_code, stock.name);
    // TODO: 实现闪电下单逻辑
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 在组件挂载前不渲染任何内容
  if (!mounted) return null;

  // 检查本地API连接状态
  const checkLocalApiConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000), // 3秒超时
      });
      return response.ok;
    } catch (error) {
      console.error('Local API connection check failed:', error);
      return false;
    }
  };

  // 获取股票列表数据
  useEffect(() => {
    const loadStockData = async () => {
      setLoading(true);
      setError(null); // 清除之前的错误
      try {
        // 检查数据健康状态
        const isLocalApiConnected = await checkLocalApiConnection();
        let stocks: StockWithStrength[] = [];

        if (isLocalApiConnected) {
          // 在线模式：调用Java后端API
          try {
            const response = await fetch('http://localhost:8080/api/v1/market/quote');
            if (!response.ok) {
              throw new Error('Failed to fetch market data from Java backend');
            }
            const marketData = await response.json();
            // 转换Java后端返回的数据格式
            stocks = marketData.data || [];
          } catch (javaApiError) {
            console.error('Java backend API error:', javaApiError);
            // 降级到Tushare或Mock数据
            const response = await fetchStockBasicList();
            stocks = response?.data?.list || [];
          }
        } else {
          // 离线模式：显示预设的10只标杆股票的Mock数据
          const mockStocks = [
            { ts_code: 'SH600000', symbol: '600000', name: '浦发银行', area: '上海', industry: '银行', market: '主板', list_date: '19990114', price: 8.25, change: 0.05, changePercent: 0.61, volume: 12345678 },
            { ts_code: 'SZ000001', symbol: '000001', name: '平安银行', area: '深圳', industry: '银行', market: '主板', list_date: '19910403', price: 15.82, change: -0.12, changePercent: -0.75, volume: 23456789 },
            { ts_code: 'SH600036', symbol: '600036', name: '招商银行', area: '上海', industry: '银行', market: '主板', list_date: '20020409', price: 32.50, change: 0.35, changePercent: 1.09, volume: 34567890 },
            { ts_code: 'SZ002415', symbol: '002415', name: '海康威视', area: '杭州', industry: '电子', market: '中小板', list_date: '20100528', price: 35.68, change: 0.85, changePercent: 2.44, volume: 45678901 },
            { ts_code: 'SZ000858', symbol: '000858', name: '五粮液', area: '四川', industry: '食品饮料', market: '主板', list_date: '19980427', price: 178.50, change: -1.20, changePercent: -0.67, volume: 56789012 },
            { ts_code: 'SH600519', symbol: '600519', name: '贵州茅台', area: '贵州', industry: '食品饮料', market: '主板', list_date: '20010827', price: 1850.00, change: 25.00, changePercent: 1.37, volume: 67890123 },
            { ts_code: 'SZ300750', symbol: '300750', name: '宁德时代', area: '福建', industry: '电气设备', market: '创业板', list_date: '20180611', price: 245.60, change: -3.20, changePercent: -1.29, volume: 78901234 },
            { ts_code: 'SH601318', symbol: '601318', name: '中国平安', area: '上海', industry: '非银金融', market: '主板', list_date: '20070301', price: 45.20, change: 0.15, changePercent: 0.33, volume: 89012345 },
            { ts_code: 'SH600031', symbol: '600031', name: '三一重工', area: '湖南', industry: '机械设备', market: '主板', list_date: '20030703', price: 23.45, change: -0.55, changePercent: -2.29, volume: 90123456 },
            { ts_code: 'SZ000002', symbol: '000002', name: '万科A', area: '深圳', industry: '房地产', market: '主板', list_date: '19910129', price: 14.85, change: 0.05, changePercent: 0.34, volume: 10123456 }
          ];
          stocks = mockStocks;
        }

        // 初始分类
        categorizeStocks(stocks);

        // 初始化强度计算器
        const calculators = new Map<string, RealTimeIntradayStrengthCalculator>();
        stocks.forEach(stock => {
          calculators.set(stock.ts_code, new RealTimeIntradayStrengthCalculator());
        });
        setStrengthCalculators(calculators);

      } catch (error) {
        console.error('Error loading stock data:', error);
        setError(`加载股票数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, []);

  // 监听分类变化，启动实时更新
  useEffect(() => {
    const currentStocks = getCurrentCategoryStocks();
    const symbols = currentStocks.map(s => s.ts_code);

    if (symbols.length > 0) {
      // 启动实时更新（每3秒）
      startRealtimeUpdates(symbols);
    }

    return () => {
      stopRealtimeUpdates();
    };
  }, [selectedCategory, categories]); // categories 变化也会触发（例如自选股变化）

  // 分类股票
  const categorizeStocks = (stocks: StockWithStrength[]) => {
    const categories: MarketCategory[] = [
      { id: 'watchlist', name: '自选', stocks: [] }, // 添加自选股分类
      { id: 'main', name: '主板', stocks: [] },
      { id: 'gem', name: '创业板', stocks: [] },
      { id: 'tech', name: '科创板', stocks: [] },
      { id: 'small', name: '中小板', stocks: [] },
      { id: 'northbound', name: '北交所', stocks: [] }
    ];

    stocks.forEach(stock => {
      // 检查是否在自选股中
      // 注意：这里我们不直接在这里判断，因为watchlist是动态的
      // 我们会在渲染时或getCurrentCategoryStocks中合并状态

      if (stock.market.includes('SH') || stock.market.includes('SZ')) {
        categories[1].stocks.push(stock); // 主板
      }
      if (stock.ts_code.startsWith('SZ300')) {
        categories[2].stocks.push(stock); // 创业板
      }
      if (stock.ts_code.startsWith('SH688')) {
        categories[3].stocks.push(stock); // 科创板
      }
      if (stock.ts_code.startsWith('SZ002')) {
        categories[4].stocks.push(stock); // 中小板
      }
      if (stock.market.includes('BJ')) {
        categories[5].stocks.push(stock); // 北交所
      }
    });

    setCategories(categories);
  };

  // 获取当前分类的股票（合并实时数据）
  const getCurrentCategoryStocks = useCallback(() => {
    let stocks: StockWithStrength[] = [];

    if (selectedCategory === 'watchlist') {
      // 从所有分类中查找自选股，或者如果后端支持直接获取自选股详情更好
      // 这里我们遍历所有分类来构建自选股列表（简化版）
      // 实际应用中应该维护一个所有股票的Map
      const allStocks = categories.flatMap(c => c.id !== 'watchlist' ? c.stocks : []);
      stocks = allStocks.filter(s => watchlist.some(w => w.symbol === s.ts_code));

      // 去重
      stocks = Array.from(new Set(stocks.map(s => s.ts_code)))
        .map(code => stocks.find(s => s.ts_code === code)!);

    } else {
      const category = categories.find(cat => cat.id === selectedCategory);
      stocks = category ? category.stocks : [];
    }

    // 合并实时数据
    return stocks.map(stock => {
      const quote = marketData.quotes[stock.ts_code];
      const isInWatchlist = watchlist.some(w => w.symbol === stock.ts_code);
      const consensus = getStockConsensus(stock.ts_code);

      return {
        ...stock,
        price: quote?.price || stock.price, // 优先使用实时数据
        change: quote?.change || stock.change,
        changePercent: quote?.changePercent || stock.changePercent,
        volume: quote?.volume || stock.volume,
        isInWatchlist,
        consensusResult: consensus
      };
    });
  }, [categories, selectedCategory, watchlist, marketData.quotes, getStockConsensus]);

  // 移除旧的 usePolling，因为我们使用了 useMarketStore 的实时更新


  // 格式化数字显示
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  // 格式化成交量显示
  const formatVolume = (volume: number): string => {
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(2) + '亿';
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(2) + '万';
    }
    return volume.toString();
  };

  // 获取AI评级文本
  const getAIDecisionText = (decision: string): string => {
    switch (decision) {
      case 'buy': return '强力买入';
      case 'sell': return '风险回避';
      case 'hold': return '持币观望';
      default: return '未知';
    }
  };

  // 获取强度颜色
  const getStrengthColor = (strength: number): string => {
    if (strength >= 0.8) return '#ef4444'; // 红色
    if (strength >= 0.6) return '#f59e0b'; // 橙色
    if (strength >= 0.4) return '#eab308'; // 黄色
    if (strength >= 0.2) return '#84cc16'; // 绿色
    return '#22c55e'; // 深绿色
  };

  // FPS监控组件
  const FPSCounter = () => {
    const fpsRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const frameCountRef = useRef(0);
    const warnThreshold = 55; // 低于此FPS时显示警告

    useEffect(() => {
      const measureFPS = (time: number) => {
        frameCountRef.current++;
        const secondsPassed = (time - lastTimeRef.current) / 1000;

        if (secondsPassed >= 1) {
          fpsRef.current = frameCountRef.current;
          frameCountRef.current = 0;
          lastTimeRef.current = time;

          // 如果FPS低于阈值，在控制台显示警告
          if (fpsRef.current < warnThreshold) {
            console.warn(`Market页面FPS较低: ${fpsRef.current}fps，可能影响用户体验`);
          }
        }

        requestAnimationFrame(measureFPS);
      };

      const animationFrameId = requestAnimationFrame(measureFPS);

      return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return null;
  };

  // 虚拟滚动组件
  interface VirtualScrollProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    itemHeight: number;
    containerHeight: number;
    itemKey: (item: T) => string;
  }

  const VirtualScroll = <T extends any>({
    items,
    renderItem,
    itemHeight,
    containerHeight,
    itemKey
  }: VirtualScrollProps<T>) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollTopRef = React.useRef(0);
    const rafRef = React.useRef<number | null>(null);
    const prevItemsCountRef = React.useRef(items.length);

    // 计算可见区域的项目
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferSize = 2;

    // 计算可见项
    const startIndex = Math.max(0, Math.floor(scrollTopRef.current / itemHeight) - bufferSize);
    const endIndex = Math.min(items.length, startIndex + visibleCount + bufferSize * 2);
    const visibleItems = items.slice(startIndex, endIndex);

    // 节流处理滚动事件
    const handleScroll = () => {
      if (containerRef.current) {
        scrollTopRef.current = containerRef.current.scrollTop;

        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            // 触发重渲染
            rafRef.current = null;
          });
        }
      }
    };

    // 处理项目数量变化时的滚动位置调整
    React.useEffect(() => {
      if (prevItemsCountRef.current > items.length && containerRef.current) {
        // 如果项目数量减少，确保滚动位置不会超出新的总高度
        const newTotalHeight = items.length * itemHeight;
        if (containerRef.current.scrollTop > newTotalHeight - containerHeight) {
          containerRef.current.scrollTop = Math.max(0, newTotalHeight - containerHeight);
          scrollTopRef.current = containerRef.current.scrollTop;
        }
      }
      prevItemsCountRef.current = items.length;
    }, [items.length, itemHeight, containerHeight]);

    // 组件卸载时清理
    React.useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    // 总高度
    const totalHeight = items.length * itemHeight;

    // 偏移量
    const offsetY = startIndex * itemHeight;

    return (
      <div
        ref={containerRef}
        className="virtual-scroll-container"
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div className="virtual-scroll-content" style={{ height: totalHeight }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
          </div>
        </div>
      </div>
    );
  };

  // 股票行组件（使用React.memo优化）
  interface StockRowProps {
    stock: StockWithStrength;
    onClick: (stock: StockWithStrength) => void;
    onLightningTrade: (stock: StockWithStrength) => void;
    onWatchlistToggle: (stock: StockWithStrength, e: React.MouseEvent) => void;
    formatNumber: (num: number, decimals?: number) => string;
    formatVolume: (volume: number) => string;
    isProcessing?: boolean; // 是否正在处理该股票
  }

  const StockRow: React.FC<StockRowProps> = React.memo(({
    stock,
    onClick,
    onLightningTrade,
    onWatchlistToggle,
    formatNumber,
    formatVolume,
    isProcessing
  }) => {
    // 直接使用 stock.consensusResult，避免重复计算
    const { consensusResult } = stock;
    const aiDecision = consensusResult?.finalDecision;
    const aiConfidence = consensusResult?.confidence || 0;
    const strengthColor = useMemo(() => getStrengthColor(stock.strength || 0), [stock.strength]);

    const handleLightningTrade = (e: React.MouseEvent) => {
      e.stopPropagation(); // 防止触发整行点击
      onLightningTrade(stock);
    };

    return (
      <tr className="table-row" onClick={() => onClick(stock)}>
        <td className="stock-name">
          {isProcessing && <span className="processing-indicator"></span>}
          {stock.name}
        </td>
        <td className="stock-code">{stock.ts_code}</td>
        <td className="stock-price">{formatNumber(stock.price || 0)}</td>
        <td className={`stock-change-percent ${(stock.changePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
          {formatNumber(stock.changePercent || 0, 2)}%
        </td>
        <td className={`stock-change ${(stock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
          {formatNumber(stock.change || 0, 2)}
        </td>
        <td className="stock-volume">{formatVolume(stock.volume || 0)}</td>
        <td className="stock-ai-rating">
          {aiDecision ? (
            <div className={`ai-badge badge-${aiDecision}`}>
              {getAIDecisionText(aiDecision)}
              <span className="badge-confidence">{(aiConfidence * 100).toFixed(0)}%</span>
            </div>
          ) : (
            <span className="no-rating">-</span>
          )}
        </td>
        <td className="stock-strength">
          <div className="strength-axis">
            <div
              className="strength-bar"
              style={{
                width: `${(stock.strength || 0) * 100}%`,
                backgroundColor: strengthColor
              }}
            ></div>
          </div>
          <span className="strength-value">{Math.round((stock.strength || 0) * 100)}</span>
        </td>
        <td className="stock-action">
          <button
            className={`watchlist-btn ${stock.isInWatchlist ? 'active' : ''}`}
            onClick={(e) => onWatchlistToggle(stock, e)}
            title={stock.isInWatchlist ? "从自选股移除" : "加入自选股"}
          >
            {stock.isInWatchlist ? '★' : '☆'}
          </button>
          <button className="lightning-trade-btn" onClick={handleLightningTrade}>
            ⚡
          </button>
        </td>
      </tr>
    );
  });

  // 添加keyExtractor以优化React.memo的比较
  StockRow.displayName = 'StockRow';

  return (
    <div className="market-page">
      <FPSCounter /> {/* FPS监控组件 */}
      <div className="market-container">
        {/* 左侧分类导航 */}
        <div className="category-sidebar">
          <div className="category-header">
            <h2>市场分类</h2>
          </div>
          <div className="category-list">
            {categories.map(category => (
              <div
                key={category.id}
                className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-name">{category.name}</span>
                <span className="category-count">{category.stocks.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧行情表格 */}
        <div className="market-table-container">
          {/* 错误消息显示 */}
          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
              <button className="clear-error-btn" onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="table-header">
            <h2>{categories.find(cat => cat.id === selectedCategory)?.name}行情</h2>
          </div>

          {loading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          ) : (
            <div className="dense-table-wrapper">
              <table className="dense-market-table">
                <thead>
                  <tr>
                    <th>股票名称</th>
                    <th>代码</th>
                    <th>价格</th>
                    <th>涨跌幅</th>
                    <th>涨跌额</th>
                    <th>成交量</th>
                    <th>AI 评级</th>
                    <th>强度轴</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody style={{ display: 'block', height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                  <VirtualScroll
                    items={getCurrentCategoryStocks()}
                    renderItem={(stock, index) => (
                      <StockRow
                        key={stock.ts_code}
                        stock={stock}
                        onClick={handleStockClick}
                        onLightningTrade={handleLightningTrade}
                        onWatchlistToggle={handleWatchlistToggle}
                        formatNumber={formatNumber}
                        formatVolume={formatVolume}
                        isProcessing={processingStock === stock.ts_code}
                      />
                    )}
                    itemHeight={26} // 每行高度
                    containerHeight={600} // 容器高度
                    itemKey={(stock) => stock.ts_code}
                  />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .market-page {
          height: 100%;
          background: #11111b;
          color: #cdd6f4;
          overflow: hidden;
        }

        .market-container {
          display: flex;
          height: 100%;
        }

        /* 左侧分类导航样式 */
        .category-sidebar {
          width: 200px;
          background: #1e1e2e;
          border-right: 1px solid #313244;
          display: flex;
          flex-direction: column;
        }

        .category-header {
          padding: 16px;
          border-bottom: 1px solid #313244;
        }

        .category-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #FFD700;
        }

        .category-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .category-item:hover {
          background-color: #313244;
        }

        .category-item.active {
          background-color: #313244;
          border-right: 3px solid #89dceb;
        }

        .category-name {
          font-size: 14px;
          color: #cdd6f4;
        }

        .category-count {
          font-size: 12px;
          color: #94a3b8;
          background-color: #313244;
          padding: 2px 8px;
        }

        /* 错误消息样式 */
        .error-message {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* 右侧表格容器样式 */
        .market-table-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
        }

        /* 清除错误按钮样式 */
        .clear-error-btn {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          margin-left: auto;
        }
        
        /* 处理中状态指示器样式 */
        .processing-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #89dceb;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
          margin-right: 6px;
        }

        .table-header {
          padding-bottom: 16px;
          border-bottom: 1px solid #313244;
        }

        .table-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #FFD700;
        }

        /* 加载指示器样式 */
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #313244;
          border-top: 3px solid #89dceb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }


        /* 高密度表格样式 */
        .dense-table-wrapper {
          flex: 1;
          overflow-y: auto;
          margin-top: 16px;
        }

        /* Fincept 表格样式 */
        .dense-market-table {
          width: 100%;
          font-size: 11px;
          border-spacing: 0;
          border-collapse: collapse;
        }

        .dense-market-table th {
          background-color: rgba(30, 30, 46, 0.5);
          color: #94a3b8;
          font-weight: 500;
          padding: 4px 8px;
          text-align: left;
          height: 24px;
          border: none;
        }

        .dense-market-table th:nth-child(n+3) {
          text-align: right;
        }

        .table-row {
          transition: all 0.2s ease;
          cursor: pointer;
          height: 26px;
          border: none;
        }

        .table-row:hover {
          background-color: rgba(49, 50, 68, 0.3);
        }

        .table-row:nth-child(even) {
          background: white/[0.02];
        }

        .dense-market-table td {
          padding: 4px 8px;
          border: none;
        }

        .dense-market-table td:nth-child(n+3) {
          text-align: right;
          font-family: 'Courier New', monospace;
        }

        /* 股票名称和代码样式 */
        .stock-name {
          color: #cdd6f4;
          font-weight: 500;
        }

        .stock-code {
          color: #94a3b8;
          font-size: 13px;
        }

        /* 价格和变化样式 */
        .stock-price {
          color: #cdd6f4;
        }

        .stock-change-percent.positive,
        .stock-change.positive {
          color: #10b981;
        }

        .stock-change-percent.negative,
        .stock-change.negative {
          color: #ef4444;
        }

        /* 成交量样式 */
        .stock-volume {
          color: #94a3b8;
        }

        /* 强度轴样式 */
        .stock-strength {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .strength-axis {
          flex: 1;
          height: 6px;
          background-color: #313244;
          overflow: hidden;
        }

        .strength-bar {
          height: 100%;
          transition: width 0.3s ease;
        }

        .strength-value {
          font-size: 13px;
          color: #94a3b8;
          min-width: 24px;
          text-align: right;
        }

        /* 滚动条样式 */
        .category-list::-webkit-scrollbar,
        .dense-table-wrapper::-webkit-scrollbar {
          width: 6px;
        }

        .category-list::-webkit-scrollbar-track,
        .dense-table-wrapper::-webkit-scrollbar-track {
          background: #1e1e2e;
        }

        .category-list::-webkit-scrollbar-thumb,
        .dense-table-wrapper::-webkit-scrollbar-thumb {
          background: #313244;
        }

        .category-list::-webkit-scrollbar-thumb:hover,
        .dense-table-wrapper::-webkit-scrollbar-thumb:hover {
          background: #45475a;
        }

        /* AI 评级徽章样式 */
        .stock-ai-rating {
          text-align: center;
          padding: 0;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge-buy {
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .badge-sell {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .badge-hold {
          background-color: rgba(234, 179, 8, 0.2);
          color: #eab308;
        }

        .badge-confidence {
          margin-left: 2px;
          font-size: 8px;
          opacity: 0.8;
        }

        .no-rating {
          color: #6b7280;
          font-size: 10px;
        }

        /* 闪电下单按钮样式 */
        .stock-action {
          text-align: center;
        }

        .lightning-trade-btn {
          background-color: rgba(249, 115, 22, 0.2);
          color: #f97316;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
        }

        .lightning-trade-btn:hover {
          background-color: rgba(249, 115, 22, 0.4);
          transform: scale(1.05);
        }

        .lightning-trade-btn:active {
          transform: scale(0.95);
        }

        /* 自选股按钮样式 */
        .watchlist-btn {
          background: transparent;
          border: none;
          color: #6b7280;
          font-size: 12px;
          cursor: pointer;
          margin-right: 4px;
          transition: all 0.2s ease;
          padding: 0;
        }

        .watchlist-btn:hover {
          transform: scale(1.1);
        }

        .watchlist-btn.active {
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
};

export default Market;