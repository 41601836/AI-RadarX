# A-RadarX 3.2.0 操作指南

## 1. 系统概述

A-RadarX 是一款基于人工智能的股票智能分析系统，通过整合多维度市场数据，为投资者提供精准的股票分析和投资建议。3.2.0 版本引入了 AI 会诊与自省机制，实现了更智能、更可靠的投资决策支持。

## 2. 系统要求

### 2.1 硬件要求
- **CPU**: 至少 4 核处理器，推荐 8 核或以上
- **内存**: 至少 16GB RAM，推荐 32GB 或以上
- **磁盘**: 至少 100GB 可用空间，推荐 SSD
- **网络**: 稳定的网络连接，带宽至少 10Mbps

### 2.2 软件要求
- **操作系统**: Linux (CentOS 7.6+ / Ubuntu 18.04+)
- **Docker**: 20.10.0+ (用于容器化部署)
- **Docker Compose**: 1.29.0+ (用于多容器管理)
- **Node.js**: 16.0.0+ (用于源码部署)
- **npm**: 8.0.0+ (用于源码部署)

## 3. 安装与部署

### 3.1 Docker 部署 (推荐)

Docker 部署是最简单、最快捷的部署方式，推荐使用。

#### 3.1.1 准备工作

1. 确保已安装 Docker 和 Docker Compose
2. 下载 A-RadarX 3.2.0 的 Docker 镜像
3. 准备配置文件

#### 3.1.2 Docker 镜像获取

```bash
# 拉取 A-RadarX 镜像
docker pull aradarax/aradarax:3.2.0

# 拉取依赖服务镜像
docker pull redis:6.2
docker pull postgres:14
docker pull influxdb:2.0
docker pull mongo:5.0
```

#### 3.1.3 Docker Compose 配置

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  # A-RadarX 主服务
  aradarax:
    image: aradarax/aradarax:3.2.0
    container_name: aradarax
    restart: always
    ports:
      - "3000:3000"  # Web 端口
      - "3001:3001"  # API 端口
    environment:
      - NODE_ENV=production
      - PORT=3000
      - API_PORT=3001
      - REDIS_URL=redis://redis:6379
      - POSTGRES_URL=postgresql://aradarax:password@postgres:5432/aradarax
      - INFLUXDB_URL=http://influxdb:8086
      - MONGODB_URL=mongodb://mongo:27017/aradarax
      - AI_PROVIDER=simulate  # 可选: openai, deepseek, simulate
      - AI_API_KEY=your_api_key_here
      - AI_BASE_URL=https://api.openai.com/v1  # 或 https://api.deepseek.com/v1
      - AI_MODEL=gpt-4o-mini  # 或 deepseek-chat
    depends_on:
      - redis
      - postgres
      - influxdb
      - mongo
    volumes:
      - ./logs:/app/logs

  # Redis 服务
  redis:
    image: redis:6.2
    container_name: aradarax-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - ./redis-data:/data

  # PostgreSQL 服务
  postgres:
    image: postgres:14
    container_name: aradarax-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=aradarax
      - POSTGRES_USER=aradarax
      - POSTGRES_PASSWORD=password
    volumes:
      - ./postgres-data:/var/lib/postgresql/data

  # InfluxDB 服务
  influxdb:
    image: influxdb:2.0
    container_name: aradarax-influxdb
    restart: always
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=aradarax
      - DOCKER_INFLUXDB_INIT_PASSWORD=password
      - DOCKER_INFLUXDB_INIT_ORG=aradarax-org
      - DOCKER_INFLUXDB_INIT_BUCKET=aradarax-bucket
    volumes:
      - ./influxdb-data:/var/lib/influxdb2

  # MongoDB 服务
  mongo:
    image: mongo:5.0
    container_name: aradarax-mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - ./mongo-data:/data/db
```

#### 3.1.4 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 3.1.5 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 3.2 源码部署

如果需要自定义部署或二次开发，可以选择源码部署方式。

#### 3.2.1 准备工作

1. 安装 Node.js 和 npm
2. 安装依赖服务：Redis、PostgreSQL、InfluxDB、MongoDB
3. 克隆 A-RadarX 源码

#### 3.2.2 克隆源码

```bash
git clone https://github.com/aradarax/aradarax.git
cd aradarax
npm install
```

#### 3.2.3 配置环境变量

创建 `.env` 文件：

```env
# 基础配置
NODE_ENV=production
PORT=3000
API_PORT=3001

