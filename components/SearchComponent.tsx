'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchIndustryScores, IndustryScore } from '../lib/api/market/data';
import { fetchStockBasicList, StockBasicInfo } from '../lib/api/market';
import { useStockContext } from '../lib/context/StockContext';

// 扩展StockBasicInfo接口，添加决策总结
interface StockBasicInfoWithDecision extends StockBasicInfo {
  decisionSummary?: string;
}

export default function SearchComponent() {
  const { setCurrentTicker } = useStockContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockList, setStockList] = useState<StockBasicInfoWithDecision[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockBasicInfoWithDecision[]>([]);
  const [industryScores, setIndustryScores] = useState<IndustryScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndustryLoading, setIsIndustryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 生成10字以内的盘中一句话决策总结
  const generateDecisionSummary = (stock: StockBasicInfo): string => {
    // 模拟决策总结，实际项目中应该从AI模型获取
    const summaries = [
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
    
    const index = summaries.length > 0 ? Math.abs(hashCode(stock.ts_code)) % summaries.length : 0;
    return summaries.length > 0 ? summaries[index] : '暂无相关信息';
  };

  // 获取股票列表
  useEffect(() => {
    const loadStockList = async () => {
      setIsLoading(true);
      try {
        const response = await fetchStockBasicList();
        // 为每个股票添加决策总结
        const stocksWithDecision = response.data.map(stock => ({
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
        setIndustryScores(response.data);
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
  }, [searchTerm, stockList]);

  // 当搜索词变化时过滤股票
  useEffect(() => {
    filterStocks();
  }, [filterStocks]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
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
          type="text"
          className="search-input"
          placeholder="搜索股票代码或名称..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && filteredStocks.length > 0) {
              handleStockSelect(filteredStocks[0]);
            }
          }}
          disabled={isLoading}
        />
        {isLoading && <div className="search-loading">加载中...</div>}
      </div>
      
      {showDropdown && filteredStocks.length > 0 && (
          <div className="search-results">
            {filteredStocks.map((stock) => {
              const industryScore = getIndustryScore(stock.industry);
              return (
                <div
                  key={stock.ts_code}
                  className="search-result-item"
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
          max-width: 400px;
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 15px;
          font-size: 14px;
          border: 1px solid #313244;
          border-radius: 6px;
          background-color: #2a2a3a;
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
          background-color: #2a2a3a;
          border: 1px solid #313244;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 100;
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
          font-size: 11px;
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
          font-size: 11px;
          font-weight: 500;
        }

        .trend-indicator {
          margin: 0 4px;
          font-size: 10px;
        }

        .rank-info {
          color: #94a3b8;
          font-size: 11px;
        }

        .search-no-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: #2a2a3a;
          border: 1px solid #313244;
          border-radius: 6px;
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
