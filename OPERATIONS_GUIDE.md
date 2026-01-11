# 常用运维命令集合

## 1. 本地开发环境命令

### 1.1 依赖管理
```bash
# 安装依赖
pnpm install

# 安装特定依赖
pnpm add <package-name>

# 安装开发依赖
pnpm add -D <package-name>

# 更新依赖
pnpm update

# 清理依赖
pnpm install --force
```

### 1.2 开发服务器
```bash
# 启动开发服务器
pnpm dev

# 指定端口启动
pnpm dev --port 3001

# 以生产模式运行开发服务器
NODE_ENV=production pnpm dev
```

### 1.3 构建和测试
```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start

# 运行测试
pnpm test

# 运行特定测试文件
pnpm test <test-file-path>
```

## 2. Docker容器管理

### 2.1 镜像管理
```bash
# 构建Docker镜像
docker build -t ai-trading-terminal .

# 查看本地镜像
docker images

# 删除镜像
docker rmi ai-trading-terminal

# 清理未使用的镜像
docker image prune
```

### 2.2 容器管理
```bash
# 运行容器
docker run -d -p 3000:3000 --name ai-trading-terminal ai-trading-terminal

# 运行容器（挂载数据卷）
docker run -d -p 3000:3000 -v redis_data:/data --name ai-trading-terminal ai-trading-terminal

# 运行容器（设置环境变量）
docker run -d -p 3000:3000 -e NODE_ENV=production -e REDIS_PASSWORD=secret --name ai-trading-terminal ai-trading-terminal

# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 启动容器
docker start ai-trading-terminal

# 停止容器
docker stop ai-trading-terminal

# 重启容器
docker restart ai-trading-terminal

# 删除容器
docker rm ai-trading-terminal

# 进入容器
docker exec -it ai-trading-terminal sh
```

### 2.3 日志管理
```bash
# 查看容器日志
docker logs ai-trading-terminal

# 实时查看日志
docker logs -f ai-trading-terminal

# 查看最新日志
docker logs -n 100 ai-trading-terminal

# 清理所有未使用的资源
docker system prune -a
```

## 3. Docker Compose管理

### 3.1 服务管理
```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d frontend

# 停止所有服务
docker-compose down

# 停止特定服务
docker-compose stop frontend

# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart frontend
```

### 3.2 状态和日志
```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs

# 实时查看特定服务日志
docker-compose logs -f frontend

# 查看服务资源使用情况
docker-compose top
```

### 3.3 构建和更新
```bash
# 构建服务镜像
docker-compose build

# 构建特定服务镜像
docker-compose build frontend

# 更新服务（拉取最新镜像并重启）
docker-compose pull && docker-compose up -d
```

## 4. 应用监控和日志

### 4.1 系统资源监控
```bash
# 查看系统资源使用情况
top

# 查看内存使用情况
free -h

# 查看磁盘使用情况
df -h

# 查看网络连接
netstat -tuln
```

### 4.2 应用性能监控
```bash
# 查看Node.js进程状态
ps aux | grep node

# 使用top监控特定进程
top -p $(pgrep -f "node server.js")

# 查看应用堆内存使用
node --inspect server.js
```

### 4.3 日志分析
```bash
# 搜索日志中的关键字
docker logs ai-trading-terminal | grep "ERROR"

# 查看特定时间范围内的日志
docker logs ai-trading-terminal | grep "2024-01-01"

# 统计日志中的错误数量
docker logs ai-trading-terminal | grep -c "ERROR"
```

## 5. 服务器管理

### 5.1 文件传输
```bash
# 上传文件到服务器
scp <local-file> user@server:/path/to/destination

# 下载文件到本地
scp user@server:/path/to/file <local-destination>

# 上传目录到服务器
scp -r <local-directory> user@server:/path/to/destination
```

### 5.2 远程操作
```bash
# SSH连接服务器
ssh user@server

# 在远程服务器上执行命令
ssh user@server "ls -la"

# 端口转发（本地端口映射到远程端口）
ssh -L 3000:localhost:3000 user@server
```

### 5.3 系统维护
```bash
# 检查系统负载
uptime

# 查看系统日志
tail -f /var/log/syslog

# 检查系统更新
apt update

# 安装系统更新
apt upgrade -y
```

## 6. 故障排查

### 6.1 应用无法启动
```bash
# 检查端口是否被占用
lsof -i :3000

# 检查环境变量配置
printenv | grep NODE_ENV

# 查看应用启动日志
docker logs -n 200 ai-trading-terminal
```

### 6.2 数据库连接问题
```bash
# 测试Redis连接
docker exec -it redis redis-cli -a <password> ping

# 查看Redis状态
docker exec -it redis redis-cli -a <password> info

# 测试数据库连接
telnet <db-host> <db-port>
```

### 6.3 网络问题
```bash
# 检查网络连通性
ping <host>

# 测试端口连通性
nc -zv <host> <port>

# 查看Docker网络
docker network ls

# 检查容器网络
docker inspect ai-trading-terminal | grep Network
```

## 7. 部署和发布

### 7.1 传统部署
```bash
# 构建项目
pnpm build

# 压缩构建文件
tar -czvf build.tar.gz .next/standalone public .next/static

# 上传到服务器
scp build.tar.gz user@server:/path/to/deploy

# 在服务器上解压
ssh user@server "cd /path/to/deploy && tar -xzvf build.tar.gz"

# 启动应用
ssh user@server "cd /path/to/deploy && PORT=3000 NODE_ENV=production node server.js"
```

### 7.2 Docker部署
```bash
# 构建镜像并推送
docker build -t ai-trading-terminal .
docker tag ai-trading-terminal registry.example.com/ai-trading-terminal
docker push registry.example.com/ai-trading-terminal

# 在服务器上拉取并运行
ssh user@server "docker pull registry.example.com/ai-trading-terminal && docker run -d -p 3000:3000 --name ai-trading-terminal registry.example.com/ai-trading-terminal"
```

## 8. 安全管理

### 8.1 密码和密钥管理
```bash
# 生成随机密码
openssl rand -base64 32

# 加密敏感文件
openssl enc -aes-256-cbc -salt -in .env -out .env.enc

# 解密敏感文件
openssl enc -d -aes-256-cbc -in .env.enc -out .env
```

### 8.2 权限管理
```bash
# 修改文件权限
chmod 600 .env

# 修改目录权限
chmod 755 /path/to/directory

# 更改文件所有者
chown -R user:group /path/to/directory
```

## 9. 备份和恢复

### 9.1 数据备份
```bash
# 备份Redis数据
docker exec -it redis redis-cli -a <password> SAVE
scp user@server:/path/to/redis/dump.rdb <local-backup-path>

# 备份配置文件
cp -r ./config ./config_backup
```

### 9.2 数据恢复
```bash
# 恢复Redis数据
scp <local-backup-path>/dump.rdb user@server:/path/to/redis/
ssh user@server "docker restart redis"

# 恢复配置文件
cp -r ./config_backup/* ./config
```

---

**注意：** 使用命令时请根据实际环境和需求调整参数，如端口号、密码、文件路径等。