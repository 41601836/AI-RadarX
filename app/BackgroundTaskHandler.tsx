'use client';

import { useEffect } from 'react'
import { useStrategyStore } from '../lib/store/useStrategyStore'

const BackgroundTaskHandler = () => {
  const { startBackgroundTask, stopBackgroundTask } = useStrategyStore();

  useEffect(() => {
    // 页面可见时启动后台任务
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startBackgroundTask();
      } else {
        stopBackgroundTask();
      }
    };

    // 初始加载时启动后台任务
    startBackgroundTask();

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 组件卸载时停止后台任务并移除事件监听
    return () => {
      stopBackgroundTask();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startBackgroundTask, stopBackgroundTask]);

  // 这个组件不渲染任何内容，只处理后台任务
  return null;
};

export default BackgroundTaskHandler;