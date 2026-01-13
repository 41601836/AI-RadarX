// 环境控制塔组件 - 支持Real API/Mock Data/Simulation模式切换
'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

// 环境模式类型
export type EnvironmentMode = 'real' | 'mock' | 'simulation';

// 环境配置接口
export interface EnvironmentConfig {
  mode: EnvironmentMode;
  mockDelay?: number; // 模拟数据延迟
  simulationSpeed?: number; // 模拟速度倍率
  enableWebSocket?: boolean; // 是否启用WebSocket
}

// 组件属性接口
interface EnvironmentControlProps {
  defaultMode?: EnvironmentMode;
  onChange?: (mode: EnvironmentMode, config: EnvironmentConfig) => void;
  showLabel?: boolean;
}

// 环境控制塔组件
export default function EnvironmentControl({
  defaultMode = 'mock',
  onChange,
  showLabel = true
}: EnvironmentControlProps) {
  // 当前环境模式
  const [mode, setMode] = useState<EnvironmentMode>(defaultMode);

  // 环境配置
  const [config, setConfig] = useState<EnvironmentConfig>({
    mode,
    mockDelay: 500,
    simulationSpeed: 1,
    enableWebSocket: true
  });

  // 在客户端渲染完成后从localStorage读取配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 从localStorage读取上次使用的模式
      const savedMode = localStorage.getItem('environmentMode') as EnvironmentMode;
      if (savedMode) {
        setMode(savedMode);
      }

      // 从localStorage读取配置
      const savedConfig = localStorage.getItem('environmentConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, []);

  // 当模式改变时更新配置并保存到localStorage
  useEffect(() => {
    const newConfig = { ...config, mode };
    setConfig(newConfig);
    
    // 只在客户端保存到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('environmentMode', mode);
      localStorage.setItem('environmentConfig', JSON.stringify(newConfig));
    }
    
    // 调用外部 onChange 回调
    if (onChange) {
      onChange(mode, newConfig);
    }
    
    // 记录环境模式切换
    logger.info('[EnvironmentControl] 环境模式切换', { mode, config: newConfig });
    
    // 强制Mock状态同步日志
    if (mode === 'mock') {
      console.log('[Environment] Switched to Mock Mode');
    }
  }, [mode, config, onChange]);

  // 切换环境模式
  const handleModeChange = (newMode: EnvironmentMode) => {
    setMode(newMode);
  };

  // 获取模式对应的颜色
  const getModeColor = (mode: EnvironmentMode): string => {
    switch (mode) {
      case 'real':
        return 'text-green-500';
      case 'mock':
        return 'text-yellow-500';
      case 'simulation':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取模式对应的图标
  const getModeIcon = (mode: EnvironmentMode): string => {
    switch (mode) {
      case 'real':
        return '🌐';
      case 'mock':
        return '📊';
      case 'simulation':
        return '🎮';
      default:
        return '⚙️';
    }
  };

  // 获取模式对应的文本
  const getModeText = (mode: EnvironmentMode): string => {
    switch (mode) {
      case 'real':
        return 'Real API';
      case 'mock':
        return 'Mock Data';
      case 'simulation':
        return 'Simulation';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="relative inline-block">
      {/* 模式切换按钮 */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#2a2a3a] rounded-md text-xs cursor-pointer hover:bg-[#3a3a4a] transition-colors">
        {showLabel && (
          <span className="font-medium text-gray-400">Env:</span>
        )}
        <span className={`flex items-center gap-1 font-medium ${getModeColor(mode)}`}>
          <span>{getModeIcon(mode)}</span>
          <span>{getModeText(mode)}</span>
        </span>
        <span className="text-gray-500">▼</span>
      </div>
      
      {/* 下拉菜单 */}
      <div className="absolute right-0 mt-1 w-36 bg-[#3a3a4a] rounded-md shadow-lg z-50 overflow-hidden">
        {(['real', 'mock', 'simulation'] as EnvironmentMode[]).map((envMode) => (
          <div
            key={envMode}
            className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-[#4a4a5a] transition-colors ${mode === envMode ? 'bg-[#4a4a5a]' : ''}`}
            onClick={() => handleModeChange(envMode)}
          >
            <span className={`text-base ${getModeColor(envMode)}`}>
              {getModeIcon(envMode)}
            </span>
            <span className={`font-medium ${mode === envMode ? getModeColor(envMode) : 'text-gray-300'}`}>
              {getModeText(envMode)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 环境配置上下文
export interface EnvironmentContextType {
  mode: EnvironmentMode;
  config: EnvironmentConfig;
  setMode: (mode: EnvironmentMode) => void;
  updateConfig: (updates: Partial<EnvironmentConfig>) => void;
}

// 清理Zustand缓存并重新初始化Store的函数
export const resetZustandStores = () => {
  logger.info('[EnvironmentControl] 清理Zustand缓存并重新初始化Store');
  
  // 只在客户端执行清理操作
  if (typeof window !== 'undefined') {
    // 获取所有Zustand存储的键
    const zustandKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('zustand/') || 
      key.includes('store') ||
      key.includes('portfolio') ||
      key.includes('market') ||
      key.includes('strategy')
    );
    
    // 清理缓存
    zustandKeys.forEach(key => {
      logger.debug('[EnvironmentControl] 清理缓存', { key });
      localStorage.removeItem(key);
    });
    
    // 重新加载页面以重新初始化Store
    window.location.reload();
  }
};
