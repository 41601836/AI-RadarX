# 老板的 AI 交易终端

## 项目概述
基于 Fincept Terminal 重构的 AI 辅助交易系统，采用前后端双轨制架构。

## 架构设计

### 前端
- **技术栈**: Next.js + TypeScript
- **核心功能**:
  - Dashboard 仪表盘
  - WAD 筹码分布监控
  - 市场概览和持仓管理
  - 实时行情展示

### 后端
- **技术栈**: Java Spring Boot
- **API 地址**: `http://localhost:8080/api/v1/market/kline`

## 项目结构

```
ai-trading-terminal/
├── app/
│   ├── layout.tsx          # 全局布局
│   └── page.tsx            # 主Dashboard页面
├── components/
│   └── WADChipDistribution.tsx  # WAD筹码分布监控组件
├── lib/
│   └── api/
│       └── market.ts       # API桥接模块
├── next.config.js          # Next.js配置
├── package.json            # 项目依赖
└── tsconfig.json           # TypeScript配置
```

## 核心功能说明

### 1. API 桥接模块 (lib/api/market.ts)
- 将前端请求重定向到 Java 后端
- 实现 Tushare K 线数据到 OHLCV 格式的映射
- 包含错误处理和模拟数据后备机制

### 2. WAD 筹码分布监控 (components/WADChipDistribution.tsx)
- 显示 WAD 指标走势图
- 展示筹码分布情况
- 计算平均成本和筹码集中度
- 分析资金流向

### 3. Dashboard 页面 (app/page.tsx)
- 市场概览面板
- 持仓管理面板
- WAD 筹码分布监控窗口
- 市场热点面板

## 环境要求

- Node.js 18+
- npm 或 pnpm
- Java 11+ (后端)

## 启动步骤

### 前端
```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev

# 访问地址
http://localhost:3000
```

### 后端
```bash
# 启动 Java Spring Boot 服务
java -jar trading-backend.jar
```

## 主要 API 接口

### 获取 K 线数据
- **地址**: `GET http://localhost:8080/api/v1/market/kline`
- **参数**:
  - `symbol`: 股票代码
  - `interval`: 时间间隔 (1d, 1w, 1m)
  - `limit`: 数据条数

## 数据格式映射

### Tushare K 线格式
```json
{
  "trade_date": "20260110",
  "open": 8.5,
  "high": 8.6,
  "low": 8.4,
  "close": 8.55,
  "vol": 1000000
}
```

### OHLCV 格式
```json
{
  "timestamp": 1736534400000,
  "open": 850,
  "high": 860,
  "low": 840,
  "close": 855,
  "volume": 1000000
}
```

## 注意事项

1. 价格单位统一为分，避免浮点精度问题
2. 时间格式采用 `yyyy-MM-dd HH:mm:ss`
3. 确保 Java 后端服务运行在 8080 端口
4. 首次启动时会使用模拟数据，后端服务启动后自动切换

## 开发说明

### 添加新组件
```bash
mkdir -p components/NewComponent
vi components/NewComponent.tsx
```

### 修改 API 配置
编辑 `lib/api/market.ts` 文件，调整后端 API 地址和数据映射规则。

### 自定义主题
修改各组件中的 `style jsx` 部分，自定义界面样式。

## 运维部署指南

### 1. 本地开发环境配置

#### 1.1 环境要求
- Node.js 18+
- pnpm 8+
- Java 11+ (后端服务)

#### 1.2 安装依赖
```bash
# 使用pnpm安装依赖
pnpm install
```

#### 1.3 配置环境变量
创建`.env.local`文件并配置必要的环境变量：
```bash
# 后端API地址
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# API版本
NEXT_PUBLIC_API_VERSION=v1
```

#### 1.4 启动开发服务器
```bash
# 启动前端开发服务器
pnpm dev

# 启动后端Spring Boot服务（需单独运行）
java -jar trading-backend.jar
```

#### 1.5 访问应用
前端：http://localhost:3000
后端API：http://localhost:8080

### 2. 生产部署

#### 2.1 传统部署方式

##### 2.1.1 构建项目
```bash
# 构建前端项目
pnpm build

# 构建输出位于 .next/standalone 目录
```

##### 2.1.2 部署到服务器
```bash
# 复制构建文件到服务器
scp -r .next/standalone server:/path/to/deploy
scp -r public server:/path/to/deploy
scp -r .next/static server:/path/to/deploy/.next

# 在服务器上启动应用
cd /path/to/deploy
PORT=3000 NODE_ENV=production node server.js
```

#### 2.2 Docker部署方式

##### 2.2.1 使用Dockerfile构建镜像
```bash
# 构建Docker镜像
docker build -t ai-trading-terminal .

# 运行Docker容器
docker run -d -p 3000:3000 --name ai-trading-terminal ai-trading-terminal
```

##### 2.2.2 使用docker-compose部署
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 3. Docker配置示例

#### 3.1 Dockerfile
```dockerfile
# 多阶段构建，优化镜像大小
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 使用pnpm安装依赖
RUN pnpm install

# 复制项目文件
COPY . .

# 构建项目
RUN pnpm build

# 第二阶段：运行时环境
FROM node:18-alpine AS runner

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# 设置环境变量
ENV NODE_ENV production
ENV PORT 3000

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
```

#### 3.2 docker-compose.yml
```yaml
version: '3.8'

services:
  # 前端应用
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:8080/api/v1
    depends_on:
      - redis
    restart: unless-stopped

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}

  # 后端服务（可选，如需要）
  backend:
    image: your-registry/ai-trading-backend:latest
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - SPRING_REDIS_HOST=redis
      - SPRING_REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:
    driver: local
```

### 4. 环境变量配置

| 环境变量 | 描述 | 默认值 | 示例 |
|---------|------|--------|------|
| NODE_ENV | 运行环境 | development | production |
| PORT | 应用端口 | 3000 | 3000 |
| NEXT_PUBLIC_API_URL | 后端API地址 | http://localhost:8080/api/v1 | http://api.example.com/api/v1 |
| NEXT_PUBLIC_API_VERSION | API版本 | v1 | v1 |
| REDIS_HOST | Redis地址 | localhost | redis |
| REDIS_PORT | Redis端口 | 6379 | 6379 |
| REDIS_PASSWORD | Redis密码 | 无 | your-redis-password |

### 5. 常用运维命令

#### 5.1 应用管理
```bash
# 启动应用
pnpm start

# 停止应用
pkill -f "node server.js"

# 重启应用
pkill -f "node server.js" && pnpm start
```

#### 5.2 日志查看
```bash
# 查看应用日志（Docker）
docker logs -f ai-trading-terminal

# 查看容器状态
docker-compose ps
```

#### 5.3 性能监控
```bash
# 使用top查看进程状态
top -p $(pgrep -f "node server.js")

# 查看内存使用
free -h
```

### 6. 常见问题排查

#### 6.1 构建失败
- 检查Node.js版本是否符合要求
- 清理node_modules并重新安装依赖：`pnpm install --force`

#### 6.2 应用无法启动
- 检查端口是否被占用：`lsof -i :3000`
- 检查环境变量配置是否正确
- 查看日志文件中的错误信息

#### 6.3 API请求失败
- 检查后端服务是否正常运行
- 检查API地址配置是否正确
- 检查网络连接和防火墙设置

## 联系方式

如有问题，请联系开发团队。