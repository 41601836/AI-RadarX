import { NextRequest } from 'next/server';
import { apiHandler } from '../../../../../../lib/api/common/handler';

// 生成模拟成交额榜数据
function generateMockTurnoverRank() {
  const mockData = [];
  const prefixes = ['000', '002', '300', '600', '601', '603'];
  
  for (let i = 0; i < 10; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const stockCode = `${prefix}${suffix}`;
    
    const amount = Math.random() * 10000000000 + 100000000;
    
    mockData.push({
      ts_code: stockCode,
      name: `股票${i + 1}`,
      close: (Math.random() * 200 + 10).toFixed(2),
      change: (Math.random() * 10 - 5).toFixed(2),
      pct_change: (Math.random() * 10 - 5).toFixed(2),
      volume: Math.floor(Math.random() * 1000000000) + 10000000,
      amount: amount.toFixed(2),
    });
  }
  
  // 按成交额排序
  return mockData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
}

// 处理成交额榜请求
async function handleTurnoverRequest(request: NextRequest) {
  try {
    // 生成模拟数据
    const mockData = generateMockTurnoverRank();
    
    // 返回成功响应
    return mockData;
  } catch (error) {
    console.error('Error handling turnover request:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleTurnoverRequest);
}