# Redis 配置
REDIS_URL=redis://localhost:6379

# PostgreSQL 配置
POSTGRES_URL=postgresql://aradarax:password@localhost:5432/aradarax

# InfluxDB 配置
INFLUXDB_URL=http://localhost:8086

# MongoDB 配置
MONGODB_URL=mongodb://localhost:27017/aradarax

# AI 模型配置
AI_PROVIDER=simulate  # 可选: openai, deepseek, simulate
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1  # 或 https://api.deepseek.com/v1
AI_MODEL=gpt-4o-mini  # 或 deepseek-chat

# 日志配置
LOG_LEVEL=info
LOG_PATH=./logs
```

#### 3.2.4 构建与启动

```bash
# 构建项目
npm run build

# 启动服务
npm run start

# 或使用 PM2 管理
npm install -g pm2
npm run build
npm run start:pm2
```

#### 3.2.5 停止服务

```bash
# 停止服务
npm run stop

# 或使用 PM2 停止
npm run stop:pm2
```

## 4. 系统配置

### 4.1 环境变量配置

A-RadarX 支持通过环境变量进行配置，主要配置项如下：

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | Web 服务端口 | 3000 |
| API_PORT | API 服务端口 | 3001 |
| REDIS_URL | Redis 连接 URL | redis://localhost:6379 |
| POSTGRES_URL | PostgreSQL 连接 URL | postgresql://localhost:5432/aradarax |
| INFLUXDB_URL | InfluxDB 连接 URL | http://localhost:8086 |
| MONGODB_URL | MongoDB 连接 URL | mongodb://localhost:27017/aradarax |
| AI_PROVIDER | AI 模型提供商 | simulate |
| AI_API_KEY | AI 模型 API Key | - |
| AI_BASE_URL | AI 模型 API 基础 URL | https://api.openai.com/v1 |
| AI_MODEL | AI 模型名称 | gpt-4o-mini |
| LOG_LEVEL | 日志级别 | info |
| LOG_PATH | 日志路径 | ./logs |

### 4.2 AI 模型配置

A-RadarX 支持配置不同的 AI 模型提供商：

#### 4.2.1 OpenAI 配置

```env
AI_PROVIDER=openai
AI_API_KEY=your_openai_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini  # 或 gpt-4, gpt-3.5-turbo
```

#### 4.2.2 DeepSeek 配置

```env
AI_PROVIDER=deepseek
AI_API_KEY=your_deepseek_api_key
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat  # 或 deepseek-coder
```

#### 4.2.3 模拟模式

```env
AI_PROVIDER=simulate
```

模拟模式不需要 API Key，使用内置的模拟数据进行分析。

## 5. 系统使用

### 5.1 Web 界面访问

打开浏览器，访问 `http://your_server_ip:3000`，即可进入 A-RadarX 的 Web 界面。

#### 5.1.1 登录

使用默认账号密码登录系统：
- **用户名**: admin
- **密码**: admin123

首次登录后请及时修改密码。

#### 5.1.2 主界面

主界面包含以下功能模块：
- **股票分析**: 股票实时分析、历史数据分析
- **市场监控**: 全市场情绪监控、热点板块分析
- **投资组合**: 投资组合管理、收益分析
- **AI 会诊**: 多模型 AI 分析、智能投资建议
- **系统设置**: 系统配置、用户管理、权限管理

### 5.2 API 接口调用

A-RadarX 提供 RESTful API 接口，可以通过 API 进行数据查询和分析。

#### 5.2.1 API 基础信息

- **基础 URL**: `http://your_server_ip:3001/api`
- **认证方式**: API Key (Header: `Authorization: Bearer <api_key>`)
- **数据格式**: JSON

#### 5.2.2 示例调用

```bash
# 获取 AI 智能分析结果
curl -X GET "http://your_server_ip:3001/api/ai/smart-analysis?stockCode=SH600000" \
  -H "Authorization: Bearer your_api_key"
```

### 5.3 命令行工具

