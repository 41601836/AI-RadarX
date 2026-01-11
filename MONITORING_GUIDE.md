# 基础监控方案建议

## 1. 监控方案概述

### 1.1 监控目标
- 确保应用系统稳定运行
- 及时发现和定位问题
- 性能优化和容量规划
- 安全事件监测

### 1.2 监控层次
1. **应用层监控**：监控应用性能、请求响应时间、错误率等
2. **系统层监控**：监控服务器CPU、内存、磁盘、网络等资源
3. **数据库监控**：监控Redis等数据库的性能和使用情况
4. **容器监控**：监控Docker容器的运行状态和资源使用

## 2. 应用层监控

### 2.1 Next.js应用监控

#### 2.1.1 内置监控
```bash
# 启用Next.js性能监控
NODE_ENV=production NEXT_PUBLIC_OTEL_ENABLED=true pnpm start
```

#### 2.1.2 添加监控中间件
创建`lib/monitoring/middleware.ts`：
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const end = Date.now();
  
  // 记录请求耗时
  console.log(`${request.method} ${request.url} ${end - start}ms`);
  
  // 添加响应头
  response.headers.set('X-Response-Time', `${end - start}ms`);
  
  return response;
}
```

#### 2.1.3 性能指标监控
- **请求响应时间**：监控API请求的平均、最大、最小响应时间
- **错误率**：监控4xx和5xx错误的发生率
- **吞吐量**：监控每秒处理的请求数
- **资源使用**：监控JavaScript堆内存使用情况

### 2.2 前端性能监控

#### 2.2.1 浏览器性能API
在前端组件中添加性能监控：
```typescript
// 监控页面加载性能
useEffect(() => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const performance = window.performance;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    console.log('页面加载时间:', navigation.loadEventEnd - navigation.fetchStart);
    console.log('首屏渲染时间:', navigation.domContentLoadedEventEnd - navigation.fetchStart);
  }
}, []);
```

#### 2.2.2 前端错误监控
```typescript
// 监控JavaScript错误
useEffect(() => {
  const handleError = (error: ErrorEvent) => {
    console.error('JavaScript错误:', error);
    // 发送错误到监控系统
  };
  
  window.addEventListener('error', handleError);
  return () => window.removeEventListener('error', handleError);
}, []);

// 监控React组件错误
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    if (hasError) {
      console.error('React组件错误');
      // 发送错误到监控系统
    }
  }, [hasError]);
  
  return hasError ? <ErrorMessage /> : children;
};
```

## 3. 系统层监控

### 3.1 Linux服务器监控

#### 3.1.1 基础监控命令
```bash
# 实时监控系统资源
top

# 监控CPU使用情况
mpstat 1

# 监控内存使用情况
free -h

# 监控磁盘使用情况
df -h

# 监控磁盘IO
iostat 1

# 监控网络使用情况
iftop
```

#### 3.1.2 系统监控工具
- **Prometheus + Node Exporter**：监控服务器资源使用
- **Grafana**：可视化监控数据
- **Nagios**：传统的服务器监控工具
- **Zabbix**：全面的企业级监控解决方案

### 3.2 Docker容器监控

#### 3.2.1 Docker内置监控
```bash
# 查看容器资源使用情况
docker stats

# 查看容器详细统计信息
docker container stats <container-id>
```

#### 3.2.2 容器监控工具
- **cAdvisor**：容器资源使用和性能分析
- **Prometheus + cAdvisor**：监控容器资源使用
- **Grafana**：可视化容器监控数据
- **Docker Compose监控**：
```bash
# 查看服务资源使用情况
docker-compose top
```

## 4. 数据库监控

### 4.1 Redis监控

#### 4.1.1 Redis内置监控
```bash
# 连接Redis
redis-cli -a <password>

# 查看Redis状态信息
info

# 查看内存使用情况
info memory

# 查看CPU使用情况
info cpu

# 查看客户端连接情况
info clients

# 查看命令统计
info stats
```

#### 4.1.2 Redis监控指标
- **内存使用**：used_memory、used_memory_peak
- **命中率**：keyspace_hits、keyspace_misses
- **客户端连接数**：connected_clients
- **命令执行情况**：total_commands_processed
- **持久化状态**：rdb_last_save_time、aof_last_bgrewrite_status

#### 4.1.3 Redis监控工具
- **Redis Exporter**：将Redis指标导出到Prometheus
- **Grafana Redis Dashboard**：可视化Redis监控数据
- **RedisInsight**：Redis官方监控工具

## 5. 监控工具链

### 5.1 Prometheus + Grafana方案

#### 5.1.1 架构图
```
应用服务 → Prometheus（收集指标） → Grafana（可视化）
  ↑               ↑
  |               |
Node Exporter   Redis Exporter
  ↑               ↑
  |               |
服务器资源     Redis指标
```

#### 5.1.2 部署步骤

##### 5.1.2.1 部署Prometheus
```yaml
# docker-compose.prometheus.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

volumes:
  prometheus_data:
    driver: local
```

创建`prometheus.yml`配置文件：
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node_exporter'
    static_configs:
      - targets: ['node_exporter:9100']

  - job_name: 'redis_exporter'
    static_configs:
      - targets: ['redis_exporter:9121']

  - job_name: 'app_metrics'
    static_configs:
      - targets: ['app:3000']
```

