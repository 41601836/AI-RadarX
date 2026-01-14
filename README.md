# AI Stock Trading Software

AI-powered stock trading software with six core modules for comprehensive market analysis.

## Project Overview

This project provides a robust backend framework for AI-driven stock trading analysis, following the RESTful API design principles. It includes six core modules for different aspects of stock analysis, a unified response format, comprehensive exception handling, and utility functions for common operations.

## Directory Structure

```
├── src/
│   ├── modules/                 # Core business modules
│   │   ├── chip/               # Chip analysis module
│   │   ├── public-opinion/     # Public opinion analysis module
│   │   ├── risk/               # Risk control module
│   │   ├── heat-flow/          # Hot money flow analysis module
│   │   ├── large-order/        # Large order analysis module
│   │   └── tech/               # Technical analysis module
│   ├── common/                 # Common components
│   │   └── Response.ts         # Unified response format
│   ├── exceptions/             # Custom exception classes
│   │   ├── BaseException.ts    # Base exception
│   │   ├── HttpException.ts    # HTTP exceptions (400/500)
│   │   └── BusinessException.ts # Business exceptions (600xx)
│   ├── middleware/             # Express middleware
│   │   └── errorHandler.ts     # Global error handler
│   ├── models/                 # Data models
│   │   ├── chip.ts             # Chip module models
│   │   └── public-opinion.ts   # Public opinion module models
│   ├── utils/                  # Utility functions
│   │   └── formatters.ts       # Formatting utilities
│   ├── constants/              # Constant definitions
│   │   └── ErrorCode.ts        # Error code constants
│   ├── config/                 # Configuration files
│   └── index.ts                # Application entry point
├── package.json                # Project dependencies
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
└── .gitignore                  # Git ignore rules
```

## Core Modules

### 1. Chip Analysis
- **Controller**: `src/modules/chip/ChipController.ts`
- **Service**: `src/modules/chip/ChipService.ts`
- **Model**: `src/models/chip.ts`
- **API Path**: `/api/v1/chip/*`

#### Features
- Get chip distribution data
- Get chip trend analysis

### 2. Public Opinion Analysis
- **Controller**: `src/modules/public-opinion/PublicOpinionController.ts`
- **Service**: `src/modules/public-opinion/PublicOpinionService.ts`
- **Model**: `src/models/public-opinion.ts`
- **API Path**: `/api/v1/public-opinion/*`

#### Features
- Get public opinion summary
- Get public opinion details (paginated)

### 3. Risk Control (To be implemented)
### 4. Hot Money Flow Analysis (To be implemented)
### 5. Large Order Analysis (To be implemented)
### 6. Technical Analysis (To be implemented)

## API Design

### Response Format
All API endpoints return a unified response format:

#### Success Response
```json
{
  "code": 200,
  "msg": "success",
  "data": {},
  "requestId": "req-1234567890abcdef",
  "timestamp": 1735689600000
}
```

#### Error Response
```json
{
  "code": 400,
  "msg": "参数无效：股票代码格式错误",
  "requestId": "req-1234567890abcdef",
  "timestamp": 1735689600000
}
```

### Error Codes

| Error Code | Description |
|------------|-------------|
| 200        | Operation successful |
| 400        | Invalid/missing parameters |
| 401        | Unauthorized/Token expired |
| 403        | Permission denied |
| 404        | Resource not found |
| 429        | Too many requests |
| 500        | Internal server error |
| 503        | Service unavailable |
| 60001      | Invalid stock code format |
| 60002      | Account does not exist |
| 60003      | No hot money records |
| 60004      | Invalid large order threshold |

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- TypeScript

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
npm start
```

### Configuration

The application can be configured using environment variables:

- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: Database connection URL
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: JWT secret key

## Development Workflow

### Adding a New Module

1. Create directory structure:
```bash
mkdir -p src/modules/new-module
mkdir -p src/models
```

2. Create model file: `src/models/new-module.ts`
3. Create service file: `src/modules/new-module/NewModuleService.ts`
4. Create controller file: `src/modules/new-module/NewModuleController.ts`
5. Register routes in `src/index.ts`

### Error Handling

Use the custom exception classes for consistent error handling:

```typescript
import { InvalidStockCodeException } from '../../exceptions/BusinessException';
import { BadRequestException } from '../../exceptions/HttpException';

// Business exception
if (!validateStockCode(stockCode)) {
  throw new InvalidStockCodeException();
}

// HTTP exception  
if (!params) {
  throw new BadRequestException('Missing parameters');
}
```

### Utility Functions

The project provides utility functions for common operations:

```typescript
import { 
  formatDateTime, 
  formatDate, 
  yuanToCents, 
  centsToYuan, 
  validateStockCode 
} from '../../utils/formatters';

// Format date
const formattedDate = formatDateTime(new Date());

// Convert price units
const priceInCents = yuanToCents(8.50); // 850
const priceInYuan = centsToYuan(850); // 8.50

// Validate stock code
const isValid = validateStockCode('SH600000'); // true
```

## Testing

Run tests with Jest:
```bash
npm test
```

## Linting

Run ESLint for code quality:
```bash
npm run lint
```

## Contributing

Please follow the existing code style and commit message conventions.

## License

MIT
