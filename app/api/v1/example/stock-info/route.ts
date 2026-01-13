import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { badRequestError, stockCodeFormatError } from '@/lib/api/common/errors';
import { successResponse } from '@/lib/api/common/response';
import { isValidStockCode } from '@/lib/api/common/utils';

// 股票基本信息接口
export interface StockInfo {
  stockCode: string;
  stockName: string;
  market: 'SH' | 'SZ';
  industry: string;
  totalMarketValue: number; // 总市值（分）
  peRatio: number; // 市盈率
  pbRatio: number; // 市净率
  createDate: string; // 上市日期
  updateTime: string; // 更新时间
}

// 行业列表
const INDUSTRIES = ['银行', '证券', '保险', '科技', '医药', '消费', '房地产', '汽车', '化工', '能源'];

// 模拟股票名称映射
const STOCK_NAME_MAP: Record<string, string> = {
  'SH600000': '浦发银行',
  'SH600036': '招商银行',
  'SH600519': '贵州茅台',
  'SZ000001': '平安银行',
  'SZ000858': '五粮液',
  'SZ002594': '比亚迪',
};

// 生成模拟股票基本信息
function generateMockStockInfo(stockCode: string): StockInfo {
  // 提取市场代码
  const market = stockCode.startsWith('SH') ? 'SH' : 'SZ';
  
  // 获取股票名称
  const stockName = STOCK_NAME_MAP[stockCode] || `股票${stockCode.slice(-4)}`;
  
  // 随机生成行业
  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  
  // 随机生成总市值（10亿-10000亿）
  const totalMarketValue = Math.floor(Math.random() * 999000000000) + 10000000000;
  
  // 随机生成市盈率和市净率
  const peRatio = parseFloat((Math.random() * 50 + 5).toFixed(2));
  const pbRatio = parseFloat((Math.random() * 10 + 0.5).toFixed(2));
  
  // 随机生成上市日期（1990-2023年）
  const createDate = new Date(
    1990 + Math.floor(Math.random() * 34),
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1
  ).toISOString().slice(0, 10);
  
  // 当前时间
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  return {
    stockCode,
    stockName,
    market,
    industry,
    totalMarketValue,
    peRatio,
    pbRatio,
    createDate,
    updateTime
  };
}

/**
 * 获取股票基本信息API处理函数
 * 接口路径：/api/v1/example/stock-info
 * 请求方法：GET
 * 演示了如何正确使用统一的API处理机制、请求参数验证、成功响应和错误处理
 */
async function handleStockInfoRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode') || '';
  
  // 验证必要参数
  if (!stockCode) {
    throw badRequestError('stockCode参数是必填的');
  }
  
  // 验证股票代码格式
  if (!isValidStockCode(stockCode)) {
    throw stockCodeFormatError('股票代码格式错误，应为SH/SZ开头的6位数字');
  }
  
  // 调用业务逻辑获取股票基本信息（这里使用模拟数据）
  const stockInfo = generateMockStockInfo(stockCode);
  
  // 返回成功响应
  return successResponse(stockInfo, '获取股票基本信息成功');
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleStockInfoRequest);
}
