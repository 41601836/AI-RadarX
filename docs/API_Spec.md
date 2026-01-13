# A-RadarX 3.2.0 API 规格说明

## 1. 接口概述

A-RadarX 提供 RESTful API 接口，支持多维度股票数据查询和 AI 智能分析功能。所有接口均采用 JSON 格式进行数据交互，使用标准的 HTTP 状态码表示请求结果。

### 1.1 基础信息
- **API 版本**：3.2.0
- **基础 URL**：`https://api.ardarax.com/v3`
- **请求方法**：GET/POST
- **数据格式**：JSON
- **认证方式**：API Key（Header: `Authorization: Bearer <api_key>`）

### 1.2 响应格式

```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    // 接口具体数据
  }
}
```

## 2. 错误码定义

| ErrorCode | HTTP 状态码 | 错误信息 | 处理建议 |
|-----------|-------------|----------|----------|
| 200       | 200         | success  | 请求成功 |
| 40001     | 400         | 参数错误 | 检查请求参数是否符合要求 |
| 40002     | 400         | 股票代码格式错误 | 请输入正确的股票代码（如：SH600000） |
| 40003     | 400         | 时间范围错误 | 请输入正确的时间范围参数 |
| 40101     | 401         | 未授权 | 请检查 API Key 是否正确 |
| 40102     | 401         | API Key 已过期 | 请更新 API Key |
| 40103     | 401         | 访问权限不足 | 请检查 API Key 的权限设置 |
| 40301     | 403         | 请求被禁止 | 该 API Key 已被禁用 |
| 40401     | 404         | 接口不存在 | 请检查接口路径是否正确 |
| 40402     | 404         | 股票数据不存在 | 请检查股票代码是否正确 |
| 42901     | 429         | 请求频率过高 | 请降低请求频率，遵守 rate limit 限制 |
| 50001     | 500         | 服务器内部错误 | 请稍后重试或联系技术支持 |
| 50002     | 500         | 数据库查询错误 | 请稍后重试或联系技术支持 |
| 50003     | 500         | AI 模型调用失败 | 请稍后重试或检查 AI 模型配置 |
| 50004     | 500         | 数据聚合失败 | 请稍后重试或检查数据源配置 |
| 50005     | 500         | 外部 API 调用失败 | 请稍后重试或检查外部 API 配置 |
| 50301     | 503         | 服务不可用 | 服务器正在维护中，请稍后重试 |

## 3. 接口列表

### 3.1 AI 智能分析接口

#### 3.1.1 获取 AI 智能分析结果

```
GET /api/ai/smart-analysis
```

**参数**：
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| stockCode | string | 是 | 股票代码（如：SH600000） |
| timeRange | string | 否 | 时间范围（默认：7d） |
| model | string | 否 | AI 模型类型（openai/deepseek/simulate，默认：根据环境变量） |

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "trendAnalysis": "股票处于震荡上行趋势",
    "mainIntention": "主力资金小幅流入",
    "operationRating": "hold",
    "confidenceScore": 75,
    "riskWarning": [
      "注意市场情绪变化",
      "关注主力资金流向",
      "设置止损位控制风险"
    ]
  }
}
```

#### 3.1.2 获取聚合股票数据

```
GET /api/ai/aggregated-data
```

**参数**：
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| stockCode | string | 是 | 股票代码（如：SH600000） |

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "stockCode": "SH600000",
    "stockName": "浦发银行",
    "currentPrice": 1000,
    "chipData": {
      "concentration": 0.85,
      "supportPrice": 950,
      "resistancePrice": 1050,
      "chipConcentrationScore": 85
    },
    "sentimentData": {
      "opinionScore": 72,
      "positiveRatio": 0.65,
      "hotEventsCount": 3
    },
    "heatFlowData": {
      "hotMoneyNetBuy": 5000000,
      "hotSeatsCount": 8,
      "heatScore": 70
    },
    "marketSentiment": {
      "sentimentScore": 65,
      "sentimentLevel": "neutral",
      "advanceDeclineRatio": 1.2,
      "volumeForecast": 8000
    }
  }
}
```

### 3.2 筹码分布接口

#### 3.2.1 获取筹码分布数据

```
GET /api/chip/distribution
```

**参数**：
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| stockCode | string | 是 | 股票代码（如：SH600000） |
| date | string | 否 | 日期（YYYY-MM-DD，默认：当前日期） |

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "stockCode": "SH600000",
    "stockName": "浦发银行",
    "date": "2023-01-01",
    "chipConcentration": 0.85,
    "supportPrice": 950,
    "resistancePrice": 1050,
    "chipConcentrationScore": 85
  }
}
```

### 3.3 舆情分析接口

#### 3.3.1 获取舆情摘要

```
GET /api/sentiment/summary
```

**参数**：
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| stockCode | string | 是 | 股票代码（如：SH600000） |
| timeRange | string | 否 | 时间范围（1d/7d/30d，默认：7d） |

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "stockCode": "SH600000",
    "stockName": "浦发银行",
    "opinionScore": 72,
    "positiveRatio": 0.65,
    "negativeRatio": 0.25,
    "neutralRatio": 0.1,
    "hotEvents": [
      {
        "eventId": "event-001",
        "title": "浦发银行发布2022年财报",
        "sentiment": "positive",
        "publishTime": "2023-01-01 10:00:00"
      }
    ]
  }
}
```

