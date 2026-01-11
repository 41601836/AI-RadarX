# 日志优化建议

## 1. 日志管理概述

### 1.1 日志的重要性
- **问题排查**：快速定位和解决系统故障
- **性能分析**：监控系统性能和瓶颈
- **安全审计**：记录系统操作和安全事件
- **业务分析**：了解用户行为和业务趋势

### 1.2 日志管理目标
- **标准化**：统一日志格式和级别
- **可扩展**：支持日志量增长和多环境部署
- **高性能**：低开销记录日志
- **易分析**：便于搜索、过滤和可视化

## 2. Next.js应用日志优化

### 2.1 服务端日志

#### 2.1.1 配置Next.js日志
在`next.config.js`中配置日志级别：
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 其他配置...
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig
```

#### 2.1.2 自定义日志中间件
创建`lib/logging/middleware.ts`：
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const end = Date.now();
  
  // 结构化日志格式
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    method: request.method,
    url: request.url,
    status: response.status,
    responseTime: `${end - start}ms`,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip,
  };
  
  console.log(JSON.stringify(logEntry));
  
  return response;
}
```

### 2.2 前端日志

#### 2.2.1 浏览器控制台日志
在前端组件中使用结构化日志：
```typescript
// 结构化日志记录
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  component: 'WADChipDistribution',
  action: 'calculateIndicators',
  stockCode: '600519',
  result: 'success',
  duration: `${end - start}ms`,
};

console.log(JSON.stringify(log));
```

#### 2.2.2 错误日志捕获
创建`lib/logging/error-handler.ts`：
```typescript
// 全局错误处理
export function initErrorLogging() {
  if (typeof window === 'undefined') return;
  
  // 捕获JavaScript错误
  window.addEventListener('error', (event) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      type: 'JavaScript Error',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
    };
    
    console.error(JSON.stringify(errorLog));
    
    // 可选：发送到日志服务器
    // sendToLogServer(errorLog);
  });
  
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const rejectionLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      type: 'Unhandled Promise Rejection',
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    };
    
    console.error(JSON.stringify(rejectionLog));
    
    // 可选：发送到日志服务器
    // sendToLogServer(rejectionLog);
  });
}
```

在`app/layout.tsx`中初始化错误日志：
```typescript
import { initErrorLogging } from '@/lib/logging/error-handler';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始化错误日志
  useEffect(() => {
    initErrorLogging();
  }, []);
  
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

## 3. 日志级别和格式规范

### 3.1 日志级别
| 级别 | 描述 | 使用场景 |
|------|------|----------|
| DEBUG | 调试信息 | 开发环境，详细的调试信息 |
| INFO | 普通信息 | 生产环境，正常的系统操作 |
| WARN | 警告信息 | 潜在问题，但不影响系统运行 |
| ERROR | 错误信息 | 系统错误，需要及时处理 |
| FATAL | 致命错误 | 系统崩溃，需要立即处理 |

### 3.2 日志格式规范

#### 3.2.1 结构化日志格式
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "ai-trading-terminal",
  "environment": "production",
  "hostname": "server-01",
  "processId": 12345,
  "requestId": "req-12345-abcde",
  "module": "api/market",
  "action": "getKlineData",
  "message": "Successfully fetched K-line data",
  "data": {
    "stockCode": "600519",
    "interval": "1d",
    "limit": 100
  },
  "duration": 150,
  "status": "success",
  "error": null
}
```

#### 3.2.2 关键字段说明
- **timestamp**：日志生成时间（ISO 8601格式）
- **level**：日志级别
- **service**：服务名称
- **environment**：运行环境（development/production）
- **requestId**：请求唯一标识（用于追踪请求链路）
- **module**：日志来源模块
- **action**：执行的操作
- **message**：日志消息
- **data**：附加数据（JSON格式）
- **duration**：操作耗时（毫秒）
- **status**：操作状态（success/failure）
- **error**：错误信息（包含message和stack）

## 4. 日志分割和归档

### 4.1 Next.js应用日志分割

#### 4.1.1 使用PM2管理应用
```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件 ecosystem.config.js
```

`ecosystem.config.js`配置：
```javascript
module.exports = {
  apps: [{
    name: 'ai-trading-terminal',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_type: 'json',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    }
  }]
}
```

#### 4.1.2 启动应用
```bash
# 启动应用
npm install -g pm2
npm install pm2-logrotate -g

# 配置日志分割
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD

# 启动应用
pm2 start ecosystem.config.js
```

### 4.2 Docker容器日志分割

