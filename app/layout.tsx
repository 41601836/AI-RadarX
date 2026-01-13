// 全局布局文件
import type { Metadata } from 'next' 
import { StockProvider } from '../lib/context/StockContext'
import { NotificationProvider } from '../components/NotificationCenter'
import MainLayout from '../components/layout/MainLayout'
import './globals.css' // 引入全局CSS样式重置

export const metadata: Metadata = {
  title: '老板的 AI 交易终端',
  description: '专业的 AI 辅助交易系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <NotificationProvider>
          <StockProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </StockProvider>
        </NotificationProvider>
      </body>
    </html>
  )
}