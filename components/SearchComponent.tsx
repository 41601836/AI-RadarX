'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchIndustryScores, IndustryScore } from '../lib/api/market/data';
import { fetchStockBasicList, StockBasicInfo } from '../lib/api/market';
import { useStockContext } from '../lib/context/StockContext';
import { useUserStore, ActiveTab } from '../lib/store/user-portfolio';

// 扩展StockBasicInfo接口，添加决策总结
interface StockBasicInfoWithDecision extends StockBasicInfo {
  decisionSummary?: string;
}

export default function SearchComponent() {
  const { setCurrentTicker } = useStockContext();
  const { setActiveTab } = useUserStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockList, setStockList] = useState<StockBasicInfoWithDecision[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockBasicInfoWithDecision[]>([]);
  const [industryScores, setIndustryScores] = useState<IndustryScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndustryLoading, setIsIndustryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 生成10字以内的盘中一句话决策总结
  const generateDecisionSummary = (stock: StockBasicInfo): string => {
    // 模拟股票数据，实际应从API获取
    const mockStockData = {
      profitRatio: Math.random() * 100, // 获利盘比例
      explodeRate: Math.random() * 50, // 炸板率
      volumeRatio: Math.random() * 3, // 成交量比率（缩量为<1）
      costSupport: Math.random() > 0.3, // 平均成本支撑是否有效
      isCrossStar: Math.random() > 0.7, // 是否为十字星
      isHighPosition: Math.random() > 0.7 // 是否处于高位
    };
    
    // 严格的决策逻辑
    if (mockStockData.profitRatio > 90 && mockStockData.explodeRate > 30) {
      return "高位踩踏风险，撤退";
    }
    
    if (mockStockData.volumeRatio < 0.5 && mockStockData.costSupport && mockStockData.isCrossStar) {
      return "地量十字星，关注低吸";
    }
    
    if (mockStockData.volumeRatio > 2 && !mockStockData.isHighPosition) {
      return "放量突破，关注追入";
    }
    
    if (mockStockData.profitRatio < 10 && mockStockData.costSupport) {
      return "超跌反弹，关注抄底";
    }
    
    if (mockStockData.volumeRatio < 0.8 && mockStockData.isHighPosition) {
      return "缩量横盘，谨慎观望";
    }
    
    if (mockStockData.explodeRate > 50 && mockStockData.isHighPosition) {
      return "炸板严重，建议离场";
    }
    
    // 默认决策
    const defaultSummaries = [
      '逢低买入',
      '持有待涨',
      '减仓观望',
      '建议卖出',
      '突破在即',
      '回调关注',
      '量价齐升',
      '谨慎操作',
      '强势上涨',
      '震荡整理'
    ];
    
    // 根据股票代码生成一个确定性的随机索引
    const hashCode = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    };
    
    const index = defaultSummaries.length > 0 ? Math.abs(hashCode(stock.ts_code)) % defaultSummaries.length : 0;
    return defaultSummaries.length > 0 ? defaultSummaries[index] : '暂无相关信息';
  };

  // 获取股票列表
  useEffect(() => {
    const loadStockList = async () => {
      setIsLoading(true);
      try {
        const response = await fetchStockBasicList();
        // 添加多层空值检查，确保安全访问list字段
        const stocksWithDecision = (response?.data?.list || []).map(stock => ({
          ...stock,
          decisionSummary: generateDecisionSummary(stock)
        }));
        setStockList(stocksWithDecision);
      } catch (error) {
        console.error('Error loading stock list:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStockList();
  }, []);



  // 获取行业评分
  useEffect(() => {
    const loadIndustryScores = async () => {
      setIsIndustryLoading(true);
      try {
        const response = await fetchIndustryScores();
        setIndustryScores(response.data || []);
      } catch (error) {
        console.error('Error loading industry scores:', error);
      } finally {
        setIsIndustryLoading(false);
      }
    };

    if (stockList.length > 0) {
      loadIndustryScores();
    }
  }, [stockList]);

  // 过滤股票列表
  const filterStocks = useCallback(() => {
    if (!searchTerm) {
      setFilteredStocks([]);
      setHighlightedIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = stockList.filter(stock => {
      // 匹配股票代码（含交易所前缀和不含）
      const matchesCode = stock.ts_code.toLowerCase().includes(term) || stock.symbol.toLowerCase().includes(term);
      // 匹配股票名称
      const matchesName = stock.name.toLowerCase().includes(term);
      // 匹配股票名称拼音（如果有）
      const matchesPinyin = stock.pinyin ? stock.pinyin.toLowerCase().includes(term) : false;
      
      return matchesCode || matchesName || matchesPinyin;
    });

    setFilteredStocks(filtered.slice(0, 10)); // 最多显示10个结果
    setHighlightedIndex(-1);
  }, [searchTerm, stockList]);

  // 当搜索词变化时过滤股票
  useEffect(() => {
    filterStocks();
  }, [filterStocks]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredStocks.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredStocks.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredStocks.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleStockSelect(filteredStocks[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // 获取股票所属行业的评分
  const getIndustryScore = (industry: string): IndustryScore | undefined => {
    return industryScores.find(item => item.industry === industry);
  };

  // 获取行业趋势的颜色
  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      case 'stable': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  // 获取行业趋势的图标
  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '▲';
      case 'down': return '▼';
      case 'stable': return '●';
      default: return '●';
    }
  };

  // 处理股票选择
  const handleStockSelect = (stock: StockBasicInfo) => {
    setSearchTerm(`${stock.name} (${stock.ts_code})`);
    setShowDropdown(false);
    setCurrentTicker(stock);
    // 切换到仪表盘页面
    setActiveTab('dashboard');
  };

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const searchContainer = document.getElementById('search-container');
      if (searchContainer && !searchContainer.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="search-container" className="search-container">
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="搜索股票代码或名称..."
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = searchTerm.trim().toLowerCase();
                  
                  // 检查是否为6位数字
                  if (/^\d{6}$/.test(input)) {
                    // 查找对应的股票（同时匹配symbol和ts_code）
                    const stock = stockList.find(s => 
                      s.symbol === input || 
                      s.ts_code.endsWith(input)
                    );
                    if (stock) {
                      handleStockSelect(stock);
                    } else {
                      // 如果找不到，尝试使用输入的6位数字作为代码
                      // 自动判断交易所（000开头为深交所，600开头为上交所）
                      const exchange = input.startsWith('6') ? 'SH' : 'SZ';
                      const ts_code = `${exchange}${input}`;
                      setCurrentTicker({ 
                        ts_code, 
                        symbol: input, 
                        name: '', 
                        industry: '', 
                        area: '', 
                        market: '', 
                        list_date: '', 
                        pinyin: '' 
                      });
                      setSearchTerm(input);
                      setShowDropdown(false);
                    }
                  } 
                  // 检查是否为Tab切换命令
                  else if (['dashboard', 'market', 'trade', 'strategy', 'assets', 'settings'].includes(input)) {
                    setActiveTab(input as ActiveTab);
                    setSearchTerm('');
                    setShowDropdown(false);
                  } 
                  // 默认行为
                  else if (filteredStocks.length > 0) {
                    handleStockSelect(filteredStocks[0]);
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
        {isLoading && <div className="search-loading">加载中...</div>}
      </div>
      
      {showDropdown && filteredStocks.length > 0 && (
            <div className="search-results">
              {filteredStocks.map((stock, index) => {
                const industryScore = getIndustryScore(stock.industry);
                return (
                  <div
                    key={stock.ts_code}
                    className={`search-result-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleStockSelect(stock)}
                  >
                  <div className="stock-info">
                    <div className="stock-name">{stock.name}</div>
                    <div className="stock-code">{stock.ts_code}</div>
                  </div>
                  <div className="stock-details">
                    <div className="stock-industry">{stock.industry}</div>
                    {industryScore && (
                      <div className="industry-score">
                        <span className="score-value">{industryScore.score}</span>
                        <span className={`trend-indicator ${getTrendColor(industryScore.trend)}`}>
                          {getTrendIcon(industryScore.trend)}
                        </span>
                        <span className="rank-info">#{industryScore.rank}</span>
                      </div>
                    )}
                    <div className="stock-market">{stock.market}</div>
                  </div>
                  {/* ActionColumn: 10字以内的盘中一句话决策总结 */}
                  <div className="stock-decision">
                    <span className="decision-summary">
                      {stock.decisionSummary || '暂无建议'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      
      {showDropdown && filteredStocks.length === 0 && searchTerm && (
        <div className="search-no-results">
          未找到匹配的股票
        </div>
      )}

      <style jsx>{`
        .search-container {
          position: relative;
          width: 100%;
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 15px;
          font-size: 14px;
          border: 1px solid #333;
          background-color: #000;
          color: #cdd6f4;
          outline: none;
          transition: all 0.2s;
        }

        .search-input:focus {
          border-color: #89dceb;
          box-shadow: 0 0 0 2px rgba(137, 220, 235, 0.2);
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .search-loading {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #89dceb;
          font-size: 12px;
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: #000;
          border: 1px solid #333;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 200;
          max-height: 300px;
          overflow-y: auto;
        }

        .search-result-item {
          padding: 12px 15px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .search-result-item:hover {
          background-color: #313244;
        }

        .search-result-item.highlighted {
          background-color: #00FF00;
          color: #000000 !important;
        }

        .search-result-item.highlighted .stock-name,
        .search-result-item.highlighted .stock-code,
        .search-result-item.highlighted .stock-industry,
        .search-result-item.highlighted .stock-market,
        .search-result-item.highlighted .decision-summary {
          color: #000000 !important;
        }

        .search-result-item.highlighted .score-value {
          background-color: #000000;
          color: #00FF00 !important;
        }

        .stock-info {
          display: flex;
          flex-direction: column;
        }

        .stock-name {
          color: #cdd6f4;
          font-weight: 500;
          font-size: 14px;
        }

        .stock-code {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 2px;
        }

        .stock-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stock-industry {
          color: #89dceb;
          font-size: 12px;
        }

        .stock-market {
          color: #c4a7e7;
          font-size: 13px;
          margin-top: 2px;
        }

        .industry-score {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: 2px;
        }

        .score-value {
          background-color: #89dceb;
          color: #1e293b;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
        }

        .trend-indicator {
          margin: 0 4px;
          font-size: 10px;
        }

        .rank-info {
          color: #94a3b8;
          font-size: 13px;
        }

        .search-no-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: #000;
          border: 1px solid #333;
          padding: 12px 15px;
          color: #94a3b8;
          font-size: 14px;
          text-align: center;
        }

        /* 滚动条样式 */
        .search-results::-webkit-scrollbar {
          width: 6px;
        }

        .search-results::-webkit-scrollbar-track {
          background: #2a2a3a;
          border-radius: 3px;
        }

        .search-results::-webkit-scrollbar-thumb {
          background: #313244;
          border-radius: 3px;
        }

        .search-results::-webkit-scrollbar-thumb:hover {
          background: #45475a;
        }
      `}</style>
    </div>
  );
}
