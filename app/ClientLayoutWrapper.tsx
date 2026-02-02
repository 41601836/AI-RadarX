'use client';

import { ReactNode, useState, useEffect } from 'react';
import { StockProvider } from '../lib/context/StockContext';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 在服务器端和客户端首次渲染时返回简单的加载状态
  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <StockProvider>
      {children}
    </StockProvider>
  );
}