A-RadarX 提供命令行工具，可以通过命令行进行系统管理和数据操作。

#### 5.3.1 安装命令行工具

```bash
npm install -g aradarax-cli
```

#### 5.3.2 常用命令

```bash
# 查看系统状态
aradarax status

# 重启服务
aradarax restart

# 查看日志
aradarax logs

# 执行数据同步
aradarax sync-data

# 执行 AI 模型训练
aradarax train-model
```

## 6. 系统维护

### 6.1 日志管理

A-RadarX 的日志默认存储在 `./logs` 目录下，包含以下日志文件：

- **app.log**: 应用程序日志
- **api.log**: API 服务日志
- **ai.log**: AI 模型调用日志
- **error.log**: 错误日志

#### 6.1.1 查看日志

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

#### 6.1.2 日志清理

```bash
# 清理 7 天前的日志
find logs -name "*.log" -mtime +7 -delete
```

### 6.2 数据备份与恢复

#### 6.2.1 数据备份

```bash
# 备份 PostgreSQL 数据
docker exec -t aradarax-postgres pg_dumpall -c -U aradarax > aradarax_backup_$(date +%Y%m%d).sql

# 备份 MongoDB 数据
docker exec -t aradarax-mongo mongodump --db aradarax --archive > aradarax_mongo_backup_$(date +%Y%m%d).gz

# 备份 Redis 数据
docker exec -t aradarax-redis redis-cli bgsave
```

#### 6.2.2 数据恢复

```bash
# 恢复 PostgreSQL 数据
docker exec -i aradarax-postgres psql -U aradarax -d aradarax < aradarax_backup_20230101.sql

# 恢复 MongoDB 数据
docker exec -i aradarax-mongo mongorestore --db aradarax --archive < aradarax_mongo_backup_20230101.gz

# 恢复 Redis 数据
# 将备份文件复制到 Redis 容器中
# docker cp dump.rdb aradarax-redis:/data/
# docker restart aradarax-redis
```

### 6.3 系统升级

#### 6.3.1 Docker 升级

```bash
# 停止并删除旧容器
docker-compose down

# 拉取最新镜像
docker pull aradarax/aradarax:3.2.0

# 启动新容器
docker-compose up -d
```

#### 6.3.2 源码升级

```bash
# 拉取最新代码
git pull origin master

# 安装依赖
npm install

# 构建项目
npm run build

# 重启服务
npm run restart
```

### 6.4 性能优化

#### 6.4.1 内存优化

```bash
# 调整 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"  # 设置为 4GB
npm run start
```

#### 6.4.2 数据库优化

```bash
# PostgreSQL 优化
# 修改 postgresql.conf 文件
shared_buffers = 2GB
work_mem = 64MB
maintenance_work_mem = 256MB
random_page_cost = 1.1

# Redis 优化
# 修改 redis.conf 文件
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## 7. 故障排查

### 7.1 常见问题

#### 7.1.1 服务无法启动

**问题描述**: 服务启动失败，查看日志显示端口被占用。

**解决方案**:

```bash
# 检查端口占用情况
lsof -i :3000
lsof -i :3001

# 或使用 netstat
netstat -tlnp | grep 3000
netstat -tlnp | grep 3001

# 终止占用端口的进程
kill -9 <pid>

# 或修改服务端口
# 在 .env 文件中修改 PORT 和 API_PORT
```

#### 7.1.2 AI 模型调用失败

**问题描述**: AI 模型调用失败，错误信息 "AI model call failed"。

**解决方案**:

```bash
# 检查 AI 模型配置
# 确保 AI_PROVIDER、AI_API_KEY、AI_BASE_URL、AI_MODEL 配置正确

# 检查网络连接
ping api.openai.com  # 或 api.deepseek.com

# 检查 API Key 有效性
# 登录 OpenAI/DeepSeek 官网确认 API Key 是否有效
```

#### 7.1.3 数据库连接失败

**问题描述**: 数据库连接失败，错误信息 "Database connection failed"。

**解决方案**:

```bash
# 检查数据库服务状态
# PostgreSQL
docker-compose ps postgres
# Redis
docker-compose ps redis
# MongoDB
docker-compose ps mongo
# InfluxDB
docker-compose ps influxdb

