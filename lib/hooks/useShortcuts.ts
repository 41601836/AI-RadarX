'use client';

import { useEffect, RefObject } from 'react';
import { useRouter } from 'next/navigation';

// 路由映射表
const KEY_ROUTE_MAP: Record<string, string> = {
  'F1': '/',
  'F2': '/market',
  'F3': '/strategy',
  'F4': '/trade',
  'F5': '/assets',
  'F6': '/settings'
};

interface UseShortcutsOptions {
  inputRefs?: RefObject<HTMLInputElement | null>[];
}

export const useShortcuts = ({ inputRefs = [] }: UseShortcutsOptions = {}) => {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查是否有输入框处于聚焦状态
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            inputRefs.some(ref => ref.current?.contains(document.activeElement as Node));
      
      if (isInputFocused) return;

      // 检查是否按下了F1-F6键
      const key = event.key;
      if (key.startsWith('F') && parseInt(key.substring(1)) >= 1 && parseInt(key.substring(1)) <= 6) {
        event.preventDefault();
        const route = KEY_ROUTE_MAP[key];
        if (route) {
          router.push(route);
        }
      }
    };

    // 添加键盘事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router, inputRefs]);
};
