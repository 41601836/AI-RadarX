// 全局布局文件（服务器组件）
import type { Metadata } from 'next'
import './globals.css' // 引入全局CSS样式重置
import { ReactNode } from 'react'
import { StockProvider } from '../lib/context/StockContext'
import LayoutUI from './LayoutUI'
import ClientLayoutWrapper from './ClientLayoutWrapper'

// 服务器端部分
export const metadata: Metadata = {
  title: '老板的 AI 交易终端',
  description: '专业的 AI 辅助交易系统',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-black overflow-hidden">
        <ClientLayoutWrapper>
          <StockProvider>
            <LayoutUI>{children}</LayoutUI>
          </StockProvider>
        </ClientLayoutWrapper>
      </body>
    </html>
  )
}
