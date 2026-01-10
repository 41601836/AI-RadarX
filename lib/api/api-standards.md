# API 开发规范文档

## 1. 项目结构与组织

### 1.1 目录结构

所有 API 相关代码都应放置在 `lib/api/` 目录下，按功能模块组织：

```
lib/api/
├── common/         # 通用工具和类型定义
│   ├── errors.ts   # 错误码和错误处理
│   ├── fetch.ts    # API 请求封装
│   ├── index.ts    # 统一导出
│   └── response.ts # 响应格式定义
├── chip/           # 筹码分析模块
├── publicOpinion/  # 舆情分析模块
├── risk/           # 风险控制模块
├── heatFlow/       # 游资行为分析模块
├── largeOrder/     # 大单异动分析模块
├── techIndicator/  # 技术分析模块
└── index.ts        # API 统一导出
```

### 1.2 文件命名

- 模块目录名使用小写字母和驼峰命名
- 接口定义文件使用清晰的功能描述命名（如 `distribution.ts`, `summary.ts`）
- 每个模块应有一个 `index.ts` 文件统一导出该模块的所有功能

## 2. API 函数实现标准

### 2.1 导入统一工具

所有 API 函数必须使用 `common/fetch` 中提供的统一请求函数：

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { ApiError, ErrorCode } from '../common/errors';
```

### 2.2 函数签名

- 函数名应以 `fetch` 或 `get` 开头，清晰描述功能
- 参数应使用接口定义，提高类型安全性
- 返回类型必须为 `Promise<ApiResponse<T>>`，确保统一的响应格式

```typescript
export async function fetchChipDistribution(
  params: ChipDistributionParams
): Promise<ApiResponse<ChipDistributionData>> {
  // 实现逻辑
}
```

### 2.3 参数验证

- 所有外部输入必须进行验证
- 使用 `common/errors` 中提供的错误函数抛出统一的业务错误

```typescript
// 验证股票代码格式
if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
  throw stockCodeFormatError();
}
```

### 2.4 API 请求

- 使用提供的 `apiGet`, `apiPost` 等函数发起请求
- 不要直接使用 `fetch` API
- 确保请求路径与后端 API 规范一致

```typescript
// 使用统一的 apiGet 函数
return await apiGet<ChipDistributionData>('/chip/distribution', params);
```

## 3. 错误处理

### 3.1 统一错误类

所有业务错误必须使用 `ApiError` 类，不要使用原生 `Error` 类：

```typescript
// 正确：使用统一的错误函数
throw stockCodeFormatError();

// 错误：使用原生 Error
throw new Error('股票代码格式错误');
```

### 3.2 错误码定义

- 业务错误码应定义在 `ErrorCode` 枚举中，从 60001 开始
- 每个错误码必须在 `ERROR_MESSAGES` 中定义对应的错误消息
- 应为每个业务错误创建便捷函数

```typescript
// 在 common/errors.ts 中定义
ERROR_CODE.INVALID_STOP_RULE_VALUE = 60005;

ERROR_MESSAGES[ERROR_CODE.INVALID_STOP_RULE_VALUE] = '止损/止盈值设置不合理';

export function invalidStopRuleValueError(message?: string): ApiError {
  return new ApiError(ErrorCode.INVALID_STOP_RULE_VALUE, message);
}
```

### 3.3 错误捕获与处理

- API 函数中应捕获并重新抛出错误，添加适当的日志
- 不要在 API 层静默处理错误，应将错误传递给调用者

```typescript
try {
  // API 调用逻辑
} catch (error) {
  console.error('Error fetching data:', error);
  throw error; // 重新抛出，由调用者处理
}
```

## 4. 响应格式

### 4.1 统一响应接口

所有 API 函数必须返回符合 `ApiResponse<T>` 接口的数据：

```typescript
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  requestId: string;
  timestamp: number;
}
```

### 4.2 成功响应

- 使用 `200` 作为成功响应码
- `data` 字段应包含实际业务数据
- `msg` 字段应保持简洁

```json
{
  "code": 200,
  "msg": "success",
  "data": { /* 业务数据 */ },
  "requestId": "req-1234567890abcdef",
  "timestamp": 1735689600000
}
```

### 4.3 失败响应

- 使用适当的错误码（4xx, 5xx, 600xx）
- `msg` 字段应包含详细的错误信息
- `data` 字段可选，可包含额外的错误详情

```json
{
  "code": 60001,
  "msg": "股票代码格式错误",
  "requestId": "req-1234567890abcdef",
  "timestamp": 1735689600000
}
```

## 5. 数据类型标准

### 5.1 价格处理

- 所有价格必须使用 `number` 类型，单位为「分」
- 禁止使用浮点数表示价格，避免精度问题

```typescript
// 正确：价格以分为单位
price: number; // 850 表示 8.50 元

// 错误：使用浮点数
price: number; // 8.5 存在精度问题
```

### 5.2 时间格式

- 时间字符串必须使用 `yyyy-MM-dd HH:mm:ss` 格式
- 时间戳使用 `number` 类型（毫秒级）

```typescript
// 日期时间字符串
eventTime: string; // "2026-01-04 15:30:00"

// 时间戳
timestamp: number; // 1735689000000
```

### 5.3 接口定义

- 为所有请求参数和响应数据创建 TypeScript 接口
- 接口名应清晰描述数据结构
- 为重要字段添加注释说明

```typescript
export interface ChipPriceRange {
  price: number; // 价格（分）
  chipRatio: number; // 该价格区间筹码占比（0-1）
  holderCount: number; // 该区间持仓户数（估算）
}
```

## 6. 认证与授权

### 6.1 Token 认证

- API 请求默认需要认证
- Token 自动从 localStorage 中获取并添加到请求头

```typescript
// API 请求配置
const config: ApiRequestConfig = {
  requiresAuth: true, // 默认值，可省略
  // 其他配置
};
```

### 6.2 权限控制

- 敏感接口应在后端进行权限验证
- 前端可根据需要设置不同的认证策略

## 7. 测试与调试

### 7.1 日志记录

- 在关键位置添加日志，但不要泄露敏感信息
- 使用 `console.error` 记录错误信息

### 7.2 错误回退

- 对于非关键 API，可提供合理的回退机制（如使用模拟数据）
- 回退数据也应符合统一的响应格式

```typescript
catch (error) {
  console.error('Error fetching data:', error);
  // 返回模拟数据作为后备
  return {
    code: ErrorCode.SUCCESS,
    msg: '操作成功',
    data: mockData,
    requestId: generateRequestId(),
    timestamp: Date.now()
  };
}
```

## 8. 代码审查要点

1. **API 函数是否使用统一的请求函数？**
2. **所有错误是否使用 ApiError 类？**
3. **响应格式是否符合 ApiResponse 接口？**
4. **价格是否以分为单位？**
5. **是否有适当的参数验证？**
6. **接口定义是否清晰完整？**
7. **是否有适当的错误处理和日志？**

## 9. 版本控制

- API 版本通过 URL 路径控制（如 `/api/v1/xxx`）
- 版本号统一在 `fetch.ts` 中的 `BASE_API_URL` 定义

```typescript
// BASE_API_URL 中包含版本号
export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
```

---

**注意：** 所有开发人员必须严格遵循此规范，确保 API 代码的一致性、可维护性和可靠性。如有问题或建议，请及时与架构师团队沟通。