### 3.4 游资流向接口

#### 3.4.1 获取游资席位数据

```
GET /api/heat-flow/stock-seat
```

**参数**：
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| stockCode | string | 是 | 股票代码（如：SH600000） |
| date | string | 否 | 日期（YYYY-MM-DD，默认：当前日期） |

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "stockCode": "SH600000",
    "stockName": "浦发银行",
    "date": "2023-01-01",
    "totalNetBuy": 5000000,
    "totalNetSell": 3000000,
    "hotSeatList": [
      {
        "seatName": "游资席位1",
        "netBuy": 2000000,
        "buyAmount": 3000000,
        "sellAmount": 1000000
      }
    ]
  }
}
```

### 3.5 市场情绪接口

#### 3.5.1 获取全市场情绪

```
GET /api/market/sentiment
```

**参数**：无

**响应示例**：
```json
{
  "code": 200,
  "msg": "success",
  "requestId": "uuid-v4-string",
  "timestamp": 1620000000000,
  "data": {
    "sentimentScore": 65,
    "sentimentLevel": "neutral",
    "advanceDeclineRatio": 1.2,
    "volumeForecast": 8000,
    "turnoverRate": 0.8
  }
}
```

## 4. 认证与授权

### 4.1 API Key 申请

1. 登录 A-RadarX 官方网站
2. 进入开发者中心
3. 创建应用并获取 API Key
4. 配置 API Key 权限

### 4.2 使用方式

在请求头中添加 `Authorization` 字段：

```
Authorization: Bearer <your_api_key>
```

### 4.3 权限管理

| 权限类型 | 描述 |
|----------|------|
| 基础权限 | 可以调用基础数据接口 |
| AI 分析权限 | 可以调用 AI 智能分析接口 |
| 高级权限 | 可以调用所有接口，包括实时数据推送 |

## 5. 速率限制

为了保证服务的稳定性，A-RadarX 对 API 请求进行速率限制：

| 权限级别 | 请求限制 |
|----------|----------|
| 免费用户 | 100 次/天，10 次/分钟 |
| 基础用户 | 1000 次/天，50 次/分钟 |
| 高级用户 | 10000 次/天，200 次/分钟 |
| 企业用户 | 无限制（需特殊申请） |

**速率限制响应头**：
- `X-RateLimit-Limit`: 每分钟请求限制数
- `X-RateLimit-Remaining`: 剩余请求次数
- `X-RateLimit-Reset`: 重置时间（Unix 时间戳）

## 6. 数据更新频率

| 数据类型 | 更新频率 |
|----------|----------|
| 行情数据 | 实时（延迟≤5秒） |
| 筹码分布数据 | 每日收盘后 |
| 舆情数据 | 实时更新 |
| 游资流向数据 | T+1（次日更新） |
| 市场情绪数据 | 每分钟更新 |
| AI 分析结果 | 实时生成 |

## 7. API 版本管理

A-RadarX 采用语义化版本管理：
- **主版本**：不兼容的 API 变更
- **次版本**：向下兼容的功能新增
- **修订版本**：向下兼容的问题修复

### 7.1 版本升级策略

1. 发布新版本时，旧版本至少保留 6 个月
2. 旧版本将在停止服务前 3 个月发布通知
3. 建议开发者使用最新版本的 API

## 8. 最佳实践

### 8.1 错误处理

1. 检查 HTTP 状态码和错误码
2. 根据错误码采取相应的处理措施
3. 实现重试机制（针对 5xx 错误）

### 8.2 性能优化

1. 使用缓存减少 API 请求
2. 合理设置请求频率，避免触发速率限制
3. 只请求需要的数据字段

### 8.3 安全建议

1. 不要在客户端代码中硬编码 API Key
2. 定期更新 API Key
3. 使用 HTTPS 加密传输
4. 限制 API Key 的权限范围

## 9. 变更日志

### 3.2.0（当前版本）
- 新增 AI 会诊功能
- 新增 AI 自省机制
- 支持多模型融合分析
- 优化 API 响应速度
- 完善错误码体系

### 3.1.0
- 新增市场情绪分析接口
- 优化筹码分布算法
- 增加数据缓存机制

### 3.0.0
- 重构 API 架构
- 支持 API Key 认证
- 新增游资流向分析功能

## 10. 联系与支持

- **官方网站**：https://www.ardarax.com
- **开发者中心**：https://developer.ardarax.com
- **技术支持**：support@ardarax.com
- **API 文档**：https://docs.ardarax.com