# 检查数据库连接配置
# 确保 POSTGRES_URL、REDIS_URL、MONGODB_URL、INFLUXDB_URL 配置正确

# 检查数据库用户权限
# 确保数据库用户有足够的权限
```

### 7.2 技术支持

如果遇到无法解决的问题，可以通过以下方式获取技术支持：

- **官方文档**: https://docs.ardarax.com
- **GitHub Issues**: https://github.com/aradarax/aradarax/issues
- **技术支持邮箱**: support@ardarax.com
- **在线客服**: https://www.ardarax.com/support
- **社区论坛**: https://forum.ardarax.com

## 8. 安全管理

### 8.1 用户与权限管理

A-RadarX 支持多级用户权限管理，包括：

- **超级管理员**: 所有权限
- **管理员**: 系统管理、用户管理、权限管理
- **分析师**: 股票分析、市场监控、AI 会诊
- **普通用户**: 股票分析、投资组合管理

### 8.2 数据安全

- **数据加密**: 敏感数据使用 AES-256 加密存储
- **传输加密**: 使用 HTTPS 加密传输数据
- **访问控制**: 基于角色的访问控制 (RBAC)
- **数据备份**: 定期备份数据，确保数据安全

### 8.3 API 安全

- **API Key 认证**: 使用 API Key 进行认证
- **速率限制**: 对 API 请求进行速率限制
- **参数验证**: 对 API 请求参数进行严格验证
- **错误处理**: 安全的错误处理，不泄露敏感信息

## 9. 附录

### 9.1 网络拓扑

```
                  +-------------------+
                  |      用户浏览器      |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |      负载均衡器      |
                  +---------+---------+
                            |
          +----------------+----------------+
          |                                 |
          v                                 v
+-------------------+           +-------------------+
|    Web 服务器      |           |    API 服务器      |
+---------+---------+           +---------+---------+
          |                                 |
          v                                 v
+-------------------+           +-------------------+
|    应用服务        |           |    AI 服务         |
+---------+---------+           +---------+---------+
          |                                 |
          +---------------------------------+
                            |
          +----------------+----------------+
          |                                 |
          v                                 v
+-------------------+           +-------------------+
|    数据服务        |           |    分析服务        |
+---------+---------+           +---------+---------+
          |                                 |
          +---------------------------------+
                            |
          +----------------+----------------+
          |                                 |
          v                                 v
+-------------------+           +-------------------+
|    Redis 缓存     |           |    PostgreSQL     |
+---------+---------+           +---------+---------+
          |                                 |
          +---------------------------------+
                            |
          +----------------+----------------+
          |                                 |
          v                                 v
+-------------------+           +-------------------+
|    InfluxDB       |           |    MongoDB        |
+-------------------+           +-------------------+
```

### 9.2 Docker 命令参考

```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs -f

# 进入容器
docker-compose exec aradarax bash

# 重启容器
docker-compose restart

# 停止容器
docker-compose stop

# 删除容器
docker-compose rm
```

### 9.3 系统监控指标

| 指标 | 描述 | 正常范围 |
|------|------|----------|
| CPU 使用率 | CPU 使用率 | < 80% |
| 内存使用率 | 内存使用率 | < 80% |
| 磁盘使用率 | 磁盘使用率 | < 80% |
| 网络带宽 | 网络带宽使用情况 | < 80% |
| API 响应时间 | API 请求响应时间 | < 1s |
| AI 模型调用成功率 | AI 模型调用成功率 | > 95% |
| 数据库连接数 | 数据库活跃连接数 | < 100 |

### 9.4 版本历史

| 版本 | 发布日期 | 主要功能 |
|------|----------|----------|
| 3.2.0 | 2023-01-01 | 新增 AI 会诊与自省机制，权重自适应算法 |
| 3.1.0 | 2022-10-01 | 新增市场情绪分析接口，优化筹码分布算法 |
| 3.0.0 | 2022-07-01 | 重构 API 架构，支持 API Key 认证 |
| 2.5.0 | 2022-04-01 | 新增游资流向分析功能，优化 UI 界面 |
| 2.0.0 | 2022-01-01 | 新增 AI 智能分析功能，支持多维度数据整合 |
