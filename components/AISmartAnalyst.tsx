'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAISmartAnalysis, AIAnalysisResult } from '../lib/api/ai-inference';
import { ApiError } from '../lib/api/common/errors';

interface AISmartAnalystProps {
  stockCode: string;
  stockName?: string;
}

const AISmartAnalyst: React.FC<AISmartAnalystProps> = ({ stockCode, stockName }) => {
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingText, setTypingText] = useState<{ [key: string]: string }>({});
  const [isTyping, setIsTyping] = useState(false);
  const typingSpeed = 30; // 打字机速度（毫秒/字符）
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 打字机效果实现
  const typeText = (key: string, fullText: string) => {
    setIsTyping(true);
    setTypingText(prev => ({ ...prev, [key]: '' }));
    
    let index = 0;
    const type = () => {
      if (index < fullText.length) {
        setTypingText(prev => ({
          ...prev,
          [key]: fullText.slice(0, index + 1)
        }));
        index++;
        typingTimeoutRef.current = setTimeout(type, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };
    
    type();
  };

  // 获取AI分析结果
  // 模拟数据生成函数
  const generateMockAnalysis = (): AIAnalysisResult => {
    return {
      trendAnalysis: `${stockName || '该股票'}当前处于震荡整理阶段，技术指标显示短期有反弹可能。`,
      mainIntention: '主力资金保持稳定，游资活跃度适中，暂无明显异动。',
      operationRating: 'hold',
      confidenceScore: 75,
      riskWarning: [
        '建议设置7%的止损位，控制风险',
        '关注成交量变化，若出现放量突破可考虑加仓'
      ]
    };
  };

  const fetchAIAnalysis = async () => {
    if (!stockCode) return;
    
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      const result = await getAISmartAnalysis(stockCode);
      setAnalysisResult(result);
      
      // 逐段开始打字机效果
      setTimeout(() => typeText('trendAnalysis', result.trendAnalysis), 500);
      setTimeout(() => typeText('mainIntention', result.mainIntention), 2000);
      setTimeout(() => typeText('operationRating', getOperationRatingText(result.operationRating)), 4000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || '获取AI分析结果失败');
      
      // 当API调用失败时，自动加载模拟数据
      const mockResult = generateMockAnalysis();
      setAnalysisResult(mockResult);
      
      // 仍然显示打字机效果
      setTimeout(() => typeText('trendAnalysis', mockResult.trendAnalysis), 500);
      setTimeout(() => typeText('mainIntention', mockResult.mainIntention), 2000);
      setTimeout(() => typeText('operationRating', getOperationRatingText(mockResult.operationRating)), 4000);
    } finally {
      setLoading(false);
    }
  };

  // 获取操作评级文本
  const getOperationRatingText = (rating: string): string => {
    const ratingMap: { [key: string]: string } = {
      buy: '买入',
      hold: '观望',
      sell: '减仓'
    };
    return `操作评级：${ratingMap[rating] || rating}`;
  };

  // 获取操作评级样式
  const getOperationRatingStyle = (rating: string): string => {
    const styleMap: { [key: string]: string } = {
      buy: 'bg-green-100 text-green-800',
      hold: 'bg-yellow-100 text-yellow-800',
      sell: 'bg-red-100 text-red-800'
    };
    return styleMap[rating] || 'bg-gray-100 text-gray-800';
  };

  // 当股票代码变化时重新获取分析结果
  useEffect(() => {
    if (stockCode) {
      fetchAIAnalysis();
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [stockCode]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          AI智能分析师
          {stockName && <span className="text-sm font-normal ml-2 text-gray-500">({stockName})</span>}
        </h2>
        <button 
          onClick={fetchAIAnalysis} 
          disabled={loading || isTyping}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || isTyping ? '分析中...' : '重新分析'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading && !analysisResult && !isTyping && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {analysisResult && (
        <div className="space-y-6">
          {/* 趋势研判 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              趋势研判
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {typingText.trendAnalysis || analysisResult.trendAnalysis}
            </p>
          </div>

          {/* 主力意图 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              主力意图
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {typingText.mainIntention || analysisResult.mainIntention}
            </p>
          </div>

          {/* 操作评级 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              操作评级
            </h3>
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getOperationRatingStyle(analysisResult.operationRating)}`}>
                {typingText.operationRating || getOperationRatingText(analysisResult.operationRating)}
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">置信度：</span>
                <div className="w-32 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full" 
                    style={{ width: `${analysisResult.confidenceScore}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">{analysisResult.confidenceScore}%</span>
              </div>
            </div>
          </div>

          {/* 风险预警 */}
          {analysisResult?.riskWarning?.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-100">
              <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                风险预警
              </h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {analysisResult.riskWarning.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !analysisResult && !error && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>点击"重新分析"按钮获取AI智能分析结果</p>
        </div>
      )}
    </div>
  );
};

export default AISmartAnalyst;