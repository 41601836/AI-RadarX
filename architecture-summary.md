# AI交易终端项目架构总结

## 1. 核心文件夹说明

### 1.1 app/
Next.js应用的主目录，包含路由、页面和API接口
- **api/**：API控制器接口
  - **ai-inference/**：AI推理相关接口
  - **tushare/**：Tushare数据代理接口
  - **v1/**：版本化API接口集合
- **global.css**：全局样式文件
- **layout.tsx**：应用布局组件
- **page.tsx**：主页面组件

### 1.2 components/
React组件集合
- **pages/**：页面级组件
  - Assets.tsx：资产页面
  - Dashboard.tsx：仪表盘页面
  - Market.tsx：行情页面
  - Settings.tsx：设置页面
  - Strategy.tsx：策略页面
  - Trade.tsx：交易页面
- **AISmartAnalyst.tsx**：AI智能分析师组件
- **ARadarPanel.tsx**：雷达图面板组件
- **DataHealth.tsx**：数据健康状态组件
- **IntelligenceBrief.tsx**：情报简报组件
- **MarketPulse.tsx**：市场脉搏组件
- **SmartThresholdRadar.tsx**：智能阈值雷达图
- **WADChipDistribution.tsx**：WAD筹码分布组件

### 1.3 lib/
核心库目录
- **algorithms/**：算法实现
  - chipDistribution.ts：筹码分布算法
  - intradayStrength.ts：分时强度算法
  - largeOrder.ts：大额订单算法
  - technicalIndicators.ts：技术指标算法
  - wad.ts：WAD指标算法
- **api/**：API服务层
  - **chip/**：筹码相关API
  - **common/**：通用API工具
  - **heatFlow/**：热流相关API
  - **largeOrder/**：大额订单相关API
  - **market/**：市场数据相关API
  - **publicOpinion/**：舆情相关API
  - **risk/**：风险控制相关API
  - **techIndicator/**：技术指标相关API
- **context/**：React上下文
- **store/**：状态管理

## 2. 已经实现的Controller接口路径

### 2.1 AI推理接口
- `GET /api/ai-inference/intelligence-brief` - 获取AI选股情报简报

### 2.2 Tushare代理接口
- `POST /api/tushare` - Tushare API代理

### 2.3 V1版本API

#### 2.3.1 筹码分析
- `GET /api/v1/chip/distribution` - 获取股票筹码分布数据
- `GET /api/v1/chip/trend` - 获取筹码趋势数据

#### 2.3.2 热流分析
- `GET /api/v1/heat/flow/alert/list` - 获取热流预警列表
- `GET /api/v1/heat/flow/stock/seat` - 获取股票席位热流数据

#### 2.3.3 大额订单
- `GET /api/v1/order/large/real-time` - 获取实时大额订单数据
- `GET /api/v1/order/large/trend` - 获取大额订单趋势数据

#### 2.3.4 舆情分析
- `GET /api/v1/public/opinion/list` - 获取舆情列表数据
- `GET /api/v1/public/opinion/summary` - 获取舆情摘要数据

#### 2.3.5 风险控制
- `GET /api/v1/risk/account/assessment` - 获取账户风险评估
- `GET /api/v1/risk/stop/rule/config` - 获取止损规则配置

#### 2.3.6 技术分析
- `GET /api/v1/tech/indicator/data` - 获取技术指标数据
- `GET /api/v1/tech/kline/pattern/recognize` - 识别K线模式

## 3. ChipAnalysisService核心逻辑伪代码

```typescript
// ChipAnalysisService
class ChipAnalysisService {
  // 计算筹码分布
  calculateChipDistribution(stockCode, startDate, endDate) {
    1. 获取历史成交数据
    2. 计算每日筹码分布
    3. 生成筹码分布矩阵
    4. 返回筹码分布数据
  }

  // 计算平均成本
  calculateAverageCost(chipData) {
    1. 计算总成交金额
    2. 计算总成交量
    3. 平均成本 = 总成交金额 / 总成交量
    4. 返回平均成本
  }

  // 计算筹码集中度
  calculateConcentration(chipData) {
    1. 计算HHI指数（赫芬达尔-赫希曼指数）
    2. 计算基尼系数
    3. 计算CR指标
    4. 返回综合集中度评分
  }

  // 识别筹码峰值
  identifyChipPeaks(chipData) {
    1. 使用密度聚类算法识别峰值
    2. 计算峰值强度和优势度
    3. 识别主筹和次筹峰值
    4. 返回峰值信息
  }

  // 计算支撑阻力位
  calculateSupportResistance(chipData, currentPrice) {
    1. 分析筹码密集区
    2. 计算支撑位
    3. 计算阻力位
    4. 返回支撑阻力信息
  }
}
```

## 4. RiskControlService核心逻辑伪代码

```typescript
// RiskControlService
class RiskControlService {
  // 账户风险评估
  assessAccountRisk(accountData, positions) {
    1. 计算VaR值（95%置信区间）
    2. 计算尾部风险值（CVaR）
    3. 计算夏普比率
    4. 计算最大回撤
    5. 生成风险评估报告
  }

  // 止损规则配置
  configureStopLossRule(params) {
    1. 验证参数有效性
    2. 保存止损规则配置
    3. 返回配置结果
  }

  // 持仓风险监控
  monitorPositionRisk(positions, marketData) {
    1. 检查价格是否跌破止损线
    2. 检查是否触发预警条件
    3. 计算盈亏比例
    4. 生成风险预警列表
  }

  // 模拟持仓风险
  simulatePositionRisk(simulatedPositions) {
    1. 计算模拟盈亏
    2. 评估风险等级
    3. 检查止损预警
    4. 返回模拟结果
  }

  // 风险预警处理
  handleRiskAlert(alert) {
    1. 记录预警信息
    2. 发送通知
    3. 执行相应操作（如自动止损）
    4. 返回处理结果
  }
}
```

## 5. 当前还没完成的部分

### 5.1 前端部分
- **Market页面**：行情页面的完整功能实现
- **Trade页面**：交易页面的完整功能实现
- **Strategy页面**：策略页面的完整功能实现
- **Settings页面**：设置页面的完整功能实现
- **部分组件**：如AISmartAnalyst等组件的完整功能

### 5.2 后端API
- **部分API的完整实现**：如技术指标数据接口、K线模式识别接口等
- **API文档**：完善的API文档
- **性能优化**：API接口的性能优化

### 5.3 算法部分
- **算法测试**：完善的单元测试
- **性能优化**：算法的性能优化
- **新算法开发**：更多AI分析算法的开发

### 5.4 测试部分
- **单元测试**：完善的单元测试
- **集成测试**：组件和API的集成测试
- **端到端测试**：完整的端到端测试

### 5.5 其他部分
- **部署配置**：完整的部署配置
- **监控系统**：应用性能监控系统
- **文档完善**：项目文档的完善

## 6. 技术栈

- **前端**：Next.js 14 + TypeScript
- **后端**：Java Spring Boot（代理）
- **数据来源**：Tushare、腾讯行情等
- **算法**：JavaScript/TypeScript实现的金融分析算法
- **状态管理**：React Context + Zustand
- **UI组件**：自定义组件 + 原生CSS

## 7. 项目特色

1. **前后端双轨制**：前端独立开发，后端作为数据代理
2. **AI辅助分析**：集成AI智能分析功能
3. **实时数据处理**：实时行情和交易数据处理
4. **筹码分布分析**：先进的筹码分布算法
5. **风险控制**：完善的风险评估和控制机制
6. **模块化设计**：高度模块化的代码结构
7. **可扩展性**：良好的扩展性设计