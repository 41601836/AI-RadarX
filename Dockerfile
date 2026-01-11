# 多阶段构建：构建阶段
FROM node:18-alpine AS builder

# 设置国内npm镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 设置工作目录
WORKDIR /app

# 复制package.json和pnpm-lock.yaml（保持依赖一致性）
COPY package.json pnpm-lock.yaml ./

# 安装pnpm包管理器
RUN npm install -g pnpm

# 安装项目依赖
RUN pnpm install

# 复制项目所有文件
COPY . .

# 构建项目（使用production模式）
RUN pnpm build

# 多阶段构建：运行阶段
FROM node:18-alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非root用户并设置权限
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# 设置文件权限
RUN chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 设置环境变量
ENV NODE_ENV production
ENV PORT 3000

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]