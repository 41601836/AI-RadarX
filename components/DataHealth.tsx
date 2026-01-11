// 数据健康状态组件
'use client';

import React, { useState, useEffect } from 'react';
import { usePolling } from '../lib/hooks/usePolling';
import { checkTushareConnection, TushareStatus } from '../lib/api/common/tushare';

// 数据源类型
export type DataSourceType = 
  | 'Local-API'              // 本地后端API
  | 'Realtime-Tencent'       // 腾讯实时行情
  | 'Hybrid-Realtime-Tushare'// 融合实时和历史数据
  | 'Baseline-Tushare'       // Tushare历史数据
  | 'NewsAggregator'         // 新闻聚合器
  | 'Mock';                  // 模拟数据

// 数据健康状态接口
export interface DataHealthStatus {
  tushare: TushareStatus;
  freeScanner?: {
    connected: boolean;
    lastCheckTime: number;
    error?: string;
  };
  aiEngine?: {
    connected: boolean;
    lastCheckTime: number;
    error?: string;
  };
  currentDataSource: DataSourceType;
}

interface DataHealthProps {
  // 可选的外部数据源类型，用于覆盖内部检测
  currentDataSource?: DataSourceType;
}

export default function DataHealth({ currentDataSource: externalDataSource }: DataHealthProps = {}) {
  const [status, setStatus] = useState<DataHealthStatus>({
    tushare: {
      connected: false,
      isUsingMock: process.env.NEXT_PUBLIC_API_MOCK === 'true',
      lastCheckTime: 0,
      error: '正在检查连接...'
    },
    freeScanner: {
      connected: false,
      lastCheckTime: 0,
      error: '正在检查连接...'
    },
    aiEngine: {
      connected: false,
      lastCheckTime: 0,
      error: '正在检查AI引擎...'
    },
    currentDataSource: 'Mock'
  });

  const checkConnection = async () => {
    try {
      // 检查Tushare连接
      const tushareStatus = await checkTushareConnection();
      
      // 检查免费行情接口连接（模拟实现）
      const freeScannerStatus = await checkFreeScannerConnection();
      
      // 检查AI引擎连接
      const aiEngineStatus = await checkAIEngineConnection();
      
      // 确定当前数据源类型
      let dataSource: DataSourceType = 'Mock';
      
      if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
        dataSource = 'Mock';
      } else if (tushareStatus.connected && freeScannerStatus?.connected) {
        dataSource = 'Hybrid-Realtime-Tushare';
      } else if (freeScannerStatus?.connected) {
        dataSource = 'Realtime-Tencent';
      } else if (tushareStatus.connected) {
        dataSource = 'Baseline-Tushare';
      }
      
      // 使用外部提供的数据源类型（如果有）
      if (externalDataSource) {
        dataSource = externalDataSource;
      }
      
      setStatus({
        tushare: tushareStatus,
        freeScanner: freeScannerStatus,
        aiEngine: aiEngineStatus,
        currentDataSource: dataSource
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        tushare: {
          ...prev.tushare,
          connected: false,
          lastCheckTime: Date.now(),
          error: '检查连接失败'
        },
        freeScanner: {
          ...prev.freeScanner!,
          connected: false,
          lastCheckTime: Date.now(),
          error: '检查连接失败'
        },
        aiEngine: {
          ...prev.aiEngine!,
          connected: false,
          lastCheckTime: Date.now(),
          error: 'AI引擎检查失败'
        },
        currentDataSource: externalDataSource || 'Mock'
      }));
    }
  };

  // 初始检查连接状态
  React.useEffect(() => {
    checkConnection();
  }, []);

  // 使用usePolling钩子替代setInterval，实现休眠模式
  usePolling(checkConnection, {
    interval: 30000, // 每30秒检查一次
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: false // 不立即执行，依赖上面的初始加载
  });

  // 检查免费行情接口连接（模拟实现）
  const checkFreeScannerConnection = async (): Promise<DataHealthStatus['freeScanner']> => {
    try {
      // 这里应该实现真实的连接检查逻辑
      // 模拟连接检查
      const isMock = process.env.NEXT_PUBLIC_API_MOCK === 'true';
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 模拟连接结果
      return {
        connected: !isMock, // 在非Mock模式下，假设连接正常
        lastCheckTime: Date.now()
      };
    } catch (error) {
      return {
        connected: false,
        lastCheckTime: Date.now(),
        error: '免费行情接口连接失败'
      };
    }
  };

  // 检查AI引擎连接
  const checkAIEngineConnection = async (): Promise<DataHealthStatus['aiEngine']> => {
    try {
      // 尝试连接到AI引擎接口进行健康检查
      const response = await fetch('/api/ai-inference/intelligence-brief?stockCode=SH600000', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 检查AI引擎是否正常响应
      const isMock = process.env.NEXT_PUBLIC_API_MOCK === 'true';
      
      return {
        connected: isMock || response.ok, // 在非Mock模式下，根据响应状态判断
        lastCheckTime: Date.now()
      };
    } catch (error) {
      return {
        connected: false,
        lastCheckTime: Date.now(),
        error: 'AI引擎连接失败'
      };
    }
  };

  // 根据数据源类型确定图标
  const getDataSourceIcon = (dataSource: DataSourceType) => {
    switch (dataSource) {
      case 'Local-API':
        return '🏠'; // 本地API
      case 'Realtime-Tencent':
      case 'Hybrid-Realtime-Tushare':
        return '⚡'; // 实时数据
      case 'Baseline-Tushare':
        return '📊'; // 历史数据
      case 'NewsAggregator':
        return '📰'; // 新闻聚合
      case 'Mock':
      default:
        return '⚠️'; // 模拟数据
    }
  };

  // 根据数据源类型确定颜色
  const getDataSourceColor = (dataSource: DataSourceType) => {
    switch (dataSource) {
      case 'Local-API':
      case 'Realtime-Tencent':
      case 'Hybrid-Realtime-Tushare':
        return 'text-green-500'; // 绿色：实时/本地数据
      case 'Baseline-Tushare':
        return 'text-blue-500'; // 蓝色：历史数据
      case 'NewsAggregator':
        return 'text-purple-500'; // 紫色：新闻数据
      case 'Mock':
      default:
        return 'text-yellow-500'; // 黄色：模拟数据
    }
  };

  // 根据数据源类型获取显示文本
  const getDataSourceText = (dataSource: DataSourceType) => {
    switch (dataSource) {
      case 'Local-API':
        return '本地API';
      case 'Realtime-Tencent':
        return '腾讯实时行情';
      case 'Hybrid-Realtime-Tushare':
        return '实时-历史融合';
      case 'Baseline-Tushare':
        return 'Tushare基准数据';
      case 'NewsAggregator':
        return '新闻聚合';
      case 'Mock':
      default:
        return 'Mock模拟数据';
    }
  };

  // 获取整体状态图标
  const getOverallStatusIcon = () => {
    const dataSource = externalDataSource || status.currentDataSource;
    return getDataSourceIcon(dataSource);
  };

  // 获取整体状态颜色
  const getOverallStatusColor = () => {
    const dataSource = externalDataSource || status.currentDataSource;
    return getDataSourceColor(dataSource);
  };

  // 获取整体状态文本
  const getOverallStatusText = () => {
    const dataSource = externalDataSource || status.currentDataSource;
    return getDataSourceText(dataSource);
  };

  // 获取AI引擎状态图标
  const getAIEngineStatusIcon = () => {
    return status.aiEngine?.connected ? '🤖' : '⚠️';
  };

  // 获取AI引擎状态颜色
  const getAIEngineStatusColor = () => {
    return status.aiEngine?.connected ? 'text-green-500' : 'text-yellow-500';
  };

  return (
    <div className="data-health">
      <div 
        className={`status-indicator ${getOverallStatusColor()}`} 
        title={`当前数据源: ${getOverallStatusText()}`}
      >
        {getOverallStatusIcon()}
      </div>
      <span className={`status-text ${getOverallStatusColor()}`}>
        {getOverallStatusText()}
      </span>

      {/* AI引擎状态指示器 */}
      <div 
        className={`status-indicator ai-engine ${getAIEngineStatusColor()}`} 
        title={`AI引擎: ${status.aiEngine?.connected ? '正常' : '异常'}`}
      >
        {getAIEngineStatusIcon()}
      </div>
      <span className={`status-text ai-engine ${getAIEngineStatusColor()}`}>
        {status.aiEngine?.connected ? 'AI引擎在线' : 'AI引擎离线'}
      </span>

      <style jsx>{`
        .data-health {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #2a2a3a;
          border-radius: 6px;
          font-size: 12px;
        }

        .status-indicator {
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .status-text {
          font-weight: 500;
        }

        .ai-engine {
          margin-left: 12px;
          padding-left: 12px;
          border-left: 1px solid #444;
        }
      `}</style>
    </div>
  );
}