##### 5.1.2.2 部署Node Exporter
```yaml
# 在docker-compose.prometheus.yml中添加
node_exporter:
  image: prom/node-exporter:v1.6.0
  ports:
    - "9100:9100"
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - '--path.procfs=/host/proc'
    - '--path.rootfs=/rootfs'
    - '--path.sysfs=/host/sys'
    - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
  restart: unless-stopped
```

##### 5.1.2.3 部署Redis Exporter
```yaml
# 在docker-compose.prometheus.yml中添加
redis_exporter:
  image: oliver006/redis_exporter:v1.52.0
  ports:
    - "9121:9121"
  environment:
    - REDIS_ADDR=redis://redis:6379
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  restart: unless-stopped
  depends_on:
    - redis
```

##### 5.1.2.4 部署Grafana
```yaml
# 在docker-compose.prometheus.yml中添加
grafana:
  image: grafana/grafana:10.1.0
  ports:
    - "3000:3000"
  volumes:
    - grafana_data:/var/lib/grafana
  restart: unless-stopped
  depends_on:
    - prometheus

volumes:
  grafana_data:
    driver: local
```

#### 5.1.3 Grafana配置

1. 访问Grafana：http://localhost:3000
2. 登录：admin/admin（首次登录需要修改密码）
3. 添加数据源：Prometheus
   - URL：http://prometheus:9090
   - 点击"Save & Test"
4. 导入仪表盘：
   - 服务器监控：导入Dashboard ID 1860（Node Exporter Full）
   - Redis监控：导入Dashboard ID 763（Redis Dashboard for Prometheus Redis Exporter）

### 5.2 阿里云SLS方案

#### 5.2.1 优势
- 无需自行部署和维护监控系统
- 与阿里云生态无缝集成
- 强大的日志分析和告警功能
- 支持多地域、多环境监控

#### 5.2.2 实施步骤
1. 开通阿里云SLS服务
2. 创建日志项目和日志库
3. 安装Logtail收集器
4. 配置日志收集规则
5. 创建仪表盘和告警规则

## 6. 告警配置

### 6.1 告警策略

#### 6.1.1 应用层告警
- **请求错误率**：当5xx错误率超过5%时触发告警
- **请求响应时间**：当平均响应时间超过500ms时触发告警
- **应用崩溃**：当应用进程异常退出时触发告警

#### 6.1.2 系统层告警
- **CPU使用率**：当CPU使用率持续5分钟超过80%时触发告警
- **内存使用率**：当内存使用率持续5分钟超过85%时触发告警
- **磁盘使用率**：当磁盘使用率超过90%时触发告警
- **网络流量**：当网络流入/流出流量超过阈值时触发告警

#### 6.1.3 数据库告警
- **Redis内存使用**：当Redis内存使用率超过80%时触发告警
- **Redis命中率**：当Redis命中率低于90%时触发告警
- **Redis连接数**：当Redis客户端连接数超过阈值时触发告警

### 6.2 告警渠道
- **邮件告警**：发送告警邮件到相关人员
- **短信告警**：发送告警短信到相关人员
- **钉钉/企业微信告警**：通过群机器人发送告警信息
- **电话告警**：严重问题时触发电话告警

### 6.3 Grafana告警配置

#### 6.3.1 配置告警渠道
1. 进入Grafana配置页面
2. 点击"Alerting" > "Contact points"
3. 添加告警渠道（邮件、钉钉等）

#### 6.3.2 创建告警规则
1. 进入仪表盘
2. 点击图表标题 > "Edit"
3. 切换到"Alert"标签
4. 配置告警条件和阈值
5. 选择告警渠道
6. 保存告警规则

## 7. 监控数据保留策略

### 7.1 短期数据
- **时间范围**：最近7天
- **数据粒度**：1分钟
- **存储方式**：本地磁盘或SSD

### 7.2 中期数据
- **时间范围**：最近30天
- **数据粒度**：5分钟
- **存储方式**：云存储或NAS

### 7.3 长期数据
- **时间范围**：30天以上
- **数据粒度**：1小时
- **存储方式**：对象存储（如OSS、S3等）

## 8. 监控方案实施建议

### 8.1 分阶段实施
1. **第一阶段**：部署基础监控（系统资源、Redis监控）
2. **第二阶段**：添加应用层监控
3. **第三阶段**：完善告警策略和可视化
4. **第四阶段**：添加安全监控和性能优化分析

### 8.2 最佳实践
- **监控关键指标**：只监控对业务有影响的关键指标
- **设置合理阈值**：根据实际业务情况设置告警阈值
- **定期审查监控**：定期检查监控配置和告警规则
- **持续优化**：根据监控数据持续优化系统性能

### 8.3 常见问题和解决方案

#### 8.3.1 监控数据过多
- 解决方案：设置数据采样率，只保留关键指标

#### 8.3.2 误报过多
- 解决方案：调整告警阈值，添加告警抑制规则

#### 8.3.3 监控系统性能影响
- 解决方案：使用轻量级监控代理，合理设置采集间隔

## 9. 总结

本监控方案提供了全面的监控覆盖，包括应用层、系统层、数据库层和容器层。通过Prometheus + Grafana或阿里云SLS等工具，可以实现监控数据的收集、存储、可视化和告警。建议根据实际业务需求和资源情况，选择合适的监控方案并分阶段实施。