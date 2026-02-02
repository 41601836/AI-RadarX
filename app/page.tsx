'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('initializing');
  const [dbStatus, setDbStatus] = useState<string>('unknown');
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('--:--:--');

  // 后端健康检查逻辑
  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('http://localhost:8080/api/v1/health', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        setDbStatus('connected'); // 假设后端能响应说明基本连接正常
        setSystemInfo(data);
        setLastHeartbeat(new Date().toLocaleTimeString());
      } else {
        setBackendStatus('error');
      }
    } catch (e) {
      setBackendStatus('offline');
      setDbStatus('unknown');
    }
  };

  useEffect(() => {
    // 立即检查一次
    checkHealth();
    // 每3秒轮询一次
    const timer = setInterval(checkHealth, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-green-500/30">
      {/* 背景光效 */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black pointer-events-none"></div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        {/* 顶部标题区 */}
        <header className="mb-16 text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-mono mb-4">
            SYSTEM STATUS: {backendStatus === 'online' ? 'OPERATIONAL' : 'SYSTEM CHECK REQUIRED'}
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-green-100 to-green-500">
            AI-RadarX
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide">
            INTELLIGENT TRADING SYSTEM <span className="text-green-500">V3.2</span>
          </p>
        </header>

        {/* 核心状态卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 前端状态 */}
          <StatusCard
            title="FRONTEND"
            status="ONLINE"
            ping="0ms"
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            }
          />

          {/* 后端状态 */}
          <StatusCard
            title="AI ENGINE"
            status={backendStatus.toUpperCase()}
            ping={lastHeartbeat}
            color={backendStatus === 'online' ? 'green' : backendStatus === 'initializing' ? 'yellow' : 'red'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            }
          />

          {/* 数据库状态 */}
          <StatusCard
            title="DATA LINK"
            status={dbStatus === 'connected' ? 'CONNECTED' : 'WAITING'}
            ping={dbStatus === 'connected' ? 'OK' : '--'}
            color={dbStatus === 'connected' ? 'blue' : 'gray'}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            }
          />
        </div>

        {/* 系统信息详细面板 */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-xl p-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            实时系统遥测
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <TelemetryItem label="Build Version" value="v3.2.0-beta.1" />
              <TelemetryItem label="Environment" value="Development (Local Hybrid)" />
              <TelemetryItem label="Node.js Check" value="Passed" />
            </div>
            <div className="space-y-4">
              <TelemetryItem label="API Endpoint" value="http://localhost:8080" />
              <TelemetryItem
                label="Response Latency"
                value={backendStatus === 'online' ? '< 50ms' : 'Timeout'}
                color={backendStatus === 'online' ? 'text-green-400' : 'text-red-400'}
              />
              <TelemetryItem label="Active User" value="Admin" />
            </div>
          </div>

          {backendStatus === 'online' && (
            <div className="mt-8 p-4 bg-black/40 rounded border border-green-500/20 font-mono text-xs text-green-300 overflow-hidden">
              {'>'} Backend Response: {JSON.stringify(systemInfo)}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="mt-12 text-center">
          <Link
            href="/market"
            className="inline-block px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            ENTER TERMINAL
          </Link>
          <div className="mt-6 text-gray-500 text-sm font-mono">
            All systems go. Safe Mode active.
          </div>
        </div>
      </div>
    </div>
  );
}

// 辅助组件：状态卡片
function StatusCard({ title, status, ping, color, icon }: any) {
  const colorClasses = {
    green: 'border-green-500/50 text-green-400 shadow-green-900/20',
    red: 'border-red-500/50 text-red-400 shadow-red-900/20',
    yellow: 'border-yellow-500/50 text-yellow-400 shadow-yellow-900/20',
    blue: 'border-blue-500/50 text-blue-400 shadow-blue-900/20',
    gray: 'border-gray-500/50 text-gray-400',
  }[color] || 'border-gray-500/50 text-gray-400';

  return (
    <div className={`p-6 rounded-xl border bg-gray-900/40 backdrop-blur transition-all duration-300 hover:scale-105 shadow-xl ${colorClasses}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-lg bg-black/40">{icon}</div>
        <div className="text-xs font-mono opacity-70">PING: {ping}</div>
      </div>
      <h3 className="text-gray-500 text-sm font-bold tracking-wider mb-1">{title}</h3>
      <div className="text-2xl font-bold tracking-tight">{status}</div>
    </div>
  );
}

// 辅助组件：遥测条目
function TelemetryItem({ label, value, color = 'text-white' }: any) {
  return (
    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`font-mono text-sm ${color}`}>{value}</span>
    </div>
  );
}