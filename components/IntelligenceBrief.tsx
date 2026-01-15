'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StockBasicInfo } from '../lib/api/market';
import { fetchIntelligenceBrief, IntelligenceBriefData, IntelligenceTag, IntelligenceTagItem } from '../lib/api/ai-inference';

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
    tags: [
      { type: 'SIGINT', description: '信号情报', level: 'high' },
      { type: 'FININT', description: '金融情报', level: 'medium' },
      { type: 'OSINT', description: '开源情报', level: 'low' }
    ],
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
  
  // 获取标签颜色
  const getTagColor = (type: IntelligenceTag): string => {
    switch (type) {
      case 'SIGINT':
        return '#ff6b6b'; // 红色荧光
      case 'HUMINT':
        return '#4ecdc4'; // 青色荧光
      case 'OSINT':
        return '#45b7d1'; // 蓝色荧光
      case 'FININT':
        return '#f9ca24'; // 黄色荧光
      case 'TECHINT':
        return '#6c5ce7'; // 紫色荧光
      default:
        return '#a29bfe';
    }
  };
  
  // 获取标签级别样式
  const getTagLevelStyle = (level: string): string => {
    switch (level) {
      case 'high':
        return 'tag-high';
      case 'medium':
        return 'tag-medium';
      case 'low':
        return 'tag-low';
      default:
        return '';
    }
  };

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
  const fetchIntelligenceBriefFromApi = async () => {
    if (!stockCode) return;
    
    setLoading(true);
    setApiError(false);
    
    // 设置重试次数和间隔
    const maxRetries = 3;
    const retryDelay = 1000;
    
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        // 调用API获取数据，允许在网络波动时使用mock数据
        const response = await fetchIntelligenceBrief(stockCode);
        
        // 检查响应状态
        if (response.code === 500) {
          throw new Error('API返回500错误');
        }
        
        setLocalData(response.data || null);
        success = true;
      } catch (error) {
        retryCount++;
        console.error(`获取情报简报数据失败 (${retryCount}/${maxRetries}):`, error);
        
        // 如果是最后一次重试，使用模拟数据
        if (retryCount >= maxRetries) {
          setApiError(true);
          // 当API调用失败时，自动加载模拟数据
          setLocalData(generateMockBrief());
        } else {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    setLoading(false);
  };
  
  // 组件挂载时获取数据，stockCode 切换时清理旧数据
  useEffect(() => {
    // 立即清理旧数据，防止新代码匹配旧数据
    setLocalData(null);
    fetchIntelligenceBriefFromApi();
  }, [stockCode]);
  
  // 当传入的data属性变化时，更新本地数据
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  // 使用本地数据或传入数据
  const displayData = useMemo(() => {
    return localData || data;
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
      
      {/* 情报分类标签 */}
      {displayData?.tags && (
        <div className="intelligence-tags">
          {displayData?.tags?.map((tag, index) => (
            <div 
              key={index} 
              className={`intelligence-tag ${getTagLevelStyle(tag.level)}`}
              style={{ 
                backgroundColor: `${getTagColor(tag.type)}20`,
                color: getTagColor(tag.type),
                borderColor: getTagColor(tag.type)
              }}
            >
              [{tag.type}]
              <span className="tag-description">{tag.description}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="brief-content">
        {loading && (
          <div className="loading">加载中...</div>
        )}
        
        {apiError && (
          <div className="error">API调用失败，使用模拟数据</div>
        )}
        
        {/* 冷启动占位逻辑 */}
        {!displayData?.stock ? (
          <div className="cold-start">
            <div className="system-checking">
              <h3>【系统自检中...】</h3>
              <div className="scanning-line"></div>
            </div>
          </div>
        ) : (
          <>
        <div className="stock-info">
          <h3>{displayData?.stock?.name || '扫描中...'} ({displayData?.stock?.ts_code || ''})</h3>
          <p>{displayData?.stock?.industry || '未知'} | {displayData?.stock?.market || '未知'}</p>
        </div>
        
        <div className="section">
          <h3>决策总结</h3>
          <div className="decision">{displayData?.decisionSummary || '分析中...'}</div>
        </div>
        
        <div className="section">
          <h3>入选逻辑</h3>
          <div className="score">综合评分: {displayData?.selectionLogic?.overallScore || 0}</div>
          <ul className="factors">
            {displayData?.selectionLogic?.factors?.map((factor, index) => (
              <li key={index}>
                <div className="factor-header">
                  <span className="factor-name">{factor?.name || '因子'}</span>
                  <span className="factor-score">{factor?.score || 0}</span>
                </div>
                <span className="factor-desc">{factor?.description || '分析中...'}</span>
              </li>
            )) || <li>加载中...</li>}
          </ul>
        </div>
          </>
        )}
      </div>
      
      <style jsx>{`
        .intelligence-brief {
          background-color: #000000;
          border-left: 1px solid #333;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 16px;
          height: 100%;
          overflow-y: auto;
          font-size: 14px;
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
          color: #FFD700;
        }
        
        .brief-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 16px;
          overflow-y: auto;
          max-height: calc(100% - 80px);
          font-size: 14px;
        }
        
        .loading, .error {
          padding: 8px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .loading {
          background-color: rgba(137, 220, 235, 0.1);
          color: #ffffff;
        }
        
        .error {
          background-color: rgba(243, 139, 168, 0.1);
          color: #ffffff;
        }
        
        .stock-info {
          margin-bottom: 8px;
        }
        
        .stock-info h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }
        
        .stock-info p {
          margin: 0;
          font-size: 14px;
          color: #ffffff;
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
          color: #FFD700;
        }
        
        .decision {
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
          padding: 16px;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }
        
        .score {
          font-size: 14px;
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
          font-size: 14px;
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
          color: #ffffff;
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
          color: #ffffff;
          line-height: 1.5;
          margin-left: 102px;
          font-size: 14px;
        }
        
        /* 冷启动占位样式 */
        .intelligence-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          padding: 0 16px;
        }
        
        .intelligence-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .intelligence-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        /* 荧光效果 */
        .intelligence-tag::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transform: rotate(45deg);
          transition: all 0.5s ease;
        }
        
        .intelligence-tag:hover::after {
          animation: tagShine 0.5s ease-out;
        }
        
        @keyframes tagShine {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
        
        .tag-description {
          font-size: 10px;
          opacity: 0.9;
          font-weight: normal;
          color: #ffffff;
        }
        
        /* 标签级别样式 */
        .tag-high {
          animation: tagPulseHigh 2s infinite;
        }
        
        .tag-medium {
          animation: tagPulseMedium 3s infinite;
        }
        
        @keyframes tagPulseHigh {
          0%, 100% {
            box-shadow: 0 0 4px currentColor;
          }
          50% {
            box-shadow: 0 0 12px currentColor, 0 0 20px currentColor;
          }
        }
        
        @keyframes tagPulseMedium {
          0%, 100% {
            box-shadow: 0 0 2px currentColor;
          }
          50% {
            box-shadow: 0 0 8px currentColor, 0 0 12px currentColor;
          }
        }
        
        .cold-start {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(0, 0, 0, 0.8) 100%);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }
        
        .system-checking {
          text-align: center;
          color: #FFD700;
          font-weight: bold;
          padding: 20px;
          border: 2px solid #333;
          border-radius: 8px;
          background-color: rgba(0, 0, 0, 0.6);
          position: relative;
          z-index: 1;
        }
        
        .system-checking h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        }
        
        .scanning-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.8), transparent);
          animation: scan 2s linear infinite;
          z-index: 2;
        }
        
        @keyframes scan {
          0% {
            top: -10px;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}