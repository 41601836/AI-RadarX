'use client';

import { ReactNode } from 'react';
// import ClientErrorBoundary from './ClientErrorBoundary';
// import { StockProvider } from '../lib/context/StockContext';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return (
    <>
      {children}
    </>
  );
}
