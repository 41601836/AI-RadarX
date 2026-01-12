// 舆情列表组件
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchOpinionList, OpinionListParams, OpinionDetail } from '../lib/api/publicOpinion/list';
import { usePolling } from '../lib/hooks/usePolling';
import { useStockContext } from '../lib/context/StockContext';
import { formatDateTime } from '../lib/api/common/utils';

interface PublicOpinionListProps {
  symbol?: string;
  initialTimeRange?: string;
  initialSentimentType?: 'positive' | 'negative' | 'neutral';
  initialPageNum?: number;
  initialPageSize?: number;
}

export default function PublicOpinionList({ 
  symbol = 'SH600000',
  initialTimeRange = '7d',
  initialSentimentType,
  initialPageNum = 1,
  initialPageSize = 10 
}: PublicOpinionListProps) {
  // 从全局状态获取当前选中的股票
  const { currentTicker } = useStockContext();
  const currentSymbol = currentTicker?.ts_code || symbol;
  
  // 状态管理
  const [opinions, setOpinions] = useState<OpinionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // 筛选和分页状态
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [sentimentType, setSentimentType] = useState<'positive' | 'negative' | 'neutral' | undefined>(initialSentimentType);
  const [pageNum, setPageNum] = useState(initialPageNum);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // 获取舆情数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: OpinionListParams = {
        stockCode: currentSymbol,
        timeRange,
        sentimentType,
        pageNum,
        pageSize
      };
      
      const response = await fetchOpinionList(params);
      
      if (response.code === 200 && response.data) {
        setOpinions(response.data.list || []);
        setTotalCount(response.data.totalCount || 0);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        setError(response.msg || '获取舆情数据失败');
      }
    } catch (err) {
      console.error('Error fetching public opinion data:', err);
      setError('获取舆情数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [currentSymbol, timeRange, sentimentType, pageNum, pageSize]);
  
  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, [currentSymbol, timeRange, sentimentType, pageNum, pageSize]);
  
  // 使用全局轮询钩子，当不在仪表盘页面时自动停止
  usePolling(fetchData, {
    interval: 60000, // 每60秒更新一次数据
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: false // 不立即执行，依赖上面的初始加载
  });
  
  // 处理筛选条件变化
  const handleFilterChange = () => {
    setPageNum(1); // 筛选条件变化时重置到第一页
  };
  
  // 处理分页变化
  const handlePageChange = (newPage: number) => {
    setPageNum(newPage);
  };
  
  // 处理每页条数变化
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPageNum(1); // 每页条数变化时重置到第一页
  };
  
  // 计算总页数
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // 获取情绪类型的中文名称
  const getSentimentText = (sentiment: string) => {
    const sentimentMap = {
      positive: '正面',
      negative: '负面',
      neutral: '中性'
    };
    return sentimentMap[sentiment as keyof typeof sentimentMap] || sentiment;
  };
  
  // 获取情绪类型对应的样式类名
  const getSentimentClass = (sentiment: string) => {
    const sentimentMap = {
      positive: 'text-green-400',
      negative: 'text-red-400',
      neutral: 'text-gray-400'
    };
    return sentimentMap[sentiment as keyof typeof sentimentMap] || '';
  };
  
  if (loading) {
    return (
      <div className="public-opinion-list">
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
            height: 200px;
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
  
  if (error) {
    return (
      <div className="public-opinion-list">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchData}>重试</button>
        </div>
        
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 16px;
          }
          
          .error-message {
            color: #f38ba8;
            font-size: 14px;
          }
          
          .retry-button {
            background: #89dceb;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
          }
          
          .retry-button:hover {
            background: #74c7ec;
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="public-opinion-list">
      {/* 组件头部 */}
      <div className="component-header">
        <div>
          <h3>舆情监控 - {currentSymbol}</h3>
          <p className="last-update">最后更新: {lastUpdate}</p>
        </div>
      </div>
      
      {/* 筛选条件 */}
      <div className="filter-container">
        <div className="filter-group">
          <label>时间范围:</label>
          <select 
            value={timeRange} 
            onChange={(e) => { setTimeRange(e.target.value); handleFilterChange(); }}
          >
            <option value="1d">1天</option>
            <option value="3d">3天</option>
            <option value="7d">7天</option>
            <option value="30d">30天</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>情绪类型:</label>
          <select 
            value={sentimentType || ''} 
            onChange={(e) => { setSentimentType(e.target.value as any || undefined); handleFilterChange(); }}
          >
            <option value="">全部</option>
            <option value="positive">正面</option>
            <option value="negative">负面</option>
            <option value="neutral">中性</option>
          </select>
        </div>
      </div>
      
      {/* 舆情列表 */}
      <div className="opinion-list-container">
        {opinions.length > 0 ? (
          opinions.map((opinion) => (
            <div key={opinion.opinionId} className="opinion-item">
              <div className="opinion-header">
                <div className="source-info">
                  <span className="source">{opinion.source}</span>
                  <span className="publish-time">{formatDateTime(new Date(opinion.publishTime))}</span>
                </div>
                <div className={`sentiment ${getSentimentClass(opinion.sentiment)}`}>
                  {getSentimentText(opinion.sentiment)}
                </div>
              </div>
              
              <div className="opinion-content">
                {opinion.content}
              </div>
              
              <div className="opinion-footer">
                <div className="relevance-score">
                  相关性: {opinion.relevanceScore}/100
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            <p>暂无舆情数据</p>
          </div>
        )}
      </div>
      
      {/* 分页组件 */}
      {totalCount > 0 && (
        <div className="pagination-container">
          <div className="page-info">
            共 {totalCount} 条记录，第 {pageNum}/{totalPages} 页
          </div>
          
          <div className="page-controls">
            <button 
              className="page-button" 
              onClick={() => handlePageChange(Math.max(1, pageNum - 1))}
              disabled={pageNum === 1}
            >
              上一页
            </button>
            
            <div className="page-size-selector">
              <label>每页显示:</label>
              <select 
                value={pageSize} 
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              >
                <option value="10">10条</option>
                <option value="20">20条</option>
                <option value="50">50条</option>
              </select>
            </div>
            
            <button 
              className="page-button" 
              onClick={() => handlePageChange(Math.min(totalPages, pageNum + 1))}
              disabled={pageNum === totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      )}
      
      {/* 样式 */}
      <style jsx>{`
        .public-opinion-list {
          background: #000;
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
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px;
          background: #1a1a2e;
          border-radius: 4px;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-group label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .filter-group select {
          background: #000;
          color: #ffffff;
          border: 1px solid #333;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .opinion-list-container {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
        }
        
        .opinion-item {
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 4px;
          transition: border-color 0.2s;
        }
        
        .opinion-item:hover {
          border-color: #89dceb;
        }
        
        .opinion-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .source-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .source {
          font-size: 14px;
          font-weight: 500;
          color: #89dceb;
        }
        
        .publish-time {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .sentiment {
          font-size: 14px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(137, 220, 235, 0.1);
        }
        
        .opinion-content {
          font-size: 14px;
          line-height: 1.6;
          color: #ffffff;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .opinion-footer {
          display: flex;
          justify-content: flex-end;
        }
        
        .relevance-score {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .no-data {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #1a1a2e;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .page-info {
          color: #94a3b8;
        }
        
        .page-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .page-size-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .page-size-selector label {
          color: #94a3b8;
        }
        
        .page-size-selector select {
          background: #000;
          color: #ffffff;
          border: 1px solid #333;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .page-button {
          background: #89dceb;
          color: #000;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .page-button:hover:not(:disabled) {
          background: #74c7ec;
        }
        
        .page-button:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
        }
        
        /* 滚动条样式 */
        .opinion-list-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .opinion-list-container::-webkit-scrollbar-track {
          background: #000;
        }
        
        .opinion-list-container::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        
        .opinion-list-container::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}