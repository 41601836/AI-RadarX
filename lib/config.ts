import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // 服务器配置
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USERNAME: process.env.DB_USERNAME || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'stock_trading_db',
  
  // Redis配置
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '2h',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  
  // 限流配置
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  
  // 日志配置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/server.log',
  
  // API配置
  API_PREFIX: '/api',
  API_VERSION: 'v1',
  
  // 缓存配置
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 默认5分钟
  CACHE_TTL_LONG: parseInt(process.env.CACHE_TTL_LONG || '3600', 10), // 默认1小时
  
  // 第三方服务配置
  TUSHARE_TOKEN: process.env.TUSHARE_TOKEN || '',
  
  // 安全配置
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your_encryption_key',
  
  // 交易相关配置
  TRADE_MIN_AMOUNT: 100, // 最小交易金额（元）
  TRADE_FEE_RATE: 0.00025, // 交易费率
  TRADE_STAMP_DUTY_RATE: 0.001, // 印花税税率
};

// 数据库连接URL
export const DB_URL = `mysql://${config.DB_USERNAME}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}?charset=utf8mb4&parseTime=true&loc=Local`;