在`docker-compose.yml`中配置日志驱动：
```yaml
services:
  frontend:
    # 其他配置...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4.3 日志归档策略

| 日志类型 | 保留期限 | 存储方式 |
|----------|----------|----------|
| 应用日志 | 7天 | 本地磁盘 |
| 系统日志 | 30天 | 本地磁盘 |
| 安全日志 | 90天 | 云存储 |
| 业务日志 | 1年 | 对象存储 |

## 5. 日志分析和查询

### 5.1 日志收集工具

#### 5.1.1 ELK Stack
- **Elasticsearch**：存储和索引日志
- **Logstash**：收集和处理日志
- **Kibana**：可视化和查询日志

#### 5.1.2 阿里云SLS
- 无需自行部署和维护
- 与阿里云生态无缝集成
- 强大的日志分析和查询功能
- 支持实时监控和告警

### 5.2 日志查询示例

#### 5.2.1 使用ELK查询日志
```kql
# 查询错误日志
level:ERROR AND environment:production

# 查询特定请求的日志
requestId:req-12345-abcde

# 查询特定时间段的日志
timestamp: ["2024-01-01T00:00:00Z" TO "2024-01-02T00:00:00Z"]

# 查询慢请求
level:INFO AND duration:>500 AND action:getKlineData
```

#### 5.2.2 使用阿里云SLS查询日志
```sql
# 查询错误日志
* | where level = 'ERROR' and environment = 'production'

# 查询特定股票的日志
* | where data.stockCode = '600519'

# 统计请求响应时间分布
* | where level = 'INFO' and action = 'getKlineData'
  | stats avg(duration) as avg_duration, max(duration) as max_duration, min(duration) as min_duration by stockCode
  | order by avg_duration desc
```

## 6. 常见日志问题和解决方案

### 6.1 日志过多
- **问题**：日志量过大，占用大量磁盘空间
- **解决方案**：
  - 设置合理的日志级别（生产环境使用INFO及以上级别）
  - 实现日志采样（只记录部分请求日志）
  - 定期清理过期日志
  - 使用日志压缩和归档

### 6.2 日志格式不统一
- **问题**：不同模块日志格式不一致，难以分析
- **解决方案**：
  - 制定日志格式规范
  - 使用统一的日志工具库
  - 定期检查和规范日志格式

### 6.3 日志性能问题
- **问题**：日志记录影响应用性能
- **解决方案**：
  - 使用异步日志记录
  - 减少日志内容（只记录必要信息）
  - 避免在日志中执行复杂计算
  - 使用高性能日志库

### 6.4 日志丢失
- **问题**：日志文件被覆盖或丢失
- **解决方案**：
  - 实现日志分割和归档
  - 使用RAID存储日志
  - 定期备份日志文件
  - 使用分布式日志系统

## 7. 最佳实践

### 7.1 前端日志最佳实践
1. **使用结构化日志**：便于分析和查询
2. **控制日志级别**：生产环境只记录INFO及以上级别
3. **捕获关键错误**：记录JavaScript错误和Promise拒绝
4. **添加上下文信息**：记录用户ID、请求ID等
5. **避免记录敏感信息**：如密码、API密钥等

### 7.2 后端日志最佳实践
1. **使用中间件记录请求**：统一记录HTTP请求和响应
2. **添加请求ID**：追踪请求全链路
3. **记录性能指标**：请求响应时间、数据库查询时间等
4. **实现日志旋转**：定期分割和清理日志
5. **使用环境变量控制日志**：根据环境调整日志级别

### 7.3 安全日志最佳实践
1. **记录关键操作**：用户登录、权限变更等
2. **记录安全事件**：登录失败、访问拒绝等
3. **保护日志安全**：设置日志文件权限，防止未授权访问
4. **定期审计日志**：检查异常操作和安全事件
5. **备份安全日志**：防止日志被篡改或删除

### 7.4 日志管理流程
1. **制定日志规范**：定义日志格式、级别和存储策略
2. **实施日志监控**：实时监控日志量和错误率
3. **定期分析日志**：识别性能问题和安全威胁
4. **优化日志配置**：根据业务需求调整日志策略
5. **培训开发人员**：确保开发人员遵循日志规范

## 8. 总结

本日志优化建议提供了全面的日志管理方案，包括日志格式、级别、分割、分析等内容。通过标准化日志格式、合理设置日志级别、实现日志分割和归档、使用日志分析工具，可以提高系统的可维护性和可靠性。建议根据实际业务需求和资源情况，选择合适的日志管理方案并持续优化。