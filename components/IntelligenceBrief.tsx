'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StockBasicInfo } from '../lib/api/market';
import { apiGet } from '../lib/api/common/fetch';

// AI选股情报简报接口
export interface IntelligenceBriefData {
  stock: StockBasicInfo;
  selectionLogic: {
    overallScore: number;
    factors: Array<{
      name: string;
      score: number;
      description: string;
    }>;
  };
  seatGame: {
    majorSeats: Array<{
      name: string;
      direction: 'buy' | 'sell' | 'neutral';
      amount: string;
      influence: string;
    }>;
    gameResult: 'bull' | 'bear' | 'balanced';
    conclusion: string;
  };
  riskControl: {
    hardThresholds: Array<{
      name: string;
      value: string;
      status: 'safe' | 'warning' | 'danger';
    }>;
    dynamicRisks: Array<{
      type: string;
      level: 'low' | 'medium' | 'high';
      description: string;
      time: string;
    }>;
  };
  decisionSummary: string; // 10字以内的决策总结
}

interface IntelligenceBriefProps {
  data?: IntelligenceBriefData | null;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  stockCode?: string;
  alertStatus?: {           // 警报状态
    isAlert: boolean;       // 是否有警报
    alertType?: string;     // 警报类型
  };
}

// 模拟数据生成函数
const generateMockBrief = (): IntelligenceBriefData => {
  return {
    stock: {
      ts_code: 'SH600000',
      symbol: '600000',
      name: '浦发银行',
      industry: '银行',
      area: '上海',
      market: '主板',
      list_date: '1999-11-10',
      pinyin: 'pfyh'
    },
    selectionLogic: {
      overallScore: 85,
      factors: [
        { name: '资金流入', score: 90, description: '主力资金连续3日净流入' },
        { name: '技术形态', score: 88, description: 'W底形态形成，突破颈线' },
        { name: '估值水平', score: 78, description: 'PE低于行业平均20%' },
        { name: '基本面', score: 82, description: '季度净利润增长15%' },
        { name: '舆情热度', score: 85, description: '机构调研热度上升' }
      ]
    },
    seatGame: {
      majorSeats: [
        { name: '机构专用', direction: 'buy', amount: '5,200万', influence: '强' },
        { name: '国泰君安上海', direction: 'buy', amount: '3,800万', influence: '中' },
        { name: '银河证券北京', direction: 'sell', amount: '2,100万', influence: '弱' },
        { name: '华泰证券深圳', direction: 'neutral', amount: '800万', influence: '弱' }
      ],
      gameResult: 'bull',
      conclusion: '多方占据优势，机构主导买入'
    },
    riskControl: {
      hardThresholds: [
        { name: '止损线', value: '8.20元', status: 'safe' },
        { name: '止盈线', value: '9.50元', status: 'safe' },
        { name: '最大回撤', value: '5.2%', status: 'warning' },
        { name: '仓位限制', value: '20%', status: 'safe' }
      ],
      dynamicRisks: [
        { type: '大盘风险', level: 'medium', description: '上证指数面临3200点压力', time: '2026-01-10 14:30' },
        { type: '行业风险', level: 'low', description: '银行板块估值修复接近尾声', time: '2026-01-10 14:15' },
        { type: '个股风险', level: 'low', description: '近3日换手率异常放大', time: '2026-01-10 13:45' }
      ]
    },
    decisionSummary: '逢低买入，持有待涨'
  };
};

