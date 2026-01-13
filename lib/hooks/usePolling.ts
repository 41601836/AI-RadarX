import { useEffect, useRef } from 'react';
import { useUserStore } from '../store/user-portfolio';

type UsePollingOptions = {
  interval: number;
  tabKey: string;
  immediate?: boolean;
};

/**
 * 全局轮询钩子，当当前活动标签页与指定标签页不匹配时自动停止轮询
 * @param callback 要执行的轮询函数
 * @param options 轮询选项
 */
export const usePolling = (
  callback: () => void,
  options: UsePollingOptions
) => {
  const { interval, tabKey, immediate = false } = options;
  const { activeTab } = useUserStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const isClient = useRef(false);

  // 确保只在客户端执行
  useEffect(() => {
    isClient.current = true;
  }, []);

  // 更新callback引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // 只在客户端执行
    if (!isClient.current) {
      return;
    }

    const isActive = activeTab === tabKey;

    // 清理之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 如果标签页不活动，不启动定时器
    if (!isActive) {
      return;
    }

    // 如果设置了立即执行，先执行一次
    if (immediate) {
      callbackRef.current();
    }

    // 启动定时器
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTab, tabKey, interval, immediate]);

  // 手动控制函数
  const start = () => {
    // 只在客户端执行
    if (!isClient.current) {
      return;
    }

    if (!intervalRef.current && activeTab === tabKey) {
      callbackRef.current();
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, interval);
    }
  };

  const stop = () => {
    // 只在客户端执行
    if (!isClient.current) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { start, stop };
};
