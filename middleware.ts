import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CORS中间件
 * 处理跨域资源共享请求
 */
export function middleware(request: NextRequest) {
  // 检查是否为API请求
  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
  
  if (isApiRequest) {
    // 允许的源
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:8080', 'https://your-production-domain.com'];
    const origin = request.headers.get('origin') || '';
    
    // 检查请求是否来自允许的源
    const isAllowedOrigin = allowedOrigins.includes(origin) || origin.endsWith('.your-production-domain.com');
    
    // 创建响应头
    const headers = new Headers({
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return NextResponse.json({}, { headers });
    }
    
    // 处理正常请求
    const response = NextResponse.next();
    
    // 设置CORS头
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  // 非API请求直接通过
  return NextResponse.next();
}

// 配置中间件应用范围
export const config = {
  matcher: '/api/:path*',
};