export default function IntelligenceBrief({
  data,
  isExpanded = true,
  onToggle,
  stockCode = 'SH600000',
  alertStatus = { isAlert: false }
}: IntelligenceBriefProps = {}) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [localData, setLocalData] = useState<IntelligenceBriefData | null>(null);
  const [alert, setAlert] = useState(alertStatus);

  // 监听外部传入的警报状态变化
  useEffect(() => {
    setAlert(alertStatus);
  }, [alertStatus]);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (onToggle) {
      onToggle(newExpanded);
    }
  };

  // 获取情报简报数据
  const fetchIntelligenceBrief = async () => {
    if (!stockCode) return;
    
    setLoading(true);
    setApiError(false);
    
    try {
      // 调用API获取数据，强制不使用mock数据
      const response = await apiGet<IntelligenceBriefData>('/ai-inference/intelligence-brief', {
        stockCode
      }, {
        useMock: false, // 确保在Token有效时使用真实数据
        requiresAuth: false // AI简报API不需要认证
      });
      
      // 检查响应状态
      if (response.code === 500) {
        throw new Error('API返回500错误');
      }
      
      setLocalData(response.data);
    } catch (error) {
      console.error('获取情报简报数据失败:', error);
      setApiError(true);
      // 当API调用失败时，自动加载模拟数据
      setLocalData(generateMockBrief());
    } finally {
      setLoading(false);
    }
  };
  
  // 组件挂载时获取数据
  useEffect(() => {
    fetchIntelligenceBrief();
  }, [stockCode]);
  
  // 当传入的data属性变化时，更新本地数据
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  // 使用本地数据、传入数据或模拟数据
  const displayData = useMemo(() => {
    return localData || data || generateMockBrief();
  }, [localData, data]);

  return (
    <div className="intelligence-brief">
      <div className="brief-header">
        <h2>AI选股情报简报</h2>
        {alert.isAlert && (
          <div className="top-secret-alert">
            【绝密级】
          </div>
        )}
      </div>
      
      <div className="brief-content">
        {loading && (
          <div className="loading">加载中...</div>
        )}
        
        {apiError && (
          <div className="error">API调用失败，使用模拟数据</div>
        )}
        
        <div className="stock-info">
          <h3>{displayData.stock.name} ({displayData.stock.ts_code})</h3>
          <p>{displayData.stock.industry} | {displayData.stock.market}</p>
        </div>
        
        <div className="section">
          <h3>决策总结</h3>
          <div className="decision">{displayData.decisionSummary}</div>
        </div>
        
        <div className="section">
          <h3>入选逻辑</h3>
          <div className="score">综合评分: {displayData.selectionLogic.overallScore}</div>
          <ul className="factors">
            {displayData.selectionLogic.factors.map((factor, index) => (
              <li key={index}>
                <div className="factor-header">
                  <span className="factor-name">{factor.name}</span>
                  <span className="factor-score">{factor.score}</span>
                </div>
                <span className="factor-desc">{factor.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        .intelligence-brief {
          background-color: #1a1a2e;
          border-left: 1px solid #333;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 16px;
          height: 100%;
          overflow-y: auto;
        }

        /* 绝密级警报样式 */
        .top-secret-alert {
          background-color: rgba(255, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          margin-top: 8px;
        }


        
        .brief-header {
          margin-bottom: 16px;
        }
        
        .brief-header h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
        }
        
        .brief-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 16px;
          overflow-y: auto;
          max-height: calc(100% - 80px);
        }
        
        .loading, .error {
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .loading {
          background-color: rgba(137, 220, 235, 0.1);
          color: #89dceb;
        }
        
        .error {
          background-color: rgba(243, 139, 168, 0.1);
          color: #f38ba8;
        }
        
        .stock-info {
          margin-bottom: 8px;
        }
        
        .stock-info h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }
        
        .stock-info p {
          margin: 0;
          font-size: 11px;
          color: #888;
        }
        
        .section {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 16px;
        }
        
        .section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
        }
        
        .decision {
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: #00d4ff;
          padding: 16px;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }
        
        .score {
          font-size: 13px;
          color: #00d4ff;
          margin-bottom: 12px;
        }
        
        .factors {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .factors li {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          padding: 12px;
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        
        .factor-header {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .factor-name {
          color: #ccc;
          font-weight: 500;
          width: 90px;
        }
        
        .factor-score {
          text-align: center;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 6px 12px;
          border-radius: 4px;
          color: #00d4ff;
          width: 60px;
        }
        
        .factor-desc {
          color: #aaa;
          line-height: 1.5;
          margin-left: 102px;
        }
      `}</style>
    </div>
  );
}