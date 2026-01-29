import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/api/common/response';
import { config } from '@/lib/config';

// 定义中间件配置
const middlewareConfig = {
  // 允许匿名访问的路由
  publicRoutes: [
    '/api/v1/example/demo',
    '/api/v1/example/stock-info',
    '/api/market/quote',
    '/api/market/stock_basic',
  ],
  
  // CORS配置
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400, // 24小时
  },
  
  // 限流配置
  rateLimit: {
    maxRequests: config.RATE_LIMIT_MAX,
    windowMs: config.RATE_LIMIT_WINDOW,
  },
};

// 请求日志记录器
function logRequest(request: NextRequest) {
  const requestId = request.headers.get('X-Request-Id') || generateRequestId();
  console.log(`[${new Date().toISOString()}] [${requestId}] ${request.method} ${request.url}`);
}

// CORS处理
function handleCors(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, {
      status: 204,
    });
    
    // 设置CORS头
    if (origin && middlewareConfig.cors.allowedOrigins.includes('*') || 
        (Array.isArray(middlewareConfig.cors.allowedOrigins) && middlewareConfig.cors.allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', middlewareConfig.cors.allowedMethods.join(','));
    response.headers.set('Access-Control-Allow-Headers', middlewareConfig.cors.allowedHeaders.join(','));
    response.headers.set('Access-Control-Expose-Headers', middlewareConfig.cors.exposedHeaders.join(','));
    response.headers.set('Access-Control-Allow-Credentials', middlewareConfig.cors.credentials ? 'true' : 'false');
    response.headers.set('Access-Control-Max-Age', middlewareConfig.cors.maxAge.toString());
    
    return response;
  }
  
  // 处理普通请求
  const response = NextResponse.next();
  
  // 设置CORS头
  if (origin && middlewareConfig.cors.allowedOrigins.includes('*') || 
      (Array.isArray(middlewareConfig.cors.allowedOrigins) && middlewareConfig.cors.allowedOrigins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', middlewareConfig.cors.credentials ? 'true' : 'false');
  
  return response;
}

// 身份验证检查
function checkAuth(request: NextRequest) {
  // 检查是否是公开路由
  const pathname = request.nextUrl.pathname;
  if (middlewareConfig.publicRoutes.some(route => pathname.startsWith(route))) {
    return null; // 无需验证
  }
  
  // 检查授权头
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(JSON.stringify({
      code: 401,
      msg: 'Unauthorized: Missing or invalid token',
      requestId: request.headers.get('X-Request-Id') || generateRequestId(),
      timestamp: Date.now(),
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  // 验证JWT令牌（这里只是简单示例，实际应该使用JWT库验证）
  const token = authHeader.substring(7);
  // TODO: 实现实际的JWT验证逻辑
  
  return null;
}

// 限流处理（简单内存实现，生产环境应使用Redis等持久化存储）
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
}>();

function handleRateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const now = Date.now();
  
  // 检查是否在限流窗口内
  const key = `rate-limit:${ip}`;
  const entry = rateLimitStore.get(key);
  
  if (entry) {
    if (now < entry.resetTime) {
      // 增加计数
      entry.count++;
      
      // 检查是否超过限制
      if (entry.count > middlewareConfig.rateLimit.maxRequests) {
        return new NextResponse(JSON.stringify({
          code: 429,
          msg: 'Too Many Requests',
          requestId: request.headers.get('X-Request-Id') || generateRequestId(),
          timestamp: Date.now(),
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
          },
        });
      }
    } else {
      // 重置计数
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + middlewareConfig.rateLimit.windowMs,
      });
    }
  } else {
    // 创建新的计数
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + middlewareConfig.rateLimit.windowMs,
    });
  }
  
  return null;
}

// 中间件主函数
export function middleware(request: NextRequest) {
  // 生成请求ID
  const requestId = generateRequestId();
  
  // 设置请求ID头
  const requestWithId = new NextRequest(request.url, {
    headers: request.headers,
    method: request.method,
    body: request.body,
  });
  requestWithId.headers.set('X-Request-Id', requestId);
  
  // 记录请求日志
  logRequest(requestWithId);
  
  // 处理CORS
  const corsResponse = handleCors(requestWithId);
  if (request.method === 'OPTIONS') {
    return corsResponse;
  }
  
  // 限流检查
  const rateLimitResponse = handleRateLimit(requestWithId);
  if (rateLimitResponse) {
    rateLimitResponse.headers.set('X-Request-Id', requestId);
    return rateLimitResponse;
  }
  
  // 身份验证检查
  const authResponse = checkAuth(requestWithId);
  if (authResponse) {
    authResponse.headers.set('X-Request-Id', requestId);
    return authResponse;
  }
  
  // 继续处理请求
  const response = NextResponse.next({
    request: requestWithId,
  });
  
  // 设置响应头
  response.headers.set('X-Request-Id', requestId);
  
  return response;
}

// 定义中间件应用的路由
export const config = {
  matcher: ['/api/:path*'],
};
