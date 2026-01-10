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

## 联系方式

如有问题，请联系开发团队。