# AI交易终端开发指南

## 项目概述
AI交易终端是一个基于React和Next.js开发的智能股票交易分析系统，提供筹码分析、舆情分析、游资行为分析、大单异动分析、风险控制和技术指标分析等六大核心功能模块。

## 技术栈
- **前端框架**: Next.js 13+ (App Router)
- **编程语言**: TypeScript
- **状态管理**: React Context API
- **UI设计**: 自定义CSS (Tailwind CSS可选)
- **API请求**: 统一封装的Fetch API
- **数据可视化**: 自定义图表组件 (可集成Chart.js等)
- **后端服务**: RESTful API (当前使用Mock数据)

## 环境要求
- **Node.js**: v18.x 或更高版本
- **npm**: v9.x 或更高版本
- **pnpm**: v8.x 或更高版本 (推荐)
- **Git**: 版本控制工具

## 安装步骤

### 1. 克隆仓库
```bash
git clone https://github.com/your-repo/ai-trading-terminal.git
cd ai-trading-terminal
```

### 2. 安装依赖

#### 使用pnpm (推荐)
```bash
pnpm install
```

#### 使用npm
```bash
npm install
```

### 3. 配置环境变量

创建`.env.local`文件，配置必要的环境变量：

```bash
# 复制示例环境变量文件
cp .env.example .env.local
```

编辑`.env.local`文件，设置以下环境变量：

```env
# 后端API配置
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_API_VERSION=v1

# 是否使用Mock数据（开发环境推荐使用true）
NEXT_PUBLIC_API_MOCK=true

# Tushare Token配置（用于真实数据获取）
NEXT_PUBLIC_TUSHARE_TOKEN=your_tushare_token_here

# 认证配置（可选）
NEXT_PUBLIC_AUTH_ENABLED=false
NEXT_PUBLIC_AUTH_URL=http://localhost:8080/auth
```

### 4. Token配置

#### Tushare Token获取
1. 访问 [Tushare官网](https://tushare.pro/register?reg=271628) 注册账号
2. 登录后，在个人中心 -> 接口Token中获取Token
3. 将Token填入`.env.local`文件中的`NEXT_PUBLIC_TUSHARE_TOKEN`字段

#### 认证Token配置（可选）
如果启用了认证功能，需要配置：
1. 在`NEXT_PUBLIC_AUTH_ENABLED`设置为`true`
2. 配置`NEXT_PUBLIC_AUTH_URL`为认证服务地址
3. 登录后，Token会自动保存到浏览器的localStorage中

## 本地启动

### 开发模式

#### 使用pnpm
```bash
pnpm dev
```

#### 使用npm
```bash
npm run dev
```

启动后，访问 `http://localhost:3000` 查看应用

### 生产模式

#### 构建项目
```bash
# 使用pnpm
pnpm build

# 使用npm
npm run build
```

#### 启动生产服务器
```bash
# 使用pnpm
pnpm start

# 使用npm
npm start
```

## 开发流程

### 代码结构
```
ai-trading-terminal/
├── app/                  # Next.js 13 App Router
│   ├── layout.tsx        # 全局布局
│   └── page.tsx          # 主页面
├── components/           # React组件
│   ├── ErrorBoundary.tsx # 错误边界组件
│   ├── SearchComponent.tsx # 搜索组件
│   ├── WADChipDistribution.tsx # 筹码分布组件
│   └── ...
├── lib/                  # 工具库
│   ├── algorithms/       # 算法实现
│   ├── api/              # API接口封装
│   │   ├── chip/         # 筹码分析API
│   │   ├── publicOpinion/ # 舆情分析API
│   │   ├── heatFlow/     # 游资行为分析API
│   │   ├── largeOrder/   # 大单异动分析API
│   │   ├── risk/         # 风险控制API
│   │   ├── techIndicator/ # 技术指标分析API
│   │   └── common/       # 通用API工具
│   └── context/          # React Context
├── public/               # 静态资源
├── styles/               # 全局样式
├── next.config.js        # Next.js配置
├── tsconfig.json         # TypeScript配置
└── package.json          # 项目依赖
```

### 新增功能模块

1. **创建API接口**
   - 在`lib/api/`目录下创建新模块目录
   - 实现接口函数和Mock数据生成器
   - 遵循统一的API响应格式

2. **创建React组件**
   - 在`components/`目录下创建新组件
   - 使用`useStockContext`获取当前股票
   - 使用`ErrorBoundary`包裹组件
   - 实现数据获取和渲染逻辑

3. **更新页面布局**
   - 在`app/page.tsx`中添加新组件
   - 配置响应式布局

### 代码规范

- 使用TypeScript进行类型定义
- 遵循React Hooks最佳实践
- 实现组件的错误边界处理
- 保持代码风格一致（使用ESLint和Prettier）

## 测试

### 单元测试
```bash
# 使用pnpm
pnpm test

# 使用npm
npm test
```

### ESLint检查
```bash
# 使用pnpm
pnpm lint

# 使用npm
npm run lint
```

### TypeScript类型检查
```bash
# 使用pnpm
pnpm typecheck

# 使用npm
npm run typecheck
```

## 构建与部署

### 构建优化
- 项目已配置自动优化：
  - 代码分割
  - 图片优化（支持WebP和AVIF格式）
  - 字体优化
  - 移除生产环境的console.log
  - 静态资源缓存策略

### 部署方式

#### Vercel部署
1. 访问 [Vercel](https://vercel.com/) 注册账号
2. 连接GitHub仓库
3. 配置环境变量
4. 点击部署

#### Docker部署
```bash
# 构建Docker镜像
docker build -t ai-trading-terminal .

# 运行Docker容器
docker run -p 3000:3000 ai-trading-terminal
```

## 常见问题

### 1. Mock数据不生效
确保`.env.local`文件中设置了`NEXT_PUBLIC_API_MOCK=true`

### 2. Tushare数据获取失败
- 检查Tushare Token是否正确配置
- 确保网络连接正常
- 检查Tushare API限制（每分钟请求次数）

### 3. 构建失败
- 检查Node.js版本是否符合要求
- 清除缓存后重新安装依赖：
  ```bash
  pnpm cache clean
  pnpm install
  ```

### 4. 页面渲染错误
- 使用浏览器开发者工具查看控制台错误
- 检查组件的错误边界处理
- 确保接口响应格式正确

## 开发资源

### API文档
- [项目API规范](./API_SPEC.json)
- [Tushare API文档](https://tushare.pro/document/2)

### 设计规范
- [组件设计规范](./COMPONENT_GUIDE.md)
- [颜色方案](./COLOR_SCHEME.md)

### 开发工具
- [VS Code配置](./VSCODE_SETTINGS.md)
- [Chrome开发者工具技巧](./CHROME_DEVTOOLS.md)

## 联系我们
- **技术支持**: tech-support@ai-trading-terminal.com
- **GitHub Issues**: https://github.com/your-repo/ai-trading-terminal/issues
- **开发交流群**: [Slack/WeChat群组链接]

---

**版本**: v1.0.0  
**最后更新**: 2026-01-10