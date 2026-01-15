'use client';

import { ReactNode } from 'react';
import ClientErrorBoundary from './ClientErrorBoundary';

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return <ClientErrorBoundary>{children}</ClientErrorBoundary>;
}
