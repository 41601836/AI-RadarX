'use client';

import React, { useState, useEffect } from 'react';
import { fetchStockBasicList, StockBasicInfo } from '../../lib/api/market';
import { RealTimeIntradayStrengthCalculator } from '../../lib/algorithms/intradayStrength';
import { formatNumberToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';
import { usePolling } from '../../lib/hooks/usePolling';
import { useStockContext } from '../../lib/context/StockContext';
import { useUserStore } from '../../lib/store/user-portfolio';

// 定义市场分类类型
interface MarketCategory {
  id: string;
  name: string;
  stocks: StockWithStrength[];
}

// 扩展StockBasicInfo接口，添加强度数据
interface StockWithStrength extends StockBasicInfo {
  strength?: number;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
}

const Market: React.FC = () => {
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('main');
  const [loading, setLoading] = useState(true);
  
  // 强度计算器实例
  const [strengthCalculators, setStrengthCalculators] = useState<Map<string, RealTimeIntradayStrengthCalculator>>(new Map());
  
  // 获取当前股票上下文
  const { setCurrentTicker } = useStockContext();
  // 获取用户状态管理
  const { setActiveTab } = useUserStore();
  
  // 处理股票点击事件
  const handleStockClick = (stock: StockWithStrength) => {
    setCurrentTicker(stock);
    // 切换到仪表盘页面
    setActiveTab('dashboard');
  };

  // 获取股票列表数据
  useEffect(() => {
    const loadStockData = async () => {
      setLoading(true);
      try {
        const response = await fetchStockBasicList();
        // 添加多层空值检查，确保安全访问list字段
        const stocks = response?.data?.list || [];
        
        // 模拟股票价格和变化数据
        const stocksWithPrice = stocks.map(stock => ({
          ...stock,
          price: Math.random() * 100 + 10,
          change: Math.random() * 5 - 2.5,
          changePercent: Math.random() * 10 - 5,
          volume: Math.floor(Math.random() * 10000000) + 1000000
        }));
        
        // 分类股票
        categorizeStocks(stocksWithPrice);
        
        // 初始化强度计算器
        const calculators = new Map<string, RealTimeIntradayStrengthCalculator>();
        stocks.forEach(stock => {
          calculators.set(stock.ts_code, new RealTimeIntradayStrengthCalculator());
        });
        setStrengthCalculators(calculators);
        
      } catch (error) {
        console.error('Error loading stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, []);

  // 分类股票
  const categorizeStocks = (stocks: StockWithStrength[]) => {
    const categories: MarketCategory[] = [
      { id: 'main', name: '主板', stocks: [] },
      { id: 'gem', name: '创业板', stocks: [] },
      { id: 'tech', name: '科创板', stocks: [] },
      { id: 'small', name: '中小板', stocks: [] },
      { id: 'northbound', name: '北交所', stocks: [] }
    ];

    stocks.forEach(stock => {
      if (stock.market.includes('SH') || stock.market.includes('SZ')) {
        categories[0].stocks.push(stock); // 主板
      }
      if (stock.ts_code.startsWith('SZ300')) {
        categories[1].stocks.push(stock); // 创业板
      }
      if (stock.ts_code.startsWith('SH688')) {
        categories[2].stocks.push(stock); // 科创板
      }
      if (stock.ts_code.startsWith('SZ002')) {
        categories[3].stocks.push(stock); // 中小板
      }
      if (stock.market.includes('BJ')) {
        categories[4].stocks.push(stock); // 北交所
      }
    });

    setCategories(categories);
  };

  // 使用全局轮询钩子，当不在市场页面时自动停止
  usePolling(() => {
    if (strengthCalculators.size === 0) return;

    // 模拟实时强度更新
    setCategories(prevCategories => 
      prevCategories.map(category => ({
        ...category,
        stocks: category.stocks.map(stock => {
          const calculator = strengthCalculators.get(stock.ts_code);
          if (calculator) {
            // 模拟价格数据
            const mockPriceData = Array.from({ length: 10 }, (_, i) => ({
              timestamp: Date.now() - (10 - i) * 60000,
              high: stock.price! + Math.random() * 2,
              low: stock.price! - Math.random() * 2,
              close: stock.price! + Math.random() * 1 - 0.5,
              volume: stock.volume! + Math.floor(Math.random() * 1000000)
            }));
            
            // 添加到计算器
            mockPriceData.forEach(data => calculator.addPriceData(data));
            
            // 获取当前强度
            const result = calculator.getCurrentStrength();
            
            return {
              ...stock,
              strength: result ? result.combinedScore / 100 : Math.random()
            };
          }
          return stock;
        })
      }))
    );
  }, {
    interval: 5000, // 每5秒更新一次
    tabKey: 'market', // 仅在市场页面运行
    immediate: false // 不立即执行
  });

  // 获取当前分类的股票
  const getCurrentCategoryStocks = () => {
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.stocks : [];
  };

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

  // 获取强度颜色
  const getStrengthColor = (strength: number): string => {
    if (strength >= 0.8) return '#ef4444'; // 红色
    if (strength >= 0.6) return '#f59e0b'; // 橙色
    if (strength >= 0.4) return '#eab308'; // 黄色
    if (strength >= 0.2) return '#84cc16'; // 绿色
    return '#22c55e'; // 深绿色
  };

  return (
    <div className="market-page">
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
                    <th>强度轴</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentCategoryStocks().map(stock => (
                    <tr key={stock.ts_code} className="table-row" onClick={() => handleStockClick(stock)}>
                      <td className="stock-name">{stock.name}</td>
                      <td className="stock-code">{stock.ts_code}</td>
                      <td className="stock-price">{formatNumber(stock.price || 0)}</td>
                      <td className={`stock-change-percent ${(stock.changePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatNumber(stock.changePercent || 0, 2)}%
                      </td>
                      <td className={`stock-change ${(stock.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatNumber(stock.change || 0, 2)}
                      </td>
                      <td className="stock-volume">{formatVolume(stock.volume || 0)}</td>
                      <td className="stock-strength">
                        <div className="strength-axis">
                          <div 
                            className="strength-bar" 
                            style={{
                              width: `${(stock.strength || 0) * 100}%`,
                              backgroundColor: getStrengthColor(stock.strength || 0)
                            }}
                          ></div>
                        </div>
                        <span className="strength-value">{Math.round((stock.strength || 0) * 100)}</span>
                      </td>
                    </tr>
                  ))}
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

        /* 右侧表格容器样式 */
        .market-table-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
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

        .dense-market-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .dense-market-table th {
          background-color: #1e1e2e;
          color: #94a3b8;
          font-weight: 500;
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #313244;
        }

        .dense-market-table th:nth-child(n+3) {
          text-align: right;
        }

        .table-row {
          transition: background-color 0.2s;
          cursor: pointer;
        }

        .table-row:hover {
          background-color: rgba(49, 50, 68, 0.5);
        }

        .dense-market-table td {
          padding: 6px 12px;
          border-bottom: 1px solid #313244;
        }

        .dense-market-table td:nth-child(n+3) {
          text-align: right;
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
      `}</style>
    </div>
  );
};

export default Market;