// 全局布局文件
import type { Metadata } from 'next' 
import './globals.css' // 引入全局CSS样式重置
import { ReactNode } from 'react'
import { StockProvider } from '../lib/context/StockContext'
import { NotificationProvider } from '../components/NotificationCenter'

// 服务器端部分
export const metadata: Metadata = {
  title: '老板的 AI 交易终端',
  description: '专业的 AI 辅助交易系统',
}

// 导入后台任务组件
import BackgroundTaskHandler from './BackgroundTaskHandler'

// 导入客户端Error Boundary组件
import ClientErrorBoundary from './ClientErrorBoundary'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ClientErrorBoundary>
          <NotificationProvider>
            <StockProvider>
              <BackgroundTaskHandler />
              {children}
            </StockProvider>
          </NotificationProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}