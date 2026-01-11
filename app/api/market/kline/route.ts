import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../lib/api/common/handler';

// 生成模拟K线数据
function generateMockKLineData() {
  const mockData = [];
  const now = Date.now();
  let closePrice = 10000; // 初始价格 100.00 元

  for (let i = 99; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const open = closePrice;
    const high = open + Math.random() * 500;
    const low = open - Math.random() * 500;
    const close = low + Math.random() * (high - low);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    mockData.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    closePrice = close;
  }

  return mockData;
}

// 处理K线数据请求
async function handleKLineRequest(request: NextRequest) {
  try {
    // 生成模拟数据
    const mockData = generateMockKLineData();
    
    // 返回成功响应
    return mockData;
  } catch (error) {
    console.error('Error handling K-line request:', error);
    return {
      code: 500,
      msg: 'Internal Server Error',
      data: null,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleKLineRequest);
